# Visual AI Workflow System - Implementation Plan

## Task 1: Initialize Next.js + TypeScript project scaffolding and install core dependencies
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Create Next.js App Router project with TypeScript in current repo
  - Install React Flow, Inngest SDK, OpenAI SDK
  - Install and configure Tailwind CSS, shadcn/ui CLI
  - Add `.gitignore`, `.env.example` (OPENAI_API_KEY, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY)
  - Add initial package.json scripts: dev, build, start, lint
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `rule` TR-1.1: `npm run build` exits 0 with no TS errors
  - `rule` TR-1.2: `.env.example` present at project root with exactly the 3 env var placeholders (no secrets)
  - `rule` TR-1.3: package.json includes reactflow/xyflow, inngest, openai, tailwindcss deps
- **Notes**: Use `npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"` or equivalent. For Tailwind on Next App Router, use PostCSS config.

## Task 2: Configure shadcn/ui and set up global layout + theme
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Run shadcn/ui init to generate `components.json` and lib/utils
  - Add shadcn components needed: Button, Card, Input, Textarea, Alert, Dialog, Select, Tabs, Toast (toaster + useToast), Badge
  - Create app layout with globals.css and Tailwind directives
  - Verify shadcn Button renders without errors on a test page
- **Acceptance Criteria Addressed**: AC-1, AC-10
- **Test Requirements**:
  - `rule` TR-2.1: App builds with shadcn Button rendered on home page
  - `rule` TR-2.2: `@/components/ui/button.tsx` and `@/lib/utils.ts` exist; components.json valid
  - `rubric` TR-2.3: Layout/globals setup cleanliness; scale 1-5; anchors 1=broken,3=works,5=clean no redundant CSS; threshold >=4; evidence: files present + build output

## Task 3: Define core type system and workflow schema (zod optional)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Create `types/workflow.ts` with:
    - `WorkflowNode = { id, type:'decision', name, prompt, position:{x,y} }`
    - `WorkflowEdge = { id, source, target, branch:'YES'|'NO' }`
    - `Workflow = { nodes: WorkflowNode[], edges: WorkflowEdge[] }`
    - `ExecutionStep = { nodeId, nodeName, prompt, result?:'YES'|'NO', branch?:'YES'|'NO', status, error?, timestamp }`
    - `ExecutionResult = { runId, status, steps: ExecutionStep[], startedAt, finishedAt? }`
  - Create validation helpers: findStartNode, validateWorkflow (unique YES/NO out per node, no dangling refs), getOutgoingEdgeForBranch
  - Ensure no `any` in type layer
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-6
- **Test Requirements**:
  - `rule` TR-3.1: validateWorkflow returns error for node with 2 YES outgoing edges
  - `rule` TR-3.2: findStartNode returns the node with no incoming edges; returns first/error when multiple/no starts
  - `rule` TR-3.3: getOutgoingEdgeForBranch returns correct edge or null for missing branch

## Task 4: Build React Flow visual editor core (canvas + custom node)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**:
  - Create `components/workflow/WorkflowEditor.tsx` using `ReactFlow` from `@xyflow/react`
  - Create `components/workflow/DecisionNode.tsx` custom node with:
    - Input handle (top)
    - Two output handles (bottom-left: YES green, bottom-right: NO red)
    - Editable name input
    - Editable prompt textarea
  - Implement controls to add node (sidebar button), delete selected node (keyboard delete + UI button), delete edge
  - Use local state + React Flow onConnect/onNodesChange/onEdgesChange
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-10
- **Test Requirements**:
  - `rule` TR-4.1: Editor renders at least one node by default; can add second
  - `rule` TR-4.2: YES connection creates edge with branch=YES; NO connection creates branch=NO (enforced via sourceHandle string)
  - `rule` TR-4.3: Duplicate YES/NO out connection is rejected or replaces the old one in state
  - `rubric` TR-4.4: Node layout/readability; scale 1-5; anchors 1=unreadable,3=OK,5=clear labels + colored handles; threshold >=4; evidence: screenshot

## Task 5: Workflow state management hook + localStorage persistence
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3, Task 4
- **Description**:
  - Create `hooks/useWorkflow.ts` exposing `{ nodes, edges, setNodes, setEdges, addNode, updateNode, deleteSelected, exportWorkflow, importWorkflow, saveToStorage, loadFromStorage }`
  - Key `visual-ai-workflow:current` for autosave to localStorage
  - Hydrate on mount from storage
  - Debounce writes to storage (e.g., 500ms)
  - Handle import validation: reject malformed JSON, invalid graph
- **Acceptance Criteria Addressed**: AC-3, AC-9
- **Test Requirements**:
  - `rule` TR-5.1: After adding nodes/edges and reloading page, graph restores (verify by reading storage key after simulated reload in test or by manual dev verification + unit helper test)
  - `rule` TR-5.2: importWorkflow throws or returns error for { nodes:[], edges:[{source:'nonexist',..}] }
  - `rule` TR-5.3: exportWorkflow returns valid JSON string that round-trips through importWorkflow without throwing

## Task 6: Set up Inngest client, serve endpoint, and workflow step function
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 3
- **Description**:
  - Create `inngest/client.ts`: inngest client with event key from env; createEventId helper
  - Create `inngest/functions.ts`: one function `ai-workflow/execute` triggered by event `ai/workflow.start`
  - In the function, use `step.run()` per decision node:
    - For current node, call `callOpenAIDecision(prompt)` server-side helper
    - Normalize result (trim + uppercase), validate ∈ {YES,NO} else throw/retry controlled
    - Record step to execution result object persisted via step state
    - Walk: find start → loop while current node → call decision → branch → next node
    - Enforce MAX_STEPS (e.g., 50) to prevent loops
    - Error states: missing start, missing outgoing edge, invalid AI output, max steps reached
  - Create `app/api/inngest/route.ts`: serve handler exporting the function
  - Create API helper `lib/ai.ts` calling OpenAI chat completions with system+user prompt that forces YES/NO only; server-side only
- **Acceptance Criteria Addressed**: AC-2, AC-5, AC-6, AC-7, AC-8, AC-21
- **Test Requirements**:
  - `rule` TR-6.1: `GET /api/inngest` lists `ai-workflow/execute` function
  - `rule` TR-6.2: normalizeDecision("  yes ") === "YES"; normalizeDecision("MAYBE") throws or returns invalid marker
  - `rule` TR-6.3: traverseEngine given a cyclic graph stops at MAX_STEPS with loop error
  - `rubric` TR-6.4: Engine code clarity; scale 1-5; threshold >=4; anchors 1=spaghetti,3=OK,5=clear while-loop with helpers; evidence: source

## Task 7: Start workflow API route + run state store (in-memory)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 6
- **Description**:
  - Create `app/api/workflow/start/route.ts` (POST) that: validates graph; calls inngest.send({name:'ai/workflow.start', data:{runId, graph}}); returns runId
  - Create `app/api/workflow/runs/[runId]/route.ts` (GET) returning current execution result
  - Create in-memory store `lib/runStore.ts` (Map runId→ExecutionResult) with get/set; Inngest function updates store after each step and at end
  - Since Inngest dev runs functions in separate worker context of same Next process, ensure run store updates via step.run writing through API or a shared module; if sharing unreliable, fall back to writing final result at end with periodic polling + final result via runStore
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-7.1: POST /api/workflow/start returns 200 with JSON { runId } when valid graph posted
  - `rule` TR-7.2: GET /api/workflow/runs/:id returns ExecutionResult shape (status + steps array) even before completion
  - `rule` TR-7.3: API route does NOT forward OPENAI_API_KEY to client (inspect response body for absence)

## Task 8: Execution UI integration (Run button, polling, highlighting, logs panel)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5, Task 7
- **Description**:
  - Add "Run Workflow" button in header (shadcn Button variant default)
  - Disable run while execution in progress; validate workflow before run → show Alert if invalid (no start node)
  - On run start: POST to /api/workflow/start, get runId, begin polling /api/workflow/runs/:runId every 1s
  - Apply node state classes via DecisionNode props:
    - default: neutral
    - executing: yellow border + pulse
    - completed: green border + check badge
    - failed: red border + error badge
  - Edge styling: traveled edges (branch taken) have animated stroke; YES edges vs NO edges colored consistently
  - Create `components/workflow/ExecutionLogs.tsx` panel (right docked) with step entries: timestamp, nodeName, → YES/NO, or error message, and final status line
- **Acceptance Criteria Addressed**: AC-5, AC-10 (AC-10 rubric scored here with evidence)
- **Test Requirements**:
  - `rule` TR-8.1: Clicking Run with empty graph shows Alert with readable message (no crash)
  - `rule` TR-8.2: During execution polling, at least one step updates node to completed/execute styling
  - `rule` TR-8.3: Logs panel shows at least one "Node X → YES/NO" entry after completion
  - `rubric` TR-8.4: Visual polish score; scale 1-5; threshold >=4; anchors per AC-10; evidence: screenshot + logs output

## Task 9: Implement Save/Load workflows UI (localStorage named saves)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 5
- **Description**:
  - Add left sidebar control section "Saved Workflows"
  - Save As… (dialog prompts for name) → stores to localStorage key `visual-ai-workflow:saves` as Record<name, Workflow>
  - List saved workflows with Load / Delete buttons
  - On Load: confirm overwrite current unsaved changes if graph non-empty
  - On Delete: remove from saves list
- **Acceptance Criteria Addressed**: FR-25
- **Test Requirements**:
  - `rule` TR-9.1: Save "demo" → refresh page → demo still appears in saved list
  - `rule` TR-9.2: Load replaces current nodes/edges with saved version

## Task 10: Implement JSON Export/Import with file dialogs
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 5
- **Description**:
  - Export JSON: triggers browser download of `workflow-YYYYMMDD-HHMMSS.json` containing `Workflow`
  - Import JSON: `<input type=file accept=application/json>` → read file → validate via validateWorkflow → replace current state; show Alert if invalid
  - Shadcn Dialog wrapping import flow
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `rule` TR-10.1: Import of a file missing `nodes` array shows Alert; graph unchanged
  - `rule` TR-10.2: Export → import in-memory yields deep-equal nodes/edges (positions optional as long as ids match)

## Task 11: Robust error handling + user-facing alerts for failure modes
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 6, Task 7, Task 8
- **Description**:
  - Detect missing OPENAI_API_KEY server-side and return specific error "Missing OpenAI API key" from start endpoint; UI displays Alert
  - Invalid AI output: engine records error step with message "AI returned an invalid answer (expected YES/NO): ..."; UI shows error badge
  - Missing outgoing branch for result: record step error; workflow ends with status error
  - Invalid workflow: no start node, dangling edge refs, duplicate YES/NO → caught on Start
  - Inngest send failure/network error: catch at start endpoint, pass to UI as Alert
  - All UI messages use shadcn Alert with title + description
- **Acceptance Criteria Addressed**: AC-7, AC-12 (AC-12 rubric scored here)
- **Test Requirements**:
  - `rule` TR-11.1: With no OPENAI_API_KEY, Run shows Alert "Missing OpenAI API key" (or plain-language variant)
  - `rule` TR-11.2: Engine simulation that injects "MAYBE" AI output produces an error step without throwing uncaught
  - `rubric` TR-11.3: Message clarity and coverage; scale 1-5; threshold >=4 per AC-12; evidence: screenshots/messages list

## Task 12: Execution history (local list of past runs)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 8
- **Description**:
  - After a run finishes (success or error), append result with runId + timestamp + graph snapshot (or ref) to localStorage key `visual-ai-workflow:history`
  - Add a "Runs History" tab in right panel alongside Logs
  - Click a past run → load its step log into the logs viewer
- **Acceptance Criteria Addressed**: FR-30
- **Test Requirements**:
  - `rule` TR-12.1: After 2 completed runs, history list contains 2 entries with unique runIds
  - `rule` TR-12.2: Clicking a history entry loads its steps into logs view without page error

## Task 13: Animated active edges + enhanced node styling
- **Status**: `pending`
- **Priority**: low
- **Depends On**: Task 8
- **Description**:
  - Custom edge component or edgeOptions with `animated: true` for edges present in `steps[].branch` path
  - YES edges green palette, NO edges red palette
  - Add Badge on node per state (Running/Completed/Failed) using shadcn Badge
- **Acceptance Criteria Addressed**: FR-27, FR-29
- **Test Requirements**:
  - `rule` TR-13.1: Traveled edges have animated class/prop during and after run
  - `rule` TR-13.2: DecisionNode renders YES handle with visually distinct green color, NO with red

## Task 14: README documentation + smoke tests + final build/typecheck/lint pass
- **Status**: `pending`
- **Priority**: high
- **Depends On**: All tasks
- **Description**:
  - Write/Update `README.md` with:
    - Project overview
    - Installation: `npm install`
    - Env vars: copy `.env.example` to `.env` fill values
    - Run Next.js: `npm run dev` → http://localhost:3000
    - Run Inngest dev: separate terminal `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`
    - Workflow system explanation: nodes, prompts, YES/NO branches, Inngest steps
    - How to create & execute a workflow
  - Run `npm run build` and fix any remaining TS/build errors
  - Run `npx tsc --noEmit`; run `npm run lint` if configured
  - Manual smoke tests:
    1. App boots → blank editor appears, Add Node button works
    2. Create 3-node graph → run → logs appear, nodes colorize
    3. Export → clear → import → graph restores
  - Ensure no secrets in repo (`.env` git-ignored); double-check `.env.example` no real keys
- **Acceptance Criteria Addressed**: AC-1, AC-5, AC-9, AC-10, AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-14.1: `npm run build` exits 0 with 0 TS errors
  - `rule` TR-14.2: README contains headings for Installation, Env Vars, Start Next, Start Inngest, How Workflows Work, Create & Execute
  - `rule` TR-14.3: `.gitignore` includes `.env*` patterns except `.env.example`; repo contains no hardcoded sk-... keys (grep the tree)
  - `rubric` TR-14.4: Architecture quality; scale 1-5; threshold >=4 per AC-11; evidence: file tree + representative files
