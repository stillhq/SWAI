export class SwaiWindow {
    swai_window_id = null;
    gnome_window_id = null;
    title = null;
    swai_file_path = null;
    app_id = null;
    meta_window = null;

    constructor(swai_window_id, title, app_id, swai_file_path) {
        this.swai_window_id = swai_window_id;
        this.title = title;
        this.app_id = app_id;
        this.swai_file_path = swai_file_path;
    }

    set_title(title) {
        this.title = title;
        this.meta_window.set_title(title);
    }
}