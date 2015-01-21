#Component: fh-mbaas

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
