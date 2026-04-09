const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../public/sparkles.png');
const outputPath = path.join(__dirname, '../public/sparkles.ico');

async function convert() {
  try {
    console.log('🔄 Convirtiendo sparkles.png a sparkles.ico...');
    const buf = await pngToIco(inputPath);
    fs.writeFileSync(outputPath, buf);
    console.log('✅ Icono generado con éxito en public/sparkles.ico');
  } catch (err) {
    console.error('❌ Error al convertir el icono:', err.message);
    process.exit(1);
  }
}

convert();
