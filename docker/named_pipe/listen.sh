#!/bin/sh
while true; do
  raw=$(cat pipe)
  
  if echo "$raw" | grep -q "^RESPOND::"; then
    cmd="${raw##RESPOND::}"
    response_file=$(mktemp)
    eval "$cmd" > "$response_file" 2>&1
    (
      while ! mkdir output_pipe.lock 2>/dev/null; do
       sleep 1
      done

      cat "$response_file" > output_pipe
      rm -f "$response_file"
      rmdir output_pipe.lock
    ) &
  else
    eval "$raw"
  fi
done