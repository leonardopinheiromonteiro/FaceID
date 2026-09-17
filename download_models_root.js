const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

function downloadFile(file) {
  return new Promise((resolve) => {
    const filePath = path.join(modelsDir, file);
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100) {
      console.log(`[EXISTE] ${file}`);
      return resolve();
    }

    const fileStream = fs.createWriteStream(filePath);
    console.log(`[BAIXANDO] ${file}...`);
    
    https.get(baseUrl + file, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, (redirectRes) => {
          redirectRes.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            console.log(`[CONCLUÍDO] ${file}`);
            resolve();
          });
        });
        return;
      }

      if (res.statusCode !== 200) {
        console.error(`Falha no download de ${file}: Status ${res.statusCode}`);
        return resolve();
      }

      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`[CONCLUÍDO] ${file}`);
        resolve();
      });
    }).on('error', (err) => {
      console.error(`Erro ao baixar ${file}:`, err.message);
      resolve();
    });
  });
}

async function run() {
  for (const file of files) {
    await downloadFile(file);
  }
  console.log('Download dos modelos para public/models concluído com sucesso!');
}

run();
