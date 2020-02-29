#!/bin/bash

#checking for contact-platform connectivity
#if available, github should then be too

#alternatively, you can use crontab -e to add this script launched
#e.g. 0 */3 * * * /usr/local/routair

BRANCH=master
NPM=/usr/bin/npm
NODE_ENOCEAN="https://github.com/codlab/node-enocean#62f23eb"

if [ -f "/usr/local/node-v8.17.0/bin/node" ]; then
  echo "node available, skipping upgrade"
else
  wget -O /tmp/node.tar.gz https://nodejs.org/dist/latest-v8.x/node-v8.17.0-linux-armv7l.tar.gz
  echo "7eb48c81e035dab37282d3275fc9a09a  node.tar.gz" > /tmp/node.tar.gz.md5
  cd /tmp
  if md5sum -c node.tar.gz.md5; then
    sudo systemctl stop routair.service
    echo "md5 match"
    tar -xzvf node.tar.gz
    cp -r node-v8.17.0-linux-armv7l /usr/local/node-v8.17.0
    export PATH=/usr/local/node-v8.17.0/bin/:$PATH

    echo "reinstalling packages..."
    cd /usr/local/routair
    rm -rf node_modules
    npm install
  else
    echo "md5 mismatched"
  fi

  rm -rf /tmp/node.tar.gz
  rm -rf /tmp/node-v8.17.0-linux-armv7l
fi

#if [ -f "/usr/local/node-v10.19.0/bin/node" ]; then
#  rm /usr/bin/npm /usr/bin/node
#  ln -s /usr/local/node-v10.19.0/bin/npm /usr/bin/npm
#  ln -s /usr/local/node-v10.19.0/bin/node /usr/bin/node
#  NPM=/usr/local/node-v10.19.0/bin/node
#fi

if [ -f "/usr/local/node-v8.17.0/bin/node" ]; then
  rm /usr/bin/npm /usr/bin/node
  ln -s /usr/local/node-v8.17.0/bin/npm /usr/bin/npm
  ln -s /usr/local/node-v8.17.0/bin/node /usr/bin/node
  NPM=/usr/local/node-v8.17.0/bin/npm
  NODE_ENOCEAN="https://github.com/codlab/node-enocean#62f23eb"
  BRANCH=feature/upgrade
fi

if [ -f "/usr/local/node-v7.7.2/bin/node" ]; then
  rm /usr/bin/npm /usr/bin/node
  ln -s /usr/local/node-v7.7.2/bin/npm /usr/bin/npm
  ln -s /usr/local/node-v7.7.2/bin/node /usr/bin/node
  NPM=/usr/local/node-v7.7.2/bin/npm
  NODE_ENOCEAN="https://github.com/codlab/node-enocean"
  BRANCH=master
fi

echo "using $NPM"

if ping -c 1 contact-platform.com >> /dev/null 2>&1; then
  echo "online, check for updates"
  cd /usr/local/routair

  # backup the config
  cp config/snmp.json tmp_config.json
  # pull the update

  echo "reset the local repo at $BRANCH"
  git checkout .
  git fetch --all
  git reset --hard origin/$BRANCH
  git checkout $BRANCH

  echo "pull the update from $BRANCH"
  git pull origin $BRANCH
  # restore the config
  cp tmp_config.json config/snmp.json

  echo "executin:: $NPM install --save $NODE_ENOCEAN"
  $NPM install --save $NODE_ENOCEAN
  echo "executin:: $NPM install"
  $NPM install

  # stop services
  systemctl stop routair.service
  sleep 5
  mongo local  --eval "printjson(db.dropDatabase())"
  mongo blog  --eval "printjson(db.dropDatabase())"
  service mongodb stop
  rm -rf /var/lib/mongodb/journal/*
  service mongodb start
  systemctl stop mysql.service
  sleep 5
  systemctl start mysql.service
  sleep 5
  systemctl restart routair.service
else
  echo "offline, cancel routair update"
  echo "restart services anyway for now <1.8"
  systemctl stop routair.service
  sleep 5
  mongo local  --eval "printjson(db.dropDatabase())"
  mongo blog  --eval "printjson(db.dropDatabase())"
  service mongodb stop
  rm -rf /var/lib/mongodb/journal/*
  service mongodb start
  systemctl stop mysql.service
  sleep 5
  systemctl start mysql.service
  sleep 5
  systemctl restart routair.service
fi

nodevers=`node -v`
nodevers=${nodevers%$'\r'}
curl -X GET "https://contact-platform.com/api/versions/$nodevers"

#send last reports, testing for the next few days
tail -100 /var/log/syslog | grep routair > /tmp/last_logs
curl -X POST -T /tmp/last_logs https://logs-01.loggly.com/bulk/a1d1f44d-a2ea-4245-9659-ba7d9b6eb4f1/tag/file_upload
rm /tmp/last_logs

#testing some tweak for future
cat /etc/mysql/my.cnf > /tmp/last_logs
curl -X POST -T /tmp/last_logs https://logs-01.loggly.com/bulk/a1d1f44d-a2ea-4245-9659-ba7d9b6eb4f1/tag/conf
rm /tmp/last_logs