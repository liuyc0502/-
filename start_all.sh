#!/bin/bash

cd /opt

# 激活虚拟环境并加载环境变量
source backend/.venv/bin/activate
source .env


# 启动 PaddleOCR MCP (SSE 协议，端点 /sse)
echo "Starting PaddleOCR MCP server (SSE mode)..."
nohup /usr/local/bin/python3.10 backend/paddleocr_sse_server.py > /tmp/paddleocr_mcp.log 2>&1 &
PADDLEOCR_PID=$!
echo "PaddleOCR MCP started with PID: $PADDLEOCR_PID"
sleep 5

# 检查是否启动成功
if kill -0 $PADDLEOCR_PID 2>/dev/null; then
    echo "PaddleOCR MCP is running at http://localhost:5020/sse"
else
    echo "WARNING: PaddleOCR MCP failed to start, check /tmp/paddleocr_mcp.log"
fi

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
