#Component: fh-mbaas
## 3.0.0 - 2015-11-04 - Craig Brookes
* RHMAP-3548-update-mbaas-clients
* RHMAP-2202-mbaas-route-for-app-messages
* RHMAP-2114 add metrics route to mbaas
* RHMAP-3175 - Use default mongo admin user of 'admin' for openshift config
* RHMAP-3216 - Fix ose placholders for messaging config

## 2.5.1 - 2015-12-14 - Gerard Ryan
* Update fh-forms version for productization
* Remove unspecifiers (^,~) from production dependency versions (and align with shrinkwrap)

## 2.5.0 - 2015-11-25 - Wei Li, Niall Donnelly
* RHMAP-2640 - Fix error handler
* RHMAP-2844 - Fixed deleteAppReferences function name error in fh-forms

## 2.4.0 - 2015-12-03 - Graham Hillis
* RHMAP-3066 - Change the app crash event timestamp in message

## 2.3.1 - 2015-12-02 - Graham Hillis
* RHMAP-3070 - Improve the email regular expression and use MBaaS when available for email. fh-mbaas-middleware version bump

## 2.3.0 - 2015-11-24 - Graham Hillis
* RHMAP-3070 - Improve the email regular expression and use MBaaS when available for email

## 2.2.0 - 2015-10-15 - Gerard Ryan
* RHMAP-2459 - Cleanup entrypoint file with fh-cluster & functions

## 2.1.0 - 2015-07-19 - Craig Brookes, Graham Hillis
* add config for crash monitor
* wire up fh-mbaas-notifications

Change to config for amqp (auto for fhcap)

fhamqp.vhosts now needs to look like:

"vhosts": {
      "events": {
        "clusterNodes": [
          "amqp://fheventuser:fheventpassword@node1.feedhenry.local:5672/fhevents"
        ]
      },
      "internal":{
        "clusterNodes": [
          "amqp://fhinternal:Jdxbf9f4hkJvs7T@node1.feedhenry.local:5672/fhinternal"
        ]
      }

two new sections to the config have been added also:

      "crash_monitor":{
          "enabled":true,
          "min_num_crashes":5,
          "max_num_crashes":40,
          "tolerance":1,
          "base_time_seconds":60,
          "sample_time_hrs":1
        },
        "email":{
          "service": "",
          "auth_user": "",
          "auth_pass": "",
          "alert_email_from": "no-reply@feedhenry.com",
          "alert_email_bcc": ""
        }

More can be read about the crash monitor at docs/CrashMonitor.md

## 2.0.9 - 2015-10-01 - Gerard Ryan
* FH-1825 - Handle MongoDB not being ready on startup with exponential backoff
* FH-2205 - Use fh-forms@1.1.7 to fix shrinkwrap-ability

## 2.0.8 - 2015-09-25 - Niall Donnelly
* FH-2140 - Bumped fh-mbaas-middleware version

## 2.0.7 - 2015-09-30 - Gerard Ryan
* Fix config files used for openshift3 config

## 2.0.6 - 2015-09-08 - Luigi Zuccarelli
* FH-2058 - Add conf-docker.json artifact
* FH-2057 - Update validation check


## 2.0.5 - 2015-09-08 - Gerard Ryan
* FH-1954 - Add an openshift3 property to appEnv model
* FH-1946 - Fix security vulnerabilities: handlebars and mongoose-validator

## 2.0.4 - 2015-08-24 - Luigi Zuccarelli
* Updated for new fh-config functionality
* FH-1893 - fh-mbaas should work even if fh-dfc is absent

## 2.0.3 - 2015-08-24 - Niall Donnelly

* FH-1466 - Added Form Submission Name To PDF Generation
* FH-1924 - Removed Submission Data From Logging.

## 2.0.2 - 2015-08-24 - Niall Donnelly

* FH-1464 - Bumped fh-forms version to create new forms config if it does not exist

## 2.0.1 - 2015-08-21 - Niall Donnelly

* FH-1820 Remove Protocol Property

## 2.0.0 - 2015-05-15 - Niall Donnelly & Luigi Zuccarelli
* FHMAP-666 unit testing update
* FHMAP-667 acceptance test update
* FHMAP-693 added to acceptance test to check middleware logger initialise
* Refactored code for route api
* Implemented changes middleware initialise
* FH-42 - Implemented changes for mbaas as service
* FH-42 - Added Forms APIs To Supercore For Core And Apps Functionality

## 1.0.7 - 2015-05-07 - Gerard Ryan
* Fix some jshint errors
* Clean up Gruntfile.js & use grunt-fh-build

## 1.0.6 - 2015-04-08 - Bruno Oliveira
* FH-136: Update fh-mbaas dependencies to mitigate vulnerabilities

## 1.0.5 - 2015-04-29 - Gerard Ryan
* FH-96 - Remove fh-dfc from package.json, depend on it being globally installed
* Include npm-shrinkwrap.json file in tarball

## 1.0.4 - 2015-04-13 - Martin Murphy
* FHPAAS-8 - Include error text in log output

## 1.0.3 - 2015-04-09 - Gerard Ryan
* Add npm-shrinkwrap.json file to lock dependency versions

## 1.0.2 - 2015-03-27 - Wei Li
* Fix for issue FHPAAS-6 - Check app existence before deciding the dynoname.

##1.0.1 - 2015-03-18 - Alan Moran

* Updating dfc version in package.json as previous one has been deleted.

##1.0.0 - 2015-01-21 - IR245 - Wei Li

* 8178 Added support for life cycle management.

### Notes

* The "mongo" config option should specify the connection details to the MongoDB inside the MBaas instance.

* The host(s) values in those config properties:

  * fhamqp
  * fhditch
  * fhmessaging
  * fhstats
  * fhredis

  They are used to construct the variouse FH service environment variables for the apps when they are deployed to dynofarm. Make sure the host(s) values are accessible from inside the dyno.
