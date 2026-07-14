import AsyncStorage from '@react-native-async-storage/async-storage';

const CURSOR_KEY_PREFIX = 'grove.sync.cursor.';
const LAST_SYNC_KEY = 'grove.sync.lastSyncAt';

export async function getTableCursor(tableName: string): Promise<string | null> {
  return AsyncStorage.getItem(CURSOR_KEY_PREFIX + tableName);
}

export async function setTableCursor(tableName: string, isoTimestamp: string): Promise<void> {
  await AsyncStorage.setItem(CURSOR_KEY_PREFIX + tableName, isoTimestamp);
}

export async function getLastSyncAt(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}

export async function setLastSyncAt(isoTimestamp: string): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, isoTimestamp);
}
