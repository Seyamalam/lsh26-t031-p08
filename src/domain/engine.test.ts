import { describe, expect, it } from "vitest"

import { bundledFixture, parseFixture } from "../data/fixture"
import {
  buildCheckingLists,
  evaluateCase,
  evaluateStudent,
  evaluateSubject,
  gradePointForMark,
  letterForGpa,
} from "./engine"
import type { Student, Subject } from "./types"

const practicalSubject: Subject = {
  code: "SCI",
  name: "Science",
  practical: true,
}

const wholeSubject: Subject = {
  code: "ENG",
  name: "English",
  practical: false,
}

describe("grade bands", () => {
  it.each([
    [0, 0],
    [32, 0],
    [33, 1],
    [39, 1],
    [40, 2],
    [49, 2],
    [50, 3],
    [59, 3],
    [60, 3.5],
    [69, 3.5],
    [70, 4],
    [79, 4],
    [80, 5],
    [100, 5],
  ])("maps %i to grade point %s", (mark, expected) => {
    expect(gradePointForMark(mark).point).toBe(expected)
  })
})

describe("subject evaluation", () => {
  it("fails a whole mark below 33", () => {
    expect(evaluateSubject(wholeSubject, 32, false).point).toBe(0)
  })

  it("lets the component rule override a high practical-subject total", () => {
    const theoryFail = evaluateSubject(
      practicalSubject,
      { theory: 24, practical: 25 },
      false,
    )
    const practicalFail = evaluateSubject(
      practicalSubject,
      { theory: 73, practical: 7 },
      false,
    )
    expect(theoryFail.point).toBe(0)
    expect(theoryFail.theoryPassed).toBe(false)
    expect(practicalFail.total).toBe(80)
    expect(practicalFail.point).toBe(0)
    expect(practicalFail.practicalPassed).toBe(false)
  })

  it("records AB explicitly", () => {
    const result = evaluateSubject(wholeSubject, "AB", false)
    expect(result).toMatchObject({ point: 0, absent: true, rawDisplay: "AB" })
  })
})

describe("GPA evaluation", () => {
  const subjects: Subject[] = [
    { code: "A", name: "A", practical: false },
    { code: "B", name: "B", practical: false },
    { code: "C", name: "C", practical: false },
    { code: "D", name: "D", practical: false },
    { code: "E", name: "E", practical: false },
    { code: "F", name: "F", practical: false },
    { code: "OPT", name: "Optional", practical: false },
  ]
  const compulsory = ["A", "B", "C", "D", "E", "F"]

  function studentWith(optionalMark: number | "AB", compulsoryMarks = [80, 80, 80, 80, 80, 80]): Student {
    return {
      id: "S001",
      name: "Boundary Student",
      class: "Class 9",
      optional: "OPT",
      marks: {
        A: compulsoryMarks[0],
        B: compulsoryMarks[1],
        C: compulsoryMarks[2],
        D: compulsoryMarks[3],
        E: compulsoryMarks[4],
        F: compulsoryMarks[5],
        OPT: optionalMark,
      },
    }
  }

  it.each([
    [0, 0],
    [33, 0],
    [40, 0],
    [50, 1],
    [80, 3],
  ])("turns optional mark %s into bonus %s", (mark, expectedBonus) => {
    expect(evaluateStudent(studentWith(mark), subjects, compulsory).optionalBonus).toBe(expectedBonus)
  })

  it("caps GPA at 5.00", () => {
    expect(evaluateStudent(studentWith(80), subjects, compulsory).finalGpa).toBe(5)
  })

  it("keeps the uncancelled average but overrides a compulsory failure", () => {
    const result = evaluateStudent(
      studentWith(80, [32, 80, 80, 80, 80, 80]),
      subjects,
      compulsory,
    )
    expect(result.uncancelledGpa).toBeGreaterThan(4)
    expect(result.finalGpa).toBe(0)
    expect(result.letterGrade).toBe("F")
    expect(result.compulsoryFailures.map((failure) => failure.code)).toEqual(["A"])
  })

  it("does not let optional AB fail the student", () => {
    const result = evaluateStudent(studentWith("AB"), subjects, compulsory)
    expect(result.finalGpa).toBe(5)
    expect(result.flags.optionalReview).toBe(true)
    expect(result.flags.absent).toBe(true)
  })

  it.each([
    [5, "A+"],
    [4, "A"],
    [3.5, "A-"],
    [3, "B"],
    [2, "C"],
    [1, "D"],
    [0, "F"],
  ])("maps GPA %s to %s", (gpa, expected) => {
    expect(letterForGpa(gpa)).toBe(expected)
  })
})

describe("checking lists", () => {
  it("keeps one student in every applicable list", () => {
    const subjects: Subject[] = [
      { code: "A", name: "A", practical: false },
      { code: "B", name: "B", practical: false },
      { code: "C", name: "C", practical: false },
      { code: "D", name: "D", practical: false },
      { code: "E", name: "E", practical: false },
      { code: "F", name: "F", practical: true },
      { code: "OPT", name: "Optional", practical: false },
    ]
    const student: Student = {
      id: "S-OVERLAP",
      name: "Overlap Student",
      class: "Class 10",
      optional: "OPT",
      marks: {
        A: "AB",
        B: 80,
        C: 80,
        D: 80,
        E: 80,
        F: { theory: 70, practical: 7 },
        OPT: 40,
      },
    }
    const result = evaluateStudent(student, subjects, ["A", "B", "C", "D", "E", "F"])
    const lists = buildCheckingLists([result])
    expect(lists.optional).toHaveLength(1)
    expect(lists.practical).toHaveLength(1)
    expect(lists.absent).toHaveLength(1)
  })
})

describe("official fixture compatibility", () => {
  it("loads the published JSON through the same validator used by uploads", () => {
    const parsed = parseFixture(JSON.stringify(bundledFixture))
    expect(parsed.cases).toHaveLength(25)
  })

  it("processes all 25 cases without non-finite values", () => {
    for (const fixtureCase of bundledFixture.cases) {
      const results = evaluateCase(fixtureCase)
      expect(results.length).toBeGreaterThanOrEqual(60)
      for (const result of results) {
        expect(Number.isFinite(result.uncancelledGpa)).toBe(true)
        expect(Number.isFinite(result.finalGpa)).toBe(true)
        expect(result.subjectResults).toHaveLength(7)
      }
    }
  })
})
