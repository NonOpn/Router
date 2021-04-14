
bash /usr/local/routair/scripts/python_configure_sub.sh


BOOT=`cat /boot/config.txt`

let found=`cat /boot/config.txt | grep "^dtparam=i2c_arm=on" | wc -l`
if [ $found -eq 0 ]; then
  echo "needs update"
  echo "dtparam=i2c_arm=on" >> /boot/config.txt
  echo "dtparam=i2c_baudrate=10000" >> /boot/config.txt
  echo "dtparam=i2s=on" >> /boot/config.txt
  echo "dtparam=spi=on" >> /boot/config.txt
  #raspi-config nonint do_i2c 0
else
  echo "already set"
fi

modprobe -r i2c_bcm2708
modprobe i2c_bcm2708 baudrate=100000

export PATH=/opt/python/3.6.5/bin:$PATH

if [ -f "/opt/python/3.6.5/lib/python3.6/site-packages/sixfab_power_python_api-0.2.2-py3.6.egg" ]; then
  echo "sixfab-power-python-api already exists, skipping"
else
  cd /tmp
  git clone https://github.com/NonOpn/sixfab-power-python-api
  cd sixfab-power-python-api
  /opt/python/3.6.5/bin/pip3.6 install -r requirements.txt
  /opt/python/3.6.5/bin/python3.6 setup.py install
fi

if [ -f "/opt/python/3.6.5/lib/python3.6/site-packages/flask" ]; then
  echo "flask already exists, skipping"
else
  (sudo /opt/python/3.6.5/bin/pip3.6 install flask) || echo "can't install for now"
fi