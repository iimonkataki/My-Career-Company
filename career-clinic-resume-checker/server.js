const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || process.argv[2] || '3000', 10);
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf'
};

function startServer(port) {
  const server = http.createServer((req, res) => {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      let pathname = decodeURIComponent(parsedUrl.pathname);

      // Redirect /ResumeFitScore to /ResumeFitScore/
      if (pathname.toLowerCase() === '/resumefitscore') {
        res.writeHead(301, { 'Location': '/ResumeFitScore/' + (parsedUrl.search || '') });
        res.end();
        return;
      }

      // If accessing root /, redirect to /ResumeFitScore/
      if (pathname === '/') {
        res.writeHead(302, { 'Location': '/ResumeFitScore/' + (parsedUrl.search || '') });
        res.end();
        return;
      }

      // Strip /ResumeFitScore prefix for asset resolution
      let relativePath = pathname;
      if (pathname.toLowerCase().startsWith('/resumefitscore/')) {
        relativePath = pathname.slice('/resumefitscore/'.length);
      }

      if (!relativePath || relativePath === '' || relativePath.endsWith('/')) {
        relativePath = path.join(relativePath, 'index.html');
      }

      let filePath = path.join(BASE_DIR, relativePath);

      // Prevent directory traversal attacks
      const relCheck = path.relative(BASE_DIR, filePath);
      if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
      }

      fs.stat(filePath, (err, stats) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
          return;
        }

        if (stats.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, content) => {
          if (readErr) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('500 Internal Server Error');
            return;
          }

          // Disable aggressive caching for smooth local development
          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          });
          res.end(content);
        });
      });
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Server Error');
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, () => {
    console.log(`\n=================================================`);
    console.log(`  Resume Fit Score™ hosted at:`);
    console.log(`  > http://localhost:${port}/ResumeFitScore`);
    console.log(`  > http://127.0.0.1:${port}/ResumeFitScore`);
    console.log(`=================================================\n`);
  });
}

startServer(PORT);
