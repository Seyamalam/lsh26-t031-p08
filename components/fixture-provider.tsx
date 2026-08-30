"use client"

import * as React from "react"

import { bundledFixture, parseFixture } from "@/src/data/fixture"
import { buildCheckingLists, evaluateCase } from "@/src/domain/engine"
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
  setCaseId: (caseId: string) => void
  loadFixture: (file: File) => Promise<void>
  resetFixture: () => void
  openTrace: (result: StudentResult) => void
  closeTrace: () => void
}

const FixtureContext = React.createContext<FixtureContextValue | null>(null)

export function FixtureProvider({ children }: { children: React.ReactNode }) {
  const [fixture, setFixture] = React.useState<Fixture>(bundledFixture)
  const [caseId, setCaseIdState] = React.useState(
    bundledFixture.cases[0].case_id
  )
  const [uploadError, setUploadError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedResult, setSelectedResult] =
    React.useState<StudentResult | null>(null)

  const currentCase = React.useMemo(
    () =>
      fixture.cases.find((item) => item.case_id === caseId) ?? fixture.cases[0],
    [caseId, fixture]
  )
  const results = React.useMemo(() => evaluateCase(currentCase), [currentCase])
  const checking = React.useMemo(() => buildCheckingLists(results), [results])
  const classes = React.useMemo(
    () =>
      Array.from(new Set(results.map((result) => result.student.class))).sort(),
    [results]
  )

  function setCaseId(nextCaseId: string) {
    if (!fixture.cases.some((item) => item.case_id === nextCaseId)) return
    setCaseIdState(nextCaseId)
    setSelectedResult(null)
    setUploadError("")
  }

  async function loadFixture(file: File) {
    setIsLoading(true)
    setUploadError("")
    try {
      const nextFixture = parseFixture(await file.text())
      setFixture(nextFixture)
      setCaseIdState(nextFixture.cases[0].case_id)
      setSelectedResult(null)
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Could not load this fixture."
      )
    } finally {
      setIsLoading(false)
    }
  }

  function resetFixture() {
    setFixture(bundledFixture)
    setCaseIdState(bundledFixture.cases[0].case_id)
    setUploadError("")
    setSelectedResult(null)
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
    setCaseId,
    loadFixture,
    resetFixture,
    openTrace: setSelectedResult,
    closeTrace: () => setSelectedResult(null),
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
