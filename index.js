const { app, BrowserWindow, WebContentsView, BaseWindow, session, ipcMain, protocol, net } = require('electron');
const WebApp = require('./WebApp');
const { wildCardMatch, openUrlInBrowser, wildCardMatchList } = require('./swai_utils');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let mainWebContents = null;

function createWindow(webapp) {
    let external_signing_in = false;
    let webAppSession = null;
    if (webapp.ecosystem != null) {
        webAppSession = session.fromPartition(`persist:${webapp.ecosystem}`);
        console.log(`Using session: persist:${webapp.ecosystem}`);
    } else {
        webAppSession = session.fromPartition(`persist:${webapp.app_id}`);
        console.log(`Using session: persist:${webapp.app_id}`);
    }

    mainWindow = new BaseWindow({
        width: 1200, height: 900,
        title: "SWAI Powered Web App",
        frame: false
    });

    let json_webapp = JSON.stringify(webapp);
    let titlebar = new WebContentsView (
        {
            // preload: path.join(__dirname, 'titlebar-preload.js'),
            webPreferences: {
                contextIsolation: false,
                nodeIntegration: true,
            },
            additionalArguments: [
                `webapp=${json_webapp}`
            ],
        }
    )

    let mainWebContents = new WebContentsView (
        {
            nodeIntegration: false,
            contextIsolation: false,
            webPreferences: {
                session: webAppSession
            }
        },
    );
    titlebar.webContents.loadURL(`file://${path.join(__dirname, 'titlebar.html')}`);
    mainWindow.removeMenu();
    mainWindow.contentView.addChildView(titlebar);
    mainWindow.contentView.addChildView(mainWebContents);
    mainWebContents.webContents.loadURL(webapp.main_url);

    function updateBounds() {
        const { width, height } = mainWindow.getBounds();
        // Set to 300 to see dev tools. Change 300 to 36 for regular
        titlebar.setBounds({ x: 0, y: 0, width, height: 36 });
        mainWebContents.setBounds({ x: 0, y: 36, width, height: height - 36 });
    }
    updateBounds();

    mainWindow.on('resize', updateBounds);

    mainWebContents.webContents.on("dom-ready", () => {
        console.log("dom ready");

        // Renderer injection
        if (mainWindow) {
            const rendererCode = fs.readFileSync(
                path.join(__dirname, 'renderer.js'),
                'utf8'
            );
            mainWebContents.webContents.executeJavaScript(rendererCode)
                .catch(error => console.error('Failed to inject renderer:', error));
        }

        const cssPath = path.join(__dirname, 'system_theme.css');
        fs.readFile(cssPath, 'utf-8', (err, data) => {
            if (err) {
                console.error('Failed to read CSS file:', err);
                return;
            }
            if (mainWindow) {
                mainWebContents.webContents.insertCSS(data).catch((error) => {
                    console.error('Failed to inject CSS:', error);
                });
            }
        });

        mainWebContents.webContents.setWindowOpenHandler((details) => {
            console.log("Attempted new window");
            if (!get_navigation_allowed(mainWebContents.webContents.getURL(), details.url)) {
                openUrlInBrowser(details.url);
                return { action: "deny" };
            }
            if (!webapp.allow_multi_window) {
                createTransientWindow(details.url, webAppSession, mainWindow);
                return { action: "deny" };
            }
            if (wildCardMatchList(details.url, webapp.allowed_urls)) {
                let new_window_app = webapp.clone();
                new_window_app.main_url = details.url;
                createWindow(new_window_app);
                return { action: "deny" };
            } else {
                createTransientWindow(details.url, webAppSession, mainWindow);
                return { action: "deny" };
            }
            return { action: "allow" };
        });

        mainWebContents.webContents.on("will-navigate", (event, navigationUrl) => {
            if (!get_navigation_allowed(mainWebContents.webContents.getURL(), navigationUrl)) {
                event.preventDefault();
                openUrlInBrowser(navigationUrl);
            }
        });

        mainWebContents.webContents.on("did-navigate", (event, navigationUrl) => {
            mainWindow.title = mainWebContents.webContents.getTitle();
            titlebar.webContents.send(
                "url-changed", mainWebContents.webContents.getTitle(),
                mainWebContents.webContents.navigationHistory.canGoBack(),
                mainWebContents.webContents.navigationHistory.canGoForward()
            );
        });
        mainWebContents.webContents.on("did-navigate-in-page", (event, navigationUrl) => {
            mainWindow.title = mainWebContents.webContents.getTitle();
            titlebar.webContents.send(
                "url_changed", mainWebContents.webContents.getTitle(),
                mainWebContents.webContents.navigationHistory.canGoBack(),
                mainWebContents.webContents.navigationHistory.canGoForward()
            );
        });
        mainWebContents.webContents.on("page-title-updated", (event, title) => {
            mainWindow.title = mainWebContents.webContents.getTitle();
            titlebar.webContents.send(
                "url_changed", mainWebContents.webContents.getTitle(),
                mainWebContents.webContents.navigationHistory.canGoBack(),
                mainWebContents.webContents.navigationHistory.canGoForward()
            );
        });

        // Keyboard Shortcuts
        mainWebContents.webContents.on('before-input-event', (event, input) => {
            if (input.control) {
                if (input.key === 'I' && input.control && input.shift) {  // Allow inspect element with CTRL+SHIFT+I
                    mainWebContents.webContents.toggleDevTools();
                    event.preventDefault();
                } else if (input.key === '+') {  // Zoom in key
                    mainWebContents.webContents.setZoomFactor(mainWebContents.webContents.getZoomFactor() + 0.1);
                    event.preventDefault();
                } else if (input.key === '-') {  // Zoom out key
                    mainWebContents.webContents.setZoomFactor(mainWebContents.webContents.getZoomFactor() - 0.1);
                    event.preventDefault();
                } else if (input.key === '0') {  // Reset zoom key
                    mainWebContents.webContents.setZoomFactor(1.0);
                    event.preventDefault();
                } else if (input.key == "r") {
                    mainWebContents.webContents.reload();
                    event.preventDefault();
                }
            }
        });

        mainWebContents.on('closed', () => {
            mainWindow = null;
        });
    });

    ipcMain.on('back', () => {
        if (mainWindow) {
            mainWebContents.webContents.navigationHistory.goBack();
        }
    });

    ipcMain.on('forward', () => {
        if (mainWindow) {
            mainWebContents.webContents.navigationHistory.goForward();
        }
    });

    ipcMain.on('close', () => {
        if (mainWindow) {
            mainWindow.close();
        }
    });
    ipcMain.on('minimize', () => {
        if (mainWindow) {
            mainWindow.minimize();
        }
    });
    ipcMain.on('maximize', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
    });

    (async () => {
        const contextMenu = await import('electron-context-menu');
        const dispose = contextMenu.default({
            window: mainWebContents.webContents,
            showInspectElement: false
        });
    })();

    function get_navigation_allowed(currentUrl, navigationUrl) {
        // Allows login urls to open external links
        if (wildCardMatchList(currentUrl, webapp.login_urls)) {
            console.log("Bypassed Browser Window1");
            return true;
        }
        // Allow non-allowed urls to open non-allowed urls to prevent external logins breaking things
        if (!wildCardMatchList(currentUrl, webapp.allowed_urls)){
            console.log("Bypassed Browser Window2");
            return true;
        }
        // Allow allowed URLs
        if (wildCardMatchList(navigationUrl, webapp.allowed_urls)) {
            return true;
        }
        return false;
    }
}

function createTransientWindow(url, session, parent) {
    let transientWindow = new BrowserWindow({
        width: 800, height: 600,
        parent: parent,
        modal: true,
        title: "SWAI Web App",
        webPreferences: {
            session: session
        }
    });
    transientWindow.loadURL(url);
    transientWindow.once('ready-to-show', () => {
        transientWindow.show();
    });
    transientWindow.on('closed', () => {
        transientWindow = null;
    });
    transientWindow.removeMenu();
}

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
        app.commandLine.appendSwitch('ozone-platform-hint', "auto");
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
