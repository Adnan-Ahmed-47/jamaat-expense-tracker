import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { BackupPayload } from '../db/repositories';
import { exportFullBackup, importFullBackup } from '../db/repositories';

export async function shareBackupJson(db: SQLiteDatabase, firebaseUid?: string): Promise<void> {
  const payload = await exportFullBackup(db, firebaseUid);
  const json = JSON.stringify(payload, null, 2);
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) throw new Error('No writable directory');
  const path = `${base}jamaat-calc-backup.json`;
  await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Tabligh Expenses backup',
    });
  }
}

export async function pickAndParseBackup(): Promise<BackupPayload | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]?.uri) return null;
  const uri = res.assets[0].uri;
  const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  const data = JSON.parse(text) as BackupPayload;
  if (!data || data.version !== 1 || !Array.isArray(data.jamaats)) {
    throw new Error('Invalid backup file');
  }
  return data;
}

export async function restoreBackup(db: SQLiteDatabase, payload: BackupPayload): Promise<void> {
  await importFullBackup(db, payload);
}
