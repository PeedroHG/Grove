import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { releaseLock, suppressLock } from '@/features/auth/lockSuppression';

/** Opens the gallery, returns the picked (cropped) image URI, or null. */
export async function pickAvatar(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  // The picker/crop backgrounds the app; keep the biometric lock from firing.
  suppressLock();
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return null;
    return result.assets[0].uri;
  } finally {
    // Release a tick later so the background→active transition settles first.
    setTimeout(releaseLock, 800);
  }
}

/**
 * Best-effort copy of the picked image into the app's document directory so
 * it survives the OS clearing the picker cache. Returns the stable URI only
 * if the copy verifiably succeeded; otherwise returns the original URI so the
 * caller always has something displayable. Async so a slow copy never blocks
 * showing the image.
 */
export async function persistAvatar(sourceUri: string): Promise<string> {
  try {
    const dest = new File(Paths.document, 'avatar.jpg');
    if (dest.exists) dest.delete();
    new File(sourceUri).copy(dest);
    return dest.exists ? dest.uri : sourceUri;
  } catch {
    return sourceUri;
  }
}
