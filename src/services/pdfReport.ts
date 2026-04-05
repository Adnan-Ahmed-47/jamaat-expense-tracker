import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { JamaatSettlementSummary } from '../types/models';
import { formatINR } from '../utils/currency';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildSettlementHtml(summary: JamaatSettlementSummary, labels: Record<string, string>): string {
  const rows = summary.members
    .map(
      (m) => `
    <tr>
      <td>${esc(m.name)}</td>
      <td>${m.personDays}</td>
      <td>${formatINR(m.fairShare)}</td>
      <td>${formatINR(m.contribution)}</td>
      <td>${formatINR(m.expensesPaid)}</td>
      <td>${formatINR(m.balance)}</td>
      <td>${esc(labels[m.status] ?? m.status)}</td>
    </tr>`
    )
    .join('');

  const poolLines = summary.poolInstructions
    .map((p) => {
      const line =
        p.direction === 'receive_from_holder'
          ? `${esc(p.name)}: ${esc(labels.receiveFromHolderPlain ?? 'Receive')} ${formatINR(p.amount)}`
          : `${esc(p.name)}: ${esc(labels.payToHolderPlain ?? 'Pay')} ${formatINR(p.amount)}`;
      return `<li>${line}</li>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; color: #1b1b1b; }
    h1 { color: #1B4332; font-size: 22px; }
    h2 { color: #2D6A4F; font-size: 16px; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #D8E8DF; padding: 8px; text-align: left; font-size: 13px; }
    th { background: #F4F9F6; color: #1B4332; }
    ul { padding-left: 20px; }
    .meta { color: #5C6F68; font-size: 14px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>${esc(summary.jamaatName)}</h1>
  <p class="meta">${esc(summary.startDate)} — ${esc(summary.endDate)}</p>
  <p><strong>${esc(labels.totalExpense)}:</strong> ${formatINR(summary.totalExpenses)}</p>
  <p><strong>${esc(labels.totalContribution)}:</strong> ${formatINR(summary.totalContributions)}</p>
  <p><strong>${esc(labels.perDayExpense)}:</strong> ${formatINR(summary.perDayExpense)}</p>
  <p><strong>${esc(labels.poolSurplus)}:</strong> ${formatINR(summary.poolSurplus)}</p>
  <h2>${esc(labels.members)}</h2>
  <table>
    <thead><tr>
      <th>Name</th><th>Days</th><th>Fair</th><th>Contrib</th><th>Paid</th><th>Bal</th><th>Status</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <h2>${esc(labels.poolSettlement)}</h2>
  ${poolLines ? `<ul>${poolLines}</ul>` : `<p>${esc(labels.noPoolMoves)}</p>`}
</body>
</html>`;
}

export async function shareSettlementPdf(
  summary: JamaatSettlementSummary,
  labels: Record<string, string>
): Promise<void> {
  const html = buildSettlementHtml(summary, labels);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: summary.jamaatName,
    });
  }
}
