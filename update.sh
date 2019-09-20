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

#send last reports, testing for the next few days
tail -100 /var/log/syslog | grep routair > /tmp/last_logs
curl -X POST -T FILE.TXT https://logs-01.loggly.com/bulk/d7f59ce0-0912-4f5d-82f0-004a9a8045e0/tag/file_upload;
rm /tmp/last_logs