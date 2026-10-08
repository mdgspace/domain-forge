#!/bin/bash

# This script takes in 3 command line arguments

# Check if the number of arguments is correct
id -u

# Assign the arguments to variables
arg1=$1

echo "Deleting... $arg1"

sudo rm -f "/etc/nginx/sites-available/$1.conf"
sudo rm -f "/etc/nginx/sites-enabled/$1.conf"
sudo docker stop "$1" 2>/dev/null || true
sudo docker rm -f "$1" 2>/dev/null || true
sudo docker rmi -f "$1" 2>/dev/null || true

sudo systemctl reload nginx || true
