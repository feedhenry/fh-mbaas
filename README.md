## fh-mbaas - FeedHenry MBaaS Management Service

### Development guide

Use the following steps to develop and debug fh-mbaas component:

* Be sure the source code of `fh-mbaas` is mounted via `nfs` to your Vagrant machine. `fh-mbaas` directory should be by default located in `/mnt/src/fh-mbaas` in Vagrant machine. You will be prompted to configure the folder which contains the source code on you host meachine when you run `./setup.sh` in `fhcap` for the first time. Before doing `vagrant up`, include the following configuration snippet into `roles/dev.json` in `fhcap` repository as a child of `override_attributes` field:

```
  "fh-mbaas": {
    "install_method": "source"
  }   
```

* After mounting, you see your sources which are located at your host machine in the context of the Vagrant box. You can develop this component using your favorite IDE on your host machine and they are in sync with Vagrant machine.
* Installation of `fh-mbaas` component is done by running `npm install`. Be sure you execute this as the superuser since it installs configuration files and init scripts to `/usr` and `/etc` respectively. You should stop the already running `fh-mbaas` component by `sudo service fh-mbaas stop` and start it after installation is done.
* Logs of `fh-mbaas` are stored in `/var/log/feedhenry/fh-mbaas`
* Once you want to start the service in "developer" mode, you do it via `grunt serve`. This effectively uses configuration file in `config/dev.json`
* The testing has been split due to the core middleare function moving to fh-mbaas-middleware - only 'grunt accept' is supported
* Unit test have been moved to the fh-mbaas-middleware module
* If you want to be able to debug a running `fh-mbaas` service, you have to start it by triggering the debug task in Grunt by running `grunt debug`. Be sure that port `8080` in the Vagrant machine is not occupied by another service. It is possible that `grunt debug` will fail to start as a result. You find the PID of the process which already listens to this port by executing `netstat -tupln  | grep 8080` as the root user. You have to stop the Tomcat server by `/etc/init.d/tomcat6 stop`. Once this is done, open node's debug console at address `http://127.0.0.1:8080/debug?port=5858`. The `127.0.0.1` is little bit misleading. If you open this address from your host's browser but it will not see any console running on host's `127.0.0.1`. You have to replace this address with the address that the Vagrant machine uses internally, e.g '192.168.33.10'. This address is visible from your host computer and since it represents the IP of the Vagrant machine, it will start the debugger.
* Plato statistics are generated via `grunt analysis`. Note that in order to see generated analysis through your web browser, you have to open statistics in `plato/index.html`. Run `grunt analysis` either on your host or on your Vargant machine as the sources are the same. View it on the host machine as there is no web browser installed on the Vagrant machine.


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
For OSE3 images, fh-mbaas will use `smtp` by default. An administrator must add an Environment variable to configure `fh-mbaas` to use a local SMTP relay/server - the name of this environment variable is `FH_EMAIL_SMTP` and it should be set to an SMTP URL e.g. `smtps://user:password@smtp.example.com`

### Testing (grunt fh:test)

* Modules published to npm.skunkhenry.com

  * The module turbo-test-runner has been updated (heapdump and memwatch needed upgrading), due to permissions on npmjs this has been published to npm.skunkhenry.com

### License

fh-mbaas is licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/).
