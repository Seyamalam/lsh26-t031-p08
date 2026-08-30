import { describe, expect, it } from "vitest"

import { evaluateCase } from "./engine"
import { scanCohortAnomalies } from "./anomalies"
import type { FixtureCase, Student } from "./types"

const subjects = [
  { code: "SCI", name: "Science", practical: true },
  ...["A", "B", "C", "D", "E", "OPT"].map((code) => ({ code, name: code, practical: false })),
]
const marks = { SCI: { theory: 60, practical: 20 }, A: 60, B: 61, C: 62, D: 63, E: 64, OPT: 65 }
const students: Student[] = Array.from({ length: 12 }, (_, index) => ({
  id: `S-${index + 1}`,
  name: `Student ${index + 1}`,
  class: index < 6 ? "Class 9" : "Class 10",
  optional: "OPT",
  marks: index === 0
    ? { ...marks, SCI: { theory: 70, practical: 8 }, A: 10, B: 10, C: 10, D: 10 }
    : index === 1
      ? { ...marks, A: 60 }
      : index === 2
        ? { ...marks, A: 60 }
        : marks,
}))
const fixtureCase: FixtureCase = {
  case_id: "ANOMALY",
  subjects,
  compulsory: ["SCI", "A", "B", "C", "D", "E"],
  students,
}

describe("cohort anomaly scanner", () => {
  const findings = scanCohortAnomalies(fixtureCase, evaluateCase(fixtureCase))

  it("explains theory and practical component gaps using percentages", () => {
    const gap = findings.find((item) => item.category === "component-gap" && item.studentIds.includes("S-1"))
    expect(gap?.explanation).toContain("93.3% theory")
    expect(gap?.explanation).toContain("32.0% practical")
    expect(gap?.explanation).toContain("35.0 percentage point threshold")
  })

  it("reports duplicate mark signatures with exact student IDs", () => {
    const duplicate = findings.find(
      (item) => item.category === "duplicate-signature" && item.studentIds.includes("S-2")
    )
    expect(duplicate?.explanation).toContain("S-2")
    expect(duplicate?.explanation).toContain("S-3")
  })

  it("flags explainable subject outliers with mean, deviation and z score", () => {
    const outlier = findings.find((item) => item.category === "subject-outlier" && item.studentIds.includes("S-1"))
    expect(outlier?.explanation).toMatch(/mean .* standard deviation .* z score/)
  })

  it("does not claim predictive grading", () => {
    expect(findings.every((item) => !item.explanation.toLowerCase().includes("predict"))).toBe(true)
  })
})
