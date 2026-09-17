const express = require('express');
const https = require('https');
const { getSSLCertificate } = require('./ssl-generator');

const app = express();
app.get('/test', (req, res) => res.json({ ok: true }));

const { cert, key, localIP } = getSSLCertificate();

const server = https.createServer({ key, cert }, app);

server.listen(3444, () => {
  console.log('HTTPS Server listening on 3444 with node-forge SSL');
  
  const options = {
    hostname: 'localhost',
    port: 3444,
    path: '/test',
    method: 'GET',
    rejectUnauthorized: false
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('HTTPS Test SUCCESS! Response:', JSON.parse(body));
      server.close();
      process.exit(0);
    });
  });
  
  req.on('error', (err) => {
    console.error('HTTPS Test Error:', err);
    server.close();
    process.exit(1);
  });

  req.end();
});
