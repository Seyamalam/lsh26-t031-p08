import { describe, expect, it } from "vitest"

import type { CheckingLists } from "./types"
import {
  buildReviewQueue,
  createPublicationState,
  resolveReviewItem,
  transitionPublication,
} from "./workflow"

const student = { id: "S-01", name: "Samira", class: "Class 9", optional: "ART", marks: {} }
const result = { student } as CheckingLists["optional"][number]["result"]
const checking = {
  optional: [{ student, result, reasons: ["Optional grade point is 2.0"] }],
  practical: [{ student, result, reasons: ["SCI practical is 7/25"] }],
  absent: [],
} satisfies CheckingLists

describe("publication workflow", () => {
  it("builds one actionable item per student and review type", () => {
    expect(buildReviewQueue(checking).map((item) => item.id)).toEqual([
      "optional:S-01",
      "practical:S-01",
    ])
  })

  it("blocks checking and publication until every exception is resolved", () => {
    const draft = createPublicationState(checking)
    expect(transitionPublication(draft, "checked")).toMatchObject({
      ok: false,
      reason: "Resolve 2 open review items before checking.",
    })

    const optionalDone = resolveReviewItem(
      draft,
      "optional:S-01",
      "verified",
      "Checked against the register"
    )
    const ready = resolveReviewItem(
      optionalDone,
      "practical:S-01",
      "corrected",
      "Teacher supplied the corrected practical mark"
    )
    const checked = transitionPublication(ready, "checked")
    expect(checked.ok).toBe(true)
    if (!checked.ok) return
    const approved = transitionPublication(checked.state, "approved")
    expect(approved.ok).toBe(true)
    if (!approved.ok) return
    expect(transitionPublication(approved.state, "published")).toMatchObject({
      ok: true,
      state: { stage: "published" },
    })
  })

  it("prevents skipped and backward transitions", () => {
    const state = createPublicationState({ optional: [], practical: [], absent: [] })
    expect(transitionPublication(state, "approved")).toMatchObject({ ok: false })
  })
})
