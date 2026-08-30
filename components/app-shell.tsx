"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FileJsonIcon,
  GaugeIcon,
  GraduationCapIcon,
  ListChecksIcon,
  RotateCcwIcon,
} from "lucide-react"

import { FixtureUploadSheet } from "@/components/fixture-upload-sheet"
import { useFixture } from "@/components/fixture-provider"
import { StudentTrace } from "@/components/student-trace"
import { ThemeToggle } from "@/components/theme-toggle"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: GaugeIcon },
  { href: "/results", label: "Results", icon: GraduationCapIcon },
  { href: "/checks", label: "Checks", icon: ListChecksIcon },
]
const pageLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/results": "Results",
  "/checks": "Checking lists",
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const {
    fixture,
    caseId,
    currentCase,
    results,
    checking,
    uploadError,
    setCaseId,
    resetFixture,
  } = useFixture()
  const reviewCount =
    checking.optional.length +
    checking.practical.length +
    checking.absent.length

  return (
    <SidebarProvider
      style={
        {
          "--shell-header-height": "3.5rem",
          "--shell-header-border": "var(--border)",
        } as React.CSSProperties
      }
    >
      <a
        href="#main-content"
        className="fixed -top-16 left-4 z-[100] rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:top-4"
      >
        Skip to content
      </a>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-(--shell-header-height) shrink-0 justify-center border-b border-[color:var(--shell-header-border)] px-3 py-0">
          <Link
            href="/dashboard"
            prefetch
            className="flex items-center gap-2 overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Image
              src="/brand-mark.png"
              alt=""
              width={32}
              height={32}
              priority
              className="size-8 shrink-0 rounded-md object-cover"
            />
            <span className="min-w-0 group-data-[collapsible=icon]:hidden">
              <strong className="block truncate text-sm">Result Office</strong>
              <span className="block text-[11px] text-sidebar-foreground/65">
                LSH26 · T031 · P08
              </span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} prefetch />}
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Case status</SidebarGroupLabel>
            <SidebarGroupContent className="space-y-2 rounded-lg border border-sidebar-border/70 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-sidebar-foreground/65">Case</span>
                <span className="font-mono">{caseId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sidebar-foreground/65">Students</span>
                <span className="font-mono">{results.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sidebar-foreground/65">Review flags</span>
                <span className="font-mono">{reviewCount}</span>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-(--shell-header-height) shrink-0 flex-nowrap items-center gap-2 border-b border-[color:var(--shell-header-border)] bg-background/95 px-3 py-0 backdrop-blur md:px-5">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-1 h-5" />
          <div className="mr-auto min-w-24">
            <p className="text-sm font-semibold">
              {pageLabels[pathname] ?? "Result Office"}
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {currentCase.students.length} students ·{" "}
              {currentCase.subjects.length} subjects
            </p>
          </div>
          <Select
            value={caseId}
            onValueChange={(value) => value && setCaseId(value)}
            items={fixture.cases.map((item) => ({
              value: item.case_id,
              label: item.case_id,
            }))}
          >
            <SelectTrigger className="w-28" aria-label="Fixture case">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                <SelectLabel>Fixture case</SelectLabel>
                {fixture.cases.map((item) => (
                  <SelectItem key={item.case_id} value={item.case_id}>
                    {item.case_id}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FixtureUploadSheet />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={resetFixture}
            aria-label="Reset bundled fixture"
          >
            <RotateCcwIcon />
          </Button>
          <ThemeToggle />
        </header>

        {uploadError && (
          <div className="px-4 pt-4 md:px-6">
            <Alert variant="destructive">
              <FileJsonIcon />
              <AlertTitle>Fixture rejected</AlertTitle>
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          </div>
        )}
        <main id="main-content" className="min-w-0 flex-1 p-4 md:p-6">
          {children}
        </main>
        <footer className="border-t px-4 py-3 text-xs text-muted-foreground md:px-6">
          <span>Rules R-10 · R-11 · R-12 · R-13 · R-29</span>
        </footer>
      </SidebarInset>
      <StudentTrace />
    </SidebarProvider>
  )
}
