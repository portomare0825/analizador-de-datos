import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pngToIco from 'png-to-ico';
import { app, nativeImage } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcImg = 'C:\\Users\\adm-09\\.gemini\\antigravity-ide\\brain\\9063f215-4ead-43e3-8f7d-1a570507e9c5\\app_icon_shield_large_1780663828355.png';
const sidebarSrc = 'C:\\Users\\adm-09\\.gemini\\antigravity-ide\\brain\\9063f215-4ead-43e3-8f7d-1a570507e9c5\\installer_sidebar_1780675304912.png';
const headerSrc = 'C:\\Users\\adm-09\\.gemini\\antigravity-ide\\brain\\9063f215-4ead-43e3-8f7d-1a570507e9c5\\installer_header_1780675320413.png';
const destDir = path.join(__dirname, 'public/icons');
const destPng = path.join(destDir, 'icon.png');
const destIco = path.join(destDir, 'icon.ico');
const destSidebar = path.join(destDir, 'installerSidebar.png');
const destHeader = path.join(destDir, 'installerHeader.png');

app.whenReady().then(async () => {
  try {
    console.log('Loading black-background source image...');
    const img = nativeImage.createFromPath(srcImg);
    if (img.isEmpty()) {
      throw new Error('Image is empty or could not be loaded by Electron.');
    }

    const size = img.getSize();
    console.log(`Image loaded successfully: ${size.width}x${size.height}`);
    
    console.log('Keying out white background to create true transparency...');
    const buffer = img.toBitmap(); // Get raw RGBA buffer
    
    for (let i = 0; i < buffer.length; i += 4) {
      const r = buffer[i];
      const g = buffer[i + 1];
      const b = buffer[i + 2];
      
      // Calculate how close the pixel is to white (255, 255, 255)
      if (r > 245 && g > 245 && b > 245) {
        // Make completely transparent
        buffer[i + 3] = 0;
      } else if (r > 220 && g > 220 && b > 220) {
        // Smooth transition/anti-aliasing at the edges to prevent white halos
        const minVal = Math.min(r, g, b);
        const factor = (245 - minVal) / (245 - 220);
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

    console.log('Copying installer sidebar and header assets...');
    fs.copyFileSync(sidebarSrc, destSidebar);
    fs.copyFileSync(headerSrc, destHeader);
    console.log('Installer assets successfully copied.');

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
