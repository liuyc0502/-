#!/bin/bash

cd /opt

# 激活虚拟环境并加载环境变量
source backend/.venv/bin/activate
source .env

# 启动后端服务
python backend/nexent_mcp_service.py &
sleep 2

python backend/data_process_service.py &
sleep 2

python backend/main_service.py &
sleep 2

# 启动前端
export PNPM_HOME="/root/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
export CI=true

cd frontend
pnpm run dev
