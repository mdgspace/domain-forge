#!/bin/bash

# This script takes in 3 command line arguments

# Check if the number of arguments is correct
id -u

# Assign the arguments to variables
arg1=$1
host="mdgiitr"
# Print the arguments
echo "Argument 1: $arg1"


sudo rm /etc/nginx/sites-available/$1.conf
sudo rm /etc/nginx/sites-enabled/$1.conf

sudo systemctl reload nginx
