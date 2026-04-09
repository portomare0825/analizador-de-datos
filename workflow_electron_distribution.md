# Workflow: Distribución y Actualización Automática de Electron Apps

Este documento describe el flujo completo para automatizar la distribución, compilar instaladores de Windows (.exe) y gestionar actualizaciones automáticas (OTA - Over The Air) para una aplicación Electron + Vite (React) utilizando GitHub Releases.

Puedes utilizar este flujo como referencia o proporcionarlo a Antigravity en futuros proyectos para que realice toda la configuración de forma automática.

## Requisitos Previos
- Repositorio de tu aplicación vinculado a GitHub.
- Aplicación de Electron + Vite funcionando localmente.
- Haber creado un **Personal Access Token (Classic)** en la configuración de desarrollador de tu cuenta de GitHub, con permisos completos sobre `repo`.

---

## Piso 1: Preparación del Entorno.

1. **Vincular el Repositorio de Git:**
   Asegúrate de que la carpeta de tu proyecto es un repositorio de git y sus orígenes apuntan a GitHub.
   ```bash
   git init
   git remote add origin https://github.com/TuUsuario/TuRepositorio.git
   ```

2. **Configurar el `.gitignore`:**
   El archivo `.gitignore` **DEBE** excluir las carpetas generadas al construir la aplicación para evitar subir código basura a GitHub:
   ```text
   node_modules
   dist
   dist-electron
   release
   .env
   ```

---

## Piso 2: Dependencias de Actualización Automática.

Se requiere la instalación del módulo de actualizaciones de Electron.
```bash
npm install electron-updater
```

---

## Piso 3: Configuración del Proceso Principal (main.ts)

En el archivo del proceso principal de Electron (habitualmente `electron/main.ts`), debes configurar el `autoUpdater` para que busque descargas de en segundo plano y notifique a la ventana web.

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

// ... tu código de creación de BrowserWindow ...

app.whenReady().then(() => {
  createWindow();
  
  // Buscar actualizaciones y notificar automáticamente.
  autoUpdater.checkForUpdatesAndNotify();

  // (Opcional) Enviar eventos al frontend para mostrar barra de progreso
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

// Listener para reiniciar e instalar después de descargar
ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});
```

---

## Piso 4: Configuración del `package.json`

El `package.json` es el corazón de la automatización. Deben existir los `scripts` de empaquetado así como la configuración del constructor (`build`).

```json
{
  "name": "nombre-de-tu-app",
  "version": "1.0.0",
  "scripts": {
    "build": "vite build && electron-builder",
    "publish": "vite build && electron-builder --win -p always",
    "push-update": "npm version patch && npm run publish"
  },
  "build": {
    "appId": "com.tunombre.tuapp",
    "productName": "Nombre Comercial App",
    "directories": {
      "output": "release"
    },
    "win": {
      "target": ["nsis"],
      "publish": ["github"]
    },
    "nsis": {
      "oneClick": true,
      "perMachine": false,
      "deleteAppDataOnUninstall": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "publish": {
      "provider": "github",
      "owner": "TuUsuarioGitHub",
      "repo": "TuRepositorio",
      "releaseType": "release" 
    }
  }
}
```
*Nota: Se agregó `"releaseType": "release"` en la sección `publish` para evitar que los releases se marquen como "Draft" (Borrador) y se publiquen de inmediato.*

---

## Piso 5: Distribución (El Comando Mágico)

Para subir cualquier nueva actualización a tus usuarios, sólo debes ejecutar este bloque (asegurando poner tu GH_TOKEN). Este comando automatiza todos los procesos: Eleva la versión un parche (`v1.0.1` -> `v1.0.2`), empaca el instalador `.exe` y lo envía a GitHub Releases.

```powershell
$env:GH_TOKEN="ghp_aquiVaTuTokenDeGitHub"; npm run push-update
```
Y envías el tag de la versión a Git:
```powershell
git push --tags
```

---

## Piso 6: Resolución de Problemas

1. **"Los usuarios no ven la actualización":** Revisar la página de _Releases_ del repo de GitHub. Si la versión dice **Draft**, edítala en GitHub y pulsa **Publish release**. El `latest.yml` debe estar adjunto en los Assets. Para evitar esto automáticamente, usa `"releaseType": "release"` en el package.json.
2. **"Error 404 o Error API GitHub en terminal":** Tu token `GH_TOKEN` no tiene permisos o lo pasaste de manera incorrecta. Verificá que la consola tome la variable de entorno y vuelve a correr `npm run publish`.
3. **Repositorios Privados:** Si tu Repo es Privado, las computadoras de los clientes no podrán leer el archivo `latest.yml` para encontrar la actualización a menos que tengas el sistema de Auth integrado o configures los _Releases_ para acceso público.
