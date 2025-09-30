import { useCallback, useState } from 'react';
import { AdminMessageState, AdminMessageType } from '../components/AdminMessage';

export const useAdminMessage = () => {
  const [message, setMessage] = useState<AdminMessageState | null>(null);

  const showMessage = useCallback((type: AdminMessageType, text: string) => {
    setMessage({ type, text });
  }, []);

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  return {
    message,
    showMessage,
    clearMessage
  };
};
