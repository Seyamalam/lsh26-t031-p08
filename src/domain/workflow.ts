import type { CheckingLists } from "./types"

export type PublicationStage = "draft" | "checked" | "approved" | "published"
export type ReviewKind = keyof CheckingLists
export type ResolutionStatus = "open" | "verified" | "corrected" | "waived"

export type ReviewItem = {
  id: string
  studentId: string
  studentName: string
  className: string
  kind: ReviewKind
  reasons: string[]
  status: ResolutionStatus
  note: string
}

export type PublicationState = {
  stage: PublicationStage
  reviewItems: ReviewItem[]
  updatedAt: string
}

const nextStage: Record<PublicationStage, PublicationStage | null> = {
  draft: "checked",
  checked: "approved",
  approved: "published",
  published: null,
}

export function buildReviewQueue(checking: CheckingLists): ReviewItem[] {
  return (Object.keys(checking) as ReviewKind[]).flatMap((kind) =>
    checking[kind].map(({ student, reasons }) => ({
      id: `${kind}:${student.id}`,
      studentId: student.id,
      studentName: student.name,
      className: student.class,
      kind,
      reasons,
      status: "open" as const,
      note: "",
    }))
  )
}

export function createPublicationState(checking: CheckingLists): PublicationState {
  return {
    stage: "draft",
    reviewItems: buildReviewQueue(checking),
    updatedAt: new Date(0).toISOString(),
  }
}

export function reconcilePublicationState(
  state: PublicationState,
  checking: CheckingLists
): PublicationState {
  const previous = new Map(state.reviewItems.map((item) => [item.id, item]))
  return {
    ...state,
    reviewItems: buildReviewQueue(checking).map((item) => {
      const saved = previous.get(item.id)
      return saved ? { ...item, status: saved.status, note: saved.note } : item
    }),
  }
}

export function resolveReviewItem(
  state: PublicationState,
  id: string,
  status: ResolutionStatus,
  note: string
): PublicationState {
  return {
    ...state,
    reviewItems: state.reviewItems.map((item) =>
      item.id === id ? { ...item, status, note: note.trim() } : item
    ),
    updatedAt: new Date().toISOString(),
  }
}

export function openReviewCount(state: PublicationState) {
  return state.reviewItems.filter((item) => item.status === "open").length
}

export function transitionPublication(
  state: PublicationState,
  target: PublicationStage
): { ok: true; state: PublicationState } | { ok: false; reason: string } {
  if (nextStage[state.stage] !== target) {
    return { ok: false, reason: `Move from ${state.stage} to ${nextStage[state.stage] ?? "no further stage"}.` }
  }
  const remaining = openReviewCount(state)
  if ((target === "checked" || target === "published") && remaining > 0) {
    return {
      ok: false,
      reason: `Resolve ${remaining} open review ${remaining === 1 ? "item" : "items"} before ${target === "checked" ? "checking" : "publishing"}.`,
    }
  }
  return {
    ok: true,
    state: { ...state, stage: target, updatedAt: new Date().toISOString() },
  }
}
