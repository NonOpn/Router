#!/bin/bash

#checking for contact-platform connectivity
#if available, github should then be too

#alternatively, you can use crontab -e to add this script launched
#e.g. 0 */3 * * * /usr/local/routair

if ping -c 1 contact-platform.com >> /dev/null 2>&1; then
  echo "online, check for updates"
  cd /usr/local/routair

  # backup the config
  cp config/snmp.json tmp_config.json
  # pull the update
  git checkout .
  git pull origin wip/ts_develop_ble
  # restore the config
  cp tmp_config.json config/snmp.json

  npm install
  systemctl restart routair.service
else
  echo "offline, cancel routair update"
fi
