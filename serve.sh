#!/bin/sh
# 启动本机演示站点（127.0.0.1:8090）
cd "$(dirname "$0")/dist" || exit 1
exec python3 -m http.server 8090 --bind 127.0.0.1
