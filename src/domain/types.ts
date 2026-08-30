export type WholeMark = number
export type PracticalMark = { theory: number; practical: number }
export type Mark = WholeMark | PracticalMark | 'AB'

export type Subject = {
  code: string
  name: string
  practical: boolean
}

export type Student = {
  id: string
  name: string
  class: string
  optional: string
  marks: Record<string, Mark>
}

export type FixtureCase = {
  case_id: string
  subjects: Subject[]
  compulsory: string[]
  students: Student[]
}

export type Fixture = {
  schema_version: string
  problem_id: 'P08'
  format_note?: string
  cases: FixtureCase[]
}

export type SubjectResult = {
  code: string
  name: string
  isOptional: boolean
  isPractical: boolean
  rawMark: Mark
  rawDisplay: string
  total: number | null
  point: number
  band: string
  decision: string
  failed: boolean
  absent: boolean
  theoryPassed?: boolean
  practicalPassed?: boolean
}

export type StudentResult = {
  student: Student
  subjectResults: SubjectResult[]
  compulsoryPointSum: number
  optionalPoint: number
  optionalBonus: number
  uncancelledGpa: number
  finalGpa: number
  letterGrade: string
  compulsoryFailures: SubjectResult[]
  flags: {
    optionalReview: boolean
    practicalFail: boolean
    absent: boolean
  }
}

export type ReviewEntry = {
  student: Student
  result: StudentResult
  reasons: string[]
}

export type CheckingLists = {
  optional: ReviewEntry[]
  practical: ReviewEntry[]
  absent: ReviewEntry[]
}
