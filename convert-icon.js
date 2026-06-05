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

// Helper to write a 24-bit BMP file from raw RGBA buffer (bottom-to-top format for Win32 compatibility)
function writeBmp(buffer, width, height, destPath) {
  const fileHeaderSize = 14;
  const dibHeaderSize = 40;
  
  // Row size must be padded to a multiple of 4 bytes
  const rowSize = Math.floor((width * 3 + 3) / 4) * 4;
  const imageSize = rowSize * height;
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
  bmpBuffer.writeInt32LE(height, 22); // Height (positive for bottom-to-top)
  bmpBuffer.writeUInt16LE(1, 26); // Planes
  bmpBuffer.writeUInt16LE(24, 28); // Bits per pixel (24-bit RGB)
  bmpBuffer.writeUInt32LE(0, 30); // Compression (0 = BI_RGB)
  bmpBuffer.writeUInt32LE(imageSize, 34); // Image size
  bmpBuffer.writeInt32LE(2835, 38); // X pixels per meter
  bmpBuffer.writeInt32LE(2835, 42); // Y pixels per meter
  bmpBuffer.writeUInt32LE(0, 46); // Colors in color table
  bmpBuffer.writeUInt32LE(0, 50); // Important colors

  // Pixel Data: Convert RGBA (top-to-bottom) to BGR (bottom-to-top)
  let pos = fileHeaderSize + dibHeaderSize;
  
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowStart + (x * 4);
      const r = buffer[idx];
      const g = buffer[idx + 1];
      const b = buffer[idx + 2];
      
      bmpBuffer[pos] = b;     // Blue
      bmpBuffer[pos + 1] = g; // Green
      bmpBuffer[pos + 2] = r; // Red
      pos += 3;
    }
    
    // Padding
    const bytesWritten = width * 3;
    const paddingNeeded = rowSize - bytesWritten;
    for (let p = 0; p < paddingNeeded; p++) {
      bmpBuffer[pos] = 0;
      pos++;
    }
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

    // Convert sidebar and header PNGs to BMPs for NSIS compatibility with exact standard dimensions
    console.log('Resizing and converting installer sidebar to BMP (164x314)...');
    const sidebarImg = nativeImage.createFromPath(sidebarSrc);
    if (!sidebarImg.isEmpty()) {
      const resizedSidebar = sidebarImg.resize({ width: 164, height: 314, quality: 'better' });
      writeBmp(resizedSidebar.toBitmap(), 164, 314, destSidebarBmp);
      console.log('Installer sidebar BMP successfully created.');
    } else {
      console.error('Warning: Sidebar source image is empty.');
    }

    console.log('Resizing and converting installer header to BMP (150x57)...');
    const headerImg = nativeImage.createFromPath(headerSrc);
    if (!headerImg.isEmpty()) {
      const resizedHeader = headerImg.resize({ width: 150, height: 57, quality: 'better' });
      const headerBuffer = resizedHeader.toBitmap();
      
      // Swap background from dark green/black (brightness < 60) to solid white
      // so it blends seamlessly with the white title bar of the NSIS installer
      for (let i = 0; i < headerBuffer.length; i += 4) {
        const r = headerBuffer[i];
        const g = headerBuffer[i + 1];
        const b = headerBuffer[i + 2];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        
        if (brightness < 60) {
          headerBuffer[i] = 255;     // Red
          headerBuffer[i + 1] = 255; // Green
          headerBuffer[i + 2] = 255; // Blue
        }
      }
      
      writeBmp(headerBuffer, 150, 57, destHeaderBmp);
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
