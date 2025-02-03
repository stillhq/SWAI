const exec = require('child_process').exec;

function parse_arg(arg_key) {
    let return_value = null;
    let args = process.argv;
    args.forEach(arg => {
        if (arg.startsWith("--")) {
            let [key, value] = arg.split("=");
            if (key == arg_key) {
                return_value = value;
            }
        }
    })
    return return_value;
}

function wildCardMatch(str, pattern) {
    str = str.toLowerCase();
    pattern = pattern.toLowerCase();
    // Escape special characters in the pattern and replace '*' with '.*'
    const regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    // Make sure the url works with or without a trailing slash
    if (str.endsWith("/")) {
        if (regex.test(str.slice(0, -1))) {
            return str;
        }
    } else if (regex.test(str + "/")) {
        return str;
    } else if (regex.test(str)) {
        return str;
    }
    return null;
}

function wildCardMatchList(str, patterns) {
    for (const pattern of patterns) {
        if (wildCardMatch(str, pattern)) {
            return true;
        }
    }
    return false;
}

function openUrlInBrowser(url) {
    const command = `xdg-open "${url}"`;
    exec(command, (error) => {
        if (error) {
            console.error('Failed to open URL:', error);
        }
    });
}

// Used to get the window control layout
function getWindowControlLayout() {
    return new Promise((resolve, reject) => {
        let button_layout = "close,minimize,maximize";
        const command = `gsettings get org.gnome.desktop.wm.preferences button-layout`;
        exec(command, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            button_layout = stdout.trim();
            // remove single quotes
            if (button_layout.startsWith("'") && button_layout.endsWith("'")) {
                button_layout = button_layout.slice(1, -1);
            }
            resolve(button_layout);
        });
    });
}

function getTitleFont() {
    return new Promise((resolve, reject) => {
        let title_font = "Inter Bold 11";
        const command = `gsettings get org.gnome.desktop.interface font-name`;
        exec(command, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            const title_font = stdout.trim();
            // remove single quotes
            if (title_font.startsWith("'") && title_font.endsWith("'")) {
                resolve(title_font.slice(1, -1));
                return;
            }
            resolve(title_font);
        });
    });
}

// Used to convert the Pango font from the GNOME settings to CSS
// Function generated from Claude 3.5 Sonnet (Anthropic, Dec 2024)
function pangoToCss(pangoString) {
    // Weight mapping from Pango to CSS
    const WEIGHT_MAP = {
        'thin': '100',
        'ultra-light': '200',
        'light': '300',
        'book': '400',
        'regular': '400',
        'medium': '500',
        'semi-bold': '600',
        'bold': '700',
        'ultra-bold': '800',
        'heavy': '900',
        'ultra-heavy': '900'
    };

    // Style keywords
    const STYLE_KEYWORDS = ['italic', 'oblique'];

    // Helper functions
    const isStyleKeyword = word => STYLE_KEYWORDS.includes(word.toLowerCase());
    const isWeightKeyword = word => word.toLowerCase() in WEIGHT_MAP;
    const isSize = word => /^[\d.]+$/.test(word);

    // Initialize default values
    let family = '';
    let weight = 'normal';
    let style = 'normal';
    let size = '16px';

    // Split the string into parts
    const parts = pangoString.trim().split(' ');
    let currentPart = 0;

    // Get font family (everything until we hit a known keyword or number)
    while (currentPart < parts.length) {
        const part = parts[currentPart];

        if (isStyleKeyword(part) || isWeightKeyword(part) || isSize(part)) {
            break;
        }

        family += (family ? ' ' : '') + part;
        currentPart++;
    }

    // Process remaining parts for style, weight, and size
    while (currentPart < parts.length) {
        const part = parts[currentPart];

        if (isStyleKeyword(part)) {
            style = part.toLowerCase();
        } else if (isWeightKeyword(part)) {
            weight = WEIGHT_MAP[part.toLowerCase()];
        } else if (isSize(part)) {
            // Convert points to pixels (1pt ≈ 1.333333px)
            const pixels = Math.round(parseFloat(part) * 1.333333);
            size = `${pixels}px`;
            break;
        }

        currentPart++;
    }

    return {
        fontFamily: family || 'inherit',
        fontWeight: weight,
        fontStyle: style,
        fontSize: size
    };
}

module.exports = {
    parse_arg,
    wildCardMatch,
    openUrlInBrowser,
    getWindowControlLayout,
    getTitleFont,
    pangoToCss,
    wildCardMatchList
};
