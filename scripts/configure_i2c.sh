
BOOT=`cat /boot/config.txt`

let found=`cat /boot/config.txt | grep "^dtparam=i2c_arm=on" | wc -l`
if [ $found -eq 0 ]; then
  echo "needs update"
  echo "dtparam=i2c_arm=on" >> /boot/config.txt
  echo "dtparam=i2c_baudrate=10000" >> /boot/config.txt
  echo "dtparam=i2s=on" >> /boot/config.txt
  echo "dtparam=spi=on" >> /boot/config.txt
  raspi-config nonint do_i2c 0
else
  echo "already set"
fi

modprobe -r i2c_bcm2708
modprobe i2c_bcm2708 baudrate=100000