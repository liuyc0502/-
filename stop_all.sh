#!/bin/bash

pkill -f "nexent_mcp_service.py"
pkill -f "data_process_service.py"
pkill -f "main_service.py"
pkill -f "node server.js"
pkill -f "pnpm run dev"

echo "所有服务已停止"
