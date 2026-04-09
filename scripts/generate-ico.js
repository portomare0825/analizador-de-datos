import pngToIco from 'png-to-ico';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputPath = join(__dirname, '../public/sparkles.png');
const outputPath = join(__dirname, '../public/sparkles.ico');

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
