const {
    app,
    BrowserWindow,
    WebContentsView,
    BaseWindow,
    session,
    ipcMain,
    nativeImage,
} = require("electron");
const WebApp = require("./WebApp");
const {
    parse_arg,
    openUrlInBrowser,
    wildCardMatchList,
    checkSwaiExtensionRunning,
} = require("./swai_utils");
const path = require("path");
const fs = require("fs");
const Ecosystem = require("./Ecosystem");
const { exec } = require("child_process");
const spawn = require("child_process").spawn;

let windowId = 0;

// Check for the debug mode argument
let debug_mode =
    parse_arg("--debug_mode") != null && parse_arg("--debug_mode") === "true";
let id_to_webapp = {};
const gnome_integration = checkSwaiExtensionRunning();

console.log("GNOME Extension Running: " + gnome_integration);

function openOtherSWAIApp(webapp) {
    // We are using a launcher script in here in order to bypass the fact that
    // there's a weird error when trying to run a new SWAI instance from SWAI itself
    spawn(
        "/bin/python3",
        [
            path.join(__dirname, "./launcher.py"),
            path.join(__dirname, "./index.js"),
            webapp.swai_file_path,
            `--custom_main_url=${webapp.main_url}`,
        ],
        { detached: true }, // Makes the child process independent from the parent
    );
}

function createWindow(webapp) {
    windowId += 1;
    let boundsTimeout = null;
    let webapp_ecosystem = null;

    let webAppSession = session.fromPartition(`${webapp.app_id}-${Date.now()}`);
    // console.log(`Using session: persist:${webapp.app_id}`);
    //
    // // Two webapps cannot use the same session at once due to the IndexedDB lock
    // // so we are going to change this to make a new session everytime but with synced storage.
    // storage_path = path.join(app.getPath("userData"), "storage", webapp.app_id);

    // let webAppSession = null;
    if (webapp.ecosystem != null) {
        // random_id = Math.floor(Math.random() * 1000000);
        // webAppSession = session.fromPartition(`persist:${webapp.ecosystem}`);
        webapp_ecosystem = Ecosystem.new_from_webapp(webapp);
        webapp_ecosystem.map_urls();
    } else {
    }

    let window_data = {
        app_id: webapp.app_id,
        window_num: windowId,
        title: webapp.app_name,
    };

    let thisWindow = new BaseWindow({
        width: 1200,
        height: 900,
        title: webapp.app_name,
        frame: false,
    });

    let titlebar = new WebContentsView({
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            additionalArguments: [
                `--windowId=${windowId}`,
                `--webappName=${webapp.app_name}`,
            ],
        },
    });

    let mainWebContents = new WebContentsView({
        nodeIntegration: false,
        contextIsolation: false,
        // webPreferences: {
        //     session: webAppSession
        // }
    });
    titlebar.webContents.loadURL(
        `file://${path.join(__dirname, "titlebar.html")}`,
    );
    thisWindow.removeMenu();
    thisWindow.contentView.addChildView(titlebar);
    thisWindow.contentView.addChildView(mainWebContents);

    let custom_main_url = parse_arg("--custom_main_url");
    if (custom_main_url) {
        webapp.main_url = custom_main_url;
        if (!wildCardMatchList(custom_main_url, webapp.allowed_urls)) {
            webapp.allowed_urls.push(custom_main_url);
        }
    }

    mainWebContents.webContents.loadURL(webapp.main_url);

    if (debug_mode) {
        titlebar.webContents.openDevTools();
        mainWebContents.webContents.openDevTools();
    }

    function updateBounds() {
        const { width, height } = thisWindow.getBounds();
        let titlebarHeight = debug_mode ? 300 : 36; // Makes the titlebar bigger in debug mode so you can actually see the dev tools
        titlebar.setBounds({ x: 0, y: 0, width, height: titlebarHeight });
        mainWebContents.setBounds({
            x: 0,
            y: titlebarHeight,
            width,
            height: height - titlebarHeight,
        });
    }
    updateBounds();

    thisWindow.on("resize", () => {
        updateBounds();
        if (boundsTimeout) {
            clearTimeout(boundsTimeout);
        }
        boundsTimeout = setTimeout(updateBounds, 1000); // Rerun updateBounds after 1sec to fix side white line
    });

    mainWebContents.webContents.on("dom-ready", () => {
        console.log("dom ready");

        // Renderer injection
        if (thisWindow) {
            const rendererCode = fs.readFileSync(
                path.join(__dirname, "renderer.js"),
                "utf8",
            );
            mainWebContents.webContents
                .executeJavaScript(rendererCode)
                .catch((error) =>
                    console.error("Failed to inject renderer:", error),
                );
        }

        const cssPath = path.join(__dirname, "system_theme.css");
        fs.readFile(cssPath, "utf-8", (err, data) => {
            if (err) {
                console.error("Failed to read CSS file:", err);
                return;
            }
            if (thisWindow) {
                mainWebContents.webContents.insertCSS(data).catch((error) => {
                    console.error("Failed to inject CSS:", error);
                });
            }
        });

        mainWebContents.webContents.setWindowOpenHandler((details) => {
            console.log("Attempted new window");
            if (
                !get_navigation_allowed(
                    mainWebContents.webContents.getURL(),
                    details.url,
                )
            ) {
                openUrlInBrowser(details.url);
                return { action: "deny" };
            }
            if (!webapp.allow_multi_window) {
                createTransientWindow(details.url, webAppSession, thisWindow);
                return { action: "deny" };
            }
            if (wildCardMatchList(details.url, webapp.allowed_urls)) {
                let new_window_app = webapp.clone();
                new_window_app.main_url = details.url;
                createWindow(new_window_app);
                return { action: "deny" };
            } else {
                createTransientWindow(details.url, webAppSession, thisWindow);
                return { action: "deny" };
            }
            return { action: "allow" };
        });

        mainWebContents.webContents.on(
            "will-navigate",
            (event, navigationUrl) => {
                if (
                    !get_navigation_allowed(
                        mainWebContents.webContents.getURL(),
                        navigationUrl,
                    )
                ) {
                    event.preventDefault();
                    openUrlInBrowser(navigationUrl);
                }
            },
        );

        mainWebContents.webContents.on(
            "did-navigate-in-page",
            (event, navigationUrl) => {
                if (webapp.in_page_navigation_redirect) {
                    if (
                        mainWebContents.webContents.navigationHistory.canGoBack()
                    ) {
                        let back_index =
                            mainWebContents.webContents.navigationHistory.getActiveIndex();
                        let back_url =
                            mainWebContents.webContents.navigationHistory.getEntryAtIndex(
                                back_index - 1,
                            ).url;
                        console.log(back_url);

                        if (
                            !(back_url == navigationUrl) &&
                            !(back_url == "about:blank")
                        ) {
                            if (
                                !get_navigation_allowed(back_url, navigationUrl)
                            ) {
                                event.preventDefault();

                                console.log(
                                    get_navigation_allowed(
                                        back_url,
                                        navigationUrl,
                                    ),
                                    navigationUrl,
                                );
                                if (
                                    webapp_ecosystem != null &&
                                    !get_navigation_allowed(
                                        back_url,
                                        navigationUrl,
                                    )
                                ) {
                                    let open_webapp =
                                        webapp_ecosystem.open_url_in_ecosystem(
                                            navigationUrl,
                                        );
                                    if (!open_webapp) {
                                        openUrlInBrowser(navigationUrl);
                                    } else {
                                        console.log(
                                            `Opening ecosystem webapp for ${open_webapp.app_id}`,
                                        );
                                        openOtherSWAIApp(open_webapp);
                                    }
                                    mainWebContents.webContents.navigationHistory.goBack();
                                }
                            }
                        }
                        // if (!get_navigation_allowed(back_url, navigationUrl)) {
                        //     event.preventDefault();
                        //     openUrlInBrowser(navigationUrl);
                        // }
                    }
                }
            },
        );

        mainWebContents.webContents.on(
            "did-navigate",
            (event, navigationUrl) => {
                thisWindow.title = mainWebContents.webContents.getTitle();
                titlebar.webContents.send(
                    `url-changed-${windowId}`,
                    mainWebContents.webContents.getTitle(),
                    mainWebContents.webContents.navigationHistory.canGoBack(),
                    mainWebContents.webContents.navigationHistory.canGoForward(),
                );
            },
        );

        mainWebContents.webContents.on(
            "did-navigate-in-page",
            (event, navigationUrl) => {
                thisWindow.title = mainWebContents.webContents.getTitle();
                titlebar.webContents.send(
                    `url-changed-${windowId}`,
                    mainWebContents.webContents.getTitle(),
                    mainWebContents.webContents.navigationHistory.canGoBack(),
                    mainWebContents.webContents.navigationHistory.canGoForward(),
                );
            },
        );

        mainWebContents.webContents.on("page-title-updated", (event, title) => {
            thisWindow.title = mainWebContents.webContents.getTitle();
            titlebar.webContents.send(
                `url-changed-${windowId}`,
                mainWebContents.webContents.getTitle(),
                mainWebContents.webContents.navigationHistory.canGoBack(),
                mainWebContents.webContents.navigationHistory.canGoForward(),
            );
        });

        // Keyboard Shortcuts
        mainWebContents.webContents.on("before-input-event", (event, input) => {
            if (input.control) {
                if (input.key === "I" && input.control && input.shift) {
                    // Allow inspect element with CTRL+SHIFT+I
                    mainWebContents.webContents.toggleDevTools();
                    event.preventDefault();
                } else if (input.key === "+") {
                    // Zoom in key
                    mainWebContents.webContents.setZoomFactor(
                        mainWebContents.webContents.getZoomFactor() + 0.1,
                    );
                    event.preventDefault();
                } else if (input.key === "-") {
                    // Zoom out key
                    mainWebContents.webContents.setZoomFactor(
                        mainWebContents.webContents.getZoomFactor() - 0.1,
                    );
                    event.preventDefault();
                } else if (input.key === "0") {
                    // Reset zoom key
                    mainWebContents.webContents.setZoomFactor(1.0);
                    event.preventDefault();
                } else if (input.key == "r") {
                    mainWebContents.webContents.reload();
                    event.preventDefault();
                }
            }
        });
    });

    ipcMain.on(`back-${windowId}`, () => {
        if (thisWindow) {
            mainWebContents.webContents.navigationHistory.goBack();
        }
    });

    ipcMain.on(`forward-${windowId}`, () => {
        if (thisWindow) {
            mainWebContents.webContents.navigationHistory.goForward();
        }
    });

    ipcMain.on(`close-${windowId}`, () => {
        if (thisWindow) {
            thisWindow.close();
        }
    });

    ipcMain.on(`minimize-${windowId}`, () => {
        if (thisWindow) {
            thisWindow.minimize();
        }
    });

    ipcMain.on(`maximize-${windowId}`, () => {
        if (thisWindow) {
            if (thisWindow.isMaximized()) {
                thisWindow.unmaximize();
            } else {
                thisWindow.maximize();
            }
        }
    });

    (async () => {
        const contextMenu = await import("electron-context-menu");
        const dispose = contextMenu.default({
            window: mainWebContents.webContents,
            showInspectElement: false,
        });
    })();

    function get_navigation_allowed(currentUrl, navigationUrl) {
        // Check if url is disallowed
        if (wildCardMatchList(navigationUrl, webapp.not_allowed_urls)) {
            console.log("Opening browser window");
            return false;
        }
        // Allows login urls to open external links
        if (wildCardMatchList(currentUrl, webapp.login_urls)) {
            console.log("Bypassed Browser Window1");
            return true;
        }
        // Allow non-allowed urls to open non-allowed urls to prevent external logins breaking things
        if (!wildCardMatchList(currentUrl, webapp.allowed_urls)) {
            console.log("Bypassed Browser Window2");
            return true;
        }
        // Allow allowed URLs
        if (wildCardMatchList(navigationUrl, webapp.allowed_urls)) {
            return true;
        }
        return false;
    }

    return thisWindow;
}

function createTransientWindow(url, session, parent) {
    let transientWindow = new BrowserWindow({
        width: 800,
        height: 600,
        parent: parent,
        modal: true,
        title: "SWAI Web App",
        webPreferences: {
            session: session,
        },
    });
    transientWindow.loadURL(url);
    transientWindow.once("ready-to-show", () => {
        transientWindow.show();
    });
    // transientWindow.on('closed', () => {
    //     transientWindow = null;
    // });
    transientWindow.removeMenu();
}

app.on("window-all-closed", () => {
    app.quit();
});

app.on("ready", () => {
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
        app.commandLine.appendSwitch("ozone-platform-hint", "auto");

        app.setName(
            webapp.ecosystem_title || webapp.ecosystem || webapp.app_name,
        );

        createWindow(webapp);
    } catch (e) {
        console.error(e);
        app.quit();
    }
});
