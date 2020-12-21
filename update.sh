#!/bin/bash

#checking for contact-platform connectivity
#if available, github should then be too

#alternatively, you can use crontab -e to add this script launched
#e.g. 0 */3 * * * /usr/local/routair

#send last reports, testing for the next few days
tail -100 /var/log/syslog | grep routair > /tmp/last_logs
curl -X POST -T /tmp/last_logs https://logs-01.loggly.com/bulk/a1d1f44d-a2ea-4245-9659-ba7d9b6eb4f1/tag/syslog;
rm /tmp/last_logs


# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# CONSTANTS FOR NodeJS V8.17.0
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
EXPECTED_V8_FOLDER="/usr/local/node-v8.17.0"
EXPECTED_V8_NODE_BIN="$EXPECTED_V8_FOLDER/bin/node"
EXPECTED_V8_NPM_BIN="$EXPECTED_V8_FOLDER/bin/npm"

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# CONSTANTS FOR NodeJS V8.17.0 FOR V6L AND V7L
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
NPM_URL_V8_V6L="https://nodejs.org/dist/latest-v8.x/node-v8.17.0-linux-armv6l.tar.gz"
NODE_FOLDER_V8_V6L="node-v8.17.0-linux-armv6l"
MD5_VALUE_V8_V6L_REPAIR="45949cbdf27b6853ff7c6a67bca556a3  $NODE_FOLDER_V8_V6L.tar.gz"
MD5_VALUE_V8_V6L_TMP="45949cbdf27b6853ff7c6a67bca556a3  node.tar.gz"

NPM_URL_V8_V7L="https://nodejs.org/dist/latest-v8.x/node-v8.17.0-linux-armv7l.tar.gz"
NODE_FOLDER_V8_V7L="node-v8.17.0-linux-armv7l"
MD5_VALUE_V8_V7L_REPAIR="7eb48c81e035dab37282d3275fc9a09a  $NODE_FOLDER_V8_V7L.tar.gz"
MD5_VALUE_V8_V7L_TMP="7eb48c81e035dab37282d3275fc9a09a  node.tar.gz"

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# HOLDING VALUES
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
BRANCH=master
NPM=/usr/bin/npm
NODE=/usr/bin/node
NODE_ENOCEAN="https://github.com/codlab/node-enocean#6ba3121"

NPM_URL=" "
NODE_FOLDER=" "
MD5_VALUE=" "
MD5_VALUE_REPAIR=" "
CPU_INFO=`cat /proc/cpuinfo`

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# CHECK FOR ARM FLAVOR
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
if grep -q '(v6l)' <<< "$CPU_INFO"; then
  echo currently on arm v6l
  NPM_URL=$NPM_URL_V8_V6L
  MD5_VALUE=$MD5_VALUE_V8_V6L_TMP
  MD5_VALUE_REPAIR=$MD5_VALUE_V8_V6L_REPAIR
  NODE_FOLDER=$NODE_FOLDER_V8_V6L
else
  echo currently on not arm v6l
  NPM_URL=$NPM_URL_V8_V7L
  MD5_VALUE=$MD5_VALUE_V8_V7L_TMP
  MD5_VALUE_REPAIR=$MD5_VALUE_V8_V7L_REPAIR
  NODE_FOLDER=$NODE_FOLDER_V8_V7L
fi

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# DOWNLOAD REPAIR NodeJS for future helper
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
NEED_DL=true
EXPECTED_PATH="/home/nonopn/$NODE_FOLDER.tar.gz"
EXPECTED_PATH_MD5="$EXPECTED_PATH.md5"

# write the md5 files
echo "$MD5_VALUE to /tmp/node.tar.gz.md5"
echo $MD5_VALUE > /tmp/node.tar.gz.md5
echo "$MD5_VALUE_REPAIR to $EXPECTED_PATH_MD5"
echo $MD5_VALUE_REPAIR > $EXPECTED_PATH_MD5


# check if the local nodejs repairable package is here and valid
cd /home/nonopn
if [ -f "$EXPECTED_PATH" ]; then
  if md5sum -c "$EXPECTED_PATH_MD5"; then
    NEED_DL=false
  else
    NEED_DL=true
  fi
else
  NEED_DL=true
fi

# if a dl is needed, download and check it
cd /tmp
if [ "$NEED_DL" = true ]; then
  wget -O /tmp/node.tar.gz $NPM_URL
  if md5sum -c /tmp/node.tar.gz.md5; then
    echo "md5 match"
    cp /tmp/node.tar.gz $EXPECTED_PATH
  fi
else
  echo 
fi

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# UPGRADE TO NodeJS v8.17.0
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
if [ -f "$EXPECTED_V8_NODE_BIN" ]; then
  echo "node available, skipping upgrade"
else
  cd /tmp
  wget -O /tmp/node.tar.gz $NPM_URL
  if md5sum -c /tmp/node.tar.gz.md5; then
    echo "md5 match"
    tar -xzf node.tar.gz
    cp -r $NODE_FOLDER $EXPECTED_V8_FOLDER
    export PATH=/usr/local/node-v8.17.0/bin/:$PATH
    echo $PATH
    sudo systemctl stop routair.service

    echo "reinstalling packages..."
    cd /usr/local/routair
    rm -rf node_modules
    NPM=$EXPECTED_V8_NPM_BIN
    NODE=$EXPECTED_V8_NODE_BIN
    rm /usr/bin/npm /usr/bin/node
    ln -s $EXPECTED_V8_NPM_BIN /usr/bin/npm
    ln -s $EXPECTED_V8_NODE_BIN /usr/bin/node

    su - nonopn -c "cd /usr/local/routair ; $NPM install"
  else
    echo "md5 mismatched"
  fi

  rm -rf /tmp/node.tar.gz
  rm -rf /tmp/node-*
fi

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# If NodeJS v8.17.0 or v7.7.2
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
if [ -f "$EXPECTED_V8_NODE_BIN" ]; then
  rm /usr/bin/npm /usr/bin/node
  ln -s $EXPECTED_V8_NPM_BIN /usr/bin/npm
  ln -s $EXPECTED_V8_NODE_BIN /usr/bin/node
  NPM=$EXPECTED_V8_NPM_BIN
  NODE=$EXPECTED_V8_NODE_BIN
  NODE_ENOCEAN="https://github.com/codlab/node-enocean#6ba3121"
  #BRANCH=feature/upgrade
  BRANCH=master

  # in case, update service
  cd /usr/local/routair
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




# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# VARIABLE STATES
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
echo EXPECTED_V8_FOLDER $EXPECTED_V8_FOLDER
echo EXPECTED_V8_NODE_BIN $EXPECTED_V8_NODE_BIN
echo EXPECTED_V8_NPM_BIN $EXPECTED_V8_NPM_BIN
echo NPM_URL_V8_V6L $NPM_URL_V8_V6L
echo NODE_FOLDER_V8_V6L $NODE_FOLDER_V8_V6L
echo MD5_VALUE_V8_V6L_REPAIR $MD5_VALUE_V8_V6L_REPAIR
echo MD5_VALUE_V8_V6L_TMP $MD5_VALUE_V8_V6L_TMP
echo NPM_URL_V8_V7L $NPM_URL_V8_V7L
echo NODE_FOLDER_V8_V7L $NODE_FOLDER_V8_V7L
echo MD5_VALUE_V8_V7L_REPAIR $MD5_VALUE_V8_V7L_REPAIR
echo MD5_VALUE_V8_V7L_TMP $MD5_VALUE_V8_V7L_TMP
echo BRANCH $BRANCH
echo NPM $NPM
echo NODE $NODE
echo NODE_ENOCEAN $NODE_ENOCEAN
echo NPM_URL $NPM_URL
echo NODE_FOLDER $NODE_FOLDER
echo MD5_VALUE $MD5_VALUE
echo MD5_VALUE_REPAIR $MD5_VALUE_REPAIR
echo CPU_INFO $CPU_INFO
echo NEED_DL $NEED_DL
echo EXPECTED_PATH $EXPECTED_PATH
echo EXPECTED_PATH_MD5 $EXPECTED_PATH_MD5


# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# FORCE COPY THE DEVICE RULE
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

cp /usr/local/routair/scripts/41-usb_modeswitch.rules /etc/udev/rules.d/
cp /usr/local/routair/scripts/config.txt /boot/
mkdir -p /etc/usb_modeswitch.d/
cp /usr/local/routair/scripts/12d1_1f01 /etc/usb_modeswitch.d/12d1\:1f01


# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# CHECK FOR ANY UPDATE
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
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

sh /usr/local/routair/scripts/repair.sh

if [ -f "/home/nonopn/rebuild" ]; then
  rm -rf /usr/local/routair/node_modules
  echo "executing:: $NPM install --save $NODE_ENOCEAN"
  su - nonopn -c "cd /usr/local/routair ; $NPM install --save $NODE_ENOCEAN"
  echo "executing:: $NPM install"
  su - nonopn -c "cd /usr/local/routair ; $NPM install"
  rm -f /home/nonopn/rebuild
else
  echo "no rebuild, skipping install of enocean and standard libs"
fi

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
