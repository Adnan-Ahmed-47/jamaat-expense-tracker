export type ExpenseCategory = 'Food' | 'Travel' | 'Misc';

export interface Jamaat {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  /** Linked Firestore `jamaats` document id when using cloud sync */
  firebaseDocId?: string | null;
  inviteCode?: string | null;
}

export interface Member {
  id: number;
  jamaatId: number;
  name: string;
  contribution: number;
  joinDate: string;
  leaveDate: string | null;
  /** Set when member joined via invite or for duplicate checks in Firestore */
  userId?: string | null;
  firestoreMemberId?: string | null;
}

export interface Expense {
  id: number;
  jamaatId: number;
  title: string;
  amount: number;
  expenseDate: string;
  paidByMemberId: number;
  category: ExpenseCategory;
  firestoreExpenseId?: string | null;
}

/**
 * Pool model: contributions are pooled; “paid by” is who disbursed from the pool.
 * Balance = contribution − fairShare.
 */
export interface MemberSettlementRow {
  memberId: number;
  name: string;
  personDays: number;
  fairShare: number;
  contribution: number;
  expensesPaid: number;
  balance: number;
  status: 'settled' | 'to_receive' | 'to_pay';
}

export type PoolInstructionDirection = 'receive_from_holder' | 'pay_to_holder';

export interface PoolInstruction {
  memberId: number;
  name: string;
  amount: number;
  direction: PoolInstructionDirection;
}

export interface JamaatSettlementSummary {
  jamaatId: number;
  jamaatName: string;
  startDate: string;
  endDate: string;
  totalJamaatDays: number;
  totalPersonDays: number;
  totalExpenses: number;
  totalContributions: number;
  perDayExpense: number;
  poolSurplus: number;
  members: MemberSettlementRow[];
  poolInstructions: PoolInstruction[];
  expenseByCategory: Record<ExpenseCategory, number>;
}

export interface ClosureMemberLine {
  memberId: number;
  name: string;
  contribution: number;
  fairShare: number;
  netVsFairShare: number;
  surplusRefundShare: number;
  deficitShare: number;
}

export interface JamaatClosureReport {
  jamaatId: number;
  jamaatName: string;
  startDate: string;
  endDate: string;
  memberCount: number;
  totalContributions: number;
  totalExpenses: number;
  remainingInPool: number;
  members: ClosureMemberLine[];
}
