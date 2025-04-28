// Access the exposed API functions
const { listProcesses, scanMemory, readMemory, readMemoryAsArray, writeMemory } = window.sfAPI;

// DOM elements
const pj64StatusElement = document.getElementById('pj64-status');
const scanButton = document.getElementById('scan-button');
const scanResultsElement = document.getElementById('scan-results');

// Memory writing elements
const addressInput = document.getElementById('address-input');
const valueInput = document.getElementById('value-input');
const valueTypeSelect = document.getElementById('value-type');
const writeButton = document.getElementById('write-button');
const writeResultElement = document.getElementById('write-result');

// Store the process ID for reuse
let pj64Process = null;

// Function to check for Project64 process
function checkForProject64() {
  listProcesses()
    .then(processes => {
      pj64Process = processes.find(process => process.name.match(/Project64/i));
      
      if (pj64Process) {
        pj64StatusElement.textContent = `Found (PID: ${pj64Process.pid}, Name: ${pj64Process.name})`;
        scanButton.disabled = false;
        writeButton.disabled = false;
      } else {
        pj64StatusElement.textContent = 'Not detected';
        scanButton.disabled = true;
        writeButton.disabled = true;
      }
    })
    .catch(error => {
      console.error('Error listing processes:', error);
      pj64StatusElement.textContent = 'Error: ' + error.message;
      scanButton.disabled = true;
      writeButton.disabled = true;
    });
}

// Function to convert hex or decimal string to number
function parseInputValue(value) {
  if (typeof value !== 'string') return value;
  
  value = value.trim();
  
  // Check if it's a hex value
  if (value.startsWith('0x') || value.startsWith('0X')) {
    return parseInt(value, 16);
  }
  
  // Otherwise parse as decimal
  return parseInt(value, 10);
}

// Function to write a value to memory
function writeToMemory() {
  if (!pj64Process) {
    writeResultElement.textContent = 'Project64 not detected. Cannot write to memory.';
    return;
  }
  
  // Disable button during write
  writeButton.disabled = true;
  writeButton.textContent = 'Writing...';
  writeResultElement.textContent = '';
  
  try {
    // Parse address (assuming hex)
    const addressStr = addressInput.value.trim();
    let address;
    
    if (addressStr.startsWith('0x') || addressStr.startsWith('0X')) {
      address = parseInt(addressStr.substring(2), 16);
    } else {
      address = parseInt(addressStr, 16); // Assume hex even without prefix
    }
    
    if (isNaN(address)) {
      writeResultElement.textContent = 'Invalid address format. Use hexadecimal notation (e.g., 0x12345678)';
      writeButton.disabled = false;
      writeButton.textContent = 'Write to Memory';
      return;
    }
    
    // Parse value based on selected type
    const valueStr = valueInput.value.trim();
    const valueType = valueTypeSelect.value;
    let value;
    
    // Parse the value string based on whether it's hex or decimal
    if (valueStr.startsWith('0x') || valueStr.startsWith('0X')) {
      value = parseInt(valueStr, 16);
    } else {
      value = parseInt(valueStr, 10);
    }
    
    if (isNaN(value)) {
      writeResultElement.textContent = 'Invalid value format. Use decimal or hexadecimal notation';
      writeButton.disabled = false;
      writeButton.textContent = 'Write to Memory';
      return;
    }
    
    // Create a buffer with the value
    let buffer;
    
    switch (valueType) {
      case 'int32':
      case 'uint32':
        buffer = new ArrayBuffer(4);
        const dv32 = new DataView(buffer);
        if (valueType === 'int32') {
          dv32.setInt32(0, value, true);  // true for little-endian
        } else {
          dv32.setUint32(0, value, true);
        }
        break;
        
      case 'int16':
      case 'uint16':
        buffer = new ArrayBuffer(2);
        const dv16 = new DataView(buffer);
        if (valueType === 'int16') {
          dv16.setInt16(0, value, true);
        } else {
          dv16.setUint16(0, value, true);
        }
        break;
        
      case 'int8':
      case 'uint8':
        buffer = new ArrayBuffer(1);
        const dv8 = new DataView(buffer);
        if (valueType === 'int8') {
          dv8.setInt8(0, value);
        } else {
          dv8.setUint8(0, value);
        }
        break;
        
      case 'float':
        buffer = new ArrayBuffer(4);
        const dvFloat = new DataView(buffer);
        dvFloat.setFloat32(0, parseFloat(valueStr), true);
        break;
        
      default:
        writeResultElement.textContent = 'Unsupported value type';
        writeButton.disabled = false;
        writeButton.textContent = 'Write to Memory';
        return;
    }
    
    // Convert ArrayBuffer to Uint8Array
    const byteArray = new Uint8Array(buffer);
    
    // Write to memory
    writeMemory(pj64Process.pid, address, byteArray)
      .then(success => {
        if (success) {
          writeResultElement.textContent = `Successfully wrote ${valueType} value ${valueStr} to address 0x${address.toString(16).toUpperCase()}`;
          
          // Read back the value to verify
          return readMemoryAsArray(pj64Process.pid, address, buffer.byteLength);
        } else {
          writeResultElement.textContent = 'Failed to write to memory';
          return null;
        }
      })
      .then(result => {
        if (result && result.valueInfo) {
          const { valueInfo } = result;
          writeResultElement.textContent += '\n\nVerification read:';
          writeResultElement.textContent += `\nRaw bytes: ${valueInfo.rawBytes}`;
          
          switch (valueType) {
            case 'int32':
              writeResultElement.textContent += `\nRead back as Int32: ${valueInfo.asInt32}`;
              break;
            case 'uint32':
              writeResultElement.textContent += `\nRead back as UInt32: ${valueInfo.asUint32}`;
              break;
            case 'float':
              writeResultElement.textContent += `\nRead back as Float: ${valueInfo.asFloat}`;
              break;
            default:
              // For smaller types, still show int32/uint32 which contain our smaller values
              writeResultElement.textContent += `\nRead back as UInt32: ${valueInfo.asUint32}`;
              writeResultElement.textContent += `\nRead back as Int32: ${valueInfo.asInt32}`;
          }
        }
      })
      .catch(error => {
        writeResultElement.textContent = `Error writing to memory: ${error.message}`;
      })
      .finally(() => {
        // Re-enable button after write
        writeButton.disabled = false;
        writeButton.textContent = 'Write to Memory';
      });
      
  } catch (error) {
    writeResultElement.textContent = `Error: ${error.message}`;
    writeButton.disabled = false;
    writeButton.textContent = 'Write to Memory';
  }
}

// Function to scan for specific value
function scanForValue() {
  if (!pj64Process) {
    scanResultsElement.textContent = 'Project64 not detected. Cannot scan.';
    return;
  }
  
  // Disable button during scan
  scanButton.disabled = true;
  scanButton.textContent = 'Scanning...';
  
  const VALUE_TO_FIND = 4277009102;
  
  scanMemory(pj64Process.pid, VALUE_TO_FIND)
    .then(results => {
      if (results && results.length > 0) {
        // Count valid results (without errors)
        const validResults = results.filter(result => !result.error);
        
        // Create a table-like format for results
        let resultsText = 
          `Found ${results.length} addresses (${validResults.length} readable):\n` + 
          'Address            | Signed Value     | Unsigned Value   | Hex Value          | Notes\n' +
          '------------------ | ---------------- | ---------------- | ------------------ | ------------------\n';
          
        resultsText += results.map(result => {
          // Create different formatting for errors vs valid values
          if (result.error) {
            return `${result.hexAddress.padEnd(18, ' ')} | ${result.value.toString().padEnd(16, ' ')} | ${' '.padEnd(16, ' ')} | ${' '.padEnd(18, ' ')} | ${result.error}`;
          } else {
            // For unsigned values, we need to handle potential BigInts
            const unsignedStr = result.unsignedValue !== undefined ? 
              (typeof result.unsignedValue === 'bigint' ? 
                result.unsignedValue.toString() : 
                result.unsignedValue.toString()
              ) : '';
                
            return `${result.hexAddress.padEnd(18, ' ')} | ${
              result.value.toString().padEnd(16, ' ')
            } | ${
              unsignedStr.padEnd(16, ' ')
            } | ${
              (result.hexValue ? result.hexValue.padEnd(18, ' ') : ' '.padEnd(18, ' '))
            } | `;
          }
        }).join('\n');
        
        // If there are valid results, let's examine the first one in detail
        if (validResults.length > 0) {
          const firstResult = validResults[0];
          resultsText += '\n\n----- First Result Details -----\n';
          resultsText += `Address: ${firstResult.hexAddress}\n`;
          resultsText += `Value (signed): ${firstResult.value}\n`;
          resultsText += `Value (unsigned): ${firstResult.unsignedValue}\n`;
          resultsText += `Value (hex): ${firstResult.hexValue}\n`;
          
          // Read additional memory around this location
          resultsText += '\nReading surrounding memory...\n';
          
          // Promise to read memory at the first valid address
          const address = firstResult.address;
          const readPromise = readMemoryAsArray(pj64Process.pid, address, 16);
          
          readPromise.then(result => {
            if (result && result.valueInfo) {
              let detailText = '\n----- Memory Details -----\n';
              detailText += `Address: ${result.valueInfo.address}\n`;
              detailText += `Raw bytes: ${result.valueInfo.rawBytes}\n`;
              detailText += `As Int32: ${result.valueInfo.asInt32}\n`;
              detailText += `As Uint32: ${result.valueInfo.asUint32} (${result.valueInfo.hexUint32})\n`;
              
              if (result.valueInfo.asInt64 !== undefined) {
                detailText += `As Int64: ${result.valueInfo.asInt64}\n`;
                detailText += `As Uint64: ${result.valueInfo.asUint64} (${result.valueInfo.hexUint64})\n`;
              }
              
              if (result.valueInfo.asFloat !== undefined) {
                detailText += `As Float: ${result.valueInfo.asFloat}\n`;
              }
              
              if (result.valueInfo.asDouble !== undefined) {
                detailText += `As Double: ${result.valueInfo.asDouble}\n`;
              }
              
              scanResultsElement.textContent += detailText;
            }
          }).catch(error => {
            scanResultsElement.textContent += `\nError reading memory details: ${error.message}\n`;
          });
        }
        
        scanResultsElement.textContent = resultsText;
      } else {
        scanResultsElement.textContent = 'No addresses found with this value.';
      }
    })
    .catch(error => {
      scanResultsElement.textContent = `Error scanning memory: ${error.message}`;
    })
    .finally(() => {
      // Re-enable button after scan
      scanButton.disabled = false;
      scanButton.textContent = `Scan for Value (${VALUE_TO_FIND})`;
    });
}

// Add event listeners to buttons
scanButton.addEventListener('click', scanForValue);
writeButton.addEventListener('click', writeToMemory);

// Add event listeners to input fields for better UX
addressInput.addEventListener('input', () => {
  // Automatically prefix with 0x if user hasn't entered it
  const value = addressInput.value.trim();
  if (value.length > 0 && !value.startsWith('0x') && !value.startsWith('0X')) {
    addressInput.value = '0x' + value;
  }
});

// Check for Project64 on load and periodically
checkForProject64();
setInterval(checkForProject64, 5000); // Check every 5 seconds 