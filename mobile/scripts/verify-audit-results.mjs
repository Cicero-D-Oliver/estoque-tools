import { readFileSync } from 'node:fs';

const [fullReportPath, runtimeReportPath] = process.argv.slice(2);
if (!fullReportPath || !runtimeReportPath) {
  throw new Error('Uso: node verify-audit-results.mjs <audit-completo.json> <audit-runtime.json>');
}

const readReport = (path) => JSON.parse(readFileSync(path, 'utf8'));
const fullReport = readReport(fullReportPath);
const runtimeReport = readReport(runtimeReportPath);

const knownExpo57ToolchainHigh = (name, finding) => {
  if (finding.isDirect || finding.severity !== 'high') return false;
  if (name === 'zod') {
    return finding.via.length === 1
      && typeof finding.via[0] === 'object'
      && finding.via[0].url === 'https://github.com/advisories/GHSA-mrhx-c7xc-m3w5'
      && finding.effects.includes('@expo/cli');
  }
  if (name === '@expo/cli') {
    return finding.via.every((via) => typeof via === 'string')
      && finding.via.includes('zod')
      && finding.effects.includes('expo');
  }
  return false;
};

const validate = (label, report) => {
  if (report.auditReportVersion !== 2
      || typeof report.vulnerabilities !== 'object'
      || report.vulnerabilities === null
      || typeof report.metadata?.vulnerabilities !== 'object') {
    throw new Error(`${label}: resposta inválida ou incompleta do npm audit`);
  }
  const vulnerabilities = Object.entries(report.vulnerabilities ?? {});
  const critical = vulnerabilities.filter(([, finding]) => finding.severity === 'critical');
  const unexpectedHigh = vulnerabilities.filter(([name, finding]) =>
    finding.severity === 'high' && !knownExpo57ToolchainHigh(name, finding));

  if (critical.length > 0) {
    throw new Error(`${label}: vulnerabilidades críticas: ${critical.map(([name]) => name).join(', ')}`);
  }
  if (unexpectedHigh.length > 0) {
    throw new Error(`${label}: vulnerabilidades altas não autorizadas: ${unexpectedHigh
      .map(([name]) => name).join(', ')}`);
  }

  const counts = report.metadata?.vulnerabilities ?? {};
  console.log(`${label}: total=${counts.total ?? 0}, high=${counts.high ?? 0}, critical=${counts.critical ?? 0}.`);
};

validate('Auditoria completa', fullReport);
validate('Auditoria sem dependências de desenvolvimento', runtimeReport);
console.log('As ocorrências HIGH conhecidas pertencem ao @expo/cli/zod do SDK 57 e não ao bundle Android.');
