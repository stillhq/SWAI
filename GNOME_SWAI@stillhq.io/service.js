import { SwaiWindow } from "./window.js";
import GLib from "gi://GLib";

export const SWAIWindowManagerInterface = `<node>
  <interface name="io.stillhq.SWAIWindowManager">
    <method name="RegisterWindow">
      <arg type="s" name="app_id" direction="in" />
      <arg type="s" name="title" direction="in" />
      <arg type="s" name="swai_window_id" direction="in" />
      <arg type="s" name="swai_file_path" direction="in" />
      <arg type="b" name="success" direction="out" />
    </method>
    <method name="GetSwaiWindows">
        <arg type="a(ssss)" name="windows" direction="out" />
    </method>
    <method name="GetSwaiWaitList">
        <arg type="a(ssss)" name="windows" direction="out" />
    </method>
    <signal name="WindowRegistered">
        <arg type="s" name="title" direction="out" />
        <arg type="s" name="swai_window_id" direction="out" />\
    </signal>
  </interface>
</node>`;

const InterfaceName = "io.stillhq.SWAIWindowManager";
const InterfacePath = "/io/stillhq/SWAIWindowManager";

export class SWAIWindowManager {
    constructor () {
        this.windows = [];
        this.window_wait_list = [];
    }

    // Tells the window manager that a window belongs to SWAI
    RegisterWindow(swai_window_id, title, app_id, swai_file_path) {
        let window = new SwaiWindow(swai_window_id, title, app_id, swai_file_path);

        let window_found = false;

        // Checks for windows with a title that is set to the swai_window_id
        // This is a workaround since theres no other way for electron to communicate with GNOME Shell
        let windows = global.get_window_actors();
        for (let i = 0; i < windows.length; i++) {
            let win = windows[i].get_meta_window();
            let title = win.get_title();

            if (title === swai_window_id) {
                window_found = true;
                this.WindowRegistration(win, swai_window_id, title, window);
                break;
            }
        }

        // If the window is not found, add it to the wait list
        // in case it got registered before the window was created
        if (!window_found) {
            this.window_wait_list.push(window);
        }

        return true;
    }

    // Actually registers the window with GNOME
    WindowRegistration(meta_win, swai_window_id, title, swai_window) {
        console.log(`Registered ${swai_window_id} with GNOME Shell as ${meta_win.get_id()}`);
        swai_window.gnome_window_id = meta_win.get_id();
        swai_window.meta_window = meta_win;

        // Connect MetaWindow Unmanaged to unregister the window
        meta_win.connect("unmanaged", () => {
            for (let win in this.windows) {
                if (win.gnome_window_id === meta_win.get_id()) {
                    this.windows.splice(this.windows.indexOf(win), 1);
                    break;
                }
            }
            console.log(`Unregistered ${swai_window_id} with GNOME Shell`);
        });

        // Add the window to the list of windows
        this.windows.push(swai_window);
        this.emitWindowRegistered(title, swai_window_id);
    }

    // Should mostly be used for debugging with D-Feet
    GetSwaiWindows() {
        let windows = [];
        for (let i = 0; i < this.windows.length; i++) {
            let window = this.windows[i];
            windows.push([window.app_id, window.title, window.meta_window.get_wm_class(), window.swai_window_id]);
        }
        return windows;
    }

    // Should mostly be used for debugging with D-Feet
    GetSwaiWaitList() {
        let windows = [];
        for (let i = 0; i < this.window_wait_list.length; i++) {
            let window = this.window_wait_list[i];
            windows.push([window.app_id, window.title, window.meta_window.get_wm_class(), window.swai_window_id]);
        }
        return windows;
    }

    emitWindowRegistered(title, swai_window_id) {
        this._impl.emit_signal('WindowRegistered',
            new GLib.Variant('(ss)', [title, swai_window_id]));
    }
}
//
// function change_window_title(gnome_id, title) {
//     }
// }
