import type {
  Expense,
  ExpenseCategory,
  Jamaat,
  JamaatClosureReport,
  ClosureMemberLine,
  Member,
  MemberSettlementRow,
  PoolInstruction,
  JamaatSettlementSummary,
} from '../types/models';
import { inclusiveDaysBetween, memberPersonDays } from './dateUtils';
import { roundMoney } from './currency';

export function sumContributions(members: Member[]): number {
  return roundMoney(members.reduce((s, m) => s + (m.contribution ?? 0), 0));
}

export function sumExpenses(expenses: Expense[]): number {
  return roundMoney(expenses.reduce((s, e) => s + (e.amount ?? 0), 0));
}

export function totalJamaatDays(jamaat: Jamaat): number {
  return inclusiveDaysBetween(jamaat.startDate, jamaat.endDate);
}

/** Average expense per calendar day of the jamaat window. */
export function perDayExpense(jamaat: Jamaat, expenses: Expense[]): number {
  const days = totalJamaatDays(jamaat);
  if (days <= 0) return 0;
  return roundMoney(sumExpenses(expenses) / days);
}

export function expensesPaidByMember(expenses: Expense[], memberId: number): number {
  return roundMoney(
    expenses.filter((e) => e.paidByMemberId === memberId).reduce((s, e) => s + e.amount, 0)
  );
}

export function expenseTotalsByCategory(expenses: Expense[]): Record<ExpenseCategory, number> {
  const base: Record<ExpenseCategory, number> = { Food: 0, Travel: 0, Misc: 0 };
  for (const e of expenses) {
    if (e.category in base) {
      base[e.category] = roundMoney(base[e.category] + e.amount);
    }
  }
  return base;
}

function isMemberActiveOnDate(member: Member, ymd: string): boolean {
  if (!ymd) return false;
  if (ymd < member.joinDate) return false;
  if (member.leaveDate && ymd > member.leaveDate) return false;
  return true;
}

/**
 * Fair share is computed per expense date:
 * each expense is split among members active on that expense day.
 */
export function computeFairShares(
  jamaat: Jamaat,
  members: Member[],
  expenses: Expense[]
): Map<number, number> {
  const map = new Map<number, number>();
  for (const m of members) map.set(m.id, 0);
  if (members.length === 0 || expenses.length === 0) return map;

  const expenseItems = [...expenses]
    .filter((e) => e.expenseDate >= jamaat.startDate && e.expenseDate <= jamaat.endDate)
    .sort((a, b) => (a.expenseDate < b.expenseDate ? -1 : a.expenseDate > b.expenseDate ? 1 : 0));

  for (const e of expenseItems) {
    const active = members.filter((m) => isMemberActiveOnDate(m, e.expenseDate));
    if (active.length === 0) continue;
    const split = roundMoney(e.amount / active.length);
    for (const m of active) {
      map.set(m.id, roundMoney((map.get(m.id) ?? 0) + split));
    }
    const assigned = roundMoney(split * active.length);
    const drift = roundMoney(e.amount - assigned);
    if (drift !== 0) {
      const chosen = active.reduce((best, cur) => (cur.id < best.id ? cur : best), active[0]);
      map.set(chosen.id, roundMoney((map.get(chosen.id) ?? 0) + drift));
    }
  }

  const totalExpenses = roundMoney(expenseItems.reduce((s, e) => s + (e.amount ?? 0), 0));
  const assignedTotal = roundMoney([...map.values()].reduce((a, b) => a + b, 0));
  const totalDrift = roundMoney(totalExpenses - assignedTotal);
  if (totalDrift !== 0 && members.length > 0) {
    const first = [...members].sort((a, b) => a.id - b.id)[0];
    map.set(first.id, roundMoney((map.get(first.id) ?? 0) + totalDrift));
  }

  return map;
}

export function memberBalanceStatus(balance: number, epsilon = 0.01): MemberSettlementRow['status'] {
  if (Math.abs(balance) < epsilon) return 'settled';
  if (balance > 0) return 'to_receive';
  return 'to_pay';
}

/**
 * Shared pool: everyone’s contribution is in one pot; “paid by” only records who disbursed pool cash.
 * Balance = contribution − fairShare (fair share is each person’s share of total expenses by person-days).
 */
export function computeMemberSettlementRow(
  member: Member,
  jamaat: Jamaat,
  fairShare: number,
  expensesPaid: number
): MemberSettlementRow {
  const personDays = memberPersonDays(
    jamaat.startDate,
    jamaat.endDate,
    member.joinDate,
    member.leaveDate
  );
  const contribution = roundMoney(member.contribution ?? 0);
  const fs = roundMoney(fairShare);
  const paid = roundMoney(expensesPaid);
  const balance = roundMoney(contribution - fs);
  return {
    memberId: member.id,
    name: member.name,
    personDays,
    fairShare: fs,
    contribution,
    expensesPaid: paid,
    balance,
    status: memberBalanceStatus(balance),
  };
}

export function computePoolInstructions(rows: MemberSettlementRow[]): PoolInstruction[] {
  const out: PoolInstruction[] = [];
  for (const r of rows) {
    if (r.balance > 0.01) {
      out.push({
        memberId: r.memberId,
        name: r.name,
        amount: r.balance,
        direction: 'receive_from_holder',
      });
    } else if (r.balance < -0.01) {
      out.push({
        memberId: r.memberId,
        name: r.name,
        amount: roundMoney(-r.balance),
        direction: 'pay_to_holder',
      });
    }
  }
  return out;
}

function distributeProportional(
  weights: Map<number, number>,
  total: number,
  memberIds: number[],
  pickLargestWeight: () => number
): Map<number, number> {
  const map = new Map<number, number>();
  const wSum = roundMoney([...weights.values()].reduce((a, b) => a + b, 0));
  if (total <= 0.01 || wSum <= 0 || memberIds.length === 0) {
    memberIds.forEach((id) => map.set(id, 0));
    return map;
  }
  for (const id of memberIds) {
    const w = weights.get(id) ?? 0;
    map.set(id, roundMoney((w / wSum) * total));
  }
  const assigned = roundMoney([...map.values()].reduce((a, b) => a + b, 0));
  const drift = roundMoney(total - assigned);
  if (drift !== 0 && memberIds.length > 0) {
    const target = pickLargestWeight();
    map.set(target, roundMoney((map.get(target) ?? 0) + drift));
  }
  return map;
}

export function buildJamaatSettlement(
  jamaat: Jamaat,
  members: Member[],
  expenses: Expense[]
): JamaatSettlementSummary {
  const totalExpenses = sumExpenses(expenses);
  const totalContributions = sumContributions(members);
  const jDays = totalJamaatDays(jamaat);
  const fairMap = computeFairShares(jamaat, members, expenses);

  let totalPersonDays = 0;
  for (const m of members) {
    totalPersonDays += memberPersonDays(
      jamaat.startDate,
      jamaat.endDate,
      m.joinDate,
      m.leaveDate
    );
  }

  const memberRows: MemberSettlementRow[] = members.map((m) =>
    computeMemberSettlementRow(m, jamaat, fairMap.get(m.id) ?? 0, expensesPaidByMember(expenses, m.id))
  );

  const poolInstructions = computePoolInstructions(memberRows);

  return {
    jamaatId: jamaat.id,
    jamaatName: jamaat.name,
    startDate: jamaat.startDate,
    endDate: jamaat.endDate,
    totalJamaatDays: jDays,
    totalPersonDays,
    totalExpenses,
    totalContributions,
    perDayExpense: perDayExpense(jamaat, expenses),
    poolSurplus: roundMoney(totalContributions - totalExpenses),
    members: memberRows,
    poolInstructions,
    expenseByCategory: expenseTotalsByCategory(expenses),
  };
}

export function buildJamaatClosureReport(
  jamaat: Jamaat,
  members: Member[],
  expenses: Expense[]
): JamaatClosureReport {
  const totalContributions = sumContributions(members);
  const totalExpenses = sumExpenses(expenses);
  const remainingInPool = roundMoney(totalContributions - totalExpenses);
  const fairMap = computeFairShares(jamaat, members, expenses);
  const ids = members.map((m) => m.id);

  const contribWeight = new Map<number, number>();
  const fairWeight = new Map<number, number>();
  for (const m of members) {
    contribWeight.set(m.id, m.contribution ?? 0);
    fairWeight.set(m.id, fairMap.get(m.id) ?? 0);
  }

  const surplus = remainingInPool > 0.01 ? remainingInPool : 0;
  const deficit = remainingInPool < -0.01 ? roundMoney(-remainingInPool) : 0;

  const surplusMap = distributeProportional(
    contribWeight,
    surplus,
    ids,
    () => {
      let best = ids[0];
      let bestW = contribWeight.get(best) ?? 0;
      for (const id of ids) {
        const w = contribWeight.get(id) ?? 0;
        if (w > bestW) {
          bestW = w;
          best = id;
        }
      }
      return best;
    }
  );

  const deficitMap = distributeProportional(
    fairWeight,
    deficit,
    ids,
    () => {
      let best = ids[0];
      let bestW = fairWeight.get(best) ?? 0;
      for (const id of ids) {
        const w = fairWeight.get(id) ?? 0;
        if (w > bestW) {
          bestW = w;
          best = id;
        }
      }
      return best;
    }
  );

  const memberLines: ClosureMemberLine[] = members.map((m) => {
    const fs = roundMoney(fairMap.get(m.id) ?? 0);
    const c = roundMoney(m.contribution ?? 0);
    const net = roundMoney(c - fs);
    return {
      memberId: m.id,
      name: m.name,
      contribution: c,
      fairShare: fs,
      netVsFairShare: net,
      surplusRefundShare: roundMoney(surplusMap.get(m.id) ?? 0),
      deficitShare: roundMoney(deficitMap.get(m.id) ?? 0),
    };
  });

  return {
    jamaatId: jamaat.id,
    jamaatName: jamaat.name,
    startDate: jamaat.startDate,
    endDate: jamaat.endDate,
    memberCount: members.length,
    totalContributions,
    totalExpenses,
    remainingInPool,
    members: memberLines,
  };
}

/** Validate dates for a new jamaat */
export function isValidJamaatRange(startYmd: string, endYmd: string): boolean {
  return inclusiveDaysBetween(startYmd, endYmd) > 0;
}

/** Member join must overlap jamaat window; leave optional but if set must be >= join and within jamaat end */
export function validateMemberDates(
  jamaatStart: string,
  jamaatEnd: string,
  joinYmd: string,
  leaveYmd: string | null
): { ok: true } | { ok: false; message: string } {
  if (!isValidJamaatRange(jamaatStart, jamaatEnd)) {
    return { ok: false, message: 'invalidJamaatRange' };
  }
  const pd = memberPersonDays(jamaatStart, jamaatEnd, joinYmd, leaveYmd);
  if (pd <= 0) {
    return { ok: false, message: 'memberNoOverlap' };
  }
  return { ok: true };
}
