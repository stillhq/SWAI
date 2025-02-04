import Gio from "gi://Gio";
import Shell from "gi://Shell";
import GObject from "gi://GObject";
import Gda from "gi://Gda?version=6.0";
import GLib from "gi://GLib";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
// import * as Main from 'resource:///org/gnome/shell/ui/main.js';

class SWAIWindowDB {
  create_db() {
    // Path ~/.local/share/swai/tmp/swai_window.db
    const dbPath = GLib.build_filenamev([
      GLib.get_user_data_dir(),
      "swai",
      "tmp",
      "swai_windows.db",
    ]);

    // create parent directory if it doesn't exist
    if (!GLib.file_test(GLib.path_get_dirname(dbPath), GLib.FileTest.IS_DIR)) {
      GLib.mkdir_with_parents(GLib.path_get_dirname(dbPath), 0o755);
    }

    // Delete file if it already exists to create a fresh database
    if (GLib.file_test(dbPath, GLib.FileTest.EXISTS)) {
      GLib.unlink(dbPath);
    }

    // create connection
    const connection = Gda.Connection.new_from_string(
      "SQLite",
      `DB_DIR=${GLib.path_get_dirname(dbPath)};DB_NAME=${GLib.path_get_basename(dbPath)}`,
      null,
    );

    try {
      connection.open();

      // Table all strings: app_id, win_id, title, icon, wm_class, ecosystem_id, swai_file_path
      connection.execute_non_select_command(
        `CREATE TABLE windows (
                    app_id TEXT,
                    win_id TEXT,
                    title TEXT,
                    icon TEXT,
                    wm_class TEXT,
                    ecosystem_id TEXT,
                    swai_win_id TEXT,
                    swai_file_path TEXT
                )`,
      );
    } catch (e) {
      console.error("Error creating database: ", e);
    }
  }
}

export default class SwaiExtension extends Extension {
  init() {
    this.timeoutId = null;
  }
  enable() {
    this.timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
      log("1===========================================================");
      let windows = global.get_window_actors();
      for (let i = 0; i < windows.length; i++) {
        let win = windows[i].get_meta_window();
        let win_id = win.get_id();
        let title = win.get_title();
        let wm_class = win.get_wm_class();
        // if (title.startsWith("swai.")) {
        log(`Title: ${title}, Win ID: ${win_id}, WM Class: ${wm_class}`);
        // }
      }
      log("2===========================================================");
      return true;
    });
  }
  disable() {
    if (this.timeoutId !== null) {
      GLib.source_remove(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
