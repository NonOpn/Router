#!/bin/bash

if [ -f "/home/nonopn/repair" ]; then
  systemctl stop routair
  systemctl stop mysql

  myisamchk -rf /var/lib/mysql/NonOpn/ConfigRows
  myisamchk -rf /var/lib/mysql/NonOpn/DataPoint
  myisamchk -rf /var/lib/mysql/NonOpn/Device
  myisamchk -rf /var/lib/mysql/NonOpn/Frames
  myisamchk -rf /var/lib/mysql/NonOpn/FramesCompress

  systemctl start mysql

  rm -f /home/nonopn/repair
fi