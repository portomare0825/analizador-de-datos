const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const exePath = path.join(__dirname, 'release/win-unpacked/Auditoría de Ingresos.exe');
console.log('Ejecutando:', exePath);

const child = execFile(exePath, [], (error, stdout, stderr) => {
  let log = '';
  if (error) {
    log += `ERROR DE EJECUCIÓN:\n${error.stack || error}\n\n`;
  }
  log += `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n`;
  
  fs.writeFileSync(path.join(__dirname, 'debug_output.txt'), log, 'utf8');
  console.log('Salida guardada en debug_output.txt');
});

// Forzar salida tras 5 segundos si el proceso sigue vivo
setTimeout(() => {
  console.log('Finalizando proceso de depuración...');
  child.kill();
  process.exit(0);
}, 5000);
