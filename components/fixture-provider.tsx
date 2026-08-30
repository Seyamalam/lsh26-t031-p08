"use client"

import * as React from "react"

import { bundledFixture, loadFixtureFile } from "@/src/data/fixture"
import {
  applyCorrections,
  buildCorrection,
  calculateCorrectionImpact,
  type Correction,
  type CorrectionImpact,
  type CorrectionInput,
} from "@/src/domain/corrections"
import { buildCheckingLists, evaluateCase } from "@/src/domain/engine"
import {
  createPublicationState,
  reconcilePublicationState,
  resolveReviewItem,
  transitionPublication,
  type PublicationStage,
  type PublicationState,
  type ResolutionStatus,
} from "@/src/domain/workflow"
import type {
  CheckingLists,
  Fixture,
  FixtureCase,
  StudentResult,
} from "@/src/domain/types"

type FixtureContextValue = {
  fixture: Fixture
  currentCase: FixtureCase
  caseId: string
  results: StudentResult[]
  checking: CheckingLists
  classes: string[]
  uploadError: string
  isLoading: boolean
  selectedResult: StudentResult | null
  sourceCase: FixtureCase
  fixtureRevision: number
  publication: PublicationState
  corrections: Correction[]
  correctionImpacts: CorrectionImpact[]
  setCaseId: (caseId: string) => void
  loadFixture: (
    file: File
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  resetFixture: () => void
  openTrace: (result: StudentResult) => void
  closeTrace: () => void
  setReviewResolution: (id: string, status: ResolutionStatus, note: string) => void
  advancePublication: (target: PublicationStage) => { ok: true } | { ok: false; reason: string }
  addCorrection: (input: Omit<CorrectionInput, "id" | "createdAt">) => Correction
  clearCorrections: () => void
}

const FixtureContext = React.createContext<FixtureContextValue | null>(null)
const OFFICE_STORAGE_KEY = "p08-office-state-v1"

export function FixtureProvider({ children }: { children: React.ReactNode }) {
  const [fixture, setFixture] = React.useState<Fixture>(bundledFixture)
  const [caseId, setCaseIdState] = React.useState(
    bundledFixture.cases[0].case_id
  )
  const [uploadError, setUploadError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedResult, setSelectedResult] =
    React.useState<StudentResult | null>(null)
  const [fixtureRevision, setFixtureRevision] = React.useState(0)
  const [correctionsByCase, setCorrectionsByCase] = React.useState<Record<string, Correction[]>>({})
  const [publicationByCase, setPublicationByCase] = React.useState<Record<string, PublicationState>>({})
  const requestId = React.useRef(0)

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
    try {
      const saved = localStorage.getItem(OFFICE_STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as {
        correctionsByCase?: Record<string, Correction[]>
        publicationByCase?: Record<string, PublicationState>
      }
      setCorrectionsByCase(parsed.correctionsByCase ?? {})
      setPublicationByCase(parsed.publicationByCase ?? {})
    } catch {
      localStorage.removeItem(OFFICE_STORAGE_KEY)
    }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  React.useEffect(() => {
    localStorage.setItem(
      OFFICE_STORAGE_KEY,
      JSON.stringify({ correctionsByCase, publicationByCase })
    )
  }, [correctionsByCase, publicationByCase])

  const sourceCase = React.useMemo(
    () =>
      fixture.cases.find((item) => item.case_id === caseId) ?? fixture.cases[0],
    [caseId, fixture]
  )
  const corrections = React.useMemo(
    () => correctionsByCase[caseId] ?? [],
    [caseId, correctionsByCase]
  )
  const currentCase = React.useMemo(
    () => applyCorrections(sourceCase, corrections),
    [corrections, sourceCase]
  )
  const results = React.useMemo(() => evaluateCase(currentCase), [currentCase])
  const checking = React.useMemo(() => buildCheckingLists(results), [results])
  const classes = React.useMemo(
    () =>
      Array.from(new Set(results.map((result) => result.student.class))).sort(),
    [results]
  )
  const publication = React.useMemo(
    () => reconcilePublicationState(
      publicationByCase[caseId] ?? createPublicationState(checking),
      checking
    ),
    [caseId, checking, publicationByCase]
  )
  const correctionImpacts = React.useMemo(
    () => corrections.map((correction, index) =>
      calculateCorrectionImpact(sourceCase, corrections.slice(0, index), correction)
    ),
    [corrections, sourceCase]
  )

  function setCaseId(nextCaseId: string) {
    if (!fixture.cases.some((item) => item.case_id === nextCaseId)) return
    setCaseIdState(nextCaseId)
    setSelectedResult(null)
    setUploadError("")
  }

  async function loadFixture(file: File) {
    const thisRequest = ++requestId.current
    setIsLoading(true)
    setUploadError("")
    try {
      const nextFixture = await loadFixtureFile(file)
      if (thisRequest !== requestId.current) {
        return { ok: false as const, error: "A newer fixture action replaced this load." }
      }
      setFixture(nextFixture)
      setCaseIdState(nextFixture.cases[0].case_id)
      setSelectedResult(null)
      setCorrectionsByCase({})
      setPublicationByCase({})
      localStorage.removeItem(OFFICE_STORAGE_KEY)
      setFixtureRevision((value) => value + 1)
      return { ok: true as const }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load this fixture."
      setUploadError(message)
      return { ok: false as const, error: message }
    } finally {
      if (thisRequest === requestId.current) setIsLoading(false)
    }
  }

  function resetFixture() {
    requestId.current += 1
    setFixture(bundledFixture)
    setCaseIdState(bundledFixture.cases[0].case_id)
    setUploadError("")
    setSelectedResult(null)
    setIsLoading(false)
    setCorrectionsByCase({})
    setPublicationByCase({})
    localStorage.removeItem(OFFICE_STORAGE_KEY)
    setFixtureRevision((value) => value + 1)
  }

  function setReviewResolution(id: string, status: ResolutionStatus, note: string) {
    setPublicationByCase((current) => ({
      ...current,
      [caseId]: resolveReviewItem(publication, id, status, note),
    }))
  }

  function advancePublication(target: PublicationStage) {
    const outcome = transitionPublication(publication, target)
    if (!outcome.ok) return outcome
    setPublicationByCase((current) => ({ ...current, [caseId]: outcome.state }))
    return { ok: true as const }
  }

  function addCorrection(input: Omit<CorrectionInput, "id" | "createdAt">) {
    const correction = buildCorrection(sourceCase, corrections, {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    })
    setCorrectionsByCase((current) => ({
      ...current,
      [caseId]: [...(current[caseId] ?? []), correction],
    }))
    return correction
  }

  function clearCorrections() {
    setCorrectionsByCase((current) => ({ ...current, [caseId]: [] }))
  }

  const value: FixtureContextValue = {
    fixture,
    currentCase,
    caseId,
    results,
    checking,
    classes,
    uploadError,
    isLoading,
    selectedResult,
    sourceCase,
    fixtureRevision,
    publication,
    corrections,
    correctionImpacts,
    setCaseId,
    loadFixture,
    resetFixture,
    openTrace: setSelectedResult,
    closeTrace: () => setSelectedResult(null),
    setReviewResolution,
    advancePublication,
    addCorrection,
    clearCorrections,
  }

  return (
    <FixtureContext.Provider value={value}>{children}</FixtureContext.Provider>
  )
}

export function useFixture() {
  const context = React.useContext(FixtureContext)
  if (!context)
    throw new Error("useFixture must be used within FixtureProvider.")
  return context
}
