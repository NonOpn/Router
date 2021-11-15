
bash /usr/local/routair/scripts/python_configure_sub.sh
bash /usr/local/routair/scripts/configure_i2c.sh

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

if [ -f "/opt/python/3.6.5/lib/python3.6/site-packages/requests" ]; then
  echo "flask already exists, skipping"
else
  (sudo /opt/python/3.6.5/bin/pip3.6 install requests) || echo "can't install for now"
fi
