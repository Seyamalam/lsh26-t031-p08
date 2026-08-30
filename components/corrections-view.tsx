"use client"

import * as React from "react"
import { PrinterIcon, RotateCcwIcon, SaveIcon } from "lucide-react"

import { useFixture } from "@/components/fixture-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { buildReportCard, formatMark } from "@/src/domain/corrections"
import type { Mark } from "@/src/domain/types"

export function CorrectionsView() {
  const { sourceCase, results, corrections, correctionImpacts, addCorrection, clearCorrections } = useFixture()
  const [studentId, setStudentId] = React.useState(sourceCase.students[0]?.id ?? "")
  const selectedStudentId = sourceCase.students.some((item) => item.id === studentId) ? studentId : sourceCase.students[0]?.id ?? ""
  const student = sourceCase.students.find((item) => item.id === selectedStudentId) ?? sourceCase.students[0]
  const codes = student ? [...sourceCase.compulsory, student.optional] : []
  const [subjectCode, setSubjectCode] = React.useState(codes[0] ?? "")
  const selectedSubjectCode = codes.includes(subjectCode) ? subjectCode : codes[0] ?? ""
  const subject = sourceCase.subjects.find((item) => item.code === selectedSubjectCode)
  const [whole, setWhole] = React.useState("80")
  const [theory, setTheory] = React.useState("60")
  const [practical, setPractical] = React.useState("20")
  const [absent, setAbsent] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState("")
  const [cardStudentId, setCardStudentId] = React.useState(results[0]?.student.id ?? "")

  const selectedCardStudentId = results.some((item) => item.student.id === cardStudentId) ? cardStudentId : results[0]?.student.id ?? ""
  const cardResult = results.find((item) => item.student.id === selectedCardStudentId) ?? results[0]
  const reportCard = cardResult ? buildReportCard(cardResult, corrections) : null

  function save() {
    if (!student || !subject) return
    const after: Mark = absent
      ? "AB"
      : subject.practical
        ? { theory: Number(theory), practical: Number(practical) }
        : Number(whole)
    try {
      addCorrection({ studentId: student.id, subjectCode: subject.code, after, reason })
      setReason("")
      setError("")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Correction rejected.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" data-print-hidden="true">
        <Card>
          <CardHeader><CardTitle>New correction</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="correction-student">Student</Label><select id="correction-student" value={student?.id} onChange={(event) => { setStudentId(event.target.value); setSubjectCode(sourceCase.compulsory[0]) }} className="h-9 w-full rounded-md border bg-background px-3 text-sm">{sourceCase.students.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></div>
            <div className="space-y-1"><Label htmlFor="correction-subject">Subject</Label><select id="correction-subject" value={selectedSubjectCode} onChange={(event) => setSubjectCode(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">{codes.map((code) => <option key={code}>{code}</option>)}</select></div>
            {subject?.practical ? <><div className="space-y-1"><Label htmlFor="theory-mark">Theory /75</Label><Input id="theory-mark" type="number" min={0} max={75} step={1} value={theory} disabled={absent} onChange={(event) => setTheory(event.target.value)} /></div><div className="space-y-1"><Label htmlFor="practical-mark">Practical /25</Label><Input id="practical-mark" type="number" min={0} max={25} step={1} value={practical} disabled={absent} onChange={(event) => setPractical(event.target.value)} /></div></> : <div className="space-y-1"><Label htmlFor="whole-mark">Mark /100</Label><Input id="whole-mark" type="number" min={0} max={100} step={1} value={whole} disabled={absent} onChange={(event) => setWhole(event.target.value)} /></div>}
            <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={absent} onChange={(event) => setAbsent(event.target.checked)} /> Record AB</label>
            <div className="space-y-1 sm:col-span-2"><Label htmlFor="correction-reason">Reason</Label><Input id="correction-reason" value={reason} placeholder="Source and reason" onChange={(event) => setReason(event.target.value)} /></div>
            {error && <Alert variant="destructive" className="sm:col-span-2"><AlertTitle>Correction rejected</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            <Button onClick={save} className="sm:col-span-2"><SaveIcon />Save correction</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle>Correction history</CardTitle><Button size="sm" variant="outline" onClick={clearCorrections} disabled={!corrections.length}><RotateCcwIcon />Clear case history</Button></CardHeader>
          <CardContent className="max-h-[26rem] overflow-auto p-0">
            <Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Before</TableHead><TableHead>After</TableHead><TableHead>GPA impact</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
              <TableBody>{corrections.map((item, index) => { const impact = correctionImpacts[index]; return <TableRow key={item.id}><TableCell className="whitespace-nowrap text-xs">{new Date(item.createdAt).toLocaleString()}</TableCell><TableCell className="font-mono text-xs">{item.studentId}</TableCell><TableCell>{item.subjectCode}</TableCell><TableCell>{formatMark(item.before)}</TableCell><TableCell>{formatMark(item.after)}</TableCell><TableCell className="whitespace-nowrap font-mono text-xs">{impact.beforeGpa.toFixed(2)} → {impact.afterGpa.toFixed(2)} ({impact.gpaDelta >= 0 ? "+" : ""}{impact.gpaDelta.toFixed(2)})</TableCell><TableCell className="max-w-56 text-xs text-muted-foreground">{item.reason}</TableCell></TableRow> })}{!corrections.length && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No corrections for this case.</TableCell></TableRow>}</TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {reportCard && <Card data-report-card>
        <CardHeader className="flex-row items-center justify-between gap-3" data-print-hidden="true"><div><CardTitle>Report card</CardTitle><p className="text-sm text-muted-foreground">Current corrected result</p></div><div className="flex items-center gap-2"><select aria-label="Report card student" value={reportCard.student.id} onChange={(event) => setCardStudentId(event.target.value)} className="h-9 max-w-72 rounded-md border bg-background px-3 text-sm">{results.map((item) => <option key={item.student.id} value={item.student.id}>{item.student.id} · {item.student.name}</option>)}</select><Button onClick={() => window.print()}><PrinterIcon />Print</Button></div></CardHeader>
        <CardContent className="space-y-5 print:p-0">
          <div className="hidden print:block"><h1 className="text-2xl font-semibold">Student report card</h1><p>LSH26-T031 · P08 · {sourceCase.case_id}</p></div>
          <div className="grid gap-3 border-b pb-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Student</p><p className="font-semibold">{reportCard.student.name}</p><p className="font-mono text-xs">{reportCard.student.id}</p></div><div><p className="text-xs text-muted-foreground">Class</p><p className="font-semibold">{reportCard.student.class}</p></div><div className="flex items-end gap-3"><span className="text-3xl font-semibold tabular-nums">{reportCard.finalGpa.toFixed(2)}</span><Badge className="mb-1">{reportCard.letterGrade}</Badge></div></div>
          <Table><TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Mark used</TableHead><TableHead>Grade point</TableHead><TableHead>Decision</TableHead></TableRow></TableHeader><TableBody>{reportCard.subjects.map((item) => <TableRow key={item.code}><TableCell><span className="font-medium">{item.code}</span>{item.isOptional && <Badge variant="outline" className="ml-2">Optional</Badge>}</TableCell><TableCell>{item.rawDisplay}</TableCell><TableCell>{item.point.toFixed(1)}</TableCell><TableCell className="text-xs text-muted-foreground">{item.decision}</TableCell></TableRow>)}</TableBody></Table>
          <div className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-3"><p>Uncancelled GPA <strong>{reportCard.uncancelledGpa.toFixed(2)}</strong></p><p>Final GPA <strong>{reportCard.finalGpa.toFixed(2)}</strong></p><p>Recorded corrections <strong>{reportCard.corrections.length}</strong></p></div>
        </CardContent>
      </Card>}
    </div>
  )
}
