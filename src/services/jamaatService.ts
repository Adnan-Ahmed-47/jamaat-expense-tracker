import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  getJamaatByFirebaseDocId,
  insertJamaat,
  replaceJamaatChildrenFromCloud,
  updateJamaatCloudIds,
  type CloudExpenseRow,
  type CloudMemberRow,
} from '../db/repositories';
import { getDb, isFirebaseConfigured } from './firebaseConfig';
import { getOrCreateUserId } from './userIdentity';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function coerceYmd(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v;
  const toDate = (v as { toDate?: () => Date }).toDate;
  if (typeof toDate === 'function') {
    const d = toDate.call(v);
    if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return '';
}

function cloudMemberFromDoc(docSnap: QueryDocumentSnapshot<DocumentData>): CloudMemberRow {
  const data = docSnap.data();
  const leave = data.leaveDate;
  return {
    id: docSnap.id,
    userId: data.userId ?? null,
    name: String(data.name ?? ''),
    contribution: Number(data.contribution ?? 0),
    joinDate: coerceYmd(data.joinDate),
    leaveDate: leave == null || leave === '' ? null : coerceYmd(leave),
  };
}

function cloudExpenseFromDoc(docSnap: QueryDocumentSnapshot<DocumentData>): CloudExpenseRow {
  const data = docSnap.data();
  const cat = data.category;
  const category: string =
    cat === 'Food' || cat === 'Travel' || cat === 'Misc' ? cat : 'Misc';
  return {
    id: docSnap.id,
    title: String(data.title ?? ''),
    amount: Number(data.amount ?? 0),
    expenseDate: coerceYmd(data.expenseDate),
    category,
    paidByMemberFirestoreId: String(data.paidByMemberFirestoreId ?? ''),
  };
}

export function generateInviteCodeCandidate(): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return `JAM-${suffix}`;
}

export function normalizeInviteCode(input: string): string {
  const trimmed = input.trim().toUpperCase().replace(/\s+/g, '');
  if (trimmed.startsWith('JAM-')) return trimmed;
  return `JAM-${trimmed}`;
}

async function isInviteCodeTaken(code: string): Promise<boolean> {
  const db = getDb();
  const q = query(collection(db, 'jamaats'), where('inviteCode', '==', code), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

/** Unique JAM-XXXXXX (retries on collision). */
export async function generateInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const code = generateInviteCodeCandidate();
    if (!(await isInviteCodeTaken(code))) return code;
  }
  throw new Error('Could not generate a unique invite code');
}

export type CreateJamaatCloudInput = {
  name: string;
  startDate: string;
  endDate: string;
  createdByUserId: string;
};

export async function createJamaatCloud(data: CreateJamaatCloudInput): Promise<{
  firebaseDocId: string;
  inviteCode: string;
}> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }
  const db = getDb();
  const inviteCode = await generateInviteCode();
  const ref = await addDoc(collection(db, 'jamaats'), {
    inviteCode,
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    createdAt: serverTimestamp(),
    createdByUserId: data.createdByUserId,
  });
  return { firebaseDocId: ref.id, inviteCode };
}

export async function updateJamaatDocumentCloud(
  firebaseDocId: string,
  patch: { name?: string; startDate?: string; endDate?: string }
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getDb();
  await updateDoc(doc(db, 'jamaats', firebaseDocId), patch);
}

export async function findJamaatDocByInviteCode(
  code: string
): Promise<QueryDocumentSnapshot<DocumentData> | null> {
  if (!isFirebaseConfigured()) return null;
  const db = getDb();
  const normalized = normalizeInviteCode(code);
  const q = query(collection(db, 'jamaats'), where('inviteCode', '==', normalized), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0]!;
}

export async function isUserMemberOfJamaatCloud(
  jamaatFirestoreId: string,
  userId: string
): Promise<boolean> {
  const db = getDb();
  const q = query(
    collection(db, 'members'),
    where('jamaatFirestoreId', '==', jamaatFirestoreId),
    where('userId', '==', userId),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export type CloudMemberPayload = {
  jamaatFirestoreId: string;
  userId: string | null;
  name: string;
  contribution: number;
  joinDate: string;
  leaveDate: string | null;
};

export async function addMemberDocumentCloud(payload: CloudMemberPayload): Promise<string> {
  const db = getDb();
  const ref = await addDoc(collection(db, 'members'), payload);
  return ref.id;
}

export async function updateMemberDocumentCloud(
  firestoreMemberId: string,
  patch: Partial<CloudMemberPayload>
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'members', firestoreMemberId), patch);
}

export async function deleteMemberDocumentCloud(firestoreMemberId: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, 'members', firestoreMemberId));
}

export type CloudExpensePayload = {
  jamaatFirestoreId: string;
  title: string;
  amount: number;
  expenseDate: string;
  category: string;
  paidByMemberFirestoreId: string;
};

export async function addExpenseDocumentCloud(payload: CloudExpensePayload): Promise<string> {
  const db = getDb();
  const ref = await addDoc(collection(db, 'expenses'), payload);
  return ref.id;
}

export async function updateExpenseDocumentCloud(
  firestoreExpenseId: string,
  patch: Partial<CloudExpensePayload>
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'expenses', firestoreExpenseId), patch);
}

export async function deleteExpenseDocumentCloud(firestoreExpenseId: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, 'expenses', firestoreExpenseId));
}

export async function fetchMembersForJamaatCloud(jamaatFirestoreId: string) {
  const db = getDb();
  const q = query(collection(db, 'members'), where('jamaatFirestoreId', '==', jamaatFirestoreId));
  const snap = await getDocs(q);
  return snap.docs;
}

export async function fetchExpensesForJamaatCloud(jamaatFirestoreId: string) {
  const db = getDb();
  const q = query(collection(db, 'expenses'), where('jamaatFirestoreId', '==', jamaatFirestoreId));
  const snap = await getDocs(q);
  return snap.docs;
}

export type JoinJamaatErrorCode = 'invalid' | 'duplicate' | 'network' | 'firebase';

export async function joinJamaatByCode(
  dbSqlite: SQLiteDatabase,
  rawCode: string,
  displayName: string,
  contribution: number,
  joinDate: string
): Promise<{ localJamaatId: number; error?: JoinJamaatErrorCode; message?: string }> {
  if (!isFirebaseConfigured()) {
    return { localJamaatId: 0, error: 'firebase', message: 'Firebase not configured' };
  }
  try {
    const normalized = normalizeInviteCode(rawCode);
    const jDoc = await findJamaatDocByInviteCode(normalized);
    if (!jDoc) {
      return { localJamaatId: 0, error: 'invalid', message: 'Invalid Code' };
    }
    const firebaseDocId = jDoc.id;
    const d = jDoc.data();
    const userId = await getOrCreateUserId();
    const existingLocal = await getJamaatByFirebaseDocId(dbSqlite, firebaseDocId);
    const alreadyCloud = await isUserMemberOfJamaatCloud(firebaseDocId, userId);

    if (!alreadyCloud) {
      await addMemberDocumentCloud({
        jamaatFirestoreId: firebaseDocId,
        userId,
        name: displayName.trim(),
        contribution,
        joinDate,
        leaveDate: null,
      });
    }

    const memberDocs = await fetchMembersForJamaatCloud(firebaseDocId);
    const expenseDocs = await fetchExpensesForJamaatCloud(firebaseDocId);
    const memberRows = memberDocs.map(cloudMemberFromDoc);
    const expenseRows = expenseDocs.map(cloudExpenseFromDoc);

    let localJamaatId: number;
    if (existingLocal) {
      localJamaatId = existingLocal.id;
    } else {
      const start = coerceYmd(d.startDate) || joinDate;
      const end = coerceYmd(d.endDate) || joinDate;
      localJamaatId = await insertJamaat(dbSqlite, String(d.name ?? 'Jamaat'), start, end);
      await updateJamaatCloudIds(
        dbSqlite,
        localJamaatId,
        firebaseDocId,
        String(d.inviteCode ?? normalized)
      );
    }

    await replaceJamaatChildrenFromCloud(dbSqlite, localJamaatId, memberRows, expenseRows);

    return { localJamaatId };
  } catch (e) {
    console.warn('joinJamaatByCode', e);
    return { localJamaatId: 0, error: 'network', message: 'Network error' };
  }
}

/** Firestore listeners → debounced SQLite replace + callback. */
export function subscribeJamaatRealtime(
  jamaatFirestoreId: string,
  dbSqlite: SQLiteDatabase,
  localJamaatId: number,
  onSynced: () => void
): Unsubscribe {
  const db = getDb();
  const qM = query(collection(db, 'members'), where('jamaatFirestoreId', '==', jamaatFirestoreId));
  const qE = query(collection(db, 'expenses'), where('jamaatFirestoreId', '==', jamaatFirestoreId));

  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = async () => {
    try {
      const [mSnap, eSnap] = await Promise.all([getDocs(qM), getDocs(qE)]);
      await replaceJamaatChildrenFromCloud(
        dbSqlite,
        localJamaatId,
        mSnap.docs.map(cloudMemberFromDoc),
        eSnap.docs.map(cloudExpenseFromDoc)
      );
      onSynced();
    } catch (e) {
      console.warn('subscribeJamaatRealtime sync', e);
    }
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, 200);
  };

  void run();
  const unsub1 = onSnapshot(qM, schedule);
  const unsub2 = onSnapshot(qE, schedule);

  return () => {
    if (timer) clearTimeout(timer);
    unsub1();
    unsub2();
  };
}
