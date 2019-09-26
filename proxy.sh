echo "Get directory"
#DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DIR=/home/vnc/sw-exporter/
echo "Move to directory"
dir
cd $DIR
dir
echo "Start programm"
npm start
while :
do
	sleep 1
done
