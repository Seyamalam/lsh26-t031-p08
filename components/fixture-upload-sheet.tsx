"use client"

import * as React from "react"
import { FileJsonIcon, HardDriveIcon, PlayIcon, UploadIcon } from "lucide-react"

import {
  FileUpload,
  type FileUploadItem,
} from "@/components/motion/file-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useFixture } from "@/components/fixture-provider"

export function FixtureUploadSheet() {
  const { loadFixture, isLoading, fixtureRevision } = useFixture()
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<FileUploadItem[]>([])
  const [datasetName, setDatasetName] = React.useState("")

  React.useEffect(() => {
    const timer = window.setTimeout(() => setItems([]), 0)
    return () => window.clearTimeout(timer)
  }, [fixtureRevision])

  async function processSelected(mode: "once" | "save") {
    const item = items[0]
    const file = item?.file
    if (!item || !file) return

    const outcome = await loadFixture(file, mode, datasetName)
    if (outcome.ok) {
      setItems([])
      setOpen(false)
      return
    }
    setItems([
      {
        ...item,
        progress: 100,
        status: "error",
        error: outcome.error,
      },
    ])
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={isLoading}
      >
        <UploadIcon />
        <span className="hidden sm:inline">Load JSON</span>
      </Button>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) { setItems([]); setDatasetName("") }
        }}
      >
        <SheetContent className="w-[min(28rem,96vw)] sm:max-w-[28rem]">
          <SheetHeader className="border-b pr-12">
            <SheetTitle className="flex items-center gap-2">
              <FileJsonIcon className="size-4" /> Load fixture
            </SheetTitle>
            <SheetDescription>
              Validated in this browser. Use once keeps it in this session. Save on this device stores the original JSON and office state in IndexedDB.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <FileUpload
              value={items}
              onValueChange={setItems}
              onRemove={() => setItems([])}
              onRetry={(item) => {
                if (item.file) void processSelected("once")
              }}
              accept="application/json,.json"
              multiple={false}
              maxFiles={1}
              disabled={isLoading}
              title="Drop P08 JSON here"
              description="One .json file · parsed locally"
              browseLabel="Choose file"
              classNames={{
                dropzone: "rounded-xl p-4",
                item: "rounded-xl",
              }}
            />
            {items[0]?.file && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dataset-name">Dataset name</Label>
                  <Input id="dataset-name" value={datasetName} onChange={(event) => setDatasetName(event.target.value)} placeholder={items[0].name.replace(/\.json$/i, "")} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => void processSelected("once")} disabled={isLoading}><PlayIcon />Use once</Button>
                  <Button onClick={() => void processSelected("save")} disabled={isLoading}><HardDriveIcon />Save on this device</Button>
                </div>
                <p className="text-xs text-muted-foreground">Saved data stays in this browser profile until deleted from Datasets.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
