import type { FixtureCase, Mark, StudentResult } from "./types"

export type AnomalyCategory =
  | "subject-outlier"
  | "class-mean-gap"
  | "component-gap"
  | "duplicate-signature"
  | "repeated-mark-pattern"

export type AnomalyFinding = {
  id: string
  category: AnomalyCategory
  className: string
  subjectCode?: string
  studentIds: string[]
  severity: "review" | "notice"
  explanation: string
}

const total = (mark: Mark) =>
  mark === "AB" ? null : typeof mark === "number" ? mark : mark.theory + mark.practical

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
const deviation = (values: number[], average: number) =>
  Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length)

export function scanCohortAnomalies(
  fixtureCase: FixtureCase,
  results: StudentResult[]
): AnomalyFinding[] {
  const findings: AnomalyFinding[] = []

  for (const subject of fixtureCase.subjects) {
    const rows = results
      .map((result) => ({ result, value: total(result.student.marks[subject.code]) }))
      .filter((row): row is { result: StudentResult; value: number } => row.value !== null)
    if (rows.length >= 10) {
      const average = mean(rows.map((row) => row.value))
      const sd = deviation(rows.map((row) => row.value), average)
      if (sd > 0) {
        rows.forEach(({ result, value }) => {
          const z = (value - average) / sd
          if (Math.abs(z) >= 2) {
            findings.push({
              id: `outlier:${subject.code}:${result.student.id}`,
              category: "subject-outlier",
              className: result.student.class,
              subjectCode: subject.code,
              studentIds: [result.student.id],
              severity: "review",
              explanation: `${result.student.id} scored ${value.toFixed(1)} in ${subject.code}. Cohort mean ${average.toFixed(1)}, standard deviation ${sd.toFixed(1)}, z score ${z.toFixed(2)}. Review threshold is an absolute z score of 2.00.`,
            })
          }
        })
      }
    }

    const cohortValues = rows.map((row) => row.value)
    if (cohortValues.length) {
      const cohortMean = mean(cohortValues)
      for (const className of new Set(rows.map((row) => row.result.student.class))) {
        const classValues = rows.filter((row) => row.result.student.class === className).map((row) => row.value)
        const classMean = mean(classValues)
        const gap = classMean - cohortMean
        if (classValues.length >= 5 && Math.abs(gap) >= 8) {
          findings.push({
            id: `class-gap:${subject.code}:${className}`,
            category: "class-mean-gap",
            className,
            subjectCode: subject.code,
            studentIds: [],
            severity: "notice",
            explanation: `${className} mean for ${subject.code} is ${classMean.toFixed(1)}, versus cohort mean ${cohortMean.toFixed(1)}. Difference ${gap.toFixed(1)} marks meets the 8.0 mark review threshold.`,
          })
        }
      }
    }

    if (subject.practical) {
      results.forEach((result) => {
        const mark = result.student.marks[subject.code]
        if (!mark || mark === "AB" || typeof mark === "number") return
        const theoryPercent = (mark.theory / 75) * 100
        const practicalPercent = (mark.practical / 25) * 100
        const gap = Math.abs(theoryPercent - practicalPercent)
        if (gap >= 35) {
          findings.push({
            id: `component:${subject.code}:${result.student.id}`,
            category: "component-gap",
            className: result.student.class,
            subjectCode: subject.code,
            studentIds: [result.student.id],
            severity: "review",
            explanation: `${result.student.id} has ${theoryPercent.toFixed(1)}% theory and ${practicalPercent.toFixed(1)}% practical in ${subject.code}, a ${gap.toFixed(1)} point gap. This meets the 35.0 percentage point threshold.`,
          })
        }
      })
    }
  }

  const signatureGroups = new Map<string, StudentResult[]>()
  results.forEach((result) => {
    const signature = [...fixtureCase.compulsory, result.student.optional]
      .map((code) => `${code}:${JSON.stringify(result.student.marks[code])}`)
      .join("|")
    const key = `${result.student.class}:${signature}`
    signatureGroups.set(key, [...(signatureGroups.get(key) ?? []), result])
  })
  signatureGroups.forEach((group, key) => {
    if (group.length < 2) return
    const ids = group.map((item) => item.student.id).sort()
    findings.push({
      id: `duplicate:${key}`,
      category: "duplicate-signature",
      className: group[0].student.class,
      studentIds: ids,
      severity: "review",
      explanation: `${ids.join(", ")} share the same seven-mark signature in ${group[0].student.class}. Exact duplicate records are listed for source-sheet verification.`,
    })
  })

  results.forEach((result) => {
    const counts = new Map<number, string[]>()
    Object.entries(result.student.marks).forEach(([code, mark]) => {
      const value = total(mark)
      if (value !== null) counts.set(value, [...(counts.get(value) ?? []), code])
    })
    counts.forEach((codes, value) => {
      if (codes.length < 4) return
      findings.push({
        id: `repeat:${result.student.id}:${value}`,
        category: "repeated-mark-pattern",
        className: result.student.class,
        studentIds: [result.student.id],
        severity: "notice",
        explanation: `${result.student.id} has the same total ${value} in ${codes.length} subjects: ${codes.join(", ")}. Four repeated totals meet the review threshold.`,
      })
    })
  })

  return findings.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id))
}
