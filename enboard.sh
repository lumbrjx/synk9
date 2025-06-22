#!/bin/bash

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 new_hostname1 new_hostname2 backend_hostname"
  exit 1
fi

REMOTE1="pi@raspberrypi.local"
REMOTE2="pi2@raspberrypi2.local"
HOSTNAME1="$1"
HOSTNAME2="$2"
HOSTNAME3="$3"
ENV_FILE=".env"  

update_hostname() {
  local remote="$1"
  local new_hostname="$2"

  echo "Updating HOSTNAME on $remote to $new_hostname"
  sshpass -p "pi" ssh "$remote" "sed -i \"s|^HOSTNAME=.*|HOSTNAME=$new_hostname|\" \$HOME/$ENV_FILE" \
    && echo "✔ $remote updated" || echo "❌ Failed to update $remote"
}

update_backend_url() {
  local remote="$1"
  local new_hostname="$2"

  echo "Updating WS_URL on $remote to $new_hostname"
  sshpass -p "pi" ssh "$remote" "sed -i \"s|^WS_URL=.*|WS_URL=$new_hostname|\" \$HOME/$ENV_FILE" \
    && echo "✔ $remote updated" || echo "❌ Failed to update $remote"
}

start_agent() {
  local remote="$1"

  echo "Starting agent on $remote in background"
  sshpass -p "pi" ssh "$remote" "nohup ./agent > agent.log 2>&1 &" \
    && echo "✔ $remote agent started" || echo "❌ Failed to start agent on $remote"
}


update_hostname "$REMOTE1" "$HOSTNAME1"
update_hostname "$REMOTE2" "$HOSTNAME2"

update_backend_url "$REMOTE1" "$HOSTNAME3"
update_backend_url "$REMOTE2" "$HOSTNAME3"

start_agent "$REMOTE1"
start_agent "$REMOTE2"
