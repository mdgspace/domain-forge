#!/bin/bash
name=$1

if [ -z "$name" ]; then
    echo "Subdomain name required"
    exit 1
fi

echo "Redeploying $name"
# delete.sh will handle stopping docker and removing nginx conf.
sudo bash /home/opbotxd/Desktop/vscode/dev/mdg/domain-forge/src/backend/shell_scripts/delete.sh $name || true

