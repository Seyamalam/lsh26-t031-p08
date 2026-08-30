"use client"

import * as React from "react"
import { CheckCircle2Icon, CircleAlertIcon, LockKeyholeIcon } from "lucide-react"

import { useFixture } from "@/components/fixture-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PublicationStage, ResolutionStatus } from "@/src/domain/workflow"

const stages: PublicationStage[] = ["draft", "checked", "approved", "published"]
const nextStage: Record<PublicationStage, PublicationStage | null> = {
  draft: "checked",
  checked: "approved",
  approved: "published",
  published: null,
}

export function PublicationView() {
  const { publication, results, setReviewResolution, advancePublication, openTrace } = useFixture()
  const [message, setMessage] = React.useState("")
  const openCount = publication.reviewItems.filter((item) => item.status === "open").length
  const next = nextStage[publication.stage]

  function advance() {
    if (!next) return
    const outcome = advancePublication(next)
    setMessage(outcome.ok ? `Stage changed to ${next}.` : outcome.reason)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Publication control</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            {stages.map((stage, index) => {
              const active = stage === publication.stage
              const complete = stages.indexOf(publication.stage) > index
              return (
                <React.Fragment key={stage}>
                  <Badge variant={active ? "default" : complete ? "secondary" : "outline"} className="capitalize">
                    {complete && <CheckCircle2Icon data-icon="inline-start" />}{stage}
                  </Badge>
                  {index < stages.length - 1 && <span className="text-muted-foreground">/</span>}
                </React.Fragment>
              )
            })}
          </CardContent>
        </Card>
        <Card className="min-w-64">
          <CardContent className="flex h-full items-center justify-between gap-4 pt-6">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{openCount}</p>
              <p className="text-xs text-muted-foreground">Open review items</p>
            </div>
            <Button onClick={advance} disabled={!next || ((next === "checked" || next === "published") && openCount > 0)}>
              {next === "published" && <LockKeyholeIcon />}
              {next ? `Move to ${next}` : "Published"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {message && (
        <Alert variant={message.startsWith("Stage") ? "default" : "destructive"}>
          {message.startsWith("Stage") ? <CheckCircle2Icon /> : <CircleAlertIcon />}
          <AlertTitle>{message.startsWith("Stage") ? "Workflow updated" : "Transition blocked"}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Required review queue</CardTitle>
          <Badge variant={openCount ? "destructive" : "secondary"}>{publication.reviewItems.length} items</Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead><TableHead>Type</TableHead><TableHead>Evidence</TableHead>
                <TableHead className="w-36">Resolution</TableHead><TableHead className="min-w-56">Note</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {publication.reviewItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><span className="block font-medium">{item.studentName}</span><span className="font-mono text-xs text-muted-foreground">{item.studentId} · {item.className}</span></TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{item.kind}</Badge></TableCell>
                  <TableCell className="max-w-sm text-xs text-muted-foreground">{item.reasons.join(" ")}</TableCell>
                  <TableCell>
                    <select
                      aria-label={`Resolution for ${item.studentId} ${item.kind}`}
                      value={item.status}
                      onChange={(event) => setReviewResolution(item.id, event.target.value as ResolutionStatus, item.note)}
                      className="h-8 w-full rounded-md border bg-background px-2 text-sm capitalize"
                    >
                      {(["open", "verified", "corrected", "waived"] as ResolutionStatus[]).map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.note}
                      aria-label={`Review note for ${item.studentId} ${item.kind}`}
                      placeholder="Verification note"
                      onChange={(event) => setReviewResolution(item.id, item.status, event.target.value)}
                    />
                  </TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => { const result = results.find((entry) => entry.student.id === item.studentId); if (result) openTrace(result) }}>Trace</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
