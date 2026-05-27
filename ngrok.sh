#!/usr/bin/env bash

# start ngrok
ngrok http 8085

# get the ngrok url
echo "Ngrok URL: $(ngrok http 8085)"