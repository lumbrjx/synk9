#!/bin/bash
serial=$(awk '/Serial/ {print $3}' /proc/cpuinfo)
mac=$(cat /sys/class/net/eth0/address 2>/dev/null || echo "no-mac")
fp=$(echo "$serial$mac" | sha256sum | awk '{print $1}')
echo "Hardware Fingerprint: $fp"

