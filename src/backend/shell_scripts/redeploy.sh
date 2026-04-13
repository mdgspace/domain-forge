#!/bin/bash
name=$1

if [ -z "$name" ]; then
    echo "Subdomain name required"
    exit 1
fi

echo "Redeploying $name"
# delete.sh will handle stopping docker and removing nginx conf.
SCRIPT_DIR=$(dirname "$0")
sudo bash "$SCRIPT_DIR/delete.sh" $name || true
