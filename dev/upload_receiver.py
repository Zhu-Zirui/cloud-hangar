# -*- coding: utf-8 -*-
"""临时上传接收器(P13 LOGO 栅格化通道)
GET  /       → 自动页:读 TMP_atr.svg 内嵌 → canvas 栅格化 → POST /upload(全同源)
POST /upload → <base64> 写入 OUT
"""
import base64, sys, os
from http.server import BaseHTTPRequestHandler, HTTPServer

OUT = sys.argv[2] if len(sys.argv) > 2 else 'assets/logos/oem-atr.png'
SVG_PATH = 'TMP_atr.svg'
W, H = 600, 271

PAGE = '''<!doctype html><meta charset="utf-8"><body>
<script>
(async function () {
  try {
    var svg = '__SVG__';
    var img = new Image();
    await new Promise(function (ok, bad) {
      img.onload = ok; img.onerror = function () { bad(new Error('svg load fail')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    var cv = document.createElement('canvas');
    cv.width = __W__; cv.height = __H__;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    var r = Math.min(cv.width * 0.92 / img.width, cv.height * 0.92 / img.height);
    ctx.drawImage(img, (cv.width - img.width * r) / 2, (cv.height - img.height * r) / 2, img.width * r, img.height * r);
    var b64 = cv.toDataURL('image/png').split(',')[1];
    await fetch('/upload', { method: 'POST', body: b64 });
    document.body.textContent = 'DONE ' + b64.length;
  } catch (e) { document.body.textContent = 'ERR ' + e.message; }
})();
</script></body>'''

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/svg.txt':
            body = open(SVG_PATH, 'rb').read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        svg = open(SVG_PATH, encoding='utf-8').read().replace("'", "\\'")
        html = PAGE.replace('__SVG__', svg).replace('__W__', str(W)).replace('__H__', str(H))
        body = html.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        data = self.rfile.read(n)
        with open(OUT, 'wb') as f:
            f.write(base64.b64decode(data))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')
        print('saved', OUT, len(data), 'chars', flush=True)
    def log_message(self, *a):
        pass

if not os.path.exists(SVG_PATH):
    print('缺少', SVG_PATH, flush=True)
    sys.exit(1)
HTTPServer(('127.0.0.1', int(sys.argv[1])), Handler).serve_forever()
