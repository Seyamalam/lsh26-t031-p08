import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { bundledFixture, loadFixtureFile, MAX_FIXTURE_BYTES, parseFixture } from "./fixture"

describe("fixture import boundary", () => {
  it("accepts the checked-in valid sample", () => {
    const source = readFileSync(resolve(process.cwd(), "public/sample-p08-fixture.json"), "utf8")
    expect(parseFixture(source).cases).toHaveLength(1)
  })

  it("rejects malformed JSON and wrong problem or schema", () => {
    expect(() => parseFixture("{not json")).toThrow("not valid JSON")
    expect(() => parseFixture(JSON.stringify({ ...bundledFixture, problem_id: "P10" }))).toThrow("P08")
    expect(() => parseFixture(JSON.stringify({ ...bundledFixture, schema_version: "1.0" }))).toThrow("schema_version 2.2")
  })

  it("rejects duplicate identifiers, whitespace identifiers and fractional marks", () => {
    const duplicate = structuredClone(bundledFixture)
    duplicate.cases[0].students[1].id = duplicate.cases[0].students[0].id
    expect(() => parseFixture(JSON.stringify(duplicate))).toThrow("duplicate student id")

    const whitespace = structuredClone(bundledFixture)
    whitespace.cases[0].subjects[0].code = " BAN "
    expect(() => parseFixture(JSON.stringify(whitespace))).toThrow("surrounding whitespace")

    const fractional = structuredClone(bundledFixture)
    const student = fractional.cases[0].students[0]
    const wholeCode = fractional.cases[0].subjects.find((subject) => !subject.practical)!.code
    student.marks[wholeCode] = 50.5
    expect(() => parseFixture(JSON.stringify(fractional))).toThrow("whole-number")
  })

  it("rejects an oversized file before reading it", async () => {
    let read = false
    await expect(
      loadFixtureFile({
        size: MAX_FIXTURE_BYTES + 1,
        text: async () => {
          read = true
          return JSON.stringify(bundledFixture)
        },
      })
    ).rejects.toThrow("5 MiB")
    expect(read).toBe(false)
  })
})
