import { evaluateCase, evaluateStudent } from "./engine"
import type { FixtureCase, Mark, StudentResult, SubjectResult } from "./types"

export type Correction = {
  id: string
  studentId: string
  subjectCode: string
  before: Mark
  after: Mark
  reason: string
  createdAt: string
}

export type CorrectionInput = Omit<Correction, "before">

export type CorrectionImpact = {
  studentId: string
  beforeGpa: number
  afterGpa: number
  gpaDelta: number
  beforeGrade: string
  afterGrade: string
}

export type ReportCard = {
  student: StudentResult["student"]
  subjects: SubjectResult[]
  finalGpa: number
  uncancelledGpa: number
  letterGrade: string
  corrections: Correction[]
}

const copyMark = (mark: Mark): Mark =>
  typeof mark === "object" ? { ...mark } : mark

export function applyCorrections(
  fixtureCase: FixtureCase,
  corrections: Correction[]
): FixtureCase {
  const latest = new Map<string, Correction>()
  corrections.forEach((correction) =>
    latest.set(`${correction.studentId}:${correction.subjectCode}`, correction)
  )
  return {
    ...fixtureCase,
    students: fixtureCase.students.map((student) => ({
      ...student,
      marks: Object.fromEntries(
        Object.entries(student.marks).map(([code, mark]) => [
          code,
          copyMark(latest.get(`${student.id}:${code}`)?.after ?? mark),
        ])
      ),
    })),
  }
}

export function buildCorrection(
  fixtureCase: FixtureCase,
  history: Correction[],
  input: CorrectionInput
): Correction {
  const effective = applyCorrections(fixtureCase, history)
  const student = effective.students.find((item) => item.id === input.studentId)
  if (!student) throw new Error(`Unknown student ${input.studentId}.`)
  if (!(input.subjectCode in student.marks)) {
    throw new Error(`${input.studentId} has no mark for ${input.subjectCode}.`)
  }
  if (!input.reason.trim()) throw new Error("A correction reason is required.")
  return {
    ...input,
    before: copyMark(student.marks[input.subjectCode]),
    after: copyMark(input.after),
    reason: input.reason.trim(),
  }
}

export function calculateCorrectionImpact(
  fixtureCase: FixtureCase,
  history: Correction[],
  correction: Correction
): CorrectionImpact {
  const beforeCase = applyCorrections(fixtureCase, history)
  const afterCase = applyCorrections(fixtureCase, [...history, correction])
  const beforeStudent = beforeCase.students.find((item) => item.id === correction.studentId)!
  const afterStudent = afterCase.students.find((item) => item.id === correction.studentId)!
  const before = evaluateStudent(beforeStudent, beforeCase.subjects, beforeCase.compulsory)
  const after = evaluateStudent(afterStudent, afterCase.subjects, afterCase.compulsory)
  return {
    studentId: correction.studentId,
    beforeGpa: before.finalGpa,
    afterGpa: after.finalGpa,
    gpaDelta: after.finalGpa - before.finalGpa,
    beforeGrade: before.letterGrade,
    afterGrade: after.letterGrade,
  }
}

export function buildReportCard(
  result: StudentResult,
  history: Correction[]
): ReportCard {
  return {
    student: result.student,
    subjects: result.subjectResults,
    finalGpa: result.finalGpa,
    uncancelledGpa: result.uncancelledGpa,
    letterGrade: result.letterGrade,
    corrections: history.filter((item) => item.studentId === result.student.id),
  }
}

export function evaluateCorrectedCase(fixtureCase: FixtureCase, history: Correction[]) {
  return evaluateCase(applyCorrections(fixtureCase, history))
}

export function formatMark(mark: Mark) {
  if (mark === "AB" || typeof mark === "number") return String(mark)
  return `T ${mark.theory} + P ${mark.practical}`
}
