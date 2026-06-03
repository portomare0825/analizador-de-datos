import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Deshabilitar aceleración por hardware para evitar fallos de GPU en ciertos entornos
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Estructura de directorios generada
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ └── main.js
// │ │ └── preload.mjs
// │
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC, 'icons/icon-512x512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  // Quitar el menú por defecto para una apariencia más limpia
  win.setMenuBarVisibility(false);

  // Redirigir logs de consola de React al proceso principal para depuración
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE] ${message} (at ${sourceId}:${line})`);
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  createWindow();
  
  // Configurar autoUpdater de forma segura
  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    console.error("Error al verificar actualizaciones:", err);
  }

  autoUpdater.on('error', (err) => {
    console.error("Error en autoUpdater:", err);
  });

  autoUpdater.on('update-available', () => {
    win?.webContents.send('update_available');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    win?.webContents.send('download_progress', progressObj.percent);
  });

  autoUpdater.on('update-downloaded', () => {
    win?.webContents.send('update_downloaded');
  });
});

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});
