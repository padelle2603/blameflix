const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('blameflixAppInfo', {
    getVersion: () => ipcRenderer.invoke('get-app-version')
});

contextBridge.exposeInMainWorld('blameflixSave', {
    save: (defaultName, content, lang) => ipcRenderer.invoke('save-backup', { defaultName, content, lang })
});

contextBridge.exposeInMainWorld('blameflixNotify', {
    notify: (title, body) => ipcRenderer.invoke('notify', { title, body })
});
