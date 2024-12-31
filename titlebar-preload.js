const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electron',
    {
        close: () => ipcRenderer.send('close'),
        minimize: () => ipcRenderer.send('minimize'),
        maximize: () => ipcRenderer.send('maximize'),
        onUpdateTitle: (callback) => ipcRenderer.on('update-title', (_, title) => callback(title)),
        onWindowStateChange: (callback) => ipcRenderer.on('window-state-change', (_, isMaximized) => callback(isMaximized))
    }
);