## fh-mbaas - FeedHenry MBaaS Management Service 

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
