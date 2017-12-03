#!/bin/bash

#checking for contact-platform connectivity
#if available, github should then be too

if ping -c 1 contact-platform.com >> /dev/null 2>&1; then
  echo "online, check for updates"
  cd /usr/local/routair

  git checkout .
  git pull origin master
else
  echo "offline, cancel routair update"
fi
