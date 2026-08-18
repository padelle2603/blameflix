const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('blameflixSave', {
    save: (defaultName, content, lang) => ipcRenderer.invoke('save-backup', { defaultName, content, lang })
});

contextBridge.exposeInMainWorld('blameflixNotify', {
    notify: (title, body) => ipcRenderer.invoke('notify', { title, body })
});
