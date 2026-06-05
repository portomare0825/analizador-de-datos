import { app, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.whenReady().then(() => {
  try {
    const pngPath = path.join(__dirname, 'public/icons/icon.png');
    console.log('Loading PNG from:', pngPath);
    const img = nativeImage.createFromPath(pngPath);
    if (img.isEmpty()) {
      console.error('Failed to load PNG.');
      app.exit(1);
    }
    
    const size = img.getSize();
    const buffer = img.toBitmap();
    console.log(`Dimensions: ${size.width}x${size.height}`);
    
    // Inspect the first 5 pixels (top-left corner)
    console.log('Top-left corner pixel values (RGBA):');
    for (let i = 0; i < 5; i++) {
      const idx = i * 4;
      console.log(`Pixel ${i}: R=${buffer[idx]}, G=${buffer[idx+1]}, B=${buffer[idx+2]}, A=${buffer[idx+3]}`);
    }
    
    app.exit(0);
  } catch (err) {
    console.error(err);
    app.exit(1);
  }
});
