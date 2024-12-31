const { getWindowControlLayout, getTitleFont, pangoToCss } = require('./swai_utils.js');

function createButton(type, iconPath, title) {
    const button = document.createElement('button');
    button.className = `window-button ${type} no-drag`;
    button.title = title;

    // Create an img element for the SVG
    const img = document.createElement('img');
    img.src = iconPath;
    img.draggable = false;
    img.style.width = '16px';
    img.style.height = '16px';
    img.style.color = '#ffffff';

    button.appendChild(img);
    button.onclick = () => {
        window.electron[type]?.();
    };
    return button;
}

const leftContainer = document.querySelector('.window-controls.left');
const rightContainer = document.querySelector('.window-controls.right');

function addControl(control, container) {
    switch (control) {
        case 'minimize':
            container.appendChild(createButton('minimize', './icons/window-minimize-symbolic.svg', 'Minimize'));
            break;
        case 'maximize':
            container.appendChild(createButton('maximize', './icons/window-maximize-symbolic.svg', 'Maximize'));
            break;
        case 'close':
            container.appendChild(createButton('close', './icons/window-close-symbolic.svg', 'Close'));
            break;
    }
}

async function setupWindowControls() {
    // Parse window controls layout from URL parameters
    let leftControls = [], rightControls = [];
    const windowControls = await getWindowControlLayout();
    const fontName = await getTitleFont();
    const splitWindowControls = windowControls.split(":");
    if (splitWindowControls.length = 2) {
        leftControls = splitWindowControls[0].split(",");
        rightControls = splitWindowControls[1].split(",");
    } else {
        leftControls = [];
        rightControls = "minimize,maximize,close".split(",");
    }
    let { fontFamily, fontWeight, fontStyle, fontSize } = pangoToCss(fontName);
    console.log(fontName, pangoToCss(fontName));
    document.querySelector('.window-title').style.fontFamily = fontFamily;
    document.querySelector('.window-title').style.fontWeight = "Bold";
    document.querySelector('.window-title').style.fontStyle = fontStyle;
    document.querySelector('.window-title').style.fontSize = fontSize;


    leftControls.forEach(control => addControl(control, leftContainer));
    rightControls.forEach(control => addControl(control, rightContainer));
}
setupWindowControls();

// Handle window title updates
window.electron?.onUpdateTitle(title => {
    document.querySelector('.window-title').textContent = title;

});

// Handle window state changes for maximize/restore button
window.electron?.onWindowStateChange(isMaximized => {
    const maximizeButtons = document.querySelectorAll('.window-button.maximize');
    maximizeButtons.forEach(button => {
        button.innerHTML = isMaximized ? restoreSVG : maximizeSVG;
        button.title = isMaximized ? 'Restore' : 'Maximize';
    });
});