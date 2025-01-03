const fs = require('fs');
const yaml = require('js-yaml');

class WebApp {
    app_id = "io.stillhq.swaiwebapp";   // Needed for GNOME to differentiate SWAI apps
    app_name = "SWAI Web App";
    main_url = "https://example.com";
    allowed_urls = ["https://example.com/*"];   // Supports wild cards
    icon_path = "";
    categories = []; // Free Desktop Categories
    keywords = [];
    comment = null;
    mimetypes = [];
    allow_multi_window = false;
    ecosystem = null;
    extensions = [];
    login_urls = [];

    static from_yaml_file(path) {  // Opens YAML file see applemusic.swai for reference
        let webapp = new WebApp();
        let file_data = fs.readFileSync(path, 'utf8');
        let data = yaml.load(file_data);

        webapp.app_id = data.app_id || webapp.app_id;
        webapp.app_name = data.app_name || webapp.app_name;
        webapp.main_url = data.main_url || webapp.main_url;
        webapp.allowed_urls = data.allowed_urls || webapp.allowed_urls;
        webapp.icon_path = data.icon_path || webapp.icon_path;
        webapp.categories = data.categories || webapp.categories;
        webapp.keywords = data.keywords || webapp.keywords;
        webapp.comment = data.comment || webapp.comment;
        webapp.mimetypes = data.mimetypes || webapp.mimetypes;
        webapp.allow_multi_window = data.allow_multi_window || webapp.allow_multi_window;
        webapp.ecosystem = data.ecosystem || webapp.ecosystem;
        webapp.extensions = data.extensions || webapp.extensions;
        webapp.login_urls = data.login_urls || webapp.login_urls;

        return webapp;
    }

    clone() {
        let webapp = new WebApp();
        webapp.app_id = this.app_id;
        webapp.app_name = this.app_name;
        webapp.main_url = this.main_url;
        webapp.allowed_urls = this.allowed_urls;
        webapp.icon_path = this.icon_path;
        webapp.categories = this.categories;
        webapp.keywords = this.keywords;
        webapp.comment = this.comment;
        webapp.mimetypes = this.mimetypes;
        webapp.allow_multi_window = this.allow_multi_window;
        webapp.ecosystem = this.ecosystem;
        webapp.extensions = this.extensions;
        webapp.login_urls = this.login_urls;
        return webapp;
    }

    to_yaml_file(path) {
        let data = {
            app_id: this.app_id,
            app_name: this.app_name,
            main_url: this.main_url,
            allowed_urls: this.allowed_urls,
            icon_path: this.icon_path,
            categories: this.categories,
            keywords: this.keywords,
            comment: this.comment,
            mimetypes: this.mimetypes,
            allow_multi_window: this.allow_multi_window,
            ecosystem: this.ecosystem,
            extensions: this.extensions,
            login_urls: this.login_urls
        };

        let yaml_data = yaml.safeDump(data);
        fs.writeFileSync(path, yaml_data);
    }
}

module.exports = WebApp;