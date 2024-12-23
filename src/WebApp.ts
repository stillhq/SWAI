const fs = require('fs');
const yaml = require('js-yaml');

export class WebApp {
    app_id: string = "io.stillhq.swaiwebapp";   // Needed for GNOME to differentiate SWAI apps
    app_name: string = "SWAI Web App";
    main_url: string = "https://example.com";
    allowed_urls: string[] = ["https://example.com/*"];   // Supports wild cards
    icon_path: string = "";
    categories: string[] = []; // Free Desktop Categories
    keywords: string[] = [];
    comment: string | null = null;
    mimetypes: string[] = [];
    allow_multi_window: boolean = false;
    ecosystem: string | null = null;
    extensions: string[] = [];
    external_login: boolean = false;

    public static from_yaml_file(path: string): WebApp {  // Opens YAML file see applemusic.swai for reference
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
        webapp.external_login = data.external_login || webapp.external_login;

        return webapp;
    }

    public to_yaml_file(path: string): void {
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
            external_login: this.external_login
        };

        let yaml_data = yaml.safeDump(data);
        fs.writeFileSync(path, yaml_data);
    }
}