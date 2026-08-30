import type { ReviewEntry, StudentResult } from "./types"

type CsvValue = string | number | boolean | null | undefined

function escapeCsvValue(value: CsvValue): string {
  const text = value == null ? "" : String(value)
  if (!/[",\r\n]/.test(text)) return text
  return `"${text.replaceAll('"', '""')}"`
}

export function rowsToCsv(rows: CsvValue[][]): string {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n")
}

function flagsFor(result: StudentResult): string {
  return [
    result.flags.optionalReview ? "optional" : "",
    result.flags.practicalFail ? "practical" : "",
    result.flags.absent ? "absent" : "",
  ]
    .filter(Boolean)
    .join("; ")
}

export function resultRegisterCsv(results: StudentResult[]): string {
  return rowsToCsv([
    [
      "Student ID",
      "Student name",
      "Class",
      "Optional subject",
      "Compulsory point sum",
      "Optional point",
      "Optional bonus",
      "Uncancelled GPA",
      "Final GPA",
      "Letter grade",
      "Compulsory failures",
      "Review flags",
    ],
    ...results.map((result) => [
      result.student.id,
      result.student.name,
      result.student.class,
      result.student.optional,
      result.compulsoryPointSum.toFixed(1),
      result.optionalPoint.toFixed(1),
      result.optionalBonus.toFixed(1),
      result.uncancelledGpa.toFixed(2),
      result.finalGpa.toFixed(2),
      result.letterGrade,
      result.compulsoryFailures.map((subject) => subject.code).join("; "),
      flagsFor(result),
    ]),
  ])
}

export function checkingListCsv(entries: ReviewEntry[]): string {
  return rowsToCsv([
    [
      "Student ID",
      "Student name",
      "Class",
      "Check reason",
      "Uncancelled GPA",
      "Final GPA",
      "Letter grade",
    ],
    ...entries.map((entry) => [
      entry.student.id,
      entry.student.name,
      entry.student.class,
      entry.reasons.join("; "),
      entry.result.uncancelledGpa.toFixed(2),
      entry.result.finalGpa.toFixed(2),
      entry.result.letterGrade,
    ]),
  ])
}

export function csvFilename(caseId: string, report: string): string {
  const safeCase = caseId.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const safeReport = report.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return `p08-${safeCase}-${safeReport}.csv`
}
