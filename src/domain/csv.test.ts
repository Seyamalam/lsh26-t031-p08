import { describe, expect, it } from "vitest"

import { bundledFixture } from "../data/fixture"
import { buildCheckingLists, evaluateCase } from "./engine"
import {
  checkingListCsv,
  csvFilename,
  resultRegisterCsv,
  rowsToCsv,
} from "./csv"

const results = evaluateCase(bundledFixture.cases[0])

describe("CSV export", () => {
  it("escapes commas, quotes, and line breaks", () => {
    expect(
      rowsToCsv([
        ["Name", "Reason"],
        ['Sultana, Imran', 'Rule says "fail"\nCheck MAT'],
      ])
    ).toBe('Name,Reason\r\n"Sultana, Imran","Rule says ""fail""\nCheck MAT"')
  })

  it("exports one result-register row per student", () => {
    const csv = resultRegisterCsv(results)
    expect(csv.split("\r\n")).toHaveLength(results.length + 1)
    expect(csv).toContain("Student ID,Student name,Class")
    expect(csv).toContain("S004,Imran Sultana")
    expect(csv).toContain("4.67,0.00,F,MAT")
  })

  it("exports every checking-list reason", () => {
    const checking = buildCheckingLists(results)
    const csv = checkingListCsv(checking.absent)
    expect(csv.split("\r\n")).toHaveLength(checking.absent.length + 1)
    expect(csv).toContain("BIO: absent (AB).")
  })

  it("creates stable, readable filenames", () => {
    expect(csvFilename("PUB-01", "Result register")).toBe(
      "p08-pub-01-result-register.csv"
    )
  })
})
