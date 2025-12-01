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

# 启动 PubMed MCP（默认 FastMCP 端口 8000）
echo "Starting PubMed MCP server..."
# 强制清理 8000 端口占用（多种方式确保清理成功）
echo "Cleaning up port 8000..."
fuser -k 8000/tcp 2>/dev/null || true
sleep 1
# 使用 ss + kill 作为备用清理方式
PORT_8000_PID=$(ss -tlnp 2>/dev/null | grep ':8000 ' | grep -oP 'pid=\K[0-9]+' | head -1)
if [ -n "$PORT_8000_PID" ]; then
    echo "Force killing process on port 8000: $PORT_8000_PID"
    kill -9 $PORT_8000_PID 2>/dev/null || true
    sleep 1
fi
# 清理 pubmearch 相关进程
pkill -9 -f "pubmearch" 2>/dev/null || true
sleep 1
# 直接运行服务器文件，确保模块路径正确
cd /opt/pubmearch && PYTHONPATH=/opt/pubmearch:$PYTHONPATH nohup /opt/backend/.venv/bin/python -m pubmearch.server > /tmp/pubmearch_mcp.log 2>&1 &
PUBMEARCH_PID=$!
echo "PubMed MCP started with PID: $PUBMEARCH_PID"
cd /opt || exit 1
sleep 3

# 检查 PubMed MCP 是否启动
if [ -n "$PUBMEARCH_PID" ] && kill -0 $PUBMEARCH_PID 2>/dev/null; then
    echo "PubMed MCP is running at http://localhost:8000/sse"
else
    echo "WARNING: PubMed MCP failed to start, check /tmp/pubmearch_mcp.log"
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
