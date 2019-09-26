const request = require('request');

module.exports = {
  defaultConfig: {
    enabled: true
  },
  pluginName: 'LunaLogger',
  pluginDescription: 'Transfers your Guild War data to dpdgaming.de automatically.',
  log_url: 'https://luna.dpdgaming.de/upload/',
  init(proxy, config) {
	proxy.on('apiCommand', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        this.processCommand(proxy, req, resp);
      }
    });
	proxy.on('GetGuildMazeStatusInfo', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        this.log(proxy, req, resp);
      }
    });
	proxy.on('GetGuildMazeMemberInfoList', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        this.log(proxy, req, resp);
      }
    });
	proxy.on('GetGuildSiegeMatchupInfo', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        this.log(proxy, req, resp);
      }
    });
	proxy.on('GetGuildWarBattleLogByGuildId', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        this.log(proxy, req, resp);
      }
    });
	proxy.on('GetGuildWarMatchupInfo', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        this.log(proxy, req, resp);
      }
    });
	proxy.on('GetGuildWarParticipationInfo', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        this.log(proxy, req, resp);
      }
    });
	proxy.on('GetGuildWarMatchLog', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        this.log(proxy, req, resp);
      }
    });
	proxy.on('GetGuildInfo', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        this.log(proxy, req, resp);
      }
    })
  },
  
  processCommand(proxy, req, resp) {
    const { command } = req;

    // Extract the rune and display it's efficiency stats.
    switch (command) {
      case 'BattleDungeonResult':
      case 'BattleScenarioResult':
        if (resp.win_lose === 1) {
          const reward = resp.reward ? resp.reward : {};

          if (reward.crate && reward.crate.rune) {
           this.logRuneDrop(proxy, req, reward.crate.rune);
          }
        }
        break;
      case 'UpgradeRune': {
        const originalLevel = req.upgrade_curr;
        const newLevel = resp.rune.upgrade_curr;


        if (newLevel > originalLevel && newLevel % 3 === 0 && newLevel <= 12) {
          this.logRuneDrop(proxy, req, resp.rune);
        }
        break;
      }
      case 'AmplifyRune':
      case 'ConfirmRune':
        this.logRuneDrop(proxy, req, resp.rune);
        break;

      case 'BuyBlackMarketItem':
        if (resp.runes && resp.runes.length === 1) {
          this.logRuneDrop(proxy, req, resp.runes[0]);
        }
        break;

      case 'BuyShopItem':
        if (resp.reward && resp.reward.crate && resp.reward.crate.runes) {
          this.logRuneDrop(proxy, req, resp.reward.crate.runes[0]);
        }
        break;

      case 'GetBlackMarketList':
        resp.market_list.forEach((item) => {
          if (item.item_master_type === 8 && item.runes) {
            this.logRuneDrop(proxy, req, item.runes[0]);
          }
        });
        break;

      case 'BattleWorldBossResult': {
        const reward = resp.reward ? resp.reward : {};

        if (reward.crate && reward.crate.runes) {
          reward.crate.runes.forEach((rune) => {
            this.logRuneDrop(proxy, req, rune);
          });
        }
        break;
      }
      case 'BattleRiftDungeonResult':
        resp.item_list.forEach((item) => {
          if (item.type === 8) {
            this.logRuneDrop(proxy, req, item.info);
          }
        });
        break;

      default:
        break;
    }
  },

  logRuneDrop(proxy, req, rune) {
    const efficiency = gMapping.getRuneEfficiency(rune);
	runej = {
		"command": "Rune",
		"rune_id": rune.rune_id,
		"wizard_id": rune.wizard_id,
		"class": rune.class,
		"rank": rune.rank,
		"slot_no": rune.slot_no,
		"set_id": rune.set_id,
		"upgrade_cur": rune.upgrade_curr,
		"pri_eff_type": rune.pri_eff[0],
		"efficiency_cur": efficiency.current,
		"efficiency_max": efficiency.max
	}
	
	this.log(proxy, req, runej);
  },
  
  log(proxy, req, resp) {
    const { command } = req;

	js = {
		"req": req,
		"resp": resp
	}
	
    let options = {
      method: 'post',
      uri: this.log_url,
      json: true,
      body: js
    };

    request(options, (error, response) => {
      if (error) {
        proxy.log({ type: 'error', source: 'plugin', name: this.pluginName, message: `Error: ${error.message}` });
        return;
      }

      if (response.statusCode === 200) {
        proxy.log({ type: 'success', source: 'plugin', name: this.pluginName, message: `${command} logged successfully` });
      } else {
        proxy.log({ type: 'error', source: 'plugin', name: this.pluginName, message: `Request failed: Server responded with code: ${response.statusCode}` });
      }
    });
  }
};
