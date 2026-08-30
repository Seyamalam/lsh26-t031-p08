"use client"

import * as React from "react"

import { bundledFixture, readFixtureFile } from "@/src/data/fixture"
import { applyCorrections, buildCorrection, calculateCorrectionImpact, type Correction, type CorrectionImpact, type CorrectionInput } from "@/src/domain/corrections"
import { buildCheckingLists, evaluateCase } from "@/src/domain/engine"
import { createPublicationState, reconcilePublicationState, resolveReviewItem, resetPublicationAfterCorrection, transitionPublication, type PublicationStage, type PublicationState, type ResolutionStatus } from "@/src/domain/workflow"
import { createIndexedDbWorkspaceAdapter } from "@/src/storage/indexed-db"
import { BUNDLED_DATASET_ID, createWorkspaceCatalog, readLastSelectedDataset, resolveWorkspaceActivation, workspaceStorageError, writeLastSelectedDataset, type DatasetRecord } from "@/src/storage/workspace"
import type { CheckingLists, Fixture, FixtureCase, StudentResult } from "@/src/domain/types"

type LoadMode = "once" | "save"
type LoadOutcome = { ok: true; datasetId: string } | { ok: false; error: string }
type FixtureContextValue = {
  fixture: Fixture; currentCase: FixtureCase; sourceCase: FixtureCase; caseId: string
  datasetId: string; datasetName: string; activeDataset: DatasetRecord | null; savedDatasets: DatasetRecord[]
  results: StudentResult[]; checking: CheckingLists; classes: string[]
  uploadError: string; uploadNotice: string; storageError: string; isLoading: boolean
  selectedResult: StudentResult | null; fixtureRevision: number
  publication: PublicationState; corrections: Correction[]; correctionImpacts: CorrectionImpact[]
  setCaseId: (caseId: string) => Promise<void>; openDataset: (datasetId: string) => Promise<void>
  loadFixture: (file: File, mode: LoadMode, name?: string) => Promise<LoadOutcome>; resetFixture: () => void
  refreshDatasets: () => Promise<void>; renameDataset: (id: string, name: string) => Promise<void>
  replaceDataset: (id: string, file: File) => Promise<void>; deleteDataset: (id: string) => Promise<void>
  clearSavedDatasets: () => Promise<void>; exportDataset: (id: string) => Promise<string>
  openTrace: (result: StudentResult) => void; closeTrace: () => void
  setReviewResolution: (id: string, status: ResolutionStatus, note: string) => void
  advancePublication: (target: PublicationStage) => { ok: true } | { ok: false; reason: string }
  addCorrection: (input: Omit<CorrectionInput, "id" | "createdAt">) => Correction; clearCorrections: () => void
}

const FixtureContext = React.createContext<FixtureContextValue | null>(null)
const MAX_CACHE_SIZE = 3

export function FixtureProvider({ children }: { children: React.ReactNode }) {
  const catalog = React.useMemo(() => createWorkspaceCatalog(createIndexedDbWorkspaceAdapter()), [])
  const fixtureCache = React.useRef(new Map<string, Fixture>())
  const requestId = React.useRef(0)
  const [fixture, setFixture] = React.useState<Fixture>(bundledFixture)
  const [datasetId, setDatasetId] = React.useState(BUNDLED_DATASET_ID)
  const [datasetName, setDatasetName] = React.useState("Bundled data")
  const [activeDataset, setActiveDataset] = React.useState<DatasetRecord | null>(null)
  const [savedDatasets, setSavedDatasets] = React.useState<DatasetRecord[]>([])
  const [caseId, setCaseIdState] = React.useState(bundledFixture.cases[0].case_id)
  const [uploadError, setUploadError] = React.useState("")
  const [uploadNotice, setUploadNotice] = React.useState("")
  const [storageError, setStorageError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedResult, setSelectedResult] = React.useState<StudentResult | null>(null)
  const [fixtureRevision, setFixtureRevision] = React.useState(0)
  const [correctionsByWorkspace, setCorrectionsByWorkspace] = React.useState<Record<string, Correction[]>>({})
  const [publicationByWorkspace, setPublicationByWorkspace] = React.useState<Record<string, PublicationState>>({})

  const workspaceKey = `${datasetId}::${caseId}`
  const sourceCase = React.useMemo(() => fixture.cases.find((item) => item.case_id === caseId) ?? fixture.cases[0], [caseId, fixture])
  const corrections = React.useMemo(() => correctionsByWorkspace[workspaceKey] ?? [], [correctionsByWorkspace, workspaceKey])
  const currentCase = React.useMemo(() => applyCorrections(sourceCase, corrections), [corrections, sourceCase])
  const results = React.useMemo(() => evaluateCase(currentCase), [currentCase])
  const checking = React.useMemo(() => buildCheckingLists(results), [results])
  const classes = React.useMemo(() => Array.from(new Set(results.map((result) => result.student.class))).sort(), [results])
  const publication = React.useMemo(() => reconcilePublicationState(publicationByWorkspace[workspaceKey] ?? createPublicationState(checking), checking), [checking, publicationByWorkspace, workspaceKey])
  const correctionImpacts = React.useMemo(() => corrections.map((correction, index) => calculateCorrectionImpact(sourceCase, corrections.slice(0, index), correction)), [corrections, sourceCase])
  const isPersistentDataset = datasetId === BUNDLED_DATASET_ID || !datasetId.startsWith("session:")

  function cacheFixture(id: string, nextFixture: Fixture) {
    const cache = fixtureCache.current
    cache.delete(id); cache.set(id, nextFixture)
    while (cache.size > MAX_CACHE_SIZE) cache.delete(cache.keys().next().value!)
  }
  async function refreshDatasets() {
    try { setSavedDatasets(await catalog.listDatasets()); setStorageError("") }
    catch (error) { setStorageError(workspaceStorageError(error).message) }
  }
  async function activate(requestedId: string, requestedCase?: string) {
    const token = ++requestId.current; setIsLoading(true)
    try {
      const activation = await resolveWorkspaceActivation(requestedId, catalog, bundledFixture)
      const nextFixture = fixtureCache.current.get(activation.datasetId) ?? activation.fixture
      cacheFixture(activation.datasetId, nextFixture)
      const candidate = requestedCase ?? activation.caseId
      const nextCase = nextFixture.cases.some((item) => item.case_id === candidate) ? candidate : nextFixture.cases[0].case_id
      const office = await catalog.getOfficeState(activation.datasetId, nextCase)
      if (token !== requestId.current) return
      const key = `${activation.datasetId}::${nextCase}`
      const nextSource = nextFixture.cases.find((item) => item.case_id === nextCase)!
      setFixture(nextFixture); setDatasetId(activation.datasetId); setDatasetName(activation.record?.name ?? "Bundled data")
      setActiveDataset(activation.record); setCaseIdState(nextCase)
      setCorrectionsByWorkspace((current) => ({ ...current, [key]: office?.corrections ?? [] }))
      setPublicationByWorkspace((current) => ({ ...current, [key]: office?.publication ?? createPublicationState(buildCheckingLists(evaluateCase(nextSource))) }))
      setSelectedResult(null); setUploadError(""); setUploadNotice(""); setStorageError("")
      setFixtureRevision((value) => value + 1); writeLastSelectedDataset(localStorage, activation.datasetId)
    } catch (error) { setStorageError(workspaceStorageError(error).message) }
    finally { if (token === requestId.current) setIsLoading(false) }
  }

  // Restore once after hydration; later activations are explicit user actions.
  React.useEffect(() => {
    const timer = window.setTimeout(() => { void refreshDatasets(); const savedId = readLastSelectedDataset(localStorage); if (savedId) void activate(savedId) }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function setCaseId(nextCaseId: string) {
    if (!fixture.cases.some((item) => item.case_id === nextCaseId)) return
    const token = ++requestId.current; setIsLoading(true)
    try {
      const office = isPersistentDataset ? await catalog.getOfficeState(datasetId, nextCaseId) : undefined
      if (token !== requestId.current) return
      const key = `${datasetId}::${nextCaseId}`; const nextSource = fixture.cases.find((item) => item.case_id === nextCaseId)!
      setCorrectionsByWorkspace((current) => ({ ...current, [key]: office?.corrections ?? current[key] ?? [] }))
      setPublicationByWorkspace((current) => ({ ...current, [key]: office?.publication ?? current[key] ?? createPublicationState(buildCheckingLists(evaluateCase(nextSource))) }))
      setCaseIdState(nextCaseId); setSelectedResult(null); setUploadError(""); setUploadNotice("")
      if (activeDataset) { await catalog.updateLastOpenedCase(activeDataset.id, nextCaseId); setActiveDataset({ ...activeDataset, lastOpenedCase: nextCaseId }) }
    } catch (error) { setStorageError(workspaceStorageError(error).message) }
    finally { if (token === requestId.current) setIsLoading(false) }
  }

  async function loadFixture(file: File, mode: LoadMode, name?: string): Promise<LoadOutcome> {
    const token = ++requestId.current; setIsLoading(true); setUploadError(""); setUploadNotice("")
    try {
      const prepared = await readFixtureFile(file)
      if (token !== requestId.current) return { ok: false, error: "A newer fixture action replaced this load." }
      if (mode === "save") {
        const saved = await catalog.saveDataset({ name: name?.trim() || file.name.replace(/\.json$/i, ""), sourceFilename: file.name, ...prepared })
        await refreshDatasets(); await activate(saved.record.id, saved.record.lastOpenedCase)
        setUploadNotice(saved.deduplicated ? `Already saved as ${saved.record.name}. Opened ${saved.record.lastOpenedCase}.` : `Saved ${saved.record.name} on this device.`)
        return { ok: true, datasetId: saved.record.id }
      }
      const sessionId = `session:${prepared.fingerprint}`; cacheFixture(sessionId, prepared.fixture)
      const firstCase = prepared.fixture.cases[0].case_id; const key = `${sessionId}::${firstCase}`
      setFixture(prepared.fixture); setDatasetId(sessionId); setDatasetName(file.name); setActiveDataset(null); setCaseIdState(firstCase)
      setCorrectionsByWorkspace((current) => ({ ...current, [key]: [] }))
      setPublicationByWorkspace((current) => ({ ...current, [key]: createPublicationState(buildCheckingLists(evaluateCase(prepared.fixture.cases[0]))) }))
      setSelectedResult(null); setFixtureRevision((value) => value + 1); writeLastSelectedDataset(localStorage, sessionId)
      setUploadNotice(`${prepared.fixture.cases.length} case${prepared.fixture.cases.length === 1 ? "" : "s"} loaded for this session.`)
      return { ok: true, datasetId: sessionId }
    } catch (error) { const message = error instanceof Error ? error.message : "Could not load this fixture."; setUploadError(message); return { ok: false, error: message } }
    finally { if (token === requestId.current) setIsLoading(false) }
  }

  function persistOffice(nextCorrections: Correction[], nextPublication: PublicationState) {
    if (!isPersistentDataset) return
    void catalog.saveOfficeState({ datasetId, caseId, corrections: nextCorrections, publication: nextPublication }).catch((error) => setStorageError(workspaceStorageError(error).message))
  }
  function resetFixture() { void activate(BUNDLED_DATASET_ID) }
  async function openDataset(nextId: string) { await activate(nextId) }
  async function renameDataset(id: string, name: string) { const record = await catalog.renameDataset(id, name); await refreshDatasets(); if (datasetId === id) { setDatasetName(record.name); setActiveDataset(record) } }
  async function replaceDataset(id: string, file: File) { const prepared = await readFixtureFile(file); await catalog.replaceDataset(id, { sourceFilename: file.name, ...prepared }); fixtureCache.current.delete(id); await refreshDatasets(); if (datasetId === id) await activate(id) }
  async function deleteDataset(id: string) { await catalog.deleteDataset(id); fixtureCache.current.delete(id); await refreshDatasets(); if (datasetId === id) await activate(BUNDLED_DATASET_ID) }
  async function clearSavedDatasets() { await catalog.clearAll(); fixtureCache.current.clear(); await refreshDatasets(); if (datasetId !== BUNDLED_DATASET_ID) await activate(BUNDLED_DATASET_ID) }
  async function exportDataset(id: string) { return catalog.exportOriginal(id) }
  function setReviewResolution(id: string, status: ResolutionStatus, note: string) { const next = resolveReviewItem(publication, id, status, note); setPublicationByWorkspace((current) => ({ ...current, [workspaceKey]: next })); persistOffice(corrections, next) }
  function advancePublication(target: PublicationStage) { const outcome = transitionPublication(publication, target); if (!outcome.ok) return outcome; setPublicationByWorkspace((current) => ({ ...current, [workspaceKey]: outcome.state })); persistOffice(corrections, outcome.state); return { ok: true as const } }
  function addCorrection(input: Omit<CorrectionInput, "id" | "createdAt">) { const correction = buildCorrection(sourceCase, corrections, { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }); const nextCorrections = [...corrections, correction]; const nextPublication = resetPublicationAfterCorrection(publication, buildCheckingLists(evaluateCase(applyCorrections(sourceCase, nextCorrections)))); setCorrectionsByWorkspace((current) => ({ ...current, [workspaceKey]: nextCorrections })); setPublicationByWorkspace((current) => ({ ...current, [workspaceKey]: nextPublication })); persistOffice(nextCorrections, nextPublication); return correction }
  function clearCorrections() { const nextPublication = resetPublicationAfterCorrection(publication, buildCheckingLists(evaluateCase(sourceCase))); setCorrectionsByWorkspace((current) => ({ ...current, [workspaceKey]: [] })); setPublicationByWorkspace((current) => ({ ...current, [workspaceKey]: nextPublication })); persistOffice([], nextPublication) }

  const value: FixtureContextValue = { fixture, currentCase, sourceCase, caseId, datasetId, datasetName, activeDataset, savedDatasets, results, checking, classes, uploadError, uploadNotice, storageError, isLoading, selectedResult, fixtureRevision, publication, corrections, correctionImpacts, setCaseId, openDataset, loadFixture, resetFixture, refreshDatasets, renameDataset, replaceDataset, deleteDataset, clearSavedDatasets, exportDataset, openTrace: setSelectedResult, closeTrace: () => setSelectedResult(null), setReviewResolution, advancePublication, addCorrection, clearCorrections }
  return <FixtureContext.Provider value={value}>{children}</FixtureContext.Provider>
}

export function useFixture() { const context = React.useContext(FixtureContext); if (!context) throw new Error("useFixture must be used within FixtureProvider."); return context }
