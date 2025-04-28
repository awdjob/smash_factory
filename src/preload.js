// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// Expose selected API to the renderer process
contextBridge.exposeInMainWorld('sfAPI', {
  // Process functions
  listProcesses: () => ipcRenderer.invoke('list-processes'),
  
  // Memory functions
  scanMemory: (pid, value) => ipcRenderer.invoke('scan-memory', pid, value),
  readMemory: (pid, address, size) => ipcRenderer.invoke('read-memory', pid, address, size),
  readMemoryAsArray: (pid, address, size) => ipcRenderer.invoke('read-memory-as-array', pid, address, size),
  writeMemory: (pid, address, buffer) => ipcRenderer.invoke('write-memory', pid, address, buffer)
});
