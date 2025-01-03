const { getWindowControlLayout, getTitleFont, pangoToCss } = require("./swai_utils.js");
const {ipcRenderer} = require('electron');

function createButton(type, iconPath) {
    const button = document.createElement("button");
    button.className = `window-button ${type} no-drag`;

    // Create an img element for the SVG
    const img = document.createElement("img");
    img.src = iconPath;
    img.draggable = false;
    img.style.width = "16px";
    img.style.height = "16px";
    img.style.color = "#ffffff";

    button.appendChild(img);
    button.onclick = () => {
        ipcRenderer.send(type);
    };
    return button;
}

const leftContainer = document.querySelector(".window-controls.left");
const rightContainer = document.querySelector(".window-controls.right");

function addControl(control, container) {
    switch (control) {
        case "minimize":
            container.appendChild(createButton(
                "minimize", 
                "./icons/window-minimize-symbolic.svg"
            ));
            break;
        case "maximize":
            container.appendChild(createButton(
                "maximize",
                "./icons/window-maximize-symbolic.svg"
            ));
            break;
        case "close":
            container.appendChild(createButton(
                "close",
                "./icons/window-close-symbolic.svg"
            ));
            break;
    }
}

async function setupWindowControls() {
    // Parse window controls layout from URL parameters
    let leftControls = [], rightControls = [];
    const windowControls = await getWindowControlLayout();
    const fontName = await getTitleFont();
    try {
        const splitWindowControls = windowControls.split(":");
        if (splitWindowControls.length = 2) {
            leftControls = splitWindowControls[0].split(",");
            rightControls = splitWindowControls[1].split(",");
        } else {
            leftControls = [];
            rightControls = "minimize,maximize,close".split(",");
        }
    } catch (e) {
        leftControls = [];
        rightControls = "minimize,maximize,close".split(",");
    }
    let { fontFamily, fontWeight, fontStyle, fontSize } = pangoToCss(fontName);
    console.log(fontName, pangoToCss(fontName));
    document.querySelector(".window-title").style.fontFamily = fontFamily;
    document.querySelector(".window-title").style.fontWeight = "Bold";
    document.querySelector(".window-title").style.fontStyle = fontStyle;
    document.querySelector(".window-title").style.fontSize = fontSize;

    leftControls.forEach(control => addControl(control, leftContainer));
    rightControls.forEach(control => addControl(control, rightContainer));

    let back_button = createButton("back", "./icons/go-previous-symbolic.svg");
    back_button.classList.add("flat");
    back_button.disabled = true;
    let forward_button = createButton("forward", "./icons/go-next-symbolic.svg");
    forward_button.classList.add("flat");
    forward_button.disabled = true;

    if (leftContainer.children.length <= rightContainer.children.length) {
        leftContainer.append(back_button);
        leftContainer.append(forward_button);
    } else {
        rightContainer.prepend(back_button);
        rightContainer.prepend(forward_button);
    }

}
setupWindowControls();

function set_color_titlebar(light_color, dark_color) {
    // Add this functionality to a future release
    // document.querySelector(".titlebar").style.backgroundColor = color;
}

// Handle window title updates
ipcRenderer.on("url_changed", (event, title, can_back, can_forward) => {
    document.querySelector(".window-title").textContent = title;
    document.querySelector(".window-button.back").disabled = !can_back;
    document.querySelector(".window-button.forward").disabled = !can_forward;
});

ipcRenderer.on("window-state-change", (event, isMaximized) => {
// Handle window state changes for maximize/restore button
    const maximizeButtons = document.querySelectorAll(".window-button.maximize");
    maximizeButtons.forEach(button => {
        button.innerHTML = isMaximized ? restoreSVG : maximizeSVG;
        button.title = isMaximized ? "Restore" : "Maximize";
    });
});