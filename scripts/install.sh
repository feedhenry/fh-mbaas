#!/bin/sh
if [ "$(id -u)" != "0" ]; then
 echo "NOT running post-install script since not ROOT user"
 exit
fi

OSNAME=`uname -s`
case $OSNAME in
 Linux)
   echo Installing startup script to /etc/init.d/fh-mbaas
   cp scripts/fh-mbaas /etc/init.d
   echo Initialising - update-rc.d fh-mbaas defaults 80
   update-rc.d fh-mbaas defaults 80
   ;;
 *)
   echo no post-installation for OS $OSNAME
   ;;
esac

