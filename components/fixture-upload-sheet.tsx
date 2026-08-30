"use client"

import * as React from "react"
import { FileJsonIcon, UploadIcon } from "lucide-react"

import {
  FileUpload,
  type FileUploadItem,
} from "@/components/motion/file-upload"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useFixture } from "@/components/fixture-provider"

export function FixtureUploadSheet() {
  const { loadFixture, isLoading } = useFixture()
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<FileUploadItem[]>([])

  async function parseSelected(added: FileUploadItem[], files: File[]) {
    const item = added[0]
    const file = files[0]
    if (!item || !file) return

    const outcome = await loadFixture(file)
    setItems([
      {
        ...item,
        progress: 100,
        status: outcome.ok ? "success" : "error",
        error: outcome.ok ? undefined : outcome.error,
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
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[min(28rem,96vw)] sm:max-w-[28rem]">
          <SheetHeader className="border-b pr-12">
            <SheetTitle className="flex items-center gap-2">
              <FileJsonIcon className="size-4" /> Load fixture
            </SheetTitle>
            <SheetDescription>
              Select one P08 JSON file. It is validated and processed in this
              browser.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <FileUpload
              value={items}
              onValueChange={setItems}
              onFilesAdded={parseSelected}
              onRemove={() => setItems([])}
              onRetry={(item) => {
                if (item.file) void parseSelected([item], [item.file])
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
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
