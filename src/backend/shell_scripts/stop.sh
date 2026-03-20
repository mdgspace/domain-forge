#!/bin/bash

# This script takes in 1 command line argument (the container name)

id -u
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 container_name"
    exit 1
fi

arg1=$1

echo "Stopping... $arg1"

sudo docker stop $arg1

# Disable nginx routing for this domain so it doesn't return 502
if [ -L "/etc/nginx/sites-enabled/$arg1.conf" ] || [ -f "/etc/nginx/sites-enabled/$arg1.conf" ]; then
    sudo rm /etc/nginx/sites-enabled/$arg1.conf
fi

if [ -L "/etc/nginx/sites-enabled/$arg1" ] || [ -f "/etc/nginx/sites-enabled/$arg1" ]; then
    sudo rm /etc/nginx/sites-enabled/$arg1
fi

sudo systemctl reload nginx
