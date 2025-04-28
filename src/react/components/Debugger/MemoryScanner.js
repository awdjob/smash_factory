import React, { useState } from 'react';

const MemoryScanner = ({ pid }) => {
  const [searchValue, setSearchValue] = useState('');
  const [scanResults, setScanResults] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  const handleSearchValueChange = (e) => {
    setSearchValue(e.target.value);
  };

  const scanMemory = async () => {
    if (!searchValue) {
      setScanStatus('Please enter a value to search for');
      return;
    }

    setIsScanning(true);
    setScanStatus('Scanning memory...');
    setScanResults([]);

    try {
      // Parse the value
      let parsedValue;
      try {
        if (searchValue.startsWith('0x')) {
          parsedValue = parseInt(searchValue, 16);
        } else {
          parsedValue = parseInt(searchValue);
        }
      } catch (e) {
        setScanStatus(`Invalid value format: ${e.message}`);
        setIsScanning(false);
        return;
      }

      // Perform the scan
      const results = await window.sfAPI.scanMemory(pid, parsedValue);
      
      if (results && results.length > 0) {
        setScanResults(results);
        setScanStatus(`Found ${results.length} matches`);
      } else {
        setScanStatus('No matches found');
      }
    } catch (error) {
      console.error('Error scanning memory:', error);
      setScanStatus(`Error: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="memory-scanner">
      <h3>Memory Scanner</h3>
      <div className="input-group">
        <label htmlFor="search-value">Search Value:</label>
        <input 
          type="text" 
          id="search-value" 
          value={searchValue}
          onChange={handleSearchValueChange}
          placeholder="Enter value to find (e.g., 1234 or 0xABCD)" 
        />
      </div>
      <button 
        className="scan-button" 
        onClick={scanMemory}
        disabled={isScanning || !searchValue || !pid}
      >
        {isScanning ? "Scanning..." : "Scan for Value"}
      </button>
      <div className="scan-status">{scanStatus}</div>

      {scanResults.length > 0 && (
        <div className="results-container">
          <h4>Results:</h4>
          <table className="results-table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Value</th>
                <th>Hex Value</th>
              </tr>
            </thead>
            <tbody>
              {scanResults.map((result, index) => (
                <tr key={index}>
                  <td>{result.hexAddress}</td>
                  <td>{result.value}</td>
                  <td>{result.hexValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MemoryScanner; 