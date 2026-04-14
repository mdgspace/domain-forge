#!/bin/bash

set -Euo pipefail

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

SCRIPT_ROOT="$(pwd)"
LOG_DIR="$SCRIPT_ROOT/logs"
STATUS_DIR="$SCRIPT_ROOT/status"
mkdir -p "$LOG_DIR" "$STATUS_DIR"
LOG_FILE="$LOG_DIR/$arg3.log"
STATUS_FILE="$STATUS_DIR/$arg3.status"

exec > >(tee -a "$LOG_FILE") 2>&1
echo "DEPLOYING" > "$STATUS_FILE"

error_handler() {
    echo "FAILED" > "$STATUS_FILE"
    exit 1
}
trap 'error_handler' ERR

if [ "$arg1" = "-u" ]; then
    echo "Creating subdomain $arg3 which redirects to $arg2"
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
      charset utf-8;
      client_max_body_size 20M;
   }" > /etc/nginx/sites-available/$arg3.conf;
     sudo ln -sf /etc/nginx/sites-available/$arg3.conf /etc/nginx/sites-enabled/$arg3.conf;
     sudo systemctl reload nginx;
     echo "READY" > "$STATUS_FILE"
elif [ "$arg1" = "-p" ]; then
    echo "Creating subdomain $arg3 which redirects to port $2"
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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
     }
     charset utf-8;
     client_max_body_size 20M;
     }" > /etc/nginx/sites-available/$arg3.conf;
     sudo ln -sf /etc/nginx/sites-available/$arg3.conf /etc/nginx/sites-enabled/$arg3.conf;
     sudo systemctl reload nginx;
     echo "READY" > "$STATUS_FILE"

else
    echo "Generating port.conf"
    echo "redirect: $arg2"
    echo "READY" > "$STATUS_FILE"
fi
