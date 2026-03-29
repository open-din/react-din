import { app, BrowserWindow } from 'electron';
import { join, resolve } from 'node:path';

function createWindow() {
    const preloadPath = join(__dirname, 'preload.js');
    const window = new BrowserWindow({
        width: 1540,
        height: 980,
        minWidth: 1120,
        minHeight: 720,
        backgroundColor: '#080912',
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    const devUrl = process.env.DIN_EDITOR_APP_DEV_URL?.trim();
    if (!app.isPackaged && devUrl) {
        void window.loadURL(devUrl);
        return;
    }

    void window.loadFile(resolve(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
