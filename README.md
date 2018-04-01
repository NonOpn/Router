# Rout@ir Intelligence

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Note that this documentation is here to indicate what should be made to install and use the software inside the shipped raspberry pi. It will also have other important information as requested in its lifetime.

## Security

The device is here to grab and send information from the devices surrounding it. It is not intended to have other behaviour than creating an internal server, a wifi and connect to whatever wifi/ethernet is chosen.

Any other services should be considered a threat.


## Initial MYSQL Configuration


### Create the user

For instance in the current default implementation :

```
CREATE USER 'rpi'@'localhost' IDENTIFIED BY 'password'
```

### Create the database

```
CREATE DATABASE NonOpn;
```

### Grant access

```
GRANT CREATE, INSERT, SELECT, UPDATE, DROP ON `NonOpn`.* TO 'rpi'@'localhost';
```

### Post install

You can restart the soft or the device if you have configured the service to start right away.

## Contributing

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.

Please note we have a code of conduct, please follow it in all your interactions with the project.

## License

This project is licensed under the GPL v3 License - see the [LICENSE](LICENSE) file for details
