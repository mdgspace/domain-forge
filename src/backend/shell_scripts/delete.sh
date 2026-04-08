#!/bin/bash

# This script takes in 3 command line arguments

# Check if the number of arguments is correct
id -u

# Assign the arguments to variables
name=$1

echo "Deleting... $name"

STORAGE_ROOT="/mnt/storage"
PROJECT_STORAGE="$STORAGE_ROOT/$name"
PROJECT_IMG="$STORAGE_ROOT/$name.img"

sudo rm /etc/nginx/sites-available/$1.conf
sudo rm /etc/nginx/sites-enabled/$1.conf
sudo docker stop $1
sudo docker rm $1
sudo docker rmi $1

if mount | grep -q "$PROJECT_STORAGE"; then
    echo "Unmounting volume..."
    sudo umount $PROJECT_STORAGE
fi

if [ -d "$PROJECT_STORAGE" ]; then
    sudo rm -rf $PROJECT_STORAGE
fi

if [ -f "$PROJECT_IMG" ]; then
    echo "Deleting volume image..."
    sudo rm -f $PROJECT_IMG
fi

sudo systemctl reload nginx
