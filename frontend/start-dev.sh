#!/bin/bash
# Auto-cleanup script for starting Next.js dev server
# This script kills any existing node server.js processes before starting

echo "🔍 Checking for existing processes on port 3000..."

# Kill any existing node server.js processes
if pgrep -f "node server.js" > /dev/null; then
    echo "⚠️  Found existing node server.js processes. Cleaning up..."
    pkill -9 -f "node server.js"
    sleep 1
    echo "✅ Cleanup complete"
else
    echo "✅ No existing processes found"
fi

# Double check the port is free
if fuser 3000/tcp 2>/dev/null; then
    echo "⚠️  Port 3000 is still in use. Force killing..."
    fuser -k 3000/tcp 2>/dev/null
    sleep 1
fi

echo "🚀 Starting development server..."
cd /opt/frontend
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm run dev

