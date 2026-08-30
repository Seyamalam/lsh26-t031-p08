import type { Fixture, FixtureCase, Mark, Student, Subject } from '../domain/types'
import publishedFixture from './P08_school_results_public.json'

export const bundledFixture = publishedFixture as Fixture

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function validateMark(mark: unknown, subject: Subject, label: string): asserts mark is Mark {
  if (mark === 'AB') return
  if (!subject.practical) {
    if (typeof mark !== 'number' || !Number.isFinite(mark) || mark < 0 || mark > 100) {
      throw new Error(`${label} must be a whole mark from 0 to 100, or AB.`)
    }
    return
  }
  if (
    !isObject(mark) ||
    typeof mark.theory !== 'number' ||
    typeof mark.practical !== 'number' ||
    mark.theory < 0 ||
    mark.theory > 75 ||
    mark.practical < 0 ||
    mark.practical > 25
  ) {
    throw new Error(`${label} must contain theory 0–75 and practical 0–25, or AB.`)
  }
}

function validateCase(value: unknown, index: number): asserts value is FixtureCase {
  if (!isObject(value)) throw new Error(`Case ${index + 1} must be an object.`)
  if (typeof value.case_id !== 'string' || !value.case_id.trim()) {
    throw new Error(`Case ${index + 1} needs a case_id.`)
  }
  if (!Array.isArray(value.subjects) || !Array.isArray(value.compulsory) || !Array.isArray(value.students)) {
    throw new Error(`${value.case_id}: subjects, compulsory and students must be arrays.`)
  }
  if (value.compulsory.length !== 6 || !value.compulsory.every((code) => typeof code === 'string')) {
    throw new Error(`${value.case_id}: exactly six compulsory subject codes are required.`)
  }
  const subjects = value.subjects as unknown[]
  subjects.forEach((subject, subjectIndex) => {
    if (
      !isObject(subject) ||
      typeof subject.code !== 'string' ||
      typeof subject.name !== 'string' ||
      typeof subject.practical !== 'boolean'
    ) {
      throw new Error(`${value.case_id}: subject ${subjectIndex + 1} is invalid.`)
    }
  })
  const typedSubjects = subjects as Subject[]
  const subjectMap = new Map(typedSubjects.map((subject) => [subject.code, subject]))
  value.compulsory.forEach((code) => {
    if (!subjectMap.has(code as string)) throw new Error(`${value.case_id}: unknown compulsory code ${code}.`)
  })
  if (value.students.length < 60) throw new Error(`${value.case_id}: at least 60 students are required.`)
  const classes = new Set<string>()
  ;(value.students as unknown[]).forEach((studentValue, studentIndex) => {
    if (!isObject(studentValue)) throw new Error(`${value.case_id}: student ${studentIndex + 1} is invalid.`)
    const requiredStrings = ['id', 'name', 'class', 'optional'] as const
    requiredStrings.forEach((field) => {
      if (typeof studentValue[field] !== 'string' || !studentValue[field]) {
        throw new Error(`${value.case_id}: student ${studentIndex + 1} needs ${field}.`)
      }
    })
    if (!isObject(studentValue.marks)) throw new Error(`${value.case_id}: ${studentValue.id} needs marks.`)
    const student = studentValue as unknown as Student
    classes.add(student.class)
    if (!subjectMap.has(student.optional)) {
      throw new Error(`${value.case_id}: ${student.id} has unknown optional subject ${student.optional}.`)
    }
    const requiredCodes = [...(value.compulsory as string[]), student.optional]
    if (new Set(requiredCodes).size !== 7) {
      throw new Error(`${value.case_id}: ${student.id} must have six compulsory and one distinct optional subject.`)
    }
    if (Object.keys(student.marks).length !== 7) {
      throw new Error(`${value.case_id}: ${student.id} must have exactly seven marks.`)
    }
    requiredCodes.forEach((code) => {
      const subject = subjectMap.get(code)!
      validateMark(student.marks[code], subject, `${value.case_id}/${student.id}/${code}`)
    })
  })
  if (classes.size < 2) throw new Error(`${value.case_id}: students must span at least two classes.`)
}

export function parseFixture(input: string): Fixture {
  let value: unknown
  try {
    value = JSON.parse(input)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (!isObject(value) || value.problem_id !== 'P08' || !Array.isArray(value.cases)) {
    throw new Error('Expected a P08 fixture with a cases array.')
  }
  if (!value.cases.length) throw new Error('The fixture contains no cases.')
  value.cases.forEach(validateCase)
  return value as Fixture
}
