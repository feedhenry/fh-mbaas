#!/bin/bash
#
# Special helper script to be used in conjunction with /etc/init.d/fh-mbaas
# to ensure log output (sent to stdout,stderr) from a daemonized script is accessible.
#
umask 002
exec /usr/local/bin/fh-mbaas $* > /var/log/feedhenry/fh-mbaas/fh-mbaas-console.log 2>&1
