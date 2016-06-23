## fh-mbaas - FeedHenry MBaaS Management Service

### Development guide

The basic strategy how to develop and debug fh-mbaas component is as follows:

* Be sure the source code of `fh-mbaas` is mounted via `nfs` to your Vagrant machine. `fh-mbaas` directory should be by default located in `/mnt/src/fh-mbaas` in Vagrant machine. You should be asked where your sources should be taken from while doing `./setup.sh` in `fhcap` for the first time. Before doing actual `vagrant up`, you have to put this configuration snippet into `roles/dev.json` in `fhcap` repository as a child of `override_attributes` field:

```
  "fh-mbaas": {
    "install_method": "source"
  }   
```

* After mounting, you see your sources which are located at your host machine in the context of the Vagrant box. You can develop this component by your favorite IDE at your host machine and they are in sync with Vagrant machine.
* Installation of `fh-mbaas` component is done as `npm install`. Be sure you execute this as the superuser since it installs configuration files and init scripts to `/usr` and `/etc` respectively. You should stop the already running `fh-mbaas` component by `sudo service fh-mbaas stop` and start it after installation is done.
* Logs of `fh-mbaas` are stored in `/var/log/feedhenry/fh-mbaas`
* Once you want to start the service in "developer" mode, you do it via `grunt serve`. This effectively uses configuration file in `config/dev.json`
* The testing has been split due to the core middleare function moving to fh-mbaas-middleware - only the 'grunt accept' is supported
* Unit test have been moved to the fh-mbaas-middleware module
* If you want to be able to debug running `fh-mbaas` service, you have to start it by triggering debug task in Grunt. You do it by `grunt debug`. Be sure the port `8080` in Vagrant machine is not occupied by other service. It is possible that `grunt debug` fails to start because of it. You find out the PID of the process which already listens to this port by executing `netstat -tupln  | grep 8080` as a root user. You basically have to stop Tomcat server by `/etc/init.d/tomcat6 stop`. Once this is done, you have to open node's debug console at address `http://127.0.0.1:8080/debug?port=5858`. The `127.0.0.1` is little bit misleading. You have to open this address from your host's browser but it does not see any console running on host's `127.0.0.1`. You have to replace this address by the address which Vagrant machine uses internally, e.g '192.168.33.10'. This address is visible from your host computer and since it represents IP of the Vagrant machine, you get that debugger started.
* Plato statistics are generated via `grunt analysis`. Note that in order to see generated analysis by your web browser, you have to open statistics in `plato/index.html`. You can run `grunt analysis` either at your host or at your Vargant machine since the sources are the same. You just have to view it at your host because there is not apparently any web browser in Vagrant machine itself.


### Email Configuration

To configure email sending from `fh-mbaas`, the `email.transport` configuration property must be set to:

* `""` to use the default transport (sendmail)
* `"sendgrid"` - to use sendgrid. The following config must also be set on the `email.sendgrid` object:
	  "auth": {
	    "api_user": "SENDGRID_USER",
	    "api_key": "SENDGRID_PASSWORD"
	  }
* `"smtp"` - to use SMTP. An SMTP connection URL must also be set on the `email.smtp` string:
		"smtps://user:password@smtp.example.com"

#### OSE3
For OSE3 images, fh-mbaas will use `smtp` as a transport by default. An administrator must add an Environment variable to configure `fh-mbaas` to use a local SMTP relay/server - the name of this environment variable is `FH_EMAIL_SMTP` and it should be set to an SMTP URL e.g. `smtps://user:password@smtp.example.com`

### Testing (grunt fh:test)

* Modules published to npm.skunkhenry.com

  * The module turbo-test-runner has been updated (heapdump and memwatch needed upgrading), due to permissions on npmjs this has been published to npm.skunkhenry.com
