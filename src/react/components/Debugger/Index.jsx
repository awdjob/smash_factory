import React, { useState, useEffect } from 'react';
import MemoryEditor from './MemoryEditor';
import MemoryScanner from './MemoryScanner';

import './styles.css';

const Debugger = () => {
  const [pj64Process, setPj64Process] = useState(null);
  
  useEffect(() => {
    // Detect Project64 process on component mount
    const detectPj64Process = async () => {
      try {
        const processes = await window.sfAPI.listProcesses();
        const pj64 = processes.find(p => 
          p.name.toLowerCase().includes('project64') || 
          p.name.toLowerCase().includes('pj64')
        );
        
        if (pj64) {
          console.log('Project64 detected:', pj64);
          setPj64Process(pj64);
        } else {
          console.log('Project64 not detected');
        }
      } catch (error) {
        console.error('Error detecting processes:', error);
      }
    };
    
    detectPj64Process();
    
    // Poll for Project64 process every 5 seconds
    const interval = setInterval(detectPj64Process, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">      
      <div className="process-info">
        <p>Project64 process: <span className={pj64Process ? "detected" : "not-detected"}>
          {pj64Process ? `Detected (PID: ${pj64Process.pid})` : 'Not detected'}
        </span></p>
      </div>
      
      {pj64Process && (
        <>
          <MemoryEditor pid={pj64Process.pid} />
          <MemoryScanner pid={pj64Process.pid} />
        </>
      )}
      
      {!pj64Process && (
        <div className="no-process-message">
          <p>Please start Project64 to use memory tools.</p>
        </div>
      )}
    </div>
  );
};

export default Debugger; 