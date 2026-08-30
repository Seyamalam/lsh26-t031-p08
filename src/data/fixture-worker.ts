/// <reference lib="webworker" />

import { parseFixture } from "./fixture-validation"

self.onmessage = (event: MessageEvent<string>) => {
  try {
    self.postMessage({ fixture: parseFixture(event.data) })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "Fixture validation failed." })
  }
}
