"use client"

import {
  AlertTriangleIcon,
  CalculatorIcon,
  CheckCircle2Icon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFixture } from "@/components/fixture-provider"

export function StudentTrace() {
  const { selectedResult: result, closeTrace } = useFixture()

  return (
    <Sheet
      open={Boolean(result)}
      onOpenChange={(open) => !open && closeTrace()}
    >
      <SheetContent className="block w-[min(1120px,96vw)]! max-w-[96vw]! overflow-x-hidden overflow-y-auto sm:max-w-[min(1120px,96vw)]!">
        {result && (
          <>
            <SheetHeader className="border-b pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle>{result.student.name}</SheetTitle>
                <Badge variant="outline">{result.student.id}</Badge>
                <Badge
                  variant={
                    result.letterGrade === "F" ? "destructive" : "secondary"
                  }
                >
                  {result.letterGrade} · {result.finalGpa.toFixed(2)}
                </Badge>
              </div>
              <SheetDescription>
                {result.student.class} · seven subject decisions and final GPA
                calculation
              </SheetDescription>
            </SheetHeader>

            {result.compulsoryFailures.length > 0 && (
              <div className="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-destructive">
                  <AlertTriangleIcon className="size-4" /> Compulsory failure
                  override
                </div>
                <p className="mt-1 text-muted-foreground">
                  {result.compulsoryFailures
                    .map((item) => item.code)
                    .join(", ")}{" "}
                  caused the final result to be F. The uncancelled GPA remains{" "}
                  {result.uncancelledGpa.toFixed(2)} for checking.
                </p>
              </div>
            )}

            <div className="mx-4 mt-4 hidden overflow-hidden rounded-lg border md:block [&_[data-slot=table-container]]:overflow-x-hidden">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[18%] whitespace-normal">
                      Subject
                    </TableHead>
                    <TableHead className="w-[22%] whitespace-normal">
                      Mark used
                    </TableHead>
                    <TableHead className="w-[10%] whitespace-normal">
                      Point
                    </TableHead>
                    <TableHead className="w-[50%] whitespace-normal">
                      Decision rule
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.subjectResults.map((subject) => (
                    <TableRow key={subject.code}>
                      <TableCell className="align-top font-medium break-words whitespace-normal">
                        {subject.code}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {subject.name}
                          {subject.isOptional ? " · optional" : ""}
                        </span>
                      </TableCell>
                      <TableCell className="align-top font-mono text-xs break-words whitespace-normal">
                        {subject.rawDisplay}
                      </TableCell>
                      <TableCell className="align-top font-mono whitespace-normal tabular-nums">
                        {subject.point.toFixed(1)}
                      </TableCell>
                      <TableCell className="align-top text-xs leading-relaxed break-words whitespace-normal text-muted-foreground">
                        <span className="mb-1 flex flex-wrap items-center gap-1 font-medium text-foreground">
                          {subject.failed ? (
                            <AlertTriangleIcon className="size-3.5 text-destructive" />
                          ) : (
                            <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                          )}
                          {subject.band}
                        </span>
                        {subject.decision}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div
              className="mx-4 mt-4 grid gap-2 md:hidden"
              aria-label="Subject rule evidence"
            >
              {result.subjectResults.map((subject) => (
                <article
                  key={subject.code}
                  className="min-w-0 rounded-lg border p-3"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium break-words">
                        {subject.code} · {subject.name}
                      </p>
                      <p className="mt-0.5 font-mono text-xs break-words text-muted-foreground">
                        {subject.rawDisplay}
                      </p>
                    </div>
                    <Badge
                      variant={subject.failed ? "destructive" : "secondary"}
                    >
                      {subject.point.toFixed(1)} GP
                    </Badge>
                  </div>
                  <p className="mt-3 flex flex-wrap items-center gap-1 text-xs font-medium break-words">
                    {subject.failed ? (
                      <AlertTriangleIcon className="size-3.5 shrink-0 text-destructive" />
                    ) : (
                      <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-600" />
                    )}
                    {subject.band}
                    {subject.isOptional ? " · optional" : ""}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed break-words text-muted-foreground">
                    {subject.decision}
                  </p>
                </article>
              ))}
            </div>

            <div className="mx-4 mt-4 mb-6 rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <CalculatorIcon className="size-4" /> GPA calculation
              </div>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Compulsory points</dt>
                  <dd className="font-mono break-words">
                    {result.compulsoryPointSum.toFixed(1)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    Optional contribution
                  </dt>
                  <dd className="font-mono break-words">
                    max(0, {result.optionalPoint.toFixed(1)} − 2) ={" "}
                    {result.optionalBonus.toFixed(1)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Uncancelled GPA</dt>
                  <dd className="font-mono">
                    min(5, ({result.compulsoryPointSum.toFixed(1)} +{" "}
                    {result.optionalBonus.toFixed(1)}) ÷ 6) ={" "}
                    {result.uncancelledGpa.toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Final result</dt>
                  <dd className="font-mono font-semibold">
                    {result.finalGpa.toFixed(2)} · {result.letterGrade}
                  </dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
