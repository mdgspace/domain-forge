#!/bin/sh
while true; do
  raw=$(cat pipe)
  
  if echo "$raw" | grep -q "^RESPOND::"; then
    cmd="${raw##RESPOND::}"
    eval "$cmd" > output_pipe 2>&1
  else
    eval "$raw" &
  fi
done