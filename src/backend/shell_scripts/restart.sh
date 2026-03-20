#!/bin/bash

# This script takes in 1 command line argument (the container name)

id -u
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 container_name"
    exit 1
fi

arg1=$1

echo "Restarting... $arg1"

sudo docker restart $arg1

# Re-enable nginx routing if it was previously stopped
if [ ! -f "/etc/nginx/sites-enabled/$arg1.conf" ] && [ -f "/etc/nginx/sites-available/$arg1.conf" ]; then
    sudo ln -s /etc/nginx/sites-available/$arg1.conf /etc/nginx/sites-enabled/$arg1.conf
    sudo systemctl reload nginx
fi
