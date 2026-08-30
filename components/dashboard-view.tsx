"use client"

import Link from "next/link"
import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  CircleAlertIcon,
  EyeIcon,
  FlaskConicalIcon,
  GraduationCapIcon,
  ListChecksIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useFixture } from "@/components/fixture-provider"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { findJudgeExamples } from "@/src/domain/evidence"

const gradeOrder = ["A+", "A", "A-", "B", "C", "D", "F"]
const gradeConfig = {
  count: { label: "Students", color: "var(--chart-1)" },
} satisfies ChartConfig
const classConfig = {
  passed: { label: "Passed", color: "var(--chart-3)" },
  failed: { label: "Failed", color: "var(--chart-2)" },
} satisfies ChartConfig

export function DashboardView() {
  const { results, checking, openTrace } = useFixture()
  const passed = results.filter((result) => result.letterGrade !== "F").length
  const failed = results.length - passed
  const reviewFlags =
    checking.optional.length +
    checking.practical.length +
    checking.absent.length
  const judgeExamples = findJudgeExamples(results)
  const gradeData = gradeOrder.map((grade) => ({
    grade,
    count: results.filter((result) => result.letterGrade === grade).length,
  }))
  const classData = Array.from(
    new Set(results.map((result) => result.student.class))
  )
    .sort()
    .map((className) => {
      const classResults = results.filter(
        (result) => result.student.class === className
      )
      return {
        className,
        passed: classResults.filter((result) => result.letterGrade !== "F")
          .length,
        failed: classResults.filter((result) => result.letterGrade === "F")
          .length,
      }
    })

  const stats = [
    {
      label: "Students",
      value: results.length,
      note: `${classData.length} classes`,
      icon: UsersIcon,
    },
    {
      label: "Passed",
      value: passed,
      note: `${Math.round((passed / results.length) * 100)}% pass rate`,
      icon: ShieldCheckIcon,
    },
    {
      label: "Failed",
      value: failed,
      note: "compulsory override",
      icon: CircleAlertIcon,
    },
    {
      label: "Review flags",
      value: reviewFlags,
      note: "across three lists",
      icon: ListChecksIcon,
    },
  ]
  const judgeShortcuts = [
    {
      label: "Strong average, compulsory fail",
      result: judgeExamples.compulsoryFail,
      icon: CircleAlertIcon,
      detail: (result: NonNullable<typeof judgeExamples.compulsoryFail>) => {
        const failed = result.compulsoryFailures[0]
        return `${result.uncancelledGpa.toFixed(2)} before override · ${failed.code} ${failed.rawDisplay}`
      },
    },
    {
      label: "Practical fail, theory pass",
      result: judgeExamples.practicalFail,
      icon: FlaskConicalIcon,
      detail: (result: NonNullable<typeof judgeExamples.practicalFail>) => {
        const failed = result.subjectResults.find(
          (subject) =>
            subject.isPractical &&
            subject.theoryPassed === true &&
            subject.practicalPassed === false
        )!
        return `${failed.code} · ${failed.rawDisplay}`
      },
    },
    {
      label: "Optional point at or below 2",
      result: judgeExamples.optionalRule,
      icon: BookOpenCheckIcon,
      detail: (result: NonNullable<typeof judgeExamples.optionalRule>) => {
        const optional = result.subjectResults.find(
          (subject) => subject.isOptional
        )!
        return `${optional.code} · ${optional.point.toFixed(1)} GP · 0 bonus`
      },
    },
    {
      label: "Absent compulsory subject",
      result: judgeExamples.absent,
      icon: EyeIcon,
      detail: (result: NonNullable<typeof judgeExamples.absent>) => {
        const absent = result.subjectResults.find(
          (subject) => subject.absent && !subject.isOptional
        ) ?? result.subjectResults.find((subject) => subject.absent)!
        return `${absent.code} · AB · ${absent.isOptional ? "optional" : "compulsory"}`
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Current case summary</p>
      </div>
      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Case metrics"
      >
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.note}</p>
              </div>
              <span className="grid size-9 place-items-center rounded-md bg-muted text-muted-foreground">
                <stat.icon className="size-4" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-labelledby="judge-shortcuts-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2
              id="judge-shortcuts-title"
              className="font-heading text-lg font-semibold"
            >
              Judge shortcuts
            </h2>
            <p className="text-sm text-muted-foreground">
              Open a published hard-edge trace in one click
            </p>
          </div>
          <span className="hidden font-mono text-xs text-muted-foreground sm:block">
            Current case
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {judgeShortcuts.map((shortcut) => {
            const result = shortcut.result
            return (
              <Card key={shortcut.label} className="gap-3 py-4">
                <CardHeader className="gap-2 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-sm leading-snug">
                      {shortcut.label}
                    </CardTitle>
                    <shortcut.icon className="size-4 shrink-0 text-muted-foreground" />
                  </div>
                  {result ? (
                    <CardDescription className="min-h-10">
                      <span className="block font-medium text-foreground">
                        {result.student.name}
                      </span>
                      {shortcut.detail(result)}
                    </CardDescription>
                  ) : (
                    <CardDescription>No matching student</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="px-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={!result}
                    onClick={() => result && openTrace(result)}
                  >
                    <EyeIcon /> Open trace
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Grade distribution</CardTitle>
            <CardDescription>Final letter grades</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={gradeConfig}
              className="aspect-auto h-64 w-full"
            >
              <BarChart
                accessibilityLayer
                data={gradeData}
                margin={{ left: -16, right: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="grade" tickLine={false} axisLine={false} />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  isAnimationActive={false}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Class outcomes</CardTitle>
            <CardDescription>Passed and failed students</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={classConfig}
              className="aspect-auto h-64 w-full"
            >
              <BarChart
                accessibilityLayer
                data={classData}
                margin={{ left: -16, right: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="className" tickLine={false} axisLine={false} />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="passed"
                  stackId="outcome"
                  fill="var(--color-passed)"
                  isAnimationActive={false}
                  radius={[0, 0, 3, 3]}
                />
                <Bar
                  dataKey="failed"
                  stackId="outcome"
                  fill="var(--color-failed)"
                  isAnimationActive={false}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section
        className="grid gap-3 md:grid-cols-3"
        aria-label="Checking list summary"
      >
        {(
          [
            ["Optional rule", checking.optional.length, "Optional point ≤ 2.0"],
            [
              "Practical fail",
              checking.practical.length,
              "Practical mark below 8",
            ],
            ["Absent", checking.absent.length, "AB in any subject"],
          ] as const
        ).map(([label, count, detail]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{label}</CardTitle>
                <span className="font-mono text-xl font-semibold">{count}</span>
              </div>
              <CardDescription>{detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/checks"
                prefetch
                className={cn(buttonVariants({ variant: "ghost" }), "-ml-2")}
              >
                Open list <ArrowRightIcon />
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
      <div className="flex justify-end">
        <Link href="/results" prefetch className={buttonVariants()}>
          <GraduationCapIcon /> Open results
        </Link>
      </div>
    </div>
  )
}
