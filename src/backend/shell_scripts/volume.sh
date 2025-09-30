#!/bin/bash

# Volume Management Script for DomainForge
# Manages Docker volumes for persistent storage per project
# Usage: volume.sh <action> <subdomain> - may chabnge later
# Actions: create, delete, exists

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <action> <subdomain>"
    echo "Actions: create, delete, exists"
    exit 1
fi

action=$1
subdomain=$2

# Sanitize subdomain for volume name
volume_name="df-vol-$(echo "$subdomain" | tr '.[:]/' '-')"

case $action in
  create)
    if docker volume inspect "$volume_name" >/dev/null 2>&1; then
      echo "Volume already exists: $volume_name"
      exit 0
    fi
    
    if docker volume create "$volume_name" >/dev/null 2>&1; then
      echo "Created volume: $volume_name"
      exit 0
    else
      echo "Failed to create volume: $volume_name" >&2
      exit 1
    fi
    ;;
    
  delete)
    if ! docker volume inspect "$volume_name" >/dev/null 2>&1; then
      echo "Volume not found: $volume_name"
      exit 0
    fi
    
    if docker volume rm "$volume_name" >/dev/null 2>&1; then
      echo "Deleted volume: $volume_name"
      exit 0
    else
      echo "Failed to delete volume: $volume_name (may be in use)" >&2
      exit 1
    fi
    ;;
    
  exists)
    if docker volume inspect "$volume_name" >/dev/null 2>&1; then
      echo "exists"
      exit 0
    else
      echo "not_found"
      exit 0
    fi
    ;;
    
  *)
    echo "Unknown action: $action" >&2
    echo "Valid actions: create, delete, exists"
    exit 1
    ;;
esac

