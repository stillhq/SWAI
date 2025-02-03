const WebApp = require("./WebApp");
const { wildCardMatch, wildCardMatchList } = require("./swai_utils");
const path = require('path');
const spawn = require("child_process").spawn;
const fs = require("fs");

class Ecosystem {
    name = ""
    webapps = [];
    allowed_url_map = {};
    unallowed_url_map = {};

    constructor (name) {
        this.name = name;
    }

    static new_from_webapp (webapp) {
        let ecosystem = new Ecosystem(webapp.ecosystem);
        ecosystem.load_web_apps_in_dir(path.dirname(webapp.swai_file_path));
        return ecosystem;
    }

    load_web_apps_in_dir (file_path) {
        const files = fs.readdirSync(file_path);
        for (const file of files) {
            if (file.endsWith(".swai")) {
                let webapp = WebApp.from_yaml_file(path.join(file_path, file));
                if (webapp.ecosystem === this.name) {
                    this.webapps.push(webapp);
                }
            }
        }
    }

    map_urls () {
        this.allowed_url_map = {}
        this.unallowed_url_map = {}

        for (const webapp of this.webapps) {
            this.allowed_url_map[webapp.app_id] = [];

            for (const url of webapp.allowed_urls) {
                this.allowed_url_map[webapp.app_id].push(url);
            }
            if (webapp.not_allowed_urls != null) {
                this.unallowed_url_map[webapp.app_id] = [];
                for (const url of webapp.not_allowed_urls) {
                    this.unallowed_url_map[webapp.app_id].push(url);
                }
            }
        }
    }

    open_url_in_ecosystem(url) {
        for (const webapp_index in this.webapps) {
            let webapp = this.webapps[webapp_index];
            console.log(this.allowed_url_map[webapp.app_id]);
            if (wildCardMatchList(url, this.allowed_url_map[webapp.app_id])) {
                if (
                    webapp.app_id in this.unallowed_url_map &&
                    !(wildCardMatchList(url, this.unallowed_url_map[webapp.app_id]))
                ) {
                    webapp.main_url = url;
                    console.log(`Opening ${url} in ${webapp.app_name}`);
                    return webapp;
                }
            }
        }
        return null
    }
}

module.exports = Ecosystem;