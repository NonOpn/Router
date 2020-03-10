#!/bin/bash

#checking for contact-platform connectivity
#if available, github should then be too

#alternatively, you can use crontab -e to add this script launched
#e.g. 0 */3 * * * /usr/local/routair

BRANCH=master
NPM=/usr/bin/npm
NODE=/usr/bin/node
NODE_ENOCEAN="https://github.com/codlab/node-enocean#6ba3121"

NPM_URL=" "
NODE_FOLDER=" "
MD5_VALUE=" "
CPU_INFO=`cat /proc/cpuinfo`

if grep -q '(v6l)' <<< "$CPU_INFO"; then
  echo currently on arm v6l
  NPM_URL="https://nodejs.org/dist/latest-v8.x/node-v8.17.0-linux-armv6l.tar.gz"
  MD5_VALUE="45949cbdf27b6853ff7c6a67bca556a3  node.tar.gz"
  NODE_FOLDER="node-v8.17.0-linux-armv6l"
else
  echo currently on not arm v6l
  NPM_URL="https://nodejs.org/dist/latest-v8.x/node-v8.17.0-linux-armv7l.tar.gz"
  MD5_VALUE="7eb48c81e035dab37282d3275fc9a09a  node.tar.gz"
  NODE_FOLDER="node-v8.17.0-linux-armv7l"
fi

if [ -f "/usr/local/node-v8.17.0/bin/node" ]; then
  echo "node available, skipping upgrade"
else
  wget -O /tmp/node.tar.gz $NPM_URL
  echo $MD5_VALUE > /tmp/node.tar.gz.md5
  cd /tmp
  if md5sum -c node.tar.gz.md5; then
    echo "md5 match"
    tar -xzvf node.tar.gz
    cp -r $NODE_FOLDER /usr/local/node-v8.17.0
    export PATH=/usr/local/node-v8.17.0/bin/:$PATH
    sudo systemctl stop routair.service

    echo "reinstalling packages..."
    cd /usr/local/routair
    rm -rf node_modules
    NPM=/usr/local/node-v8.17.0/bin/npm
    NODE=/usr/local/node-v8.17.0/bin/node
    rm /usr/bin/npm /usr/bin/node
    ln -s /usr/local/node-v8.17.0/bin/npm /usr/bin/npm
    ln -s /usr/local/node-v8.17.0/bin/node /usr/bin/node

    su - nonopn -c "cd /usr/local/routair ; $NPM install"
  else
    echo "md5 mismatched"
  fi

  rm -rf /tmp/node.tar.gz
  rm -rf /tmp/node-*
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
  NODE=/usr/local/node-v8.17.0/bin/node
  NODE_ENOCEAN="https://github.com/codlab/node-enocean#6ba3121"
  #BRANCH=feature/upgrade
  BRANCH=master

  # in case, update service
  cp systemd/routair.8.17.0.service /etc/systemd/system/routair.service
  systemctl daemon-reload

elif [ -f "/usr/local/node-v7.7.2/bin/node" ]; then
  rm /usr/bin/npm /usr/bin/node
  ln -s /usr/local/node-v7.7.2/bin/npm /usr/bin/npm
  ln -s /usr/local/node-v7.7.2/bin/node /usr/bin/node
  NPM=/usr/local/node-v7.7.2/bin/npm
  NODE=/usr/local/node-v7.7.2/bin/node
  NODE_ENOCEAN="https://github.com/codlab/node-enocean"
  BRANCH=master
fi

echo "using $NPM"
echo "using $NODE"

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

  echo "executing:: $NPM install --save $NODE_ENOCEAN"
  su - nonopn -c "cd /usr/local/routair ; $NPM install --save $NODE_ENOCEAN"
  echo "executing:: $NPM install"
  su - nonopn -c "cd /usr/local/routair ; $NPM install"

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