const fs = require('fs');
const https = require('https');
const path = require('path');

const fontsDir = path.join(__dirname, 'public', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Handle redirect
        https.get(response.headers.location, (res) => {
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        });
      } else {
         response.pipe(file);
         file.on('finish', () => { file.close(); resolve(); });
      }
    }).on('error', (err) => {
      fs.unlink(dest);
      reject(err);
    });
  });
}

async function main() {
  console.log("Downloading Noto Sans...");
  await download('https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans-Regular.ttf', path.join(fontsDir, 'NotoSans-Regular.ttf'));
  
  console.log("Downloading Noto Sans Devanagari...");
  await download('https://github.com/google/fonts/raw/main/ofl/notosansdevanagari/NotoSansDevanagari-Regular.ttf', path.join(fontsDir, 'NotoSansDevanagari-Regular.ttf'));
  
  console.log("Fonts downloaded successfully.");
}

main();
