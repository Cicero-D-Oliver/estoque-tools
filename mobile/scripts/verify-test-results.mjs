import { readFileSync } from 'node:fs';

const [reportPath, minimumText] = process.argv.slice(2);
const minimum = Number(minimumText);
if (!reportPath || !Number.isInteger(minimum) || minimum < 1) {
  throw new Error('Uso: node verify-test-results.mjs <relatorio.json> <minimo>');
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
if (report.numTotalTests < minimum) {
  throw new Error(`Regressão na suíte mobile: ${report.numTotalTests}; mínimo ${minimum}.`);
}
if (report.numFailedTests !== 0 || report.numPendingTests !== 0 || report.numTodoTests !== 0) {
  throw new Error(
    `Suíte mobile inválida: falhas=${report.numFailedTests}, ignorados=${report.numPendingTests}, todo=${report.numTodoTests}.`,
  );
}
if (!report.success) throw new Error('Jest não concluiu a suíte mobile com sucesso.');

console.log(`Suíte mobile aprovada: ${report.numPassedTests}/${report.numTotalTests} testes.`);
