#Component: fh-mbaas

## 2.1.0 - 2015-10-03 - Niall Donnelly

* FH-2097: Added Data Source Mbaas APIs
* RHMAP-2395: Added agenda scheduler. 
* RHMAP-2394 - Bump fh-forms version

## 2.0.2 - 2015-09-08 - Gerard Ryan
* FH-1954 - Add an openshift3 property to appEnv model
* FH-1946 - Fix security vulnerabilities: handlebars and mongoose-validator

## 2.0.1 - 2015-08-24 - Luigi Zuccarelli
* Updated for new fh-config functionality
* FH-1893 - fh-mbaas should work even if fh-dfc is absent

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
