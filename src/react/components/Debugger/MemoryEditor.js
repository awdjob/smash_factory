import React, { useState } from 'react';

const MemoryEditor = ({ pid }) => {
  const [address, setAddress] = useState('');
  const [value, setValue] = useState('');
  const [valueType, setValueType] = useState('int32');
  const [writeResult, setWriteResult] = useState('');
  const [isWriting, setIsWriting] = useState(false);

  const handleAddressChange = (e) => {
    setAddress(e.target.value);
  };

  const handleValueChange = (e) => {
    setValue(e.target.value);
  };

  const handleTypeChange = (e) => {
    setValueType(e.target.value);
  };

  const writeToMemory = async () => {
    if (!address || !value) {
      setWriteResult('Please enter both address and value');
      return;
    }

    setIsWriting(true);
    setWriteResult('Writing to memory...');

    try {
      // Parse the address
      let addressValue;
      try {
        if (address.startsWith('0x')) {
          addressValue = parseInt(address, 16);
        } else {
          addressValue = parseInt(address);
        }
      } catch (e) {
        setWriteResult(`Invalid address format: ${e.message}`);
        setIsWriting(false);
        return;
      }

      // Parse the value based on type
      let valueStr = value;
      let parsedValue;
      
      try {
        if (valueStr.startsWith('0x')) {
          parsedValue = parseInt(valueStr, 16);
        } else if (valueType === 'float') {
          parsedValue = parseFloat(valueStr);
        } else {
          parsedValue = parseInt(valueStr);
        }
      } catch (e) {
        setWriteResult(`Invalid value format: ${e.message}`);
        setIsWriting(false);
        return;
      }

      // Create an ArrayBuffer for the value
      let buffer;
      
      switch (valueType) {
        case 'int32':
        case 'uint32':
          buffer = new ArrayBuffer(4);
          const dv32 = new DataView(buffer);
          if (valueType === 'int32') {
            dv32.setInt32(0, parsedValue, true);  // true for little-endian
          } else {
            dv32.setUint32(0, parsedValue, true);
          }
          break;
          
        case 'int16':
        case 'uint16':
          buffer = new ArrayBuffer(2);
          const dv16 = new DataView(buffer);
          if (valueType === 'int16') {
            dv16.setInt16(0, parsedValue, true);
          } else {
            dv16.setUint16(0, parsedValue, true);
          }
          break;
          
        case 'int8':
        case 'uint8':
          buffer = new ArrayBuffer(1);
          const dv8 = new DataView(buffer);
          if (valueType === 'int8') {
            dv8.setInt8(0, parsedValue);
          } else {
            dv8.setUint8(0, parsedValue);
          }
          break;
          
        case 'float':
          buffer = new ArrayBuffer(4);
          const dvFloat = new DataView(buffer);
          dvFloat.setFloat32(0, parsedValue, true);
          break;
          
        default:
          setWriteResult('Unsupported value type');
          setIsWriting(false);
          return;
      }
      
      // Convert ArrayBuffer to Uint8Array
      const byteArray = new Uint8Array(buffer);
      
      // Write to memory
      const success = await window.sfAPI.writeMemory(pid, addressValue, byteArray);
      
      if (success) {
        setWriteResult(`Successfully wrote ${valueType} value to ${address}`);
        
        // Optionally read back the value to confirm
        const readBuffer = await window.sfAPI.readMemoryAsArray(pid, addressValue, buffer.byteLength);
        if (readBuffer && readBuffer.length === buffer.byteLength) {
          let readValue;
          const readView = new DataView(new ArrayBuffer(buffer.byteLength));
          
          for (let i = 0; i < buffer.byteLength; i++) {
            readView.setUint8(i, readBuffer[i]);
          }
          
          switch (valueType) {
            case 'int32':
              readValue = readView.getInt32(0, true);
              break;
            case 'uint32':
              readValue = readView.getUint32(0, true);
              break;
            case 'int16':
              readValue = readView.getInt16(0, true);
              break;
            case 'uint16':
              readValue = readView.getUint16(0, true);
              break;
            case 'int8':
              readValue = readView.getInt8(0);
              break;
            case 'uint8':
              readValue = readView.getUint8(0);
              break;
            case 'float':
              readValue = readView.getFloat32(0, true);
              break;
          }
          
          setWriteResult(`Successfully wrote ${valueType} value to ${address}: ${readValue}`);
        }
      } else {
        setWriteResult('Failed to write to memory');
      }
    } catch (error) {
      console.error('Error writing to memory:', error);
      setWriteResult(`Error: ${error.message}`);
    } finally {
      setIsWriting(false);
    }
  };

  return (
    <div className="memory-editor">
      <h3>Memory Writer</h3>
      <div className="input-group">
        <label htmlFor="address-input">Address:</label>
        <input 
          type="text" 
          id="address-input" 
          value={address}
          onChange={handleAddressChange}
          placeholder="Enter hex address (e.g., 0x12345678)" 
        />
      </div>
      <div className="input-group">
        <label htmlFor="value-input">Value:</label>
        <input 
          type="text" 
          id="value-input" 
          value={value}
          onChange={handleValueChange}
          placeholder="Enter value (e.g., 1234 or 0xABCD)" 
        />
      </div>
      <div className="input-group">
        <label htmlFor="value-type">Type:</label>
        <select 
          id="value-type"
          value={valueType}
          onChange={handleTypeChange}
        >
          <option value="int32">Int32</option>
          <option value="uint32">UInt32</option>
          <option value="float">Float</option>
          <option value="int16">Int16</option>
          <option value="uint16">UInt16</option>
          <option value="int8">Int8</option>
          <option value="uint8">UInt8</option>
        </select>
      </div>
      <button 
        className="write-button" 
        onClick={writeToMemory}
        disabled={isWriting || !address || !value || !pid}
      >
        {isWriting ? "Writing..." : "Write to Memory"}
      </button>
      <div className="write-result">{writeResult}</div>
    </div>
  );
};

export default MemoryEditor; 