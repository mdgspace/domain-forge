#!/bin/bash

# This script takes in 3 command line arguments

# Check if the number of arguments is correct
id -u

# Assign the arguments to variables
arg1=$1

echo "Deleting... $arg1"

sudo rm /etc/nginx/sites-available/$1.conf
sudo rm /etc/nginx/sites-enabled/$1.conf
sudo docker stop $1
sudo docker rm $1
sudo docker rmi $1

sudo systemctl reload nginx
