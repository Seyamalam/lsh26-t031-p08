"use client"

import { useMemo, useRef, useState } from "react"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BookOpenCheckIcon,
  CheckIcon,
  ClipboardCheckIcon,
  RotateCcwIcon,
  SearchIcon,
  ShieldCheckIcon,
  UploadIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { bundledFixture, parseFixture } from "@/src/data/fixture"
import { buildCheckingLists, evaluateCase } from "@/src/domain/engine"
import type {
  CheckingLists,
  Fixture,
  ReviewEntry,
  StudentResult,
} from "@/src/domain/types"

type WorkspacePage = "desk" | "register" | "checking"
type ReviewKey = keyof CheckingLists

const formatGpa = (value: number) => value.toFixed(2)

const reviewLabels: Record<ReviewKey, string> = {
  optional: "Optional review",
  practical: "Practical fail",
  absent: "Absent marks",
}

export function ResultsWorkspace() {
  const [fixture, setFixture] = useState<Fixture>(bundledFixture)
  const [caseId, setCaseId] = useState(bundledFixture.cases[0].case_id)
  const [page, setPage] = useState<WorkspacePage>("desk")
  const [selected, setSelected] = useState<StudentResult | null>(null)
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [reviewKey, setReviewKey] = useState<ReviewKey>("optional")
  const [uploadError, setUploadError] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)

  const currentCase = useMemo(
    () =>
      fixture.cases.find((fixtureCase) => fixtureCase.case_id === caseId) ??
      fixture.cases[0],
    [fixture, caseId],
  )
  const results = useMemo(() => evaluateCase(currentCase), [currentCase])
  const checking = useMemo(() => buildCheckingLists(results), [results])
  const classes = useMemo(
    () => Array.from(new Set(results.map((result) => result.student.class))),
    [results],
  )
  const passCount = results.filter((result) => result.letterGrade !== "F").length
  const featured =
    results.find(
      (result) =>
        result.compulsoryFailures.length > 0 && result.uncancelledGpa >= 3.5,
    ) ?? results.find((result) => result.compulsoryFailures.length > 0) ?? results[0]
  const filteredResults = results.filter((result) => {
    const needle = search.trim().toLowerCase()
    return (
      (classFilter === "all" || result.student.class === classFilter) &&
      (!needle ||
        result.student.name.toLowerCase().includes(needle) ||
        result.student.id.toLowerCase().includes(needle))
    )
  })

  function changeCase(nextCaseId: string | null) {
    if (!nextCaseId) return
    setCaseId(nextCaseId)
    setSearch("")
    setClassFilter("all")
  }

  async function loadFixture(file?: File) {
    if (!file) return
    setUploadError("")
    try {
      const nextFixture = parseFixture(await file.text())
      setFixture(nextFixture)
      setCaseId(nextFixture.cases[0].case_id)
      setPage("desk")
      setSearch("")
      setClassFilter("all")
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Could not load this fixture.",
      )
    } finally {
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  function resetFixture() {
    setFixture(bundledFixture)
    setCaseId(bundledFixture.cases[0].case_id)
    setUploadError("")
    setSearch("")
    setClassFilter("all")
  }

  function openChecking(key: ReviewKey) {
    setReviewKey(key)
    setPage("checking")
  }

  return (
    <Tabs
      value={page}
      onValueChange={(value) => setPage(value as WorkspacePage)}
      className="min-h-svh gap-0"
    >
      <a
        href="#workspace-content"
        className="fixed -top-16 left-4 z-50 bg-card px-4 py-2 focus:top-4"
      >
        Skip to content
      </a>
      <header
        data-print-hidden="true"
        className="border-b-4 border-ring bg-primary text-primary-foreground"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-4 px-4 py-4 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full border border-primary-foreground/45 font-heading text-sm font-bold">
              RR
            </span>
            <span className="flex flex-col">
              <span className="text-[0.65rem] font-bold tracking-[0.16em] text-primary-foreground/65 uppercase">
                LSH26 · T031 · P08
              </span>
              <strong className="font-heading text-lg">Result Register</strong>
            </span>
          </div>

          <TabsList
            variant="line"
            className="order-3 w-full justify-start overflow-x-auto text-primary-foreground lg:order-none lg:w-auto"
          >
            <TabsTrigger value="desk" className="text-primary-foreground/70 data-active:text-primary-foreground">
              Audit desk
            </TabsTrigger>
            <TabsTrigger value="register" className="text-primary-foreground/70 data-active:text-primary-foreground">
              Result register
            </TabsTrigger>
            <TabsTrigger value="checking" className="text-primary-foreground/70 data-active:text-primary-foreground">
              Checking lists
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-end justify-start gap-2 lg:justify-end">
            <Field className="w-32 gap-1">
              <FieldLabel className="text-[0.6rem] tracking-[0.12em] text-primary-foreground/60 uppercase">
                Working case
              </FieldLabel>
              <Select
                value={caseId}
                onValueChange={changeCase}
                items={fixture.cases.map((item) => ({
                  value: item.case_id,
                  label: item.case_id,
                }))}
              >
                <SelectTrigger className="w-full border-primary-foreground/35 bg-primary text-primary-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Fixture cases</SelectLabel>
                    {fixture.cases.map((item) => (
                      <SelectItem key={item.case_id} value={item.case_id}>
                        {item.case_id}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Input
              ref={fileInput}
              id="fixture-upload"
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => loadFixture(event.target.files?.[0])}
            />
            <Button
              variant="outline"
              className="border-primary-foreground/35 bg-primary text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => fileInput.current?.click()}
            >
              <UploadIcon data-icon="inline-start" /> Load JSON
            </Button>
            <Button
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={resetFixture}
            >
              <RotateCcwIcon data-icon="inline-start" /> Reset
            </Button>
          </div>
        </div>
      </header>

      {uploadError && (
        <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-8">
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>Fixture not loaded</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        </div>
      )}

      <main id="workspace-content">
        <TabsContent value="desk">
          <AuditDesk
            caseId={currentCase.case_id}
            results={results}
            checking={checking}
            passCount={passCount}
            classCount={classes.length}
            featured={featured}
            onTrace={setSelected}
            onRegister={() => setPage("register")}
            onChecking={openChecking}
          />
        </TabsContent>
        <TabsContent value="register">
          <ResultRegister
            results={filteredResults}
            total={results.length}
            classes={classes}
            search={search}
            classFilter={classFilter}
            onSearch={setSearch}
            onClassFilter={setClassFilter}
            onTrace={setSelected}
          />
        </TabsContent>
        <TabsContent value="checking">
          <CheckingDesk
            lists={checking}
            active={reviewKey}
            onChange={setReviewKey}
            onTrace={setSelected}
          />
        </TabsContent>
      </main>

      <footer
        data-print-hidden="true"
        className="flex flex-col justify-between gap-2 bg-primary px-5 py-4 text-xs text-primary-foreground/60 sm:flex-row lg:px-10"
      >
        <span>Exam office working copy · Rules R-10, R-11, R-12, R-13 & R-29</span>
        <span>
          {fixture === bundledFixture ? "Published fixture" : "Uploaded fixture"} ·{" "}
          {fixture.cases.length} cases loaded
        </span>
      </footer>

      <TraceSheet result={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </Tabs>
  )
}

function AuditDesk({
  caseId,
  results,
  checking,
  passCount,
  classCount,
  featured,
  onTrace,
  onRegister,
  onChecking,
}: {
  caseId: string
  results: StudentResult[]
  checking: CheckingLists
  passCount: number
  classCount: number
  featured: StudentResult
  onTrace: (result: StudentResult) => void
  onRegister: () => void
  onChecking: (key: ReviewKey) => void
}) {
  const reviewEntryCount =
    checking.optional.length + checking.practical.length + checking.absent.length

  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-8">
      <section className="grid min-h-[610px] items-center gap-16 py-16 lg:grid-cols-[1.08fr_.92fr] lg:py-24">
        <div>
          <Eyebrow>Pre-publication audit · {caseId}</Eyebrow>
          <h1 className="mt-4 font-heading text-[clamp(3.6rem,8vw,6.5rem)] leading-[0.88] font-semibold tracking-[-0.07em] text-primary">
            Every grade,
            <br />
            <em className="not-italic text-destructive">accounted for.</em>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-muted-foreground">
            Process the full register, expose every rule decision, and hand
            teachers the exact exceptions that need a human check.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" onClick={onRegister}>
              Open result register <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button variant="link" size="lg" onClick={() => onChecking("optional")}>
              Review flagged students
            </Button>
          </div>
        </div>

        <article className="ledger-paper relative border-t-[7px] border-t-primary p-6 shadow-xl shadow-primary/10 lg:rotate-1 lg:p-8">
          <span className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 -rotate-2 bg-ring/50" />
          <div className="flex justify-between border-b pb-3 text-[0.65rem] font-bold tracking-[0.13em] text-muted-foreground uppercase">
            <span>Rule audit sample</span>
            <span>{featured.student.id}</span>
          </div>
          <div className="py-6">
            <span className="text-xs text-muted-foreground">{featured.student.class}</span>
            <h2 className="font-heading text-4xl font-semibold tracking-[-0.05em] text-primary">
              {featured.student.name}
            </h2>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-y py-5">
            <div className="flex flex-col gap-1">
              <span className="text-[0.67rem] text-muted-foreground">
                Average before fail rule
              </span>
              <strong className="font-heading text-4xl text-primary">
                {formatGpa(featured.uncancelledGpa)}
              </strong>
            </div>
            <ArrowRightIcon className="text-muted-foreground" />
            <div className="flex flex-col gap-1 text-right">
              <span className="text-[0.67rem] text-muted-foreground">Published result</span>
              <strong className="font-heading text-4xl text-destructive">
                {featured.letterGrade}
              </strong>
            </div>
          </div>
          <div className="grid grid-cols-[82px_1fr] items-center gap-4 py-6">
            <span className="audit-stamp grid h-16 place-items-center text-center text-[0.65rem] font-black tracking-[0.1em] text-destructive">
              CHECK
              <br />
              REQUIRED
            </span>
            <p className="text-xs leading-5 text-muted-foreground">
              {featured.compulsoryFailures.length
                ? `${featured.compulsoryFailures.map((item) => item.code).join(", ")} triggered the compulsory-fail rule. The working average stays visible.`
                : "No compulsory failure. The final result follows the calculated average."}
            </p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-between border-t pt-4"
            onClick={() => onTrace(featured)}
          >
            See the full calculation trace <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </article>
      </section>

      <section className="mb-24 border bg-card shadow-sm">
        <div className="flex items-center gap-4 border-b p-5">
          <span className="grid size-11 place-items-center bg-primary text-primary-foreground">
            <ClipboardCheckIcon />
          </span>
          <div>
            <Eyebrow>Register state</Eyebrow>
            <h2 className="font-heading text-xl font-semibold text-primary">
              Ready for office checking
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <SummaryValue value={String(results.length)} label={`students · ${classCount} classes`} />
          <SummaryValue value={`${Math.round((passCount / results.length) * 100)}%`} label={`${passCount} passing results`} />
          <SummaryValue value={String(results.length - passCount)} label="compulsory failures" danger />
          <SummaryValue value={String(reviewEntryCount)} label="review-list entries" />
        </div>
      </section>

      <section className="mb-28">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Eyebrow>Before results go out</Eyebrow>
            <h2 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.05em] text-primary md:text-5xl">
              Three lists. No hidden exceptions.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Lists deliberately overlap. One student may need more than one check.
          </p>
        </div>
        <div className="border-t-2 border-primary">
          <CheckRow number="01" title="Optional review" description="Optional GP is 2.0 or below, including AB. No bonus is applied." count={checking.optional.length} onClick={() => onChecking("optional")} />
          <CheckRow number="02" title="Practical fail" description="Practical is below 8 in any compulsory or optional subject." count={checking.practical.length} onClick={() => onChecking("practical")} />
          <CheckRow number="03" title="Absent marks" description="AB appears in any subject and must be verified by hand." count={checking.absent.length} onClick={() => onChecking("absent")} />
        </div>
      </section>
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[0.68rem] font-bold tracking-[0.14em] text-primary/75 uppercase">
      {children}
    </span>
  )
}

function SummaryValue({ value, label, danger = false }: { value: string; label: string; danger?: boolean }) {
  return (
    <div className="flex flex-col border-r border-b p-5 last:border-r-0 lg:border-b-0">
      <strong className={cn("font-heading text-4xl tracking-[-0.04em] text-primary", danger && "text-destructive")}>
        {value}
      </strong>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function CheckRow({ number, title, description, count, onClick }: { number: string; title: string; description: string; count: number; onClick: () => void }) {
  return (
    <Button variant="ghost" className="grid h-auto w-full grid-cols-[45px_1fr_70px_auto] items-center gap-3 rounded-none border-b px-1 py-5 text-left" onClick={onClick}>
      <span className="font-heading text-lg text-destructive">{number}</span>
      <span className="flex min-w-0 flex-col gap-1 whitespace-normal">
        <strong className="text-base text-primary">{title}</strong>
        <small className="hidden text-xs leading-5 font-normal text-muted-foreground sm:block">{description}</small>
      </span>
      <span className="flex flex-col text-right font-heading text-2xl text-primary">
        {count}<small className="font-sans text-[0.6rem] text-muted-foreground">students</small>
      </span>
      <ArrowRightIcon data-icon="inline-end" />
    </Button>
  )
}

function ResultRegister({ results, total, classes, search, classFilter, onSearch, onClassFilter, onTrace }: { results: StudentResult[]; total: number; classes: string[]; search: string; classFilter: string; onSearch: (value: string) => void; onClassFilter: (value: string) => void; onTrace: (result: StudentResult) => void }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
      <PageTitle eyebrow="Calculated register" title="Results, with the working shown." description="Every GPA is derived from six compulsory subjects and the optional bonus. Select a student to inspect the full rule trace." />
      <section className="mt-10 border-t-4 border-primary bg-card shadow-xl shadow-primary/5">
        <div className="flex flex-wrap items-end gap-4 border-b p-4">
          <Field className="min-w-64 flex-1 gap-1">
            <FieldLabel htmlFor="student-search">Search students</FieldLabel>
            <span className="relative">
              <SearchIcon className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
              <Input id="student-search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Name or student ID" className="pl-8" />
            </span>
          </Field>
          <Field className="w-44 gap-1">
            <FieldLabel>Class</FieldLabel>
            <Select value={classFilter} onValueChange={(value) => value && onClassFilter(value)} items={[{ value: "all", label: "All classes" }, ...classes.map((value) => ({ value, label: value }))]}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup><SelectLabel>Class filter</SelectLabel><SelectItem value="all">All classes</SelectItem>{classes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
          </Field>
          <span className="pb-2 text-xs text-muted-foreground">Showing {results.length} of {total}</span>
        </div>
        {results.length ? (
          <Table>
            <TableHeader><TableRow className="bg-muted/70"><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Optional</TableHead><TableHead>Before fail rule</TableHead><TableHead>Final GPA</TableHead><TableHead>Grade</TableHead><TableHead>Checks</TableHead><TableHead><span className="sr-only">Trace</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.student.id} className={cn(result.letterGrade === "F" && "bg-destructive/4")}>
                  <TableCell><Button variant="link" className="h-auto flex-col items-start gap-0 p-0 text-left" onClick={() => onTrace(result)}><strong>{result.student.name}</strong><small className="text-muted-foreground">{result.student.id}</small></Button></TableCell>
                  <TableCell>{result.student.class}</TableCell>
                  <TableCell>{result.student.optional} · {result.optionalPoint.toFixed(1)}</TableCell>
                  <TableCell>{formatGpa(result.uncancelledGpa)}</TableCell>
                  <TableCell className="font-bold">{formatGpa(result.finalGpa)}</TableCell>
                  <TableCell><Badge variant={result.letterGrade === "F" ? "destructive" : "secondary"}>{result.letterGrade}</Badge></TableCell>
                  <TableCell><ResultFlags result={result} /></TableCell>
                  <TableCell><Button size="icon-sm" variant="ghost" aria-label={`Open ${result.student.name}'s trace`} onClick={() => onTrace(result)}><ArrowRightIcon /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty className="min-h-72"><EmptyHeader><EmptyMedia variant="icon"><SearchIcon /></EmptyMedia><EmptyTitle>No students found</EmptyTitle><EmptyDescription>Clear the search or choose another class.</EmptyDescription></EmptyHeader></Empty>
        )}
      </section>
    </div>
  )
}

function ResultFlags({ result }: { result: StudentResult }) {
  const flags = [result.flags.optionalReview && "Optional", result.flags.practicalFail && "Practical", result.flags.absent && "Absent"].filter(Boolean) as string[]
  return flags.length ? (
    <span className="flex gap-1" aria-label={flags.join(", ")} title={flags.join(", ")}>
      {flags.map((flag) => <span key={flag} className="size-2 rounded-full bg-destructive" />)}
    </span>
  ) : (
    <Badge variant="ghost"><CheckIcon data-icon="inline-start" /> Clear</Badge>
  )
}

function CheckingDesk({ lists, active, onChange, onTrace }: { lists: CheckingLists; active: ReviewKey; onChange: (key: ReviewKey) => void; onTrace: (result: StudentResult) => void }) {
  const entries = lists[active]
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
      <PageTitle eyebrow="Teacher verification queue" title="Check before publishing." description="These lists are independent by design. A student remains everywhere their marks trigger a check." split />
      <Tabs value={active} onValueChange={(value) => onChange(value as ReviewKey)} orientation="vertical" className="mt-10 grid items-start gap-8 lg:grid-cols-[250px_1fr]">
        <TabsList variant="line" className="h-auto w-full flex-row overflow-x-auto border-t-2 border-primary lg:flex-col lg:items-stretch">
          {(Object.keys(reviewLabels) as ReviewKey[]).map((key) => (
            <TabsTrigger key={key} value={key} className="h-auto justify-between border-b px-2 py-4 lg:w-full">
              {reviewLabels[key]} <Badge variant={active === key ? "default" : "secondary"}>{lists[key].length}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        {(Object.keys(reviewLabels) as ReviewKey[]).map((key) => (
          <TabsContent key={key} value={key} className="border-t-4 border-primary bg-card shadow-xl shadow-primary/5">
            <div className="flex items-center justify-between gap-4 border-b p-5">
              <div><Eyebrow>Current list</Eyebrow><h2 className="font-heading text-3xl font-semibold text-primary">{reviewLabels[key]}</h2></div>
              <Badge variant="secondary"><ShieldCheckIcon data-icon="inline-start" /> {lists[key].length} to verify</Badge>
            </div>
            {lists[key].length ? <div>{lists[key].map((entry, index) => <ReviewRow key={entry.student.id} entry={entry} index={index + 1} onTrace={() => onTrace(entry.result)} />)}</div> : <Empty className="min-h-64"><EmptyHeader><EmptyMedia variant="icon"><CheckIcon /></EmptyMedia><EmptyTitle>No manual checks</EmptyTitle><EmptyDescription>No students trigger this list in the selected case.</EmptyDescription></EmptyHeader></Empty>}
          </TabsContent>
        ))}
      </Tabs>
      <span className="sr-only" aria-live="polite">{entries.length} students in {reviewLabels[active]}</span>
    </div>
  )
}

function ReviewRow({ entry, index, onTrace }: { entry: ReviewEntry; index: number; onTrace: () => void }) {
  return (
    <Button variant="ghost" className="grid h-auto w-full grid-cols-[35px_1fr_65px_auto] gap-3 rounded-none border-b p-4 text-left md:grid-cols-[35px_.8fr_1.4fr_65px_auto]" onClick={onTrace}>
      <span className="font-heading text-destructive">{String(index).padStart(2, "0")}</span>
      <span className="flex flex-col whitespace-normal"><strong className="text-primary">{entry.student.name}</strong><small className="font-normal text-muted-foreground">{entry.student.id} · {entry.student.class}</small></span>
      <span className="col-start-2 row-start-2 flex flex-col whitespace-normal md:col-start-3 md:row-start-1">{entry.reasons.map((reason) => <small key={reason} className="font-normal text-destructive/80">{reason}</small>)}</span>
      <span className="flex flex-col text-right"><strong className="text-destructive">{entry.result.letterGrade}</strong><small className="font-normal text-muted-foreground">GPA {formatGpa(entry.result.finalGpa)}</small></span>
      <ArrowRightIcon />
    </Button>
  )
}

function PageTitle({ eyebrow, title, description, split = false }: { eyebrow: string; title: string; description: string; split?: boolean }) {
  return (
    <section className={cn(split && "flex flex-col justify-between gap-5 md:flex-row md:items-end")}>
      <div><Eyebrow>{eyebrow}</Eyebrow><h1 className="mt-3 font-heading text-5xl font-semibold tracking-[-0.06em] text-primary md:text-7xl">{title}</h1></div>
      <p className={cn("mt-5 max-w-2xl text-sm leading-6 text-muted-foreground", split && "md:mt-0 md:max-w-sm")}>{description}</p>
    </section>
  )
}

function TraceSheet({ result, onOpenChange }: { result: StudentResult | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={Boolean(result)} onOpenChange={onOpenChange}>
      {result && (
        <SheetContent
          side="right"
          className="gap-0 overflow-y-auto p-0 data-[side=right]:w-[96vw] data-[side=right]:sm:max-w-5xl"
        >
          <SheetHeader className="border-b-4 border-ring bg-primary p-6 text-primary-foreground">
            <Eyebrow>Student calculation trace · {result.student.id}</Eyebrow>
            <SheetTitle className="font-heading text-3xl text-primary-foreground">{result.student.name}</SheetTitle>
            <SheetDescription className="text-primary-foreground/65">{result.student.class} · Optional subject {result.student.optional}</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 border-b md:grid-cols-[130px_130px_1fr]">
            <TraceMetric label="Final GPA" value={formatGpa(result.finalGpa)} />
            <TraceMetric label="Letter grade" value={result.letterGrade} />
            <div className={cn("col-span-2 flex items-center gap-2 border-t p-5 text-sm font-bold md:col-span-1 md:border-t-0 md:border-l", result.compulsoryFailures.length ? "bg-destructive/6 text-destructive" : "bg-secondary text-primary")}>
              {result.compulsoryFailures.length ? <AlertTriangleIcon /> : <BookOpenCheckIcon />}
              {result.compulsoryFailures.length ? `${result.compulsoryFailures.length} compulsory failure${result.compulsoryFailures.length > 1 ? "s" : ""}` : "All compulsory subjects passed"}
            </div>
          </div>
          <div className="p-4 md:p-6">
            <Table>
              <TableHeader><TableRow className="bg-muted"><TableHead>Subject</TableHead><TableHead>Mark used</TableHead><TableHead>Pass checks</TableHead><TableHead className="min-w-64">Rule decision</TableHead><TableHead>GP</TableHead></TableRow></TableHeader>
              <TableBody>
                {result.subjectResults.map((subject) => (
                  <TableRow key={subject.code} className={cn(subject.failed && "bg-destructive/4")}>
                    <TableCell><strong className="block text-primary">{subject.name}</strong><small className="text-muted-foreground">{subject.code} · {subject.isOptional ? "optional" : "compulsory"}</small></TableCell>
                    <TableCell><strong className="block">{subject.rawDisplay}</strong>{subject.total !== null && <small className="text-muted-foreground">Total used: {subject.total}/100</small>}</TableCell>
                    <TableCell>{subject.absent ? <Badge variant="destructive">Absent</Badge> : subject.isPractical ? <span className="flex flex-col gap-1"><Badge variant={subject.theoryPassed ? "secondary" : "destructive"}>Theory {subject.theoryPassed ? "≥ 25 ✓" : "< 25 ✕"}</Badge><Badge variant={subject.practicalPassed ? "secondary" : "destructive"}>Practical {subject.practicalPassed ? "≥ 8 ✓" : "< 8 ✕"}</Badge></span> : <Badge variant={subject.failed ? "destructive" : "secondary"}>{subject.failed ? "Below pass mark" : "Mark accepted"}</Badge>}</TableCell>
                    <TableCell className="whitespace-normal text-xs leading-5 text-muted-foreground">{subject.decision}</TableCell>
                    <TableCell className={cn("font-bold", subject.point === 0 && "text-destructive")}>{subject.point.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <section className="m-4 border md:m-6">
            <div className="bg-muted p-5"><Eyebrow>Final calculation · R-13</Eyebrow><h3 className="font-heading text-2xl font-semibold text-primary">The arithmetic, line by line</h3></div>
            <FormulaLine label="Six compulsory grade points" expression={result.subjectResults.filter((item) => !item.isOptional).map((item) => item.point.toFixed(1)).join(" + ")} value={result.compulsoryPointSum.toFixed(1)} />
            <FormulaLine label="Optional bonus" expression={`max(0, ${result.optionalPoint.toFixed(1)} − 2)`} value={result.optionalBonus.toFixed(1)} />
            <FormulaLine label="Average before compulsory-fail rule" expression={`min(5, (${result.compulsoryPointSum.toFixed(1)} + ${result.optionalBonus.toFixed(1)}) ÷ 6)`} value={formatGpa(result.uncancelledGpa)} emphasis />
            {result.compulsoryFailures.length > 0 && <Alert variant="destructive" className="rounded-none border-0 border-t p-4"><AlertTriangleIcon /><AlertTitle>Compulsory-fail override</AlertTitle><AlertDescription>{result.compulsoryFailures.map((item) => `${item.code}: ${item.decision}`).join("; ")} Final result is 0.00 / F.</AlertDescription></Alert>}
          </section>
        </SheetContent>
      )}
    </Sheet>
  )
}

function TraceMetric({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-col border-r p-5"><span className="text-xs text-muted-foreground">{label}</span><strong className="font-heading text-3xl text-primary">{value}</strong></div>
}

function FormulaLine({ label, expression, value, emphasis = false }: { label: string; expression: string; value: string; emphasis?: boolean }) {
  return <div className={cn("flex items-center justify-between gap-4 border-t p-4", emphasis && "bg-secondary")}><span className="flex flex-col text-sm font-bold text-primary">{label}<small className="font-normal text-muted-foreground">{expression}</small></span><strong className={cn("font-heading text-2xl text-primary", emphasis && "text-3xl")}>{value}</strong></div>
}
