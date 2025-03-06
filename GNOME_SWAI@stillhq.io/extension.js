import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Meta from "gi://Meta";
import Shell from "gi://Shell";
import { Extension, InjectionManager } from "resource:///org/gnome/shell/extensions/extension.js";
import { SWAIWindowManager, SWAIWindowManagerInterface } from "./service.js";
import { Panel } from "resource:///org/gnome/shell/ui/panel.js";

// let WindowTracker = Shell.WindowTracker.get_default();

// import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class SwaiExtension extends Extension {
    init() {
        this.timeoutId = null;
        this.service = null;
        this.dbus_session = null;
        this.dbus_id = null;
        this._injectionManager = null;
    }

    enable() {
        // Create the database
        this._injectionManager = new InjectionManager();
        this.service = new SWAIWindowManager();
        this.dbus_session = Gio.DBusExportedObject.wrapJSObject(
            SWAIWindowManagerInterface, this.service);
        this.service._impl = this.dbus_session;
        this.dbus_session.export(Gio.DBus.session, "/io/stillhq/SWAIWindowManager");
        this.dbus_id = Gio.DBus.session.own_name(
            "io.stillhq.SWAIWindowManager",
            Gio.BusNameOwnerFlags.REPLACE,
            (name) => log(`Acquired bus name: ${name}`),
            (name) => log(`Lost bus name: ${name}`)
        );

        console.log("Service registered");

        this._injectionManager.overrideMethod(Panel.prototype, 'toggleCalendar',
            originalMethod => {
                return args => {
                    console.log(`${this.metadata.name}: toggling calendar`);
                    originalMethod.call(Main.panel, ...args);
                };
            });

        this._injectionManager.overrideMethod(Shell.WindowTracker.prototype, "get_app_window",
            (originalMethod) => {
                let that = this;
                return function (metaWindow) {
                    console.log("Overriding get_app_window");
                    if (metaWindow.get_wm_class() === 'io.stillhq.swai') {
                        console.log("Found SWAI window: " + metaWindow.get_title());
                        for (const window of that.service.windows) {
                            if (window.gnome_window_id === metaWindow.get_id()) {
                                let appSystem = Shell.AppSystem.get_default();
                                return appSystem.lookup_app(`swai.${window.app_id}`);
                            }
                        }
                    }
                    return originalMethod.call(this, metaWindow);
                }
            }
        );

        // Connect to window created signal
        let display = global.get_display();
        display.connect("window-created", (_, win) => {
            console.log(win.get_wm_class());
            if (this.service.window_wait_list.length > 0) {
                for (let i = 0; i < this.service.window_wait_list.length; i++) {
                    let window = this.service.window_wait_list[i];
                    if (window.swai_window_id === win.get_title()) {
                        this.service.WindowRegistration(win, window.swai_window_id, window.title, window);
                        this.service.window_wait_list.splice(i, 1);
                        break;
                    }
                }
            }
        });

        // Get all windows
        let windows = global.get_window_actors();
        for (let i = 0; i < windows.length; i++) {
            let win = windows[i].get_meta_window();
            let title = win.get_title();
            console.log(win.get_wm_class(), win.get_wm_class_instance(), title);
            win.set_wm_class("io.stillhq.swai", win.get_wm_class_instance());
            console.log(win.get_wm_class(), win.get_wm_class_instance(), title);
        }
    }

    disable() {
        this.dbus_session.unexport();
        this.dbus_session = null;
        Gio.DBus.session.unown_name(this._dbusId);
        this.dbus_id = null;
        this.service = null;
        this._injectionManager.clear();
        this._injectionManager = null;
    }
}
