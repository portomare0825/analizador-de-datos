import { app, nativeImage } from 'electron';

app.whenReady().then(() => {
  try {
    const srcImg = 'C:\\Users\\adm-09\\.gemini\\antigravity-ide\\brain\\9063f215-4ead-43e3-8f7d-1a570507e9c5\\installer_sidebar_large_1780684391337.png';
    console.log('Loading sidebar image:', srcImg);
    const img = nativeImage.createFromPath(srcImg);
    if (img.isEmpty()) {
      console.error('Failed to load image.');
      app.exit(1);
    }
    
    const size = img.getSize();
    const buffer = img.toBitmap();
    console.log(`Dimensions: ${size.width}x${size.height}`);
    
    // Inspect some pixels on the left border (x=0, y=0,10,20,30,40)
    console.log('Left edge column (x=0) pixel values (RGBA):');
    for (let y = 0; y < 5; y++) {
      const idx = (y * 10 * size.width) * 4; // y*10 row, x=0
      console.log(`Row ${y*10}: R=${buffer[idx]}, G=${buffer[idx+1]}, B=${buffer[idx+2]}, A=${buffer[idx+3]}`);
    }
    
    // Inspect some pixels in the middle (x=width/2, y=height/2)
    const midIdx = (Math.floor(size.height/2) * size.width + Math.floor(size.width/2)) * 4;
    console.log('Middle pixel:', `R=${buffer[midIdx]}, G=${buffer[midIdx+1]}, B=${buffer[midIdx+2]}`);

    app.exit(0);
  } catch (err) {
    console.error(err);
    app.exit(1);
  }
});
