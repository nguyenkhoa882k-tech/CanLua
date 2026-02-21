import { useState, useCallback } from 'react';

export const useToast = () => {
  const [toastConfig, setToastConfig] = useState({
    visible: false,
    message: '',
    duration: 2000,
  });

  const showToast = useCallback((message, duration = 2000) => {
    setToastConfig({
      visible: true,
      message,
      duration,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToastConfig(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  return {
    toastConfig,
    showToast,
    hideToast,
  };
};
