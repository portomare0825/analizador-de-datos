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
const destSidebarBmp = path.join(destDir, 'installerSidebar.bmp');
const destHeaderBmp = path.join(destDir, 'installerHeader.bmp');

// Helper to write a 32-bit BMP file from raw RGBA buffer
function writeBmp(buffer, width, height, destPath) {
  const fileHeaderSize = 14;
  const dibHeaderSize = 40;
  const imageSize = width * height * 4;
  const fileSize = fileHeaderSize + dibHeaderSize + imageSize;

  const bmpBuffer = Buffer.alloc(fileSize);

  // File Header
  bmpBuffer.write('BM', 0); // Signature
  bmpBuffer.writeUInt32LE(fileSize, 2); // File Size
  bmpBuffer.writeUInt32LE(0, 6); // Reserved
  bmpBuffer.writeUInt32LE(fileHeaderSize + dibHeaderSize, 10); // Offset to pixel data

  // DIB Header (BITMAPINFOHEADER)
  bmpBuffer.writeUInt32LE(dibHeaderSize, 14); // Header size
  bmpBuffer.writeInt32LE(width, 18); // Width
  bmpBuffer.writeInt32LE(-height, 22); // Height (negative for top-to-bottom)
  bmpBuffer.writeUInt16LE(1, 26); // Planes
  bmpBuffer.writeUInt16LE(32, 28); // Bits per pixel (32-bit for BGRA)
  bmpBuffer.writeUInt32LE(0, 30); // Compression (0 = BI_RGB)
  bmpBuffer.writeUInt32LE(imageSize, 34); // Image size
  bmpBuffer.writeInt32LE(2835, 38); // X pixels per meter
  bmpBuffer.writeInt32LE(2835, 42); // Y pixels per meter
  bmpBuffer.writeUInt32LE(0, 46); // Colors in color table
  bmpBuffer.writeUInt32LE(0, 50); // Important colors

  // Pixel Data: Convert RGBA to BGRA
  let pos = fileHeaderSize + dibHeaderSize;
  for (let i = 0; i < buffer.length; i += 4) {
    const r = buffer[i];
    const g = buffer[i + 1];
    const b = buffer[i + 2];
    const a = buffer[i + 3];

    bmpBuffer[pos] = b;     // Blue
    bmpBuffer[pos + 1] = g; // Green
    bmpBuffer[pos + 2] = r; // Red
    bmpBuffer[pos + 3] = a; // Alpha
    pos += 4;
  }

  fs.writeFileSync(destPath, bmpBuffer);
}

app.whenReady().then(async () => {
  try {
    console.log('Loading app icon source image...');
    const img = nativeImage.createFromPath(srcImg);
    if (img.isEmpty()) {
      throw new Error('Image is empty or could not be loaded by Electron.');
    }

    const size = img.getSize();
    console.log(`App icon loaded: ${size.width}x${size.height}`);
    
    console.log('Keying out white background to create true transparency...');
    const buffer = img.toBitmap();
    
    for (let i = 0; i < buffer.length; i += 4) {
      const r = buffer[i];
      const g = buffer[i + 1];
      const b = buffer[i + 2];
      
      if (r > 245 && g > 245 && b > 245) {
        buffer[i + 3] = 0;
      } else if (r > 220 && g > 220 && b > 220) {
        const minVal = Math.min(r, g, b);
        const factor = (245 - minVal) / (245 - 220);
        buffer[i + 3] = Math.round(factor * buffer[i + 3]);
      }
    }
    
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
    console.log('Icon successfully converted to icon.ico!');

    // Convert sidebar and header PNGs to BMPs for NSIS compatibility
    console.log('Converting installer sidebar to BMP...');
    const sidebarImg = nativeImage.createFromPath(sidebarSrc);
    if (!sidebarImg.isEmpty()) {
      const sbSize = sidebarImg.getSize();
      writeBmp(sidebarImg.toBitmap(), sbSize.width, sbSize.height, destSidebarBmp);
      console.log('Installer sidebar BMP successfully created.');
    } else {
      console.error('Warning: Sidebar source image is empty.');
    }

    console.log('Converting installer header to BMP...');
    const headerImg = nativeImage.createFromPath(headerSrc);
    if (!headerImg.isEmpty()) {
      const hSize = headerImg.getSize();
      writeBmp(headerImg.toBitmap(), hSize.width, hSize.height, destHeaderBmp);
      console.log('Installer header BMP successfully created.');
    } else {
      console.error('Warning: Header source image is empty.');
    }
    
    app.exit(0);
  } catch (err) {
    console.error('Error during icon conversion:', err);
    app.exit(1);
  }
});
