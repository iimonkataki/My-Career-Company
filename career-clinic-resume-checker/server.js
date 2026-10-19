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

      // Automated Access Invitation Email Dispatch API endpoint
      if (req.method === 'POST' && (pathname === '/api/send-access-email' || pathname === '/ResumeFitScore/api/send-access-email')) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const recipient = Array.isArray(data.to) ? data.to.join(', ') : (data.to || data.recipientEmail || '');
            console.log(`\n======================================================`);
            console.log(`  [AUTOMATED EMAIL DISPATCH] support@mycareercompany.com`);
            console.log(`  To: ${recipient}`);
            console.log(`  From: ${data.from || 'support@mycareercompany.com'}`);
            console.log(`  Subject: ${data.message ? data.message.subject : 'Access Granted'}`);
            console.log(`  Dispatched: ${new Date().toISOString()}`);
            console.log(`======================================================\n`);

            // Also forward to Google Apps Script Webhook to trigger actual Google Workspace email dispatch
            try {
              const https = require('https');
              const webhookUrl = "https://script.google.com/macros/s/AKfycbxH9SO8xJ7jym99FZwHL9WkB2j1KDWbzppSrlCzD9UOqAEYxgS-aWiY-DF2dud7sG1k/exec";
              const postData = JSON.stringify({
                action: "sendAccessInvitation",
                type: "access_invitation",
                to: recipient,
                recipientEmail: recipient,
                email: recipient,
                name: (data.metadata && data.metadata.recipientName) || data.name || '',
                institution: (data.metadata && data.metadata.institution) || data.institution || '',
                subject: (data.message && data.message.subject) || '',
                text: (data.message && data.message.text) || '',
                html: (data.message && data.message.html) || '',
                portalUrl: (data.metadata && data.metadata.portalUrl) || 'https://www.mycareercompany.com/ResumeFitScore',
                submittedAt: new Date().toISOString()
              });

              const webhookReq = https.request(webhookUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'text/plain;charset=utf-8',
                  'Content-Length': Buffer.byteLength(postData)
                }
              }, (hookRes) => {
                console.log(`[Server] Webhook forwarded, response code: ${hookRes.statusCode}`);
              });
              webhookReq.on('error', (err) => {
                console.warn('[Server] Webhook forward error:', err.message);
              });
              webhookReq.write(postData);
              webhookReq.end();
            } catch (fwdErr) {
              console.warn('[Server] Forwarding notice:', fwdErr.message);
            }

            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ success: true, messageId: 'msg_' + Date.now(), dispatchedFrom: 'support@mycareercompany.com' }));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
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
