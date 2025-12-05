#!/bin/bash

pkill -f "nexent_mcp_service.py"
pkill -f "data_process_service.py"
pkill -f "main_service.py"
pkill -f "node server.js"

# Function to kill process on a specific port
kill_port() {
  local PORT=$1
  if command -v lsof >/dev/null 2>&1; then
    lsof -t -i :"${PORT}" 2>/dev/null | xargs -r kill -9 2>/dev/null
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}"/tcp 2>/dev/null
  elif command -v ss >/dev/null 2>&1; then
    # Extract PID from ss output format: users:(("python",pid=49345,fd=8))
    ss -ltnp 2>/dev/null | awk -v port=":${PORT}" '$4 ~ port {
      match($6, /pid=([0-9]+)/, arr)
      if (arr[1] != "") print arr[1]
    }' | xargs -r kill -9 2>/dev/null
  else
    echo "未找到 lsof/fuser/ss，无法自动清理 ${PORT} 端口，请手动检查。"
  fi
}

# Clean port 8000 (PubMed MCP SSE may occupy)
kill_port 8000
kill_port 5012
# Clean port 5010 (main_service.py uses this port)
kill_port 5010
# Clean port 5555 (Flower monitoring uses this port)
kill_port 5555

echo "所有服务已停止"
