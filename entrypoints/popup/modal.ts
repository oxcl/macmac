export type ModalResult = { confirmed: false } | { confirmed: true; value?: string };

export function showConfirm(message: string): Promise<ModalResult> {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay')!;
    const title = document.getElementById('modal-title')!;
    const body = document.getElementById('modal-body')!;
    const cancelBtn = document.getElementById('modal-cancel')!;
    const confirmBtn = document.getElementById('modal-confirm')!;

    title.textContent = 'Confirm';
    body.textContent = message;
    overlay.classList.remove('hidden');

    function cleanup() {
      overlay.classList.add('hidden');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKeydown);
    }

    function onCancel() {
      cleanup();
      resolve({ confirmed: false });
    }
    function onConfirm() {
      cleanup();
      resolve({ confirmed: true });
    }
    function onOverlayClick(e: MouseEvent) {
      if (e.target === overlay) {
        cleanup();
        resolve({ confirmed: false });
      }
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup();
        resolve({ confirmed: false });
      }
    }

    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeydown);
  });
}

export function showPrompt(defaultValue: string): Promise<ModalResult> {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay')!;
    const title = document.getElementById('modal-title')!;
    const body = document.getElementById('modal-body')!;
    const cancelBtn = document.getElementById('modal-cancel')!;
    const confirmBtn = document.getElementById('modal-confirm')!;

    title.textContent = 'Rename Account';
    body.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue;
    body.appendChild(input);
    overlay.classList.remove('hidden');
    input.focus();
    input.select();

    function cleanup() {
      overlay.classList.add('hidden');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
      input.removeEventListener('keydown', onInputKeydown);
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKeydown);
    }

    function onCancel() {
      cleanup();
      resolve({ confirmed: false });
    }
    function onConfirm() {
      cleanup();
      resolve({ confirmed: true, value: input.value });
    }
    function onInputKeydown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        cleanup();
        resolve({ confirmed: true, value: input.value });
      }
    }
    function onOverlayClick(e: MouseEvent) {
      if (e.target === overlay) {
        cleanup();
        resolve({ confirmed: false });
      }
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup();
        resolve({ confirmed: false });
      }
    }

    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
    input.addEventListener('keydown', onInputKeydown);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeydown);
  });
}
