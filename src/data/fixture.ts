import type { Fixture } from "../domain/types"
import { sha256Fingerprint } from "../storage/workspace"
import publishedFixture from "./P08_school_results_public.json"
import { parseFixture } from "./fixture-validation"

export { parseFixture } from "./fixture-validation"
export const bundledFixture = publishedFixture as unknown as Fixture
export const MAX_FIXTURE_BYTES = 5 * 1024 * 1024
export const WORKER_PARSE_THRESHOLD = 250 * 1024

type FixtureFile = { size: number; name?: string; type?: string; text: () => Promise<string> }

function validateFileEnvelope(file: FixtureFile) {
  if (file.size > MAX_FIXTURE_BYTES) throw new Error("Fixture files must be 5 MiB or smaller.")
  if (!file.name) return
  const jsonExtension = file.name.toLowerCase().endsWith(".json")
  const jsonMime = file.type === "application/json"
  if (!jsonExtension && !jsonMime) throw new Error("Select a JSON fixture file. ZIP and other formats are not supported.")
}

function parseInWorker(rawJson: string) {
  return new Promise<Fixture>((resolve, reject) => {
    const worker = new Worker(new URL("./fixture-worker.ts", import.meta.url), { type: "module" })
    worker.onmessage = (event: MessageEvent<{ fixture?: Fixture; error?: string }>) => {
      worker.terminate()
      if (event.data.fixture) resolve(event.data.fixture)
      else reject(new Error(event.data.error ?? "Worker validation failed."))
    }
    worker.onerror = () => { worker.terminate(); reject(new Error("Worker validation failed.")) }
    worker.postMessage(rawJson)
  })
}

async function parseLargeFixture(rawJson: string) {
  try { return await parseInWorker(rawJson) }
  catch { return parseFixture(rawJson) }
}

export async function readFixtureFile(file: FixtureFile) {
  validateFileEnvelope(file)
  const rawJson = await file.text()
  const fixture = file.size > WORKER_PARSE_THRESHOLD && typeof Worker !== "undefined" ? await parseLargeFixture(rawJson) : parseFixture(rawJson)
  const fingerprint = await sha256Fingerprint(rawJson)
  return { rawJson, fixture, fingerprint, byteSize: file.size }
}

export async function loadFixtureFile(file: FixtureFile): Promise<Fixture> {
  return (await readFixtureFile(file)).fixture
}
