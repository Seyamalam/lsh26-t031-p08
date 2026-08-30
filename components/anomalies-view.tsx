"use client"

import * as React from "react"
import { ScanSearchIcon } from "lucide-react"

import { useFixture } from "@/components/fixture-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { scanCohortAnomalies, type AnomalyCategory } from "@/src/domain/anomalies"

const labels: Record<AnomalyCategory, string> = {
  "subject-outlier": "Subject outlier",
  "class-mean-gap": "Class mean gap",
  "component-gap": "Theory/practical gap",
  "duplicate-signature": "Duplicate signature",
  "repeated-mark-pattern": "Repeated marks",
}

export function AnomaliesView() {
  const { currentCase, results, classes, openTrace } = useFixture()
  const findings = React.useMemo(() => scanCohortAnomalies(currentCase, results), [currentCase, results])
  const [category, setCategory] = React.useState<AnomalyCategory | "all">("all")
  const [className, setClassName] = React.useState("all")
  const filtered = findings.filter((item) => (category === "all" || item.category === category) && (className === "all" || item.className === className))
  const counts = Object.keys(labels).map((key) => ({ key: key as AnomalyCategory, count: findings.filter((item) => item.category === key).length }))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {counts.map((item) => <Card key={item.key}><CardContent className="pt-5"><p className="text-2xl font-semibold tabular-nums">{item.count}</p><p className="text-xs text-muted-foreground">{labels[item.key]}</p></CardContent></Card>)}
      </div>
      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><CardTitle className="flex items-center gap-2"><ScanSearchIcon className="size-4" />Cohort anomaly review</CardTitle><p className="mt-1 text-xs text-muted-foreground">Deterministic thresholds · descriptive statistics · no predicted grades</p></div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Anomaly category" value={category} onChange={(event) => setCategory(event.target.value as AnomalyCategory | "all")} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="all">All categories</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <select aria-label="Anomaly class" value={className} onChange={(event) => setClassName(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="all">All classes</option>{classes.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table><TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead><TableHead>Students</TableHead><TableHead>Explanation</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{filtered.map((item) => <TableRow key={item.id}><TableCell><Badge variant={item.severity === "review" ? "destructive" : "secondary"}>{labels[item.category]}</Badge></TableCell><TableCell className="whitespace-nowrap">{item.className}</TableCell><TableCell className="font-mono">{item.subjectCode ?? "All"}</TableCell><TableCell className="max-w-44 font-mono text-xs">{item.studentIds.join(", ") || "Class aggregate"}</TableCell><TableCell className="min-w-96 text-xs leading-relaxed text-muted-foreground">{item.explanation}</TableCell><TableCell>{item.studentIds[0] && <Button size="sm" variant="ghost" onClick={() => { const result = results.find((entry) => entry.student.id === item.studentIds[0]); if (result) openTrace(result) }}>Trace</Button>}</TableCell></TableRow>)}{!filtered.length && <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">No findings for these filters.</TableCell></TableRow>}</TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Thresholds</CardTitle></CardHeader><CardContent className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2 xl:grid-cols-4"><p><strong className="text-foreground">Outlier:</strong> absolute z score at least 2.00, minimum 10 marks.</p><p><strong className="text-foreground">Class gap:</strong> class mean differs by at least 8.0 marks, minimum 5 marks.</p><p><strong className="text-foreground">Component gap:</strong> theory and practical percentages differ by at least 35.0 points.</p><p><strong className="text-foreground">Pattern:</strong> exact seven-mark duplicates or four identical totals.</p></CardContent></Card>
    </div>
  )
}
