const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const fs = require('fs-extra');
const storage = require('electron-json-storage');
const windowStateKeeper = require('electron-window-state');
const _ = require('lodash');
const SWProxy = require('./proxy/SWProxy');

const path = require('path');
const url = require('url');

global.gMapping = require('./mapping');
global.appVersion = app.getVersion();

let defaultFilePath = path.join(app.getPath('desktop'), `${app.getName()} Files`);
let defaultConfig = {
  Config: {
    App: { filesPath: defaultFilePath, debug: false, clearLogOnLogin: false },
    Proxy: { port: 8080, autoStart: false },
    Plugins: {}
  }
};
let defaultConfigDetails = {
  ConfigDetails: {
    App: { debug: { label: 'Show Debug Messages' }, clearLogOnLogin: { label: 'Clear Log on every login' } },
    Proxy: { autoStart: { label: 'Start proxy automatically' } },
    Plugins: {}
  }
};

function createWindow() {
  let mainWindowState = windowStateKeeper({
    defaultWidth: 800,
    defaultHeight: 600
  });

  global.win = new BrowserWindow({
    minWidth: 800,
    minHeight: 600,
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    acceptFirstMouse: true,
    autoHideMenuBar: true
  });

  global.mainWindowId = win.id;

  win.loadURL(
    url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
    })
  );

  mainWindowState.manage(win);

  win.webContents.on('new-window', (e, link) => {
    e.preventDefault();
    shell.openExternal(link);
  });
}

const proxy = new SWProxy();

proxy.on('error', () => {});

ipcMain.on('proxyIsRunning', event => {
  event.returnValue = proxy.isRunning();
});

ipcMain.on('proxyGetInterfaces', event => {
  event.returnValue = proxy.getInterfaces();
});

ipcMain.on('proxyStart', () => {
  proxy.start(config.Config.Proxy.port);
});

ipcMain.on('proxyStop', () => {
  proxy.stop();
});

ipcMain.on('logGetEntries', event => {
  event.returnValue = proxy.getLogEntries();
});

ipcMain.on('updateConfig', () => {
  storage.set('Config', config.Config, error => {
    if (error) throw error;
  });
});

ipcMain.on('getFolderLocations', event => {
  event.returnValue = {
    settings: app.getPath('userData'),
    plugins: path.join(path.dirname(app.getPath('exe')), 'plugins')
  };
});

global.plugins = [];

function loadPlugins() {
  // Initialize Plugins
  let plugins = [];

  const pluginDir = path.join(__dirname, 'plugins');

  // Load each plugin module in the folder
  fs.readdirSync(pluginDir).forEach(file => {
    plugins.push(require(path.join(pluginDir, file)));
  });

  // Initialize plugins
  plugins.forEach(plug => {
    // try to parse JSON for textareas
    config.Config.Plugins[plug.pluginName] = _.merge(plug.defaultConfig, config.Config.Plugins[plug.pluginName]);
    Object.entries(config.Config.Plugins[plug.pluginName]).forEach(([key, value]) => {
      if (
        plug.defaultConfigDetails &&
        plug.defaultConfigDetails[key] &&
        plug.defaultConfigDetails[key].type &&
        plug.defaultConfigDetails[key].type === 'textarea'
      ) {
        try {
          const parsedValue = JSON.parse(value);
          config.Config.Plugins[plug.pluginName][key] = parsedValue;
        } catch (error) {
          // JSON parsing didn't work, do nothing
        }
      }
    });
    config.ConfigDetails.Plugins[plug.pluginName] = plug.defaultConfigDetails || {};
    plug.init(proxy, config);
  });

  return plugins;
}

app.on('ready', () => {
  createWindow();

  if (process.platform === 'darwin') {
    // Create our menu entries so that we can use MAC shortcuts like copy & paste
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'pasteandmatchstyle' },
            { role: 'delete' },
            { role: 'selectall' }
          ]
        }
      ])
    );
  }

  storage.getAll((error, data) => {
    if (error) throw error;

    global.config = _.merge(defaultConfig, data);
    global.config.ConfigDetails = defaultConfigDetails.ConfigDetails;

    fs.ensureDirSync(global.config.Config.App.filesPath);

    global.plugins = loadPlugins();

    if (process.env.autostart || global.config.Config.Proxy.autoStart) {
      proxy.start(process.env.port || config.Config.Proxy.port);
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});
