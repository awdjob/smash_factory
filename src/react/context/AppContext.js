import React, { createContext, useState, useContext } from 'react';

// Create context
const AppContext = createContext();

// Custom hook to use the app context
export const useAppContext = () => useContext(AppContext);

// Provider component
export const AppProvider = ({ children }) => {
  const [pj64Pid, setPj64Pid] = useState(null);
  const [itemsEnabled, setItemsEnabled] = useState(true);
  // Values to be provided to consuming components
  const contextValue = {
    pj64Pid,
    setPj64Pid,
    itemsEnabled,
    setItemsEnabled,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}; 