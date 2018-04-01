# Rout@ir documentation

Note that this documentation is here to indicate what should be made to install and use the software inside the shipped raspberry pi.

# Security

The device is here to grab and send information from the devices surrounding it. It is not intended to have other behaviour than creating an internal server, a wifi and connect to whatever wifi/ethernet is chosen.

Any other services should be considered a threat.


# Initial MYSQL Configuration


## Create the user

For instance in the current default implementation :

```
CREATE USER 'rpi'@'localhost' IDENTIFIED BY 'password'
```

## Create the database

```
CREATE DATABASE NonOpn;
```

## Grant access

```
GRANT CREATE, INSERT, SELECT, UPDATE, DROP ON `NonOpn`.* TO 'rpi'@'localhost';
```

## Post install

You can restart the soft or the device if you have configured the service to start right away.
