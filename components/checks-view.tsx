"use client"

import { CheckCircle2Icon, EyeIcon } from "lucide-react"

import { useFixture } from "@/components/fixture-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CheckingLists, ReviewEntry } from "@/src/domain/types"

const tabs: { key: keyof CheckingLists; label: string; rule: string }[] = [
  {
    key: "optional",
    label: "Optional",
    rule: "Optional point 2.0 or below, including AB",
  },
  {
    key: "practical",
    label: "Practical fail",
    rule: "Practical component below 8",
  },
  { key: "absent", label: "Absent", rule: "AB in any subject" },
]

function ReviewTable({
  entries,
  onTrace,
}: {
  entries: ReviewEntry[]
  onTrace: (entry: ReviewEntry) => void
}) {
  if (entries.length === 0)
    return (
      <Empty className="min-h-64">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCircle2Icon />
          </EmptyMedia>
          <EmptyTitle>No students on this list</EmptyTitle>
          <EmptyDescription>
            No manual checks are required for this rule in the selected case.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Check reason</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>
              <span className="sr-only">Trace</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.student.id}>
              <TableCell>
                <p className="font-medium">{entry.student.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {entry.student.id}
                </p>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{entry.student.class}</Badge>
              </TableCell>
              <TableCell className="min-w-64 text-sm text-muted-foreground">
                {entry.reasons.map((reason) => (
                  <p key={reason}>{reason}</p>
                ))}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    entry.result.letterGrade === "F"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {entry.result.finalGpa.toFixed(2)} ·{" "}
                  {entry.result.letterGrade}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTrace(entry)}
                >
                  <EyeIcon /> Trace
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function ChecksView() {
  const { checking, openTrace } = useFixture()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Checking lists
        </h1>
        <p className="text-sm text-muted-foreground">
          Manual verification before publication
        </p>
      </div>
      <Tabs defaultValue="optional">
        <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-fit">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
              <Badge variant="outline" className="ml-1">
                {checking[tab.key].length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <p className="mb-3 text-xs text-muted-foreground">
              Rule: {tab.rule}
            </p>
            <Card className="overflow-hidden py-0">
              <CardContent className="p-0">
                <ReviewTable
                  entries={checking[tab.key]}
                  onTrace={(entry) => openTrace(entry.result)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
