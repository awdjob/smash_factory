import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

const Project64 = () => {
  const { pj64Pid, setPj64Pid } = useAppContext();

  useEffect(() => {
    const detectPj64Process = async () => {
      try {
        const processes = await window.sfAPI.listProcesses();
        const pj64 = processes.find(p =>
          p.name.toLowerCase().includes('project64') ||
          p.name.toLowerCase().includes('pj64')
        );

        if (pj64) {
          setPj64Pid(pj64.pid);
        } else {
          console.log('Project64 not detected');
        }
      } catch (error) {
        console.error('Error detecting processes:', error);
      }
    };

    const interval = setInterval(detectPj64Process, 1000);

    detectPj64Process();

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col justify-center items-center p-4">
      <h2 className="text-yellow-300 font-bold text-xl mb-2">Project64 Status:</h2>
      <p className={`text-white ${pj64Pid ? 'text-green-300' : 'text-red-300'} font-medium text-lg`}>
        {pj64Pid ? `Detected (PID: ${pj64Pid})` : 'Not detected'}
      </p>
    </div>
  );
};

export default Project64;
