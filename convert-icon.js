import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pngToIco from 'png-to-ico';
import { app, nativeImage } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcImg = 'C:\\Users\\adm-09\\.gemini\\antigravity-ide\\brain\\9063f215-4ead-43e3-8f7d-1a570507e9c5\\app_icon_shield_large_1780663828355.png';
const destDir = path.join(__dirname, 'public/icons');
const destPng = path.join(destDir, 'icon.png');
const destIco = path.join(destDir, 'icon.ico');

app.whenReady().then(async () => {
  try {
    console.log('Loading black-background source image...');
    const img = nativeImage.createFromPath(srcImg);
    if (img.isEmpty()) {
      throw new Error('Image is empty or could not be loaded by Electron.');
    }

    const size = img.getSize();
    console.log(`Image loaded successfully: ${size.width}x${size.height}`);
    
    console.log('Keying out black background to create true transparency...');
    const buffer = img.toBitmap(); // Get raw RGBA buffer
    
    for (let i = 0; i < buffer.length; i += 4) {
      const r = buffer[i];
      const g = buffer[i + 1];
      const b = buffer[i + 2];
      
      // Calculate perceptual brightness (0 to 255)
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      
      if (brightness < 30) {
        // Pure transparent for very dark background
        buffer[i + 3] = 0;
      } else if (brightness < 70) {
        // Smooth transition/anti-aliasing at the edges to prevent black halos
        const factor = (brightness - 30) / (70 - 30);
        buffer[i + 3] = Math.round(factor * buffer[i + 3]);
      }
    }
    
    // Recreate image from modified transparent buffer
    const transparentImg = nativeImage.createFromBuffer(buffer, {
      width: size.width,
      height: size.height
    });

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    fs.writeFileSync(destPng, transparentImg.toPNG());
    console.log('Sanitized transparent PNG successfully saved.');

    console.log('Converting transparent PNG to ICO...');
    const icoBuffer = await pngToIco(destPng);
    fs.writeFileSync(destIco, icoBuffer);
    console.log('Icon successfully converted to icon.ico with true alpha transparency!');
    
    app.exit(0);
  } catch (err) {
    console.error('Error during icon conversion:', err);
    app.exit(1);
  }
});
