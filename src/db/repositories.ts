import type { SQLiteDatabase } from 'expo-sqlite';
import type { Expense, ExpenseCategory, Jamaat, Member } from '../types/models';

function nowIso(): string {
  return new Date().toISOString();
}

type JamaatRow = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
  firebase_doc_id?: string | null;
  invite_code?: string | null;
};

type MemberRow = {
  id: number;
  jamaat_id: number;
  name: string;
  contribution: number;
  join_date: string;
  leave_date: string | null;
  user_id?: string | null;
  firestore_member_id?: string | null;
};

type ExpenseRow = {
  id: number;
  jamaat_id: number;
  title: string;
  amount: number;
  expense_date: string;
  paid_by_member_id: number;
  category: string;
  firestore_expense_id?: string | null;
};

function mapJamaat(r: JamaatRow): Jamaat {
  return {
    id: r.id,
    name: r.name,
    startDate: r.start_date,
    endDate: r.end_date,
    createdAt: r.created_at,
    firebaseDocId: r.firebase_doc_id ?? null,
    inviteCode: r.invite_code ?? null,
  };
}

function mapMember(r: MemberRow): Member {
  return {
    id: r.id,
    jamaatId: r.jamaat_id,
    name: r.name,
    contribution: r.contribution,
    joinDate: r.join_date,
    leaveDate: r.leave_date,
    userId: r.user_id ?? null,
    firestoreMemberId: r.firestore_member_id ?? null,
  };
}

function mapExpense(r: ExpenseRow): Expense {
  return {
    id: r.id,
    jamaatId: r.jamaat_id,
    title: r.title,
    amount: r.amount,
    expenseDate: r.expense_date,
    paidByMemberId: r.paid_by_member_id,
    category: r.category as ExpenseCategory,
    firestoreExpenseId: r.firestore_expense_id ?? null,
  };
}

export async function getAllJamaats(db: SQLiteDatabase): Promise<Jamaat[]> {
  const rows = await db.getAllAsync<JamaatRow>(
    `SELECT * FROM jamaats ORDER BY datetime(created_at) DESC`
  );
  return rows.map(mapJamaat);
}

export async function getJamaatById(db: SQLiteDatabase, id: number): Promise<Jamaat | null> {
  const row = await db.getFirstAsync<JamaatRow>(`SELECT * FROM jamaats WHERE id = ?`, id);
  return row ? mapJamaat(row) : null;
}

export async function getJamaatByFirebaseDocId(
  db: SQLiteDatabase,
  firebaseDocId: string
): Promise<Jamaat | null> {
  const row = await db.getFirstAsync<JamaatRow>(
    `SELECT * FROM jamaats WHERE firebase_doc_id = ? LIMIT 1`,
    firebaseDocId
  );
  return row ? mapJamaat(row) : null;
}

export async function insertJamaat(
  db: SQLiteDatabase,
  name: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const created = nowIso();
  const res = await db.runAsync(
    `INSERT INTO jamaats (name, start_date, end_date, created_at) VALUES (?, ?, ?, ?)`,
    name,
    startDate,
    endDate,
    created
  );
  return Number(res.lastInsertRowId);
}

export async function updateJamaatCloudIds(
  db: SQLiteDatabase,
  localId: number,
  firebaseDocId: string,
  inviteCode: string
): Promise<void> {
  await db.runAsync(
    `UPDATE jamaats SET firebase_doc_id = ?, invite_code = ? WHERE id = ?`,
    firebaseDocId,
    inviteCode,
    localId
  );
}

export async function updateJamaat(
  db: SQLiteDatabase,
  id: number,
  name: string,
  startDate: string,
  endDate: string
): Promise<void> {
  await db.runAsync(
    `UPDATE jamaats SET name = ?, start_date = ?, end_date = ? WHERE id = ?`,
    name,
    startDate,
    endDate,
    id
  );
}

export async function reconcileJamaatDateBounds(db: SQLiteDatabase, jamaatId: number): Promise<boolean> {
  const j = await getJamaatById(db, jamaatId);
  if (!j) return false;
  const expenses = await getExpensesByJamaat(db, jamaatId);
  const members = await getMembersByJamaat(db, jamaatId);

  let start = j.startDate;
  let end = j.endDate;

  for (const e of expenses) {
    if (e.expenseDate < start) start = e.expenseDate;
    if (e.expenseDate > end) end = e.expenseDate;
  }
  for (const m of members) {
    if (m.joinDate < start) start = m.joinDate;
    if (m.leaveDate && m.leaveDate > end) end = m.leaveDate;
  }

  if (start > end) {
    const t = start;
    start = end;
    end = t;
  }

  if (start !== j.startDate || end !== j.endDate) {
    await updateJamaat(db, jamaatId, j.name, start, end);
    return true;
  }
  return false;
}

export async function deleteJamaat(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM jamaats WHERE id = ?`, id);
}

export async function getMemberById(db: SQLiteDatabase, id: number): Promise<Member | null> {
  const row = await db.getFirstAsync<MemberRow>(`SELECT * FROM members WHERE id = ?`, id);
  return row ? mapMember(row) : null;
}

export async function getMembersByJamaat(db: SQLiteDatabase, jamaatId: number): Promise<Member[]> {
  const rows = await db.getAllAsync<MemberRow>(
    `SELECT * FROM members WHERE jamaat_id = ? ORDER BY join_date ASC, id ASC`,
    jamaatId
  );
  return rows.map(mapMember);
}

export type InsertMemberOptions = {
  userId?: string | null;
  firestoreMemberId?: string | null;
};

export async function insertMember(
  db: SQLiteDatabase,
  jamaatId: number,
  name: string,
  contribution: number,
  joinDate: string,
  leaveDate: string | null,
  options?: InsertMemberOptions
): Promise<number> {
  const res = await db.runAsync(
    `INSERT INTO members (jamaat_id, name, contribution, join_date, leave_date, user_id, firestore_member_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    jamaatId,
    name,
    contribution,
    joinDate,
    leaveDate,
    options?.userId ?? null,
    options?.firestoreMemberId ?? null
  );
  const newId = Number(res.lastInsertRowId);
  await reconcileJamaatDateBounds(db, jamaatId);
  return newId;
}

export async function updateMember(
  db: SQLiteDatabase,
  id: number,
  name: string,
  contribution: number,
  joinDate: string,
  leaveDate: string | null
): Promise<void> {
  await db.runAsync(
    `UPDATE members SET name = ?, contribution = ?, join_date = ?, leave_date = ? WHERE id = ?`,
    name,
    contribution,
    joinDate,
    leaveDate,
    id
  );
  const row = await db.getFirstAsync<{ jamaat_id: number }>(`SELECT jamaat_id FROM members WHERE id = ?`, id);
  if (row) await reconcileJamaatDateBounds(db, row.jamaat_id);
}

export async function deleteMember(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM members WHERE id = ?`, id);
}

export type InsertExpenseOptions = {
  firestoreExpenseId?: string | null;
};

export async function insertExpense(
  db: SQLiteDatabase,
  jamaatId: number,
  title: string,
  amount: number,
  expenseDate: string,
  paidByMemberId: number,
  category: ExpenseCategory,
  options?: InsertExpenseOptions
): Promise<number> {
  const res = await db.runAsync(
    `INSERT INTO expenses (jamaat_id, title, amount, expense_date, paid_by_member_id, category, firestore_expense_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    jamaatId,
    title,
    amount,
    expenseDate,
    paidByMemberId,
    category,
    options?.firestoreExpenseId ?? null
  );
  const newId = Number(res.lastInsertRowId);
  await reconcileJamaatDateBounds(db, jamaatId);
  return newId;
}

export async function updateExpense(
  db: SQLiteDatabase,
  id: number,
  title: string,
  amount: number,
  expenseDate: string,
  paidByMemberId: number,
  category: ExpenseCategory
): Promise<void> {
  await db.runAsync(
    `UPDATE expenses SET title = ?, amount = ?, expense_date = ?, paid_by_member_id = ?, category = ? WHERE id = ?`,
    title,
    amount,
    expenseDate,
    paidByMemberId,
    category,
    id
  );
  const row = await db.getFirstAsync<{ jamaat_id: number }>(`SELECT jamaat_id FROM expenses WHERE id = ?`, id);
  if (row) await reconcileJamaatDateBounds(db, row.jamaat_id);
}

export async function deleteExpense(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM expenses WHERE id = ?`, id);
}

export async function getExpensesByJamaat(db: SQLiteDatabase, jamaatId: number): Promise<Expense[]> {
  const rows = await db.getAllAsync<ExpenseRow>(
    `SELECT * FROM expenses WHERE jamaat_id = ? ORDER BY expense_date DESC, id DESC`,
    jamaatId
  );
  return rows.map(mapExpense);
}

export type CloudMemberRow = {
  id: string;
  userId?: string | null;
  name?: string;
  contribution?: number;
  joinDate?: string;
  leaveDate?: string | null;
};

export type CloudExpenseRow = {
  id: string;
  title?: string;
  amount?: number;
  expenseDate?: string;
  category?: string;
  paidByMemberFirestoreId?: string;
};

/** Replace all members & expenses for a jamaat from Firestore snapshot (real-time sync / join). */
export async function replaceJamaatChildrenFromCloud(
  db: SQLiteDatabase,
  localJamaatId: number,
  memberRows: CloudMemberRow[],
  expenseRows: CloudExpenseRow[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM expenses WHERE jamaat_id = ?`, localJamaatId);
    await db.runAsync(`DELETE FROM members WHERE jamaat_id = ?`, localJamaatId);

    const fsToLocal = new Map<string, number>();

    for (const m of memberRows) {
      const name = String(m.name ?? '');
      const contribution = Number(m.contribution ?? 0);
      const joinDate = String(m.joinDate ?? '');
      const leaveDate = m.leaveDate != null ? String(m.leaveDate) : null;
      const res = await db.runAsync(
        `INSERT INTO members (jamaat_id, name, contribution, join_date, leave_date, user_id, firestore_member_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        localJamaatId,
        name,
        contribution,
        joinDate,
        leaveDate,
        m.userId ?? null,
        m.id
      );
      fsToLocal.set(m.id, Number(res.lastInsertRowId));
    }

    for (const e of expenseRows) {
      const payerFs = e.paidByMemberFirestoreId;
      if (!payerFs) continue;
      const localPayer = fsToLocal.get(payerFs);
      if (localPayer === undefined) continue;
      await db.runAsync(
        `INSERT INTO expenses (jamaat_id, title, amount, expense_date, paid_by_member_id, category, firestore_expense_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        localJamaatId,
        String(e.title ?? ''),
        Number(e.amount ?? 0),
        String(e.expenseDate ?? ''),
        localPayer,
        String(e.category ?? 'Misc'),
        e.id
      );
    }
  });
  await reconcileJamaatDateBounds(db, localJamaatId);
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  jamaats: Jamaat[];
  members: Member[];
  expenses: Expense[];
}

export async function exportFullBackup(db: SQLiteDatabase): Promise<BackupPayload> {
  const jamaats = await getAllJamaats(db);
  const members: Member[] = [];
  const expenses: Expense[] = [];
  for (const j of jamaats) {
    members.push(...(await getMembersByJamaat(db, j.id)));
    expenses.push(...(await getExpensesByJamaat(db, j.id)));
  }
  return {
    version: 1,
    exportedAt: nowIso(),
    jamaats,
    members,
    expenses,
  };
}

export async function importFullBackup(db: SQLiteDatabase, payload: BackupPayload): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`DELETE FROM expenses`);
    await db.execAsync(`DELETE FROM members`);
    await db.execAsync(`DELETE FROM jamaats`);

    const idMap = new Map<number, number>();
    const jamaatsSorted = [...payload.jamaats].sort((a, b) => a.id - b.id);

    for (const j of jamaatsSorted) {
      const newId = await insertJamaat(db, j.name, j.startDate, j.endDate);
      idMap.set(j.id, newId);
      if (j.firebaseDocId && j.inviteCode) {
        await updateJamaatCloudIds(db, newId, j.firebaseDocId, j.inviteCode);
      }
    }

    const memberIdMap = new Map<number, number>();
    const membersSorted = [...payload.members].sort((a, b) => a.id - b.id);
    for (const m of membersSorted) {
      const newJamaatId = idMap.get(m.jamaatId);
      if (newJamaatId === undefined) continue;
      const res = await db.runAsync(
        `INSERT INTO members (jamaat_id, name, contribution, join_date, leave_date, user_id, firestore_member_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        newJamaatId,
        m.name,
        m.contribution,
        m.joinDate,
        m.leaveDate,
        m.userId ?? null,
        m.firestoreMemberId ?? null
      );
      memberIdMap.set(m.id, Number(res.lastInsertRowId));
    }

    const expensesSorted = [...payload.expenses].sort((a, b) => a.id - b.id);
    for (const e of expensesSorted) {
      const newJamaatId = idMap.get(e.jamaatId);
      const newPayerId = memberIdMap.get(e.paidByMemberId);
      if (newJamaatId === undefined || newPayerId === undefined) continue;
      await insertExpense(db, newJamaatId, e.title, e.amount, e.expenseDate, newPayerId, e.category, {
        firestoreExpenseId: e.firestoreExpenseId ?? null,
      });
    }
  });
}
