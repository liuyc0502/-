#!/bin/bash

pkill -f "nexent_mcp_service.py"
pkill -f "data_process_service.py"
pkill -f "main_service.py"
pkill -f "node server.js"

PORT=8000
# 清理占用 8000 端口的进程（PubMed MCP SSE 可能占用）
if command -v lsof >/dev/null 2>&1; then
  lsof -t -i :"${PORT}" | xargs -r kill -9
elif command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}"/tcp
elif command -v ss >/dev/null 2>&1; then
  ss -ltnp | awk -v port=":${PORT}" '$4 ~ port {print $6}' | sed 's/,.*//' | xargs -r kill -9
else
  echo "未找到 lsof/fuser/ss，无法自动清理 ${PORT} 端口，请手动检查。"
fi

echo "所有服务已停止"
