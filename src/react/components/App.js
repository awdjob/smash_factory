import React from 'react';
import Debugger from './Debugger/Index';
import Project64 from './Project64/Index';
import ItemTable from './ItemTable/Index';
import Activity from './Activity/Index';
import sfLogo from './sf_logo.png';
import { AppProvider } from '../context/AppContext';

const App = () => {
  return (
    <AppProvider>
      <div className="flex flex-col justify-center items-center">
        <div className="flex-1 flex justify-center items-center logo-wrapper">
          <img src={sfLogo} alt="Smash Factory Logo" className="w-1/2" />
        </div>
        <div className="flex-1">
          <Project64 />
        </div>
        <div className="flex-1 flex">
          <div className="flex-1">
            <ItemTable />
          </div>
          <div className="flex-1">
            <Activity />
            {/* <Debugger /> */}
          </div>
        </div>
      </div>
    </AppProvider>
  );
};

export default App; 