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

# Developing on OpenShift
For development purposes, we can build a CentOS based Docker image and watch for changes in the local filesystem which would be reflected in the running image.

### Build the development image

1. `docker build -t docker.io/my-Username/fh-mbaas:dev -f Dockerfile.dev .`
2. `oc edit dc fh-mbaas`
3. Replace the image with the tagged version above.

### Hot Deployment

The development image will allow you to sync local code changes to the running container without the need for rebuilding or redeploying the image.

From the root of the `fh-mbaas directory, run the following:
```oc rsync --no-perms=true ./lib $(oc get po | grep fh-mbaas | grep Running | awk '{print $1}'):/opt/app-root/src ```

### Debugging with VS Code

1. Open [Visual Studio Code](https://code.visualstudio.com/)
2. `oc set probe dc fh-mbaas --liveness --readiness --remove=true`
3. `oc port-forward $(oc get po | grep fh-mbaas | grep Running | awk '{print $1}') :5858`. - This will forward port 5858 from the running Pod to a local port. Note the port.
4. Select the debug option and choose Node.js as the runtime.
5. Set the `launch.json` file similar to the following, using the port obtained above via the port forward command:

```json
 {
     "version": "0.2.0",
     "configurations": [
         {
             "type": "node",
             "request": "attach",
             "name": "Attach to Remote",
             "address": "localhost",
             "port": 59180,
             "localRoot": "${workspaceRoot}",
             "remoteRoot": "/opt/app-root/src/"
         },
         {
             "type": "node",
             "request": "launch",
             "name": "Launch Program",
             "program": "${workspaceRoot}/fh-mbaas.js"
         }
     ]
 }
 ```
6. Click `Attach to Remote`


### License

fh-mbaas is licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/).
