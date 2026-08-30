import { describe, expect, it } from "vitest"

import { bundledFixture } from "../data/fixture"
import {
  applyCorrections,
  buildCorrection,
  buildReportCard,
  calculateCorrectionImpact,
} from "./corrections"
import { evaluateCase } from "./engine"

describe("corrections and report cards", () => {
  const fixtureCase = bundledFixture.cases[0]
  const student = fixtureCase.students[0]
  const subjectCode = fixtureCase.compulsory[0]

  it("records immutable before and after marks and applies the latest correction", () => {
    const correction = buildCorrection(fixtureCase, [], {
      id: "edit-1",
      studentId: student.id,
      subjectCode,
      after: 80,
      reason: "Verified against signed mark sheet",
      createdAt: "2026-08-30T12:00:00.000Z",
    })
    expect(correction.before).toEqual(student.marks[subjectCode])
    expect(applyCorrections(fixtureCase, [correction]).students[0].marks[subjectCode]).toBe(80)
  })

  it("calculates the exact GPA impact of a correction", () => {
    const correction = buildCorrection(fixtureCase, [], {
      id: "edit-2",
      studentId: student.id,
      subjectCode,
      after: 80,
      reason: "Teacher correction",
      createdAt: "2026-08-30T12:00:00.000Z",
    })
    const impact = calculateCorrectionImpact(fixtureCase, [], correction)
    expect(impact.studentId).toBe(student.id)
    expect(impact.afterGpa - impact.beforeGpa).toBeCloseTo(impact.gpaDelta, 8)
  })

  it("builds a printable report card with rule results and correction history", () => {
    const results = evaluateCase(fixtureCase)
    const card = buildReportCard(results[0], [])
    expect(card.subjects).toHaveLength(7)
    expect(card.finalGpa).toBe(results[0].finalGpa)
    expect(card.student.id).toBe(student.id)
  })
})
