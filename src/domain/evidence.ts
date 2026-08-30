import type { StudentResult } from "./types"

export type JudgeExamples = {
  compulsoryFail: StudentResult | undefined
  practicalFail: StudentResult | undefined
  optionalRule: StudentResult | undefined
  absent: StudentResult | undefined
}

export function findJudgeExamples(results: StudentResult[]): JudgeExamples {
  const compulsoryFail = results.find(
    (result) =>
      result.compulsoryFailures.length > 0 && result.uncancelledGpa >= 4
  )
  const practicalFail = results.find((result) =>
    result.subjectResults.some(
      (subject) =>
        subject.isPractical &&
        subject.theoryPassed === true &&
        subject.practicalPassed === false
    )
  )
  const optionalRule = results.find((result) => {
    const optional = result.subjectResults.find((subject) => subject.isOptional)
    return (
      optional &&
      optional.point <= 2 &&
      !optional.absent &&
      !result.flags.practicalFail
    )
  })
  const absent =
    results.find((result) =>
      result.subjectResults.some(
        (subject) => subject.absent && !subject.isOptional
      )
    ) ?? results.find((result) => result.flags.absent)

  return { compulsoryFail, practicalFail, optionalRule, absent }
}
