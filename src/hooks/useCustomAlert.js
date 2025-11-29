import { useState, useCallback } from 'react';

export function useCustomAlert() {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = useCallback(config => {
    setAlertConfig({
      visible: true,
      title: config.title || '',
      message: config.message || '',
      buttons: config.buttons || [],
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  return {
    alertConfig,
    showAlert,
    hideAlert,
  };
}
