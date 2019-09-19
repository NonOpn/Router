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

  echo "reset the local repo"
  git checkout .
  git fetch --all
  git reset --hard origin/master
  git checkout master

  echo "pull the update"
  git pull origin master
  # restore the config
  cp tmp_config.json config/snmp.json

  npm install
  systemctl restart routair.service
else
  echo "offline, cancel routair update"
fi

nodevers=`node -v`
nodevers=${nodevers%$'\r'}
curl -X GET "https://contact-platform.com/api/versions/$nodevers"