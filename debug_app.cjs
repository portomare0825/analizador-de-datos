const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const exePath = path.join(__dirname, 'release/win-unpacked/Auditoría de Ingresos.exe');
console.log('Ejecutando:', exePath);

let logData = '--- INICIO DIAGNÓSTICO ---\n';

const child = execFile(exePath, [], (error, stdout, stderr) => {
  if (error) {
    logData += `\nERROR DEL PROCESO:\n${error.stack || error}\n`;
  }
  logData += `\nSTDOUT FINAL:\n${stdout}\n\nSTDERR FINAL:\n${stderr}\n`;
  fs.writeFileSync(path.join(__dirname, 'debug_output.txt'), logData, 'utf8');
});

child.stdout.on('data', (data) => {
  logData += `[STDOUT] ${data}\n`;
  fs.writeFileSync(path.join(__dirname, 'debug_output.txt'), logData, 'utf8');
});

child.stderr.on('data', (data) => {
  logData += `[STDERR] ${data}\n`;
  fs.writeFileSync(path.join(__dirname, 'debug_output.txt'), logData, 'utf8');
});

// Guardar al salir
setTimeout(() => {
  console.log('Finalizando proceso de depuración y guardando logs...');
  child.kill();
  
  // Guardar log final acumulado
  fs.writeFileSync(path.join(__dirname, 'debug_output.txt'), logData + '\n--- FIN DIAGNÓSTICO (TIMEOUT) ---', 'utf8');
  console.log('Salida guardada en debug_output.txt');
  
  setTimeout(() => {
    process.exit(0);
  }, 500);
}, 6000);
