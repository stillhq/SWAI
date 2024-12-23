import { app, BrowserWindow, session, ipcMain } from 'electron';
import { WebApp } from './WebApp';
import { wildcardMatch, openUrl } from './swai_utils';
import * as path from 'path';
import * as fs from "fs";
// /import contextMenu from "electron-context-menu";

let mainWindow: BrowserWindow | null = null;

// Creates the browser window
function createWindow(webapp: WebApp) {
    let webAppSession: Electron.Session;
    if (webapp.ecosystem != null) {
        webAppSession = session.fromPartition(`persist:${webapp.ecosystem}`);
    } else {
        webAppSession = session.fromPartition(`persist:${webapp.app_id}`);
    }

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        title: "SWAI Powered Web App",
        backgroundColor: '#FFFFFF',
        frame: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            session: webAppSession,
        },
    });

    mainWindow.loadURL(webapp.main_url);
    mainWindow.removeMenu();

    mainWindow.webContents.on("dom-ready", () => {
        console.log("finished loading")
        const cssPath = path.join(__dirname, 'system_theme.css');
        fs.readFile(cssPath, 'utf-8', (err, data) => {
            if (err) {
                console.error('Failed to read CSS file:', err);
                return;
            }
            if (mainWindow) {
                mainWindow.webContents.insertCSS(data).catch((error) => {
                    console.error('Failed to inject CSS:', error);
                });
            }
        });
    });

    mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
        for (let allowed_url of webapp.allowed_urls) {
            if (mainWindow && wildcardMatch(navigationUrl, allowed_url)) {
                return;
            }
        }
        event.preventDefault();
        openUrl(navigationUrl);
    });

    // Keyboard Shortcuts
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.control) {
            if (input.key === 'I' && input.control && input.shift) {  // Allow inspect element with CTRL+SHIFT+I
                mainWindow?.webContents.toggleDevTools();
                event.preventDefault();
            }
            if (input.key === '+') {  // Zoom in key
                mainWindow?.webContents.setZoomFactor(mainWindow?.webContents.getZoomFactor() + 0.1);
                event.preventDefault();
            } else if (input.key === '-') {
                mainWindow?.webContents.setZoomFactor(mainWindow?.webContents.getZoomFactor() - 0.1);
                event.preventDefault();
            } else if (input.key === '0') {
                mainWindow?.webContents.setZoomFactor(1.0);
                event.preventDefault();
            }
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Add context menu
    async function setupContextMenu(): Promise<void>  {
        const contextMenu = await import('electron-context-menu');
        contextMenu.default({
            prepend: (defaultActions: any, parameters: any, browserWindow: any) => [
                {
                    label: "Back",
                    visible: browserWindow.webContents.navigationHistory.canGoBack(),
                    click: () => browserWindow.webContents.goBack()
                },
                {
                    label: "Forward",
                    visible: browserWindow.webContents.navigationHistory.canGoForward(),
                    click: () => browserWindow.webContents.goForward()
                },
                {
                    label: "Reload",
                    click: () => browserWindow.webContents.reload()
                },
                { type: 'separator' }
            ],
            showInspectElement: false,
        });
    }
    setupContextMenu();
}

// New Window

app.on('window-all-closed', () => {
    app.quit();
});

app.on('ready', () => {
    try {
        const filePath = process.argv[2];
        if (!filePath) {
            console.error("No file path provided");
            app.quit();
        }
        if (!fs.existsSync(filePath)) {
            console.error(`File doesn't exist: ${filePath}`);
            app.quit();
        }
        const webapp = WebApp.from_yaml_file(filePath);
        app.setAppUserModelId(webapp.app_id);

        if (mainWindow === null) {
            createWindow(webapp);
        }
    }
    catch (e) {
        console.error(e);
        app.quit();
    }
});