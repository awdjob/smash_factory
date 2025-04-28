const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

// Load the native module in the main process
const SFNative = require('../native_modules/sf_native_binding/build/Release/sf_native');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // Set up IPC handlers for native module functions
  setupIpcHandlers();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Set up IPC handlers for the native module functions
function setupIpcHandlers() {
  // Check if the native module loaded successfully
  const moduleError = !SFNative ? 
    new Error('Native module not loaded. Check build configuration.') : null;

  // Processes functions
  ipcMain.handle('list-processes', async () => {
    if (moduleError) throw moduleError;
    try {
      return SFNative.listProcesses();
    } catch (err) {
      console.error('Error listing processes:', err);
      throw err;
    }
  });

  // Memory functions
  ipcMain.handle('scan-memory', async (_, pid, value) => {
    if (moduleError) throw moduleError;
    try {
      const addresses = SFNative.scanMemoryForValue(pid, value);
      console.log(`Found ${addresses.length} addresses with value ${value}`);
      
      // For each address, read the memory to confirm the value
      const results = await Promise.all(addresses.map(async (address) => {
        try {
          // Read 4 bytes (assuming we're looking for a 32-bit integer)
          // Use the more reliable array-based reading
          const byteArray = SFNative.readMemoryAsArray(pid, address, 4);
          
          if (!byteArray || byteArray.length < 4) {
            console.warn(`Insufficient data read at address 0x${address.toString(16).toUpperCase()}: got ${byteArray ? byteArray.length : 0} bytes`);
            return {
              address,
              hexAddress: `0x${address.toString(16).toUpperCase()}`,
              value: 'Insufficient data',
              error: 'Could not read 4 bytes'
            };
          }
          
          // Convert array to Int32Array for reading the value
          try {
            // Convert the array to a buffer
            const buffer = new ArrayBuffer(4);
            const view = new Uint8Array(buffer);
            for (let i = 0; i < 4; i++) {
              view[i] = byteArray[i];
            }
            
            // Read as both signed and unsigned
            const dataView = new DataView(buffer);
            const signedValue = dataView.getInt32(0, true); // true for little-endian
            const unsignedValue = dataView.getUint32(0, true);
            
            return {
              address,
              hexAddress: `0x${address.toString(16).toUpperCase()}`,
              value: signedValue,
              unsignedValue,
              hexValue: `0x${unsignedValue.toString(16).toUpperCase()}`
            };
          } catch (parseErr) {
            console.warn(`Failed to parse data at address 0x${address.toString(16).toUpperCase()}: ${parseErr.message}`);
            return {
              address,
              hexAddress: `0x${address.toString(16).toUpperCase()}`,
              value: 'Parse error',
              error: parseErr.message
            };
          }
        } catch (readErr) {
          console.warn(`Failed to read memory at address 0x${address.toString(16).toUpperCase()}: ${readErr.message}`);
          return {
            address,
            hexAddress: `0x${address.toString(16).toUpperCase()}`,
            value: 'Read error',
            error: readErr.message
          };
        }
      }));
      
      // Filter out addresses with read errors if needed
      const validResults = results.filter(result => !result.error);
      console.log(`Successfully read ${validResults.length} out of ${results.length} addresses`);
      
      return results;
    } catch (err) {
      console.error('Error scanning memory:', err);
      throw err;
    }
  });

  ipcMain.handle('read-memory', async (_, pid, address, size) => {
    if (moduleError) throw moduleError;
    try {
      return SFNative.readMemory(pid, address, size);
    } catch (err) {
      console.error('Error reading memory:', err);
      throw err;
    }
  });

  // Memory writing function
  ipcMain.handle('write-memory', async (_, pid, address, buffer) => {
    if (moduleError) throw moduleError;
    try {
      console.log(`Writing memory: PID=${pid}, Address=0x${address.toString(16).toUpperCase()}, Size=${buffer.length}`);
      console.log(`Buffer contents: ${Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
      
      const success = SFNative.writeMemory(pid, address, buffer);
      
      if (success) {
        console.log(`Successfully wrote ${buffer.length} bytes to address 0x${address.toString(16).toUpperCase()}`);
      } else {
        console.error(`Failed to write to memory at address 0x${address.toString(16).toUpperCase()}`);
      }
      
      return success;
    } catch (err) {
      console.error(`Error writing memory: ${err.message}`);
      throw err;
    }
  });

  // Read memory and display value
  ipcMain.handle('read-memory-as-array', async (_, pid, address, size) => {
    if (moduleError) throw moduleError;
    try {
      console.log(`Reading memory as array: PID=${pid}, Address=0x${address.toString(16).toUpperCase()}, Size=${size}`);
      const byteArray = SFNative.readMemoryAsArray(pid, address, size);
      
      if (byteArray && byteArray.length >= 4) {
        // Convert to array buffer for reading values
        const buffer = new ArrayBuffer(byteArray.length);
        const view = new Uint8Array(buffer);
        
        for (let i = 0; i < byteArray.length; i++) {
          view[i] = byteArray[i];
        }
        
        const dataView = new DataView(buffer);
        
        // Display values in different formats
        const valueInfo = {
          address: `0x${address.toString(16).toUpperCase()}`,
          rawBytes: Array.from(byteArray).map(b => b.toString(16).padStart(2, '0')).join(' '),
          asInt32: dataView.getInt32(0, true),
          asUint32: dataView.getUint32(0, true),
          hexUint32: `0x${dataView.getUint32(0, true).toString(16).toUpperCase()}`
        };
        
        if (byteArray.length >= 8) {
          valueInfo.asInt64 = Number(dataView.getBigInt64(0, true));
          valueInfo.asUint64 = Number(dataView.getBigUint64(0, true));
          valueInfo.hexUint64 = `0x${dataView.getBigUint64(0, true).toString(16).toUpperCase()}`;
        }
        
        if (byteArray.length >= 4) {
          valueInfo.asFloat = dataView.getFloat32(0, true);
        }
        
        if (byteArray.length >= 8) {
          valueInfo.asDouble = dataView.getFloat64(0, true);
        }
        
        console.log('Memory read result:', valueInfo);
        return {
          byteArray,
          valueInfo
        };
      }
      
      return { byteArray };
    } catch (err) {
      console.error(`Error reading memory as array: ${err.message}`);
      throw err;
    }
  });
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
