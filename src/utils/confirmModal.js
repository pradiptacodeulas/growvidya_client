const listeners = new Set();

export const subscribeConfirmModal = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const emitModalRequest = (request) => {
  listeners.forEach((fn) => fn(request));
};

/**
 * Show a Bootstrap confirmation modal and resolve to true (confirmed) or false (cancelled).
 * @param {string | { title?: string, message: string, confirmText?: string, cancelText?: string, variant?: 'danger' | 'primary' | 'warning' | 'success' }} options
 * @returns {Promise<boolean>}
 */
export const confirmAction = (options) => {
  const normalized =
    typeof options === 'string'
      ? {
          title: 'Confirm Action',
          message: options,
          confirmText: 'Yes, Proceed',
          cancelText: 'Cancel',
          variant: 'danger',
        }
      : {
          title: options?.title || 'Confirm Action',
          message: options?.message || 'Are you sure you want to proceed?',
          confirmText: options?.confirmText || 'Yes, Proceed',
          cancelText: options?.cancelText || 'Cancel',
          variant: options?.variant || 'danger',
        };

  return new Promise((resolve) => {
    emitModalRequest({
      mode: 'confirm',
      ...normalized,
      resolve,
    });
  });
};

/**
 * Show a Bootstrap input prompt modal and resolve to the entered string or null if cancelled.
 * @param {{ title?: string, message?: string, placeholder?: string, defaultValue?: string, confirmText?: string, cancelText?: string }} options
 * @returns {Promise<string | null>}
 */
export const promptInput = (options = {}) => {
  return new Promise((resolve) => {
    emitModalRequest({
      mode: 'prompt',
      title: options.title || 'Enter Value',
      message: options.message || '',
      placeholder: options.placeholder || '',
      defaultValue: options.defaultValue || '',
      confirmText: options.confirmText || 'Apply',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'primary',
      resolve,
    });
  });
};
