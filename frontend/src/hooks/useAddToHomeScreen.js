import { useState, useEffect } from 'react';

/**
 * Custom hook to detect and handle "Add to Home Screen" functionality
 * Works for both iOS and Android devices
 */
export const useAddToHomeScreen = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Detect if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Detect if app is already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the default mini-infobar from appearing
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  /**
   * Prompt user to install the app (Android/Chrome)
   */
  const promptToInstall = async () => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  };

  /**
   * Show iOS installation instructions
   */
  const showIOSInstallInstructions = () => {
    setShowIOSInstructions(true);
  };

  /**
   * Check if the app can be installed
   */
  const canInstall = !isStandalone && (deferredPrompt !== null || isIOS);

  return {
    canInstall,
    isIOS,
    isStandalone,
    showIOSInstructions,
    promptToInstall,
    showIOSInstallInstructions,
    setShowIOSInstructions,
  };
};

