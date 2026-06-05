import { app, nativeImage } from 'electron';

app.whenReady().then(() => {
  try {
    const srcImg = 'C:\\Users\\adm-09\\.gemini\\antigravity-ide\\brain\\9063f215-4ead-43e3-8f7d-1a570507e9c5\\app_icon_shield_large_1780663828355.png';
    console.log('Loading source image:', srcImg);
    const img = nativeImage.createFromPath(srcImg);
    if (img.isEmpty()) {
      console.error('Failed to load source image.');
      app.exit(1);
    }
    
    const size = img.getSize();
    const buffer = img.toBitmap();
    console.log(`Dimensions: ${size.width}x${size.height}`);
    
    // Inspect the first 5 pixels (top-left corner)
    console.log('Top-left corner pixel values of source image (RGBA):');
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
