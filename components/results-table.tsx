"use client"

import * as React from "react"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  EyeIcon,
  SearchIcon,
} from "lucide-react"
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { StudentResult } from "@/src/domain/types"
import { csvFilename, resultRegisterCsv } from "@/src/domain/csv"
import { downloadCsv } from "@/lib/download"

function SortButton({
  column,
  label,
}: {
  column: {
    getIsSorted: () => false | "asc" | "desc"
    toggleSorting: (desc?: boolean) => void
  }
  label: string
}) {
  const sorted = column.getIsSorted()
  return (
    <Button
      variant="ghost"
      className="-ml-2 h-7"
      onClick={() => column.toggleSorting(sorted === "asc")}
      aria-label={`Sort by ${label}`}
      aria-pressed={Boolean(sorted)}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUpIcon />
      ) : sorted === "desc" ? (
        <ArrowDownIcon />
      ) : (
        <ArrowUpDownIcon />
      )}
    </Button>
  )
}

export function ResultsTable() {
  const { results, classes, caseId, openTrace } = useFixture()
  const [search, setSearch] = React.useState("")
  const [classFilter, setClassFilter] = React.useState("all")
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "student", desc: false },
  ])

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return results.filter(
      (result) =>
        (classFilter === "all" || result.student.class === classFilter) &&
        (!query ||
          result.student.name.toLowerCase().includes(query) ||
          result.student.id.toLowerCase().includes(query))
    )
  }, [results, search, classFilter])

  const columns = React.useMemo<ColumnDef<StudentResult>[]>(
    () => [
      {
        id: "student",
        accessorFn: (row) => row.student.name,
        header: ({ column }) => <SortButton column={column} label="Student" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.student.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {row.original.student.id}
            </p>
          </div>
        ),
      },
      {
        id: "class",
        accessorFn: (row) => row.student.class,
        header: ({ column }) => <SortButton column={column} label="Class" />,
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.student.class}</Badge>
        ),
      },
      {
        id: "optional",
        accessorFn: (row) => row.student.optional,
        header: "Optional",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.student.optional}
          </span>
        ),
      },
      {
        id: "uncancelled",
        accessorFn: (row) => row.uncancelledGpa,
        header: ({ column }) => (
          <SortButton column={column} label="Before fail" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-muted-foreground tabular-nums">
            {row.original.uncancelledGpa.toFixed(2)}
          </span>
        ),
      },
      {
        id: "gpa",
        accessorFn: (row) => row.finalGpa,
        header: ({ column }) => <SortButton column={column} label="GPA" />,
        cell: ({ row }) => (
          <span className="font-mono font-semibold tabular-nums">
            {row.original.finalGpa.toFixed(2)}
          </span>
        ),
      },
      {
        id: "grade",
        accessorFn: (row) => row.letterGrade,
        header: ({ column }) => <SortButton column={column} label="Grade" />,
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.letterGrade === "F" ? "destructive" : "secondary"
            }
          >
            {row.original.letterGrade}
          </Badge>
        ),
      },
      {
        id: "flags",
        header: "Flags",
        cell: ({ row }) => {
          const labels = [
            row.original.flags.optionalReview && "Optional",
            row.original.flags.practicalFail && "Practical",
            row.original.flags.absent && "Absent",
          ].filter(Boolean)
          return labels.length ? (
            <div className="flex flex-wrap gap-1">
              {labels.map((label) => (
                <Badge
                  key={String(label)}
                  variant="outline"
                  className="text-[10px]"
                >
                  {label}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        },
      },
      {
        id: "trace",
        header: () => <span className="sr-only">Trace</span>,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openTrace(row.original)}
          >
            <EyeIcon /> Trace
          </Button>
        ),
      },
    ],
    [openTrace]
  )

  // TanStack Table intentionally returns mutable helpers; React Compiler skips this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })
  React.useEffect(() => table.setPageIndex(0), [search, classFilter, table])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Results
          </h1>
          <p className="text-sm text-muted-foreground">
            Final GPA register and subject traces
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            downloadCsv(
              csvFilename(caseId, "result register"),
              resultRegisterCsv(results)
            )
          }
        >
          <DownloadIcon /> Export register CSV
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-sm sm:flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or ID"
            className="pl-8"
            aria-label="Search students"
          />
        </div>
        <Select
          value={classFilter}
          onValueChange={(value) => value && setClassFilter(value)}
          items={[
            { value: "all", label: "All classes" },
            ...classes.map((item) => ({ value: item, label: item })),
          ]}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter class">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((item) => (
                <SelectItem value={item} key={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {filtered.length} students
        </p>
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <Empty className="min-h-72">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchIcon />
                </EmptyMedia>
                <EmptyTitle>No matching students</EmptyTitle>
                <EmptyDescription>
                  Clear the search or choose another class.
                </EmptyDescription>
              </EmptyHeader>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("")
                  setClassFilter("all")
                }}
              >
                Clear filters
              </Button>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="whitespace-nowrap"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={
                        row.original.letterGrade === "F" ? "failed" : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-2.5">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {filtered.length > 0 && (
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Rows</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) =>
                value && table.setPageSize(Number(value))
              }
              items={[10, 25, 50].map((value) => ({
                value: String(value),
                label: String(value),
              }))}
            >
              <SelectTrigger className="w-20" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {[10, 25, 50].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-2 text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
