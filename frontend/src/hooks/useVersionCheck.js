import { useState, useEffect } from 'react';
import { BUILD_INFO } from '../version';

const useVersionCheck = (checkInterval = 300000) => { // 5 minutes default
  const [isNewVersionAvailable, setIsNewVersionAvailable] = useState(false);
  const [serverVersion, setServerVersion] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/version.json?' + Date.now()); // Cache bust
      const serverVersionData = await response.json();
      setServerVersion(serverVersionData);
      
      // Compare build timestamps
      if (serverVersionData.buildTimestamp > BUILD_INFO.buildTimestamp) {
        setIsNewVersionAvailable(true);
      } else {
        setIsNewVersionAvailable(false);
      }
    } catch (error) {
      console.log('Version check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkForUpdates();

    // Set up interval for periodic checks
    const interval = setInterval(checkForUpdates, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval]);

  const refreshPage = () => {
    window.location.reload();
  };

  return {
    isNewVersionAvailable,
    serverVersion,
    currentVersion: BUILD_INFO,
    isChecking,
    checkForUpdates,
    refreshPage
  };
};

export default useVersionCheck;
