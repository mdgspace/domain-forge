#!/bin/sh
# listen.sh
echo "Listener started, waiting for commands in 'pipe'..."
tail -f pipe | while read -r cmd; do
  if [ -n "$cmd" ]; then
    echo "Executing: $cmd"
    # Using 'eval' allows for redirects in the command string
    eval "$cmd"
  fi
done
