import "fake-indexeddb/auto"

import { beforeEach, describe, expect, it } from "vitest"

import { bundledFixture } from "../data/fixture"
import { createPublicationState } from "../domain/workflow"
import { createIndexedDbWorkspaceAdapter } from "./indexed-db"
import { WORKSPACE_DB_NAME, createMemoryWorkspaceAdapter, createWorkspaceCatalog } from "./workspace"

beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(WORKSPACE_DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
})

describe("versioned IndexedDB workspace adapter", () => {
  it("persists catalog and namespaced office records, then clears both stores", async () => {
    const catalog = createWorkspaceCatalog(createIndexedDbWorkspaceAdapter())
    const rawJson = JSON.stringify(bundledFixture)
    const saved = await catalog.saveDataset({ name: "Device copy", sourceFilename: "p08.json", rawJson, fixture: bundledFixture, fingerprint: "idb-sha", byteSize: rawJson.length })
    await catalog.saveOfficeState({ datasetId: saved.record.id, caseId: "PUB-01", corrections: [], publication: createPublicationState({ optional: [], practical: [], absent: [] }) })

    const reopened = createWorkspaceCatalog(createIndexedDbWorkspaceAdapter())
    expect((await reopened.listDatasets())[0].name).toBe("Device copy")
    expect((await reopened.getOfficeState(saved.record.id, "PUB-01"))?.datasetId).toBe(saved.record.id)
    await reopened.clearAll()
    expect(await reopened.listDatasets()).toEqual([])
    expect(await reopened.getOfficeState(saved.record.id, "PUB-01")).toBeUndefined()
  })

  it("turns quota failures into a user-safe storage error", async () => {
    const adapter = createMemoryWorkspaceAdapter()
    adapter.putDataset = async () => { throw new DOMException("quota", "QuotaExceededError") }
    const catalog = createWorkspaceCatalog(adapter)
    await expect(catalog.saveDataset({ name: "Too large", sourceFilename: "p08.json", rawJson: "{}", fixture: bundledFixture, fingerprint: "quota", byteSize: 2 })).rejects.toThrow("Device storage is full")
  })
})
