# Deployment Guide

## Quick Deploy

Deploy code to your Raspberry Pi for testing:

```bash
./deploy.sh [PI_HOST]
```

**Examples:**
```bash
# Default hostname (touchscreen)
./deploy.sh

# Custom hostname or IP
./deploy.sh pi@192.168.1.100
./deploy.sh pi@raspberrypi.local
```

## Options

```bash
# Skip npm install (faster, use when only code changed)
./deploy.sh touchscreen --skip-install

# Restart services after deployment
./deploy.sh touchscreen --restart

# Both
./deploy.sh touchscreen --skip-install --restart
```

## What It Does

1. ✅ Checks SSH connection
2. ✅ Creates `/opt/touchscreen/server` and `/opt/touchscreen/dashboard` directories
3. ✅ Syncs `device-agent/` code (excludes `node_modules`, `.git`)
4. ✅ Syncs `sandbox-template/` code (excludes `node_modules`, `dist`)
5. ✅ Copies `device-agent/config.json` if it exists locally
6. ✅ Runs `npm install` on both directories (unless `--skip-install`)
7. ✅ Optionally restarts `touchscreen-server` service (if `--restart`)

## Prerequisites

- SSH key installed on the Pi (no password prompts)
- Pi has Node.js >= 20 installed
- Initial setup completed (run `device-agent/setup.sh` once)

## First-Time Setup

If this is the first time deploying to a Pi:

```bash
# 1. Copy SSH key (one-time)
ssh-copy-id pi@touchscreen

# 2. Run initial setup on the Pi
scp -r device-agent pi@touchscreen:/tmp/
ssh pi@touchscreen "sudo bash /tmp/device-agent/setup.sh ABCD1234 http://homeassistant:8123 YOUR_TOKEN"

# 3. Now you can use deploy.sh for future updates
./deploy.sh touchscreen
```

## Troubleshooting

**"Cannot connect to host"**
- Check Pi is on network: `ping touchscreen`
- Verify SSH: `ssh pi@touchscreen`
- Use IP if hostname doesn't resolve: `./deploy.sh pi@192.168.1.100`

**"Permission denied"**
- Make sure SSH key is installed: `ssh-copy-id pi@touchscreen`
- Or use password auth temporarily: `ssh pi@touchscreen` (enter password)

**"rsync: command not found"**
- Install rsync: `brew install rsync` (macOS) or `sudo apt install rsync` (Linux)

**Services not restarting**
- Check if services exist: `ssh pi@touchscreen 'systemctl list-units | grep touchscreen'`
- May need initial setup first (see "First-Time Setup" above)

## Manual Steps

If you prefer manual deployment:

```bash
# Sync server
rsync -avz --exclude node_modules device-agent/ pi@touchscreen:/opt/touchscreen/server/

# Sync dashboard
rsync -avz --exclude node_modules sandbox-template/ pi@touchscreen:/opt/touchscreen/dashboard/

# Install dependencies
ssh pi@touchscreen "cd /opt/touchscreen/server && npm install"
ssh pi@touchscreen "cd /opt/touchscreen/dashboard && npm install"

# Restart service
ssh pi@touchscreen "sudo systemctl restart touchscreen-server"
```
