#!/bin/bash

# This script takes in 1 command line argument (the container name)

id -u
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 container_name"
    exit 1
fi

arg1=$1

if [[ ! "$arg1" =~ ^[a-zA-Z0-9_.-]+$ ]]; then
    echo "Error: Invalid container name '$arg1'. Allowed characters: letters, digits, '.', '-', '_'." >&2
    exit 1
fi

echo "Restarting... $arg1"

sudo docker restart -- "$arg1"

# Re-enable nginx routing (check for .conf suffix)
if [ ! -L "/etc/nginx/sites-enabled/$arg1.conf" ] && [ ! -f "/etc/nginx/sites-enabled/$arg1.conf" ] && [ -f "/etc/nginx/sites-available/$arg1.conf" ]; then
    sudo ln -s -- "/etc/nginx/sites-available/$arg1.conf" "/etc/nginx/sites-enabled/$arg1.conf"
fi

# Re-enable nginx routing (check for no suffix)
if [ ! -L "/etc/nginx/sites-enabled/$arg1" ] && [ ! -f "/etc/nginx/sites-enabled/$arg1" ] && [ -f "/etc/nginx/sites-available/$arg1" ]; then
    sudo ln -s -- "/etc/nginx/sites-available/$arg1" "/etc/nginx/sites-enabled/$arg1"
fi

sudo systemctl reload nginx
