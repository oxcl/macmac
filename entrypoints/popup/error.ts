export function showError(message: string): void {
  const errorBar = document.getElementById('error-bar')!;
  errorBar.textContent = message;
  errorBar.classList.remove('hidden');
}

export function clearError(): void {
  const errorBar = document.getElementById('error-bar')!;
  errorBar.classList.add('hidden');
}
