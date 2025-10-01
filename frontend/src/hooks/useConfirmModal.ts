import { useCallback, useState } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const useConfirmModal = () => {
  const [confirmConfig, setConfirmConfig] = useState<ConfirmOptions | null>(null);

  const requestConfirmation = useCallback((options: ConfirmOptions) => {
    setConfirmConfig(options);
  }, []);

  const confirm = useCallback(() => {
    if (!confirmConfig) {
      return;
    }
    const action = confirmConfig.onConfirm;
    setConfirmConfig(null);
    action();
  }, [confirmConfig]);

  const cancel = useCallback(() => {
    if (confirmConfig?.onCancel) {
      confirmConfig.onCancel();
    }
    setConfirmConfig(null);
  }, [confirmConfig]);

  return {
    confirmConfig,
    requestConfirmation,
    confirm,
    cancel
  };
};
