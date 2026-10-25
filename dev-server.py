"""dev-server.py — 本地开发服务器(总纲 §6 自测用)
在 python -m http.server 基础上给全部响应加 Cache-Control: no-store,
避免浏览器启发式缓存吞掉刚改过的模块(本次 P1 调试踩坑)。
用法:py dev-server.py [port]  (默认 8000)
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoStoreHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    ThreadingHTTPServer(('127.0.0.1', port), NoStoreHandler).serve_forever()
