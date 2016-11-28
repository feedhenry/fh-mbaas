#!/bin/sh
# PostInstall Script for fh-mbaas

# Service Management (root only)
if [ "$(id -u)" = "0" ]; then
 OSNAME=`uname -s`
 case $OSNAME in
  Linux)
   echo "Installing Service Control Scripts"
   cp ./scripts/fh-mbaas /etc/init.d
   cp ./scripts/fh-mbaas-launcher.sh /usr/local/bin
   echo Initialising - update-rc.d fh-mbaas defaults 80
   update-rc.d fh-mbaas defaults 80
  ;;
  *)
   # Reserved for future use
  ;;
 esac
fi
