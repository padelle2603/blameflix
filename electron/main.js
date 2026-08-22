const { app, BrowserWindow, dialog, ipcMain, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function getWebRoot() {
    // In packaged app (AppImage), resources are at process.resourcesPath/app/
    // In development, they're at __dirname/../www/
    const packaged = path.join(process.resourcesPath, 'app', 'www', 'index.html');
    if (fs.existsSync(packaged)) return packaged;
    const dev = path.join(__dirname, '..', 'www', 'index.html');
    if (fs.existsSync(dev)) return dev;
    // Fallback for other packaging scenarios
    const fallback = path.join(process.resourcesPath, 'www', 'index.html');
    return fallback;
}

function getAppIcon() {
    const packaged = path.join(process.resourcesPath, 'app', 'icon.png');
    if (fs.existsSync(packaged)) return packaged;
    const dev = path.join(__dirname, '..', 'assets', 'icon.png');
    if (fs.existsSync(dev)) return dev;
    const fallback = path.join(process.resourcesPath, 'icon.png');
    return fallback;
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 480,
        minHeight: 640,
        backgroundColor: '#141210',
        autoHideMenuBar: true,
        title: 'BlameFlix',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile(getWebRoot());
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('save-backup', async (event, { defaultName, content, lang }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const isEn = lang === 'en';
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: isEn ? 'Save BlameFlix backup' : 'Salva backup BlameFlix',
        defaultPath: defaultName,
        filters: [{ name: isEn ? 'BlameFlix backup' : 'Backup BlameFlix', extensions: ['json'] }]
    });
    if (canceled || !filePath) return false;
    await fs.promises.writeFile(filePath, content, 'utf8');
    return true;
});

ipcMain.handle('notify', (event, { title, body }) => {
    if (!Notification.isSupported()) return false;
    const win = BrowserWindow.fromWebContents(event.sender);
    const n = new Notification({
        title,
        body,
        icon: getAppIcon(),
        silent: false
    });
    n.on('click', () => {
        if (win && !win.isDestroyed()) {
            win.show();
            win.focus();
        }
    });
    n.show();
    return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
