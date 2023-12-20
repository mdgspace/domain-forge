#!/bin/bash

# This script takes in 3 command line arguments

# Check if the number of arguments is correct
id -u
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 arg1 arg2 arg3"
    exit 1
fi

# Assign the arguments to variables
arg1=$1
arg2=$2
arg3=$3
host="mdgiitr"
http_upgrade="mdgiitr"
# Print the arguments
echo "Argument 1: $arg1"
echo "Argument 2: $arg2"
echo "Argument 3: $arg3"

if [ "$arg1" = "-u" ]; then
    echo "Generating url.conf"
    echo "url: $arg2"
    sudo touch /etc/nginx/sites-available/$arg3.conf
    sudo chmod 666 /etc/nginx/sites-available/$arg3.conf
    sudo echo "  server {
      listen 80;
      listen [::]:80;
      server_name $arg3;
     
      location / {
          return 307 $arg2;
      }
   }" > /etc/nginx/sites-available/$arg3.conf;
     sudo ln -s /etc/nginx/sites-available/$arg3.conf /etc/nginx/sites-enabled/$arg3.conf;
     sudo systemctl reload nginx;
elif [ "$arg1" = "-p" ]; then
    echo "Generating port.conf"
    echo "redirect: $arg2"
    sudo touch /etc/nginx/sites-available/$arg3.conf
    sudo chmod 666 /etc/nginx/sites-available/$arg3.conf
    sudo echo "# Virtual Host configuration for example.com
  server {
     listen 80;
     listen [::]:80;
     server_name $arg3;
     location / {
        proxy_pass http://localhost:$arg2;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
     }
     }" > /etc/nginx/sites-available/$arg3.conf;
     ln -s /etc/nginx/sites-available/$arg3.conf /etc/nginx/sites-enabled/$arg3.conf;
     sudo systemctl reload nginx;

else
    echo "Generating port.conf"
    echo "redirect: $arg2"
fi
