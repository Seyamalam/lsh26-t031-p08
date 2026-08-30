import type {
  CheckingLists,
  FixtureCase,
  Mark,
  ReviewEntry,
  Student,
  StudentResult,
  Subject,
  SubjectResult,
} from "./types"

export function gradePointForMark(mark: number): {
  point: number
  band: string
} {
  if (mark >= 80) return { point: 5, band: "80–100 → 5.0" }
  if (mark >= 70) return { point: 4, band: "70–79 → 4.0" }
  if (mark >= 60) return { point: 3.5, band: "60–69 → 3.5" }
  if (mark >= 50) return { point: 3, band: "50–59 → 3.0" }
  if (mark >= 40) return { point: 2, band: "40–49 → 2.0" }
  if (mark >= 33) return { point: 1, band: "33–39 → 1.0" }
  return { point: 0, band: "Below 33 → 0.0" }
}

export function evaluateSubject(
  subject: Subject,
  mark: Mark,
  isOptional: boolean
): SubjectResult {
  const base = {
    code: subject.code,
    name: subject.name,
    isOptional,
    isPractical: subject.practical,
    rawMark: mark,
  }

  if (mark === "AB") {
    return {
      ...base,
      rawDisplay: "AB",
      total: null,
      point: 0,
      band: "Absent → 0.0",
      decision: "Absent mark (AB); subject grade point is 0.0.",
      failed: true,
      absent: true,
    }
  }

  if (subject.practical) {
    if (typeof mark === "number") {
      throw new Error(
        `${subject.code} requires separate theory and practical marks.`
      )
    }
    const theoryPassed = mark.theory >= 25
    const practicalPassed = mark.practical >= 8
    const total = mark.theory + mark.practical
    if (!theoryPassed || !practicalPassed) {
      const failures = [
        !theoryPassed ? `theory ${mark.theory}/75 is below 25` : "",
        !practicalPassed ? `practical ${mark.practical}/25 is below 8` : "",
      ].filter(Boolean)
      return {
        ...base,
        rawDisplay: `T ${mark.theory}/75 + P ${mark.practical}/25`,
        total,
        point: 0,
        band: "Component fail → 0.0",
        decision: `${failures.join(" and ")}; component rule overrides the total of ${total}.`,
        failed: true,
        absent: false,
        theoryPassed,
        practicalPassed,
      }
    }
    const grade = gradePointForMark(total)
    return {
      ...base,
      rawDisplay: `T ${mark.theory}/75 + P ${mark.practical}/25`,
      total,
      point: grade.point,
      band: grade.band,
      decision: `Theory and practical passed; total ${total} uses the ${grade.band} band.`,
      failed: grade.point === 0,
      absent: false,
      theoryPassed,
      practicalPassed,
    }
  }

  if (typeof mark !== "number") {
    throw new Error(`${subject.code} requires one whole mark.`)
  }
  const grade = gradePointForMark(mark)
  return {
    ...base,
    rawDisplay: `${mark}/100`,
    total: mark,
    point: grade.point,
    band: grade.band,
    decision: `Whole mark ${mark} uses the ${grade.band} band.`,
    failed: grade.point === 0,
    absent: false,
  }
}

export function letterForGpa(
  gpa: number,
  hasCompulsoryFailure = false
): string {
  if (hasCompulsoryFailure || gpa < 1) return "F"
  if (gpa === 5) return "A+"
  if (gpa >= 4) return "A"
  if (gpa >= 3.5) return "A-"
  if (gpa >= 3) return "B"
  if (gpa >= 2) return "C"
  return "D"
}

export function evaluateStudent(
  student: Student,
  subjects: Subject[],
  compulsoryCodes: string[]
): StudentResult {
  const subjectMap = new Map(subjects.map((subject) => [subject.code, subject]))
  const evaluatedCodes = [...compulsoryCodes, student.optional]
  const subjectResults = evaluatedCodes.map((code) => {
    const subject = subjectMap.get(code)
    if (!subject) throw new Error(`Unknown subject code ${code}.`)
    const mark = student.marks[code]
    if (mark === undefined)
      throw new Error(`${student.id} is missing a mark for ${code}.`)
    return evaluateSubject(subject, mark, code === student.optional)
  })
  const compulsoryResults = subjectResults.filter(
    (result) => !result.isOptional
  )
  const optionalResult = subjectResults.find((result) => result.isOptional)!
  const compulsoryPointSum = compulsoryResults.reduce(
    (sum, result) => sum + result.point,
    0
  )
  const optionalPoint = optionalResult.point
  const optionalBonus = Math.max(0, optionalPoint - 2)
  const uncancelledGpa = Math.min(5, (compulsoryPointSum + optionalBonus) / 6)
  const compulsoryFailures = compulsoryResults.filter((result) => result.failed)
  const hasCompulsoryFailure = compulsoryFailures.length > 0
  const finalGpa = hasCompulsoryFailure ? 0 : uncancelledGpa

  return {
    student,
    subjectResults,
    compulsoryPointSum,
    optionalPoint,
    optionalBonus,
    uncancelledGpa,
    finalGpa,
    letterGrade: letterForGpa(finalGpa, hasCompulsoryFailure),
    compulsoryFailures,
    flags: {
      optionalReview: optionalPoint <= 2,
      practicalFail: subjectResults.some(
        (result) => result.isPractical && result.practicalPassed === false
      ),
      absent: subjectResults.some((result) => result.absent),
    },
  }
}

export function evaluateCase(fixtureCase: FixtureCase): StudentResult[] {
  return fixtureCase.students.map((student) =>
    evaluateStudent(student, fixtureCase.subjects, fixtureCase.compulsory)
  )
}

function makeEntry(result: StudentResult, reasons: string[]): ReviewEntry {
  return { student: result.student, result, reasons }
}

export function buildCheckingLists(results: StudentResult[]): CheckingLists {
  const optional: ReviewEntry[] = []
  const practical: ReviewEntry[] = []
  const absent: ReviewEntry[] = []

  results.forEach((result) => {
    const optionalResult = result.subjectResults.find(
      (subject) => subject.isOptional
    )!
    if (result.flags.optionalReview) {
      optional.push(
        makeEntry(result, [
          optionalResult.absent
            ? `${optionalResult.code}: optional subject is AB; bonus is 0.`
            : `${optionalResult.code}: grade point ${optionalResult.point.toFixed(1)} is 2.0 or below; bonus is 0.`,
        ])
      )
    }

    const practicalReasons = result.subjectResults
      .filter(
        (subject) => subject.isPractical && subject.practicalPassed === false
      )
      .map((subject) => `${subject.code}: practical mark is below 8.`)
    if (practicalReasons.length)
      practical.push(makeEntry(result, practicalReasons))

    const absentReasons = result.subjectResults
      .filter((subject) => subject.absent)
      .map((subject) => `${subject.code}: absent (AB).`)
    if (absentReasons.length) absent.push(makeEntry(result, absentReasons))
  })

  return { optional, practical, absent }
}
