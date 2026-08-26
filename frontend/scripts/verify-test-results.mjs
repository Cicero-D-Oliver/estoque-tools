import { readFileSync } from 'node:fs'

const [, , reportPath, minimumTestsArgument] = process.argv
const minimumTests = Number.parseInt(minimumTestsArgument ?? '', 10)

if (!reportPath || !Number.isInteger(minimumTests) || minimumTests <= 0) {
  throw new Error('Uso: node scripts/verify-test-results.mjs <relatório.json> <mínimo>')
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'))
const total = Number(report.numTotalTests)
const passed = Number(report.numPassedTests)
const failed = Number(report.numFailedTests)
const skipped = Number(report.numPendingTests)

if (![total, passed, failed, skipped].every(Number.isInteger)) {
  throw new Error('O relatório Vitest não contém contadores válidos.')
}
if (total < minimumTests) {
  throw new Error(`Regressão na suíte frontend: ${total}; mínimo esperado: ${minimumTests}.`)
}
if (failed !== 0) {
  throw new Error(`A suíte frontend contém ${failed} teste(s) com falha.`)
}
if (skipped !== 0) {
  throw new Error(`A suíte frontend contém ${skipped} teste(s) ignorado(s) inesperadamente.`)
}
if (passed !== total || report.success !== true) {
  throw new Error(`Resultado frontend inconsistente: ${passed}/${total} aprovados.`)
}

console.log(`Suíte frontend aprovada: ${passed}/${total} testes, sem falhas ou ignorados.`)
