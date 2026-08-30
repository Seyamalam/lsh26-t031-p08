"use client"

import * as React from "react"
import { DatabaseIcon, DownloadIcon, FolderOpenIcon, PencilIcon, RefreshCwIcon, Trash2Icon } from "lucide-react"

import { useFixture } from "@/components/fixture-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function downloadJson(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }))
  const anchor = document.createElement("a")
  anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url)
}

export function DatasetsView() {
  const { datasetId, savedDatasets, openDataset, renameDataset, replaceDataset, deleteDataset, clearSavedDatasets, exportDataset } = useFixture()
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState("")

  async function run(id: string, action: () => Promise<void>) {
    setBusy(id); setError("")
    try { await action() } catch (caught) { setError(caught instanceof Error ? caught.message : "Dataset action failed.") }
    finally { setBusy("") }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div><CardTitle className="flex items-center gap-2"><DatabaseIcon className="size-4" />Saved imports</CardTitle><p className="mt-1 text-xs text-muted-foreground">Private to this browser profile · IndexedDB schema v1 · original JSON retained</p></div>
          <Button variant="destructive" size="sm" disabled={!savedDatasets.length || Boolean(busy)} onClick={() => { if (window.confirm("Delete every saved P08 dataset and its office state from this browser?")) void run("all", clearSavedDatasets) }}><Trash2Icon />Clear all</Button>
        </CardHeader>
        {error && <CardContent><Alert variant="destructive"><AlertTitle>Dataset action failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></CardContent>}
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Name and source</TableHead><TableHead>Imported</TableHead><TableHead>Size</TableHead><TableHead>Cases</TableHead><TableHead>Fingerprint</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {savedDatasets.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="min-w-64"><div className="flex items-center gap-2"><span className="font-medium">{record.name}</span>{datasetId === record.id && <Badge>Open</Badge>}</div><p className="text-xs text-muted-foreground">{record.sourceFilename} · P08 · schema {record.schemaVersion}</p><form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get("name") ?? ""); void run(record.id, () => renameDataset(record.id, name)) }}><Input name="name" defaultValue={record.name} aria-label={`Rename ${record.name}`} className="h-8" /><Button size="sm" variant="outline" type="submit"><PencilIcon />Rename</Button></form></TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(record.importedAt).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{(record.byteSize / 1024).toFixed(1)} KiB</TableCell>
                  <TableCell><span className="font-medium">{record.caseCount}</span><p className="max-w-52 text-xs text-muted-foreground">{record.caseSummary.slice(0, 3).map((item) => `${item.caseId}: ${item.students}`).join(" · ")}{record.caseCount > 3 ? " · …" : ""}</p></TableCell>
                  <TableCell><code className="block max-w-44 truncate text-xs" title={record.fingerprint}>{record.fingerprint}</code><p className="text-xs text-muted-foreground">Last case {record.lastOpenedCase}</p></TableCell>
                  <TableCell><div className="flex min-w-64 flex-wrap justify-end gap-2"><Button size="sm" onClick={() => void run(record.id, () => openDataset(record.id))} disabled={busy === record.id}><FolderOpenIcon />Open</Button><Button size="sm" variant="outline" onClick={() => void run(record.id, async () => downloadJson(record.sourceFilename, await exportDataset(record.id)))}><DownloadIcon />Export original</Button><Button size="sm" variant="outline" render={<label><RefreshCwIcon />Replace<input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void run(record.id, () => replaceDataset(record.id, file)); event.currentTarget.value = "" }} /></label>} /><Button size="sm" variant="destructive" onClick={() => { if (window.confirm(`Delete ${record.name} and its saved office state?`)) void run(record.id, () => deleteDataset(record.id)) }}><Trash2Icon />Delete</Button></div></TableCell>
                </TableRow>
              ))}
              {!savedDatasets.length && <TableRow><TableCell colSpan={6} className="h-40 text-center"><DatabaseIcon className="mx-auto mb-2 size-6 text-muted-foreground" /><p className="font-medium">No saved imports</p><p className="text-xs text-muted-foreground">Use Load JSON, then Save on this device.</p></TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
