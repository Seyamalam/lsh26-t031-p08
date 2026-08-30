import type { Correction } from "../domain/corrections"
import type { Fixture } from "../domain/types"
import type { PublicationState } from "../domain/workflow"

export const BUNDLED_DATASET_ID = "bundled"
export const LAST_SELECTED_DATASET_KEY = "p08:last-saved-dataset"
export const WORKSPACE_DB_NAME = "lsh26-p08-workspaces"
export const WORKSPACE_DB_VERSION = 1

export type DatasetCaseSummary = {
  caseId: string
  students: number
  classes: number
}

export type DatasetRecord = {
  id: string
  name: string
  problemId: "P08"
  schemaVersion: string
  sourceFilename: string
  importedAt: string
  byteSize: number
  fingerprint: string
  caseCount: number
  caseSummary: DatasetCaseSummary[]
  rawJson: string
  fixture: Fixture
  lastOpenedCase: string
}

export type OfficeStateRecord = {
  key: string
  datasetId: string
  caseId: string
  corrections: Correction[]
  publication: PublicationState
  updatedAt: string
}

export type DatasetInput = {
  name: string
  sourceFilename: string
  rawJson: string
  fixture: Fixture
  fingerprint: string
  byteSize: number
}

export type WorkspaceAdapter = {
  listDatasets(): Promise<DatasetRecord[]>
  getDataset(id: string): Promise<DatasetRecord | undefined>
  getDatasetByFingerprint(fingerprint: string): Promise<DatasetRecord | undefined>
  putDataset(record: DatasetRecord): Promise<void>
  deleteDataset(id: string): Promise<void>
  clearDatasets(): Promise<void>
  getOffice(key: string): Promise<OfficeStateRecord | undefined>
  putOffice(record: OfficeStateRecord): Promise<void>
  deleteOfficeForDataset(datasetId: string): Promise<void>
  clearOffice(): Promise<void>
}

const officeKey = (datasetId: string, caseId: string) => `${datasetId}::${caseId}`

function summarize(fixture: Fixture): DatasetCaseSummary[] {
  return fixture.cases.map((item) => ({
    caseId: item.case_id,
    students: item.students.length,
    classes: new Set(item.students.map((student) => student.class)).size,
  }))
}

function storageMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return new Error("Device storage is full. Export or delete a saved dataset, then try again.")
  }
  return error instanceof Error ? error : new Error("Device storage is unavailable in this browser.")
}

export function createWorkspaceCatalog(adapter: WorkspaceAdapter) {
  return {
    async listDatasets() {
      return (await adapter.listDatasets()).sort((a, b) => b.importedAt.localeCompare(a.importedAt))
    },
    getDataset: (id: string) => adapter.getDataset(id),
    async saveDataset(input: DatasetInput) {
      const existing = await adapter.getDatasetByFingerprint(input.fingerprint)
      if (existing) return { record: existing, deduplicated: true as const }
      const record: DatasetRecord = {
        id: crypto.randomUUID(),
        name: input.name.trim() || input.sourceFilename,
        problemId: "P08",
        schemaVersion: input.fixture.schema_version,
        sourceFilename: input.sourceFilename,
        importedAt: new Date().toISOString(),
        byteSize: input.byteSize,
        fingerprint: input.fingerprint,
        caseCount: input.fixture.cases.length,
        caseSummary: summarize(input.fixture),
        rawJson: input.rawJson,
        fixture: input.fixture,
        lastOpenedCase: input.fixture.cases[0].case_id,
      }
      try {
        await adapter.putDataset(record)
      } catch (error) {
        throw storageMessage(error)
      }
      return { record, deduplicated: false as const }
    },
    async renameDataset(id: string, name: string) {
      const record = await adapter.getDataset(id)
      if (!record) throw new Error("Saved dataset not found.")
      const next = { ...record, name: name.trim() || record.name }
      await adapter.putDataset(next)
      return next
    },
    async replaceDataset(id: string, input: Omit<DatasetInput, "name">) {
      const record = await adapter.getDataset(id)
      if (!record) throw new Error("Saved dataset not found.")
      const duplicate = await adapter.getDatasetByFingerprint(input.fingerprint)
      if (duplicate && duplicate.id !== id) throw new Error(`This file is already saved as ${duplicate.name}.`)
      const next: DatasetRecord = {
        ...record,
        sourceFilename: input.sourceFilename,
        importedAt: new Date().toISOString(),
        byteSize: input.byteSize,
        fingerprint: input.fingerprint,
        schemaVersion: input.fixture.schema_version,
        caseCount: input.fixture.cases.length,
        caseSummary: summarize(input.fixture),
        rawJson: input.rawJson,
        fixture: input.fixture,
        lastOpenedCase: input.fixture.cases[0].case_id,
      }
      await adapter.putDataset(next)
      await adapter.deleteOfficeForDataset(id)
      return next
    },
    async exportOriginal(id: string) {
      const record = await adapter.getDataset(id)
      if (!record) throw new Error("Saved dataset not found.")
      return record.rawJson
    },
    async deleteDataset(id: string) {
      await adapter.deleteDataset(id)
      await adapter.deleteOfficeForDataset(id)
    },
    async clearAll() {
      await adapter.clearDatasets()
      await adapter.clearOffice()
    },
    async updateLastOpenedCase(id: string, caseId: string) {
      const record = await adapter.getDataset(id)
      if (!record || !record.fixture.cases.some((item) => item.case_id === caseId)) return
      await adapter.putDataset({ ...record, lastOpenedCase: caseId })
    },
    async getOfficeState(datasetId: string, caseId: string) {
      return adapter.getOffice(officeKey(datasetId, caseId))
    },
    async saveOfficeState(input: Omit<OfficeStateRecord, "key" | "updatedAt">) {
      await adapter.putOffice({ ...input, key: officeKey(input.datasetId, input.caseId), updatedAt: new Date().toISOString() })
    },
    async deleteOfficeState(datasetId: string) {
      await adapter.deleteOfficeForDataset(datasetId)
    },
  }
}

export function createMemoryWorkspaceAdapter(): WorkspaceAdapter {
  const datasets = new Map<string, DatasetRecord>()
  const office = new Map<string, OfficeStateRecord>()
  return {
    listDatasets: async () => [...datasets.values()],
    getDataset: async (id) => datasets.get(id),
    getDatasetByFingerprint: async (fingerprint) => [...datasets.values()].find((item) => item.fingerprint === fingerprint),
    putDataset: async (record) => { datasets.set(record.id, structuredClone(record)) },
    deleteDataset: async (id) => { datasets.delete(id) },
    clearDatasets: async () => { datasets.clear() },
    getOffice: async (key) => office.get(key),
    putOffice: async (record) => { office.set(record.key, structuredClone(record)) },
    deleteOfficeForDataset: async (datasetId) => { [...office.values()].filter((item) => item.datasetId === datasetId).forEach((item) => office.delete(item.key)) },
    clearOffice: async () => { office.clear() },
  }
}

export type SelectionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

export function readLastSelectedDataset(storage: SelectionStorage) {
  return storage.getItem(LAST_SELECTED_DATASET_KEY)
}

export function writeLastSelectedDataset(storage: SelectionStorage, datasetId: string) {
  if (datasetId === BUNDLED_DATASET_ID || datasetId.startsWith("session:")) {
    storage.removeItem(LAST_SELECTED_DATASET_KEY)
  } else {
    storage.setItem(LAST_SELECTED_DATASET_KEY, datasetId)
  }
}

export async function resolveWorkspaceActivation(
  requestedId: string | null,
  catalog: ReturnType<typeof createWorkspaceCatalog>,
  bundled: Fixture
) {
  if (requestedId && requestedId !== BUNDLED_DATASET_ID) {
    const record = await catalog.getDataset(requestedId)
    if (record) {
      const caseId = record.fixture.cases.some((item) => item.case_id === record.lastOpenedCase)
        ? record.lastOpenedCase
        : record.fixture.cases[0].case_id
      return { datasetId: record.id, fixture: record.fixture, caseId, record }
    }
  }
  return { datasetId: BUNDLED_DATASET_ID, fixture: bundled, caseId: bundled.cases[0].case_id, record: null }
}

export async function sha256Fingerprint(rawJson: string) {
  const bytes = new TextEncoder().encode(rawJson)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}
