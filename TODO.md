# Milestones ICS Export - Implementation Tasks

## ✅ Completed
- [x] Explored repository structure and understood codebase patterns
- [x] Gathered requirements and created implementation plan
- [x] Plan approved by user
- [x] Step 1: Created `src/lib/icsExport.ts`
  - [x] `escapeICSText(value: string): string` - Escape `\`, `;`, `,`, `\n` per RFC 5545
  - [x] `milestoneStatusToICS(status: string): string` - Map milestone status to ICS STATUS
  - [x] `formatICSDDate(date: Date): string` - Format Date to YYYYMMDD
  - [x] `milestonesToICS(milestones: Milestone[]): string` - Build VCALENDAR + VEVENT blocks
  - [x] `downloadMilestonesICS(milestones: Milestone[], filename?: string): void` - Download trigger
- [x] Step 2: Created `src/lib/__tests__/icsExport.test.ts`
  - [x] Text escaping tests (backslash, semicolon, comma, newline, combined)
  - [x] ICS status mapping tests
  - [x] Date formatting tests (YYYYMMDD, padding, edge months)
  - [x] ICS generation tests (empty array, with/without due dates, structure, VEVENT fields)
  - [x] Download trigger tests (Blob, URL lifecycle, anchor interaction)
- [x] Step 3: Created `docs/lib/ics-export.md`
  - [x] Purpose, usage, format details, escaping rules, edge cases
- [x] Step 4: Updated `src/app/milestones/page.tsx`
  - [x] Added "Add to Calendar" button in the toolbar area
  - [x] Wired up to `downloadMilestonesICS(sortedMilestones)`
- [x] Step 5: Verify
  - [x] Dependencies installed (`npm install`)
  - [x] 49/49 tests pass for `icsExport.test.ts`
  - [ ] Lint check - running
  - [ ] Full test suite
  - [ ] Build
