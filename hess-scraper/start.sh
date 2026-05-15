#!/bin/bash
# Hess Hippo eSchool 啟動腳本

cd "$(dirname "$0")"

echo "🚀 啟動 Hess Hippo eSchool 爬蟲工具..."
echo "   開啟瀏覽器：http://localhost:8001"
echo "   按 Ctrl+C 停止"
echo ""

.venv/bin/python main.py
