import {
  WORKSPACE_DB_NAME,
  WORKSPACE_DB_VERSION,
  type DatasetRecord,
  type OfficeStateRecord,
  type WorkspaceAdapter,
} from "./workspace"

const DATASETS = "datasets"
const OFFICE = "office"

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."))
  })
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."))
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction was aborted."))
  })
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(WORKSPACE_DB_NAME, WORKSPACE_DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(DATASETS)) {
        const datasets = database.createObjectStore(DATASETS, { keyPath: "id" })
        datasets.createIndex("fingerprint", "fingerprint", { unique: true })
        datasets.createIndex("importedAt", "importedAt")
      }
      if (!database.objectStoreNames.contains(OFFICE)) {
        const office = database.createObjectStore(OFFICE, { keyPath: "key" })
        office.createIndex("datasetId", "datasetId")
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Could not open device storage."))
    request.onblocked = () => reject(new Error("Device storage upgrade is blocked by another app tab."))
  })
}

export function createIndexedDbWorkspaceAdapter(): WorkspaceAdapter {
  return {
    async listDatasets() {
      const database = await openDatabase()
      try { return await requestResult(database.transaction(DATASETS).objectStore(DATASETS).getAll()) as DatasetRecord[] }
      finally { database.close() }
    },
    async getDataset(id) {
      const database = await openDatabase()
      try { return await requestResult(database.transaction(DATASETS).objectStore(DATASETS).get(id)) as DatasetRecord | undefined }
      finally { database.close() }
    },
    async getDatasetByFingerprint(fingerprint) {
      const database = await openDatabase()
      try { return await requestResult(database.transaction(DATASETS).objectStore(DATASETS).index("fingerprint").get(fingerprint)) as DatasetRecord | undefined }
      finally { database.close() }
    },
    async putDataset(record) {
      const database = await openDatabase()
      const transaction = database.transaction(DATASETS, "readwrite")
      transaction.objectStore(DATASETS).put(record)
      try { await transactionDone(transaction) } finally { database.close() }
    },
    async deleteDataset(id) {
      const database = await openDatabase()
      const transaction = database.transaction(DATASETS, "readwrite")
      transaction.objectStore(DATASETS).delete(id)
      try { await transactionDone(transaction) } finally { database.close() }
    },
    async clearDatasets() {
      const database = await openDatabase()
      const transaction = database.transaction(DATASETS, "readwrite")
      transaction.objectStore(DATASETS).clear()
      try { await transactionDone(transaction) } finally { database.close() }
    },
    async getOffice(key) {
      const database = await openDatabase()
      try { return await requestResult(database.transaction(OFFICE).objectStore(OFFICE).get(key)) as OfficeStateRecord | undefined }
      finally { database.close() }
    },
    async putOffice(record) {
      const database = await openDatabase()
      const transaction = database.transaction(OFFICE, "readwrite")
      transaction.objectStore(OFFICE).put(record)
      try { await transactionDone(transaction) } finally { database.close() }
    },
    async deleteOfficeForDataset(datasetId) {
      const database = await openDatabase()
      const transaction = database.transaction(OFFICE, "readwrite")
      const index = transaction.objectStore(OFFICE).index("datasetId")
      const cursorRequest = index.openKeyCursor(IDBKeyRange.only(datasetId))
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result
        if (!cursor) return
        transaction.objectStore(OFFICE).delete(cursor.primaryKey)
        cursor.continue()
      }
      try { await transactionDone(transaction) } finally { database.close() }
    },
    async clearOffice() {
      const database = await openDatabase()
      const transaction = database.transaction(OFFICE, "readwrite")
      transaction.objectStore(OFFICE).clear()
      try { await transactionDone(transaction) } finally { database.close() }
    },
  }
}
