#!/bin/bash
# Stop script for Next.js dev server
# This script gracefully stops the frontend development server

PORT=3000

echo "🛑 Stopping development server on port $PORT..."

# First, try to kill node server.js processes
if pgrep -f "node server.js" > /dev/null; then
    echo "⚠️  Found running node server.js processes. Stopping..."
    pkill -15 -f "node server.js"  # Use SIGTERM for graceful shutdown
    sleep 2

    # If still running, force kill
    if pgrep -f "node server.js" > /dev/null; then
        echo "⚠️  Process still running. Force killing..."
        pkill -9 -f "node server.js"
        sleep 1
    fi

    echo "✅ Node processes stopped"
else
    echo "ℹ️  No node server.js processes found"
fi

# Double check and clean up the port
if fuser $PORT/tcp 2>/dev/null; then
    echo "⚠️  Port $PORT is still in use. Cleaning up..."
    fuser -k $PORT/tcp 2>/dev/null
    sleep 1
    echo "✅ Port $PORT freed"
else
    echo "✅ Port $PORT is already free"
fi

# Verify everything is stopped
if pgrep -f "node server.js" > /dev/null || fuser $PORT/tcp 2>/dev/null; then
    echo "❌ Failed to stop all processes. Please check manually:"
    echo "   ps aux | grep 'node server.js'"
    exit 1
else
    echo "✨ Development server stopped successfully"
fi
