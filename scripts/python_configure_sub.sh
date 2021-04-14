if [ -f "/opt/python/3.6.5/bin/pip3.6" ]; then
  echo "skipping, pip3.6 exists, therefore python3.6 exists"
  exit 0
fi

if [ -f "/opt/python/3.6.5/bin/python3.6" ]; then
  echo "skipping, pip3.6 exists, therefore python3.6 exists"
  exit 0
fi

cd /tmp
wget https://www.python.org/ftp/python/3.6.5/Python-3.6.5.tar.xz
tar xf Python-3.6.5.tar.xz
cd Python-3.6.5
./configure --prefix=/opt/python/3.6.5
make -j4
sudo make install
