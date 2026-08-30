import type { Fixture, FixtureCase, Mark, Student, Subject } from "../domain/types"

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)

function validateMark(mark: unknown, subject: Subject, label: string): asserts mark is Mark {
  if (mark === "AB") return
  if (!subject.practical) {
    if (typeof mark !== "number" || !Number.isFinite(mark) || !Number.isInteger(mark) || mark < 0 || mark > 100) throw new Error(`${label} must be a whole-number mark from 0 to 100, or AB.`)
    return
  }
  if (!isObject(mark) || typeof mark.theory !== "number" || typeof mark.practical !== "number" || !Number.isFinite(mark.theory) || !Number.isFinite(mark.practical) || !Number.isInteger(mark.theory) || !Number.isInteger(mark.practical) || mark.theory < 0 || mark.theory > 75 || mark.practical < 0 || mark.practical > 25) throw new Error(`${label} must contain theory 0–75 and practical 0–25, or AB.`)
}

function validateCase(value: unknown, index: number): asserts value is FixtureCase {
  if (!isObject(value)) throw new Error(`Case ${index + 1} must be an object.`)
  if (typeof value.case_id !== "string" || !value.case_id.trim()) throw new Error(`Case ${index + 1} needs a case_id.`)
  if (value.case_id !== value.case_id.trim()) throw new Error(`Case ${index + 1} case_id has surrounding whitespace.`)
  if (!Array.isArray(value.subjects) || !Array.isArray(value.compulsory) || !Array.isArray(value.students)) throw new Error(`${value.case_id}: subjects, compulsory and students must be arrays.`)
  if (value.compulsory.length !== 6 || !value.compulsory.every((code) => typeof code === "string")) throw new Error(`${value.case_id}: exactly six compulsory subject codes are required.`)
  const subjects = value.subjects as unknown[]
  const subjectCodes = new Set<string>()
  subjects.forEach((subject, subjectIndex) => {
    if (!isObject(subject) || typeof subject.code !== "string" || typeof subject.name !== "string" || typeof subject.practical !== "boolean") throw new Error(`${value.case_id}: subject ${subjectIndex + 1} is invalid.`)
    if (subject.code !== subject.code.trim()) throw new Error(`${value.case_id}: subject code has surrounding whitespace.`)
    if (subjectCodes.has(subject.code)) throw new Error(`${value.case_id}: duplicate subject code ${subject.code}.`)
    subjectCodes.add(subject.code)
  })
  const subjectMap = new Map((subjects as Subject[]).map((subject) => [subject.code, subject]))
  value.compulsory.forEach((code) => { if (!subjectMap.has(code as string)) throw new Error(`${value.case_id}: unknown compulsory code ${code}.`) })
  if (value.students.length < 60) throw new Error(`${value.case_id}: at least 60 students are required.`)
  const classes = new Set<string>(); const studentIds = new Set<string>()
  ;(value.students as unknown[]).forEach((studentValue, studentIndex) => {
    if (!isObject(studentValue)) throw new Error(`${value.case_id}: student ${studentIndex + 1} is invalid.`)
    const requiredStrings = ["id", "name", "class", "optional"] as const
    requiredStrings.forEach((field) => {
      if (typeof studentValue[field] !== "string" || !studentValue[field]) throw new Error(`${value.case_id}: student ${studentIndex + 1} needs ${field}.`)
      if ((studentValue[field] as string) !== (studentValue[field] as string).trim()) throw new Error(`${value.case_id}: student ${studentIndex + 1} ${field} has surrounding whitespace.`)
    })
    if (!isObject(studentValue.marks)) throw new Error(`${value.case_id}: ${studentValue.id} needs marks.`)
    const student = studentValue as unknown as Student
    if (studentIds.has(student.id)) throw new Error(`${value.case_id}: duplicate student id ${student.id}.`)
    studentIds.add(student.id); classes.add(student.class)
    if (!subjectMap.has(student.optional)) throw new Error(`${value.case_id}: ${student.id} has unknown optional subject ${student.optional}.`)
    const requiredCodes = [...(value.compulsory as string[]), student.optional]
    if (new Set(requiredCodes).size !== 7) throw new Error(`${value.case_id}: ${student.id} must have six compulsory and one distinct optional subject.`)
    if (Object.keys(student.marks).length !== 7) throw new Error(`${value.case_id}: ${student.id} must have exactly seven marks.`)
    requiredCodes.forEach((code) => validateMark(student.marks[code], subjectMap.get(code)!, `${value.case_id}/${student.id}/${code}`))
  })
  if (classes.size < 2) throw new Error(`${value.case_id}: students must span at least two classes.`)
}

export function parseFixture(input: string): Fixture {
  let value: unknown
  try { value = JSON.parse(input) } catch { throw new Error("This file is not valid JSON.") }
  if (!isObject(value) || value.problem_id !== "P08" || !Array.isArray(value.cases)) throw new Error("Expected a P08 fixture with a cases array.")
  if (value.schema_version !== "2.2") throw new Error("Expected schema_version 2.2.")
  if (!value.cases.length) throw new Error("The fixture contains no cases.")
  const caseIds = new Set<string>()
  value.cases.forEach((fixtureCase, index) => {
    if (isObject(fixtureCase) && typeof fixtureCase.case_id === "string") { if (caseIds.has(fixtureCase.case_id)) throw new Error(`Fixture has duplicate case id ${fixtureCase.case_id}.`); caseIds.add(fixtureCase.case_id) }
    validateCase(fixtureCase, index)
  })
  return value as Fixture
}
