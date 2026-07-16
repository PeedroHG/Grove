/**
 * Lets in-app flows that briefly send the app to the background — the image
 * picker, and later things like the Pluggy Connect flow — tell the
 * BiometricGate not to lock on that background transition. Without this,
 * opening the gallery bounces the user to the lock screen on return.
 *
 * Counter (not a boolean) so overlapping suppressors don't clear each other.
 */
let suppressed = 0;

export function suppressLock(): void {
  suppressed += 1;
}

export function releaseLock(): void {
  suppressed = Math.max(0, suppressed - 1);
}

export function isLockSuppressed(): boolean {
  return suppressed > 0;
}
