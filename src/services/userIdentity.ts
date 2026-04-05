import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@jamaat_calc_device_user_id';

function randomSegment(len: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

/** Stable per-install user id for duplicate-join checks (no login required). */
export async function getOrCreateUserId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = `usr_${Date.now().toString(36)}_${randomSegment(8)}`;
  await AsyncStorage.setItem(STORAGE_KEY, id);
  return id;
}
