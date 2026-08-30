import { describe, expect, it } from "vitest"

import { bundledFixture } from "../data/fixture"
import { evaluateCase } from "./engine"
import { findJudgeExamples } from "./evidence"

describe("judge examples", () => {
  it("finds the four published hard-edge demonstrations in PUB-01", () => {
    const examples = findJudgeExamples(evaluateCase(bundledFixture.cases[0]))

    expect(examples.compulsoryFail?.student.name).toBe("Imran Sultana")
    expect(examples.compulsoryFail?.uncancelledGpa).toBeGreaterThan(4)
    expect(examples.practicalFail?.student.name).toBe("Hasib Das")
    expect(examples.optionalRule?.student.name).toBe("Lamia Begum")
    expect(examples.absent?.student.name).toBe("Hasib Khatun")
  })
})
