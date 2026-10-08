#!/bin/bash

# This script takes in 3 command line arguments

# Check if the number of arguments is correct
id -u

# Assign the arguments to variables
arg1=$1

echo "Deleting... $arg1"

# Clean up NGINX configurations (both .conf and legacy suffix-less)
sudo rm -f "/etc/nginx/sites-available/$arg1.conf" "/etc/nginx/sites-available/$arg1"
sudo rm -f "/etc/nginx/sites-enabled/$arg1.conf" "/etc/nginx/sites-enabled/$arg1"

# Stop and remove container with -v to eliminate orphaned volumes
sudo docker stop "$arg1" 2>/dev/null || true
sudo docker rm -f -v "$arg1" 2>/dev/null || true

# Remove docker image
sudo docker rmi -f "$arg1" 2>/dev/null || true

# Remove leftover cloned build directory and pipe artifacts
sudo rm -rf "$arg1" 2>/dev/null || true
sudo rm -f ".env.$arg1" "Dockerfile.$arg1" ".dockerignore.$arg1" "status/$arg1.status" "logs/$arg1.log" 2>/dev/null || true

sudo systemctl reload nginx || true
