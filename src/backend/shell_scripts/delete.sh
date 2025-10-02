#!/bin/bash

# This script deletes a project deployment including container, image, nginx config, and volume

# Check if the number of arguments is correct
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <subdomain>"
    exit 1
fi

# Assign the arguments to variables
subdomain=$1

# Sanitize subdomain for volume name
volume_name="df-vol-$(echo "$subdomain" | tr '.[:]/' '-')"

echo "Deleting... $subdomain"

sudo rm -f /etc/nginx/sites-available/$subdomain.conf
sudo rm -f /etc/nginx/sites-enabled/$subdomain.conf

sudo docker stop $subdomain 2>/dev/null || true
sudo docker rm $subdomain 2>/dev/null || true
sudo docker rmi $subdomain 2>/dev/null || true

# Remove volume if it exists
if docker volume inspect "$volume_name" >/dev/null 2>&1; then
    echo "Deleting volume: $volume_name"
    docker volume rm "$volume_name" 2>/dev/null || echo "Warning: Could not delete volume (may be in use)"
fi

sudo systemctl reload nginx
