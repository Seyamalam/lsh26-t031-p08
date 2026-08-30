import { describe, expect, it } from "vitest"

import { bundledFixture } from "../data/fixture"
import {
  BUNDLED_DATASET_ID,
  createMemoryWorkspaceAdapter,
  createWorkspaceCatalog,
  readLastSelectedDataset,
  resolveWorkspaceActivation,
  writeLastSelectedDataset,
} from "./workspace"
import { createPublicationState } from "../domain/workflow"

const raw = JSON.stringify(bundledFixture)

describe("workspace catalog", () => {
  it("saves, lists, deduplicates, renames, replaces, exports, deletes and clears datasets", async () => {
    const catalog = createWorkspaceCatalog(createMemoryWorkspaceAdapter())
    const first = await catalog.saveDataset({
      name: "Term results",
      sourceFilename: "term.json",
      rawJson: raw,
      fixture: bundledFixture,
      fingerprint: "sha-a",
      byteSize: raw.length,
    })
    expect(first.deduplicated).toBe(false)
    expect((await catalog.listDatasets()).map((item) => item.name)).toEqual(["Term results"])

    const duplicate = await catalog.saveDataset({
      name: "Duplicate",
      sourceFilename: "copy.json",
      rawJson: raw,
      fixture: bundledFixture,
      fingerprint: "sha-a",
      byteSize: raw.length,
    })
    expect(duplicate).toMatchObject({ deduplicated: true, record: { id: first.record.id } })

    expect((await catalog.renameDataset(first.record.id, "Final term")).name).toBe("Final term")
    expect(await catalog.exportOriginal(first.record.id)).toBe(raw)

    const replacement = await catalog.replaceDataset(first.record.id, {
      sourceFilename: "replacement.json",
      rawJson: raw,
      fixture: bundledFixture,
      fingerprint: "sha-b",
      byteSize: raw.length,
    })
    expect(replacement).toMatchObject({ id: first.record.id, sourceFilename: "replacement.json", fingerprint: "sha-b" })

    await catalog.deleteDataset(first.record.id)
    expect(await catalog.listDatasets()).toEqual([])
    await catalog.saveDataset({ name: "Again", sourceFilename: "again.json", rawJson: raw, fixture: bundledFixture, fingerprint: "sha-c", byteSize: raw.length })
    await catalog.clearAll()
    expect(await catalog.listDatasets()).toEqual([])
  })

  it("isolates office state by dataset and case", async () => {
    const catalog = createWorkspaceCatalog(createMemoryWorkspaceAdapter())
    const publication = createPublicationState({ optional: [], practical: [], absent: [] })
    await catalog.saveOfficeState({ datasetId: "one", caseId: "PUB-01", corrections: [], publication })
    await catalog.saveOfficeState({ datasetId: "two", caseId: "PUB-01", corrections: [], publication: { ...publication, stage: "approved" } })
    expect((await catalog.getOfficeState("one", "PUB-01"))?.publication.stage).toBe("draft")
    expect((await catalog.getOfficeState("two", "PUB-01"))?.publication.stage).toBe("approved")
  })

  it("stores only the selected saved dataset id and resolves activation safely", async () => {
    const values = new Map<string, string>()
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }
    writeLastSelectedDataset(storage, "saved-1")
    expect(readLastSelectedDataset(storage)).toBe("saved-1")
    writeLastSelectedDataset(storage, BUNDLED_DATASET_ID)
    expect(readLastSelectedDataset(storage)).toBeNull()

    const catalog = createWorkspaceCatalog(createMemoryWorkspaceAdapter())
    const saved = await catalog.saveDataset({ name: "Restore me", sourceFilename: "restore.json", rawJson: raw, fixture: bundledFixture, fingerprint: "restore-sha", byteSize: raw.length })
    await catalog.updateLastOpenedCase(saved.record.id, "PUB-02")
    const restored = await resolveWorkspaceActivation(saved.record.id, catalog, bundledFixture)
    expect(restored).toMatchObject({ datasetId: saved.record.id, caseId: "PUB-02", record: { name: "Restore me" } })
    const fallback = await resolveWorkspaceActivation("missing", catalog, bundledFixture)
    expect(fallback).toMatchObject({ datasetId: BUNDLED_DATASET_ID, caseId: bundledFixture.cases[0].case_id })
  })
})
