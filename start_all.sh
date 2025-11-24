#!/bin/bash

cd /opt

# 激活虚拟环境并加载环境变量
source backend/.venv/bin/activate
source .env

# 启动 PaddleOCR MCP（本地 OCR，HTTP 模式，端口 5020）
# 临时禁用浏览器自动打开功能
BROWSER=none PADDLEOCR_MCP_PIPELINE=OCR PADDLEOCR_MCP_PPOCR_SOURCE=local paddleocr_mcp --http --host 0.0.0.0 --port 5020 --verbose &
sleep 2

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
