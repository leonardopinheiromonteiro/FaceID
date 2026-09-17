const forge = require('node-forge');
const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function getSSLCertificate() {
  const certPath = path.join(__dirname, 'data', 'cert.pem');
  const keyPath = path.join(__dirname, 'data', 'key.pem');

  // Reuse existing cert if available
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return {
      cert: fs.readFileSync(certPath, 'utf8'),
      key: fs.readFileSync(keyPath, 'utf8'),
      localIP: getLocalIP()
    };
  }

  console.log('[SSL] Gerando novo certificado SSL autoassinado com extensões SAN para desenvolvimento móbile...');
  
  const pkey = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  const localIP = getLocalIP();

  cert.publicKey = pkey.publicKey;
  cert.serialNumber = '01' + Date.now().toString(16);
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);

  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'countryName', value: 'BR' },
    { name: 'organizationName', value: 'FaceID Local Dev' }
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, digitalSignature: true, nonRepudiation: true, keyEncipherment: true, dataEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true, clientAuth: true },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: localIP }
      ]
    }
  ]);

  cert.sign(pkey.privateKey, forge.md.sha256.create());

  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(pkey.privateKey);

  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(certPath, certPem);
  fs.writeFileSync(keyPath, keyPem);

  return { cert: certPem, key: keyPem, localIP };
}

module.exports = { getSSLCertificate, getLocalIP };
