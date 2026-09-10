# Visual AI Workflow System - Product Requirements Document

## Overview
- **Summary**: A visual AI workflow system where each node represents an AI decision step. Users create decision graphs with prompts, send them to an LLM for YES/NO answers, and the workflow traverses the graph via Inngest. The frontend visualizes execution with React Flow.
- **Purpose**: Provide an interactive, visual demonstration of AI-powered decision workflows with durable execution via Inngest.
- **Target Users**: Developers evaluating AI workflow patterns, teams prototyping decision trees with LLM outputs.

## Goals
- Build a fully functional Next.js + TypeScript application from scratch in an empty repository.
- Implement an interactive visual workflow editor using React Flow with YES/NO branching nodes.
- Integrate Inngest for durable workflow execution with each AI decision as a step.
- Integrate OpenAI API server-side only for YES/NO decision responses.
- Provide polished UI with execution visualization, logs panel, save/load, JSON import/export, error handling, and more.
- End-to-end demo-quality: app starts, builds clean, workflows run, UI reflects state.

## Non-Goals
- No user authentication or multi-user system.
- No external database beyond browser localStorage for persistence.
- No production deployment infrastructure or CI/CD configuration.
- No complex node types beyond AI decision nodes (no loops, no data transform, etc.).
- No batching or multi-workflow management dashboard.
- No mobile-specific UI optimization (desktop-first reasonable layout only).

## Background & Context
- Repository starts empty at `c:\Users\XC\Desktop\Visual AI Workflow System`.
- User prefers clean layered Python-style architecture but this project is TypeScript/Next.js; apply analogous cleanliness.
- User expects real system verification (run app, run tests, execute workflows end to end).
- OpenAI key, Inngest event key, and Inngest signing key are provided via environment variables.

## Functional Requirements

### Phase 1 — Project Setup
- **FR-1**: Initialize a clean Next.js app with TypeScript in the empty repository.
- **FR-2**: Install and configure React Flow, Inngest (SDK + dev server integration), OpenAI SDK, shadcn/ui, Tailwind.
- **FR-3**: Create `.env.example` with `OPENAI_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` placeholders.
- **FR-4**: Provide README with install, env vars, Next.js run, Inngest dev server, workflow usage instructions matching real implementation.
- **FR-5**: Inngest serve endpoint configured and reachable in dev; Inngest function registered for workflow execution.

### Phase 2 — Visual Workflow Editor
- **FR-6**: React Flow canvas with pan/zoom controls is visible on the main page.
- **FR-7**: UI control to add a new AI decision node to the canvas.
- **FR-8**: Each decision node displays: editable name, editable prompt, YES output handle, NO output handle, input handle.
- **FR-9**: Users can connect nodes by dragging from YES or NO handle to another node's input.
- **FR-10**: Users can select and delete nodes and edges.
- **FR-11**: Invalid connections are prevented or gracefully handled (e.g., at most one YES out and one NO out per node).
- **FR-12**: Workflow graph state serializable to a clear TS shape (nodes + edges).
- **FR-13**: Workflow persists in browser localStorage and restores on reload.

### Phase 3 — AI + Inngest Execution
- **FR-14**: "Run Workflow" action starts execution by emitting an Inngest event.
- **FR-15**: Inngest workflow function receives event with serialized graph, picks a start node, walks nodes step by step.
- **FR-16**: Each decision is an Inngest step: send the node prompt to OpenAI with instruction to return ONLY YES or NO.
- **FR-17**: AI response is normalized (trim, uppercase) and validated. Non YES/NO responses cause an error state and/or retry rather than corrupting traversal.
- **FR-18**: Engine follows the matching YES/NO edge, records execution history (node id, name, prompt, result, branch, timestamp/order, errors).
- **FR-19**: Engine identifies start node (node with no incoming edges; deterministically handles multi-start edge case).
- **FR-20**: Engine enforces max-step limit to prevent infinite loops and reports error if no outgoing edge for selected branch.
- **FR-21**: OpenAI SDK calls happen server-side only; API key never exposed to browser.
- **FR-22**: Frontend receives and displays execution state/logs updates.

### Phase 4 — Polish (must implement at least 5, prioritizing listed ones)
- **FR-23 (Visual execution state)**: During execution, highlight current node with distinct style; mark completed nodes green; mark failed nodes red; visually distinguish the traveled YES/NO path on edges.
- **FR-24 (Execution logs panel)**: Docked panel shows ordered log entries like "Node A → YES", "Node B → NO", "Workflow completed" with timestamps.
- **FR-25 (Save/load workflows)**: Save the current workflow locally with a name and reload later; user can see saved list and pick one.
- **FR-26 (JSON export/import)**: Export current graph as downloadable JSON; import JSON file to restore graph with validation.
- **FR-27 (Better node styling)**: YES output handle styled green, NO output handle styled red; node bodies show state badges; typography and layout clear.
- **FR-28 (Error handling)**: Understandable user-facing messages for missing API key, invalid AI output, missing outgoing branch, invalid workflow, Inngest failure, network errors.
- **FR-29 (Animated active edges)**: Edges that have been selected during execution get animated styling.
- **FR-30 (Execution history)**: Local list of previous runs so users can inspect earlier execution logs.

### UI/UX
- **FR-31**: Layout roughly matches spec: left control panel, center React Flow, right logs; top bar with "Run Workflow" and title.
- **FR-32**: Use shadcn/ui components where they provide value (buttons, dialogs, alerts, textareas, inputs).

## Non-Functional Requirements
- **NFR-1**: Strictly TypeScript throughout (no `.js`, no `any` in core paths).
- **NFR-2**: `npm run build` succeeds with no TS errors.
- **NFR-3**: Lint passes (or at minimum no blocking diagnostics from GetDiagnostics / tsc --noEmit).
- **NFR-4**: No hardcoded secrets; keys read from env; `.env.example` provided; `.env` git-ignored.
- **NFR-5**: Code separated into UI components, workflow state hooks, API routes, Inngest server function, type definitions.
- **NFR-6**: No unnecessary dependencies (no ORM, no DB, no auth libs).

## Constraints
- **Technical**: Next.js + React + TypeScript; React Flow; Inngest; OpenAI SDK; shadcn/ui; Tailwind; localStorage.
- **Business**: Deliver end-to-end working demo, not a mockup.
- **Dependencies**: Requires user to provide `OPENAI_API_KEY`. Inngest can run in dev mode with `npx inngest-cli@latest dev` which may or may not need keys; use sensible Inngest config compatible with local dev.

## Assumptions
- Inngest dev server + Next.js API route `/api/inngest` is sufficient setup; we use `inngest/client` and `inngest/serve`.
- OpenAI model defaulting to `gpt-3.5-turbo` or `gpt-4o-mini` is acceptable for YES/NO tasks.
- For frontend-to-backend execution state, we can use a simple polling/REST endpoint returning a run id's state stored in-memory server-side (no DB required), or emit via server-sent updates — pick simplest reliable approach.
- Save/Load workflows stores in localStorage with a key like `saved-workflows`.
- Execution history stored in localStorage key like `execution-history`.

## Acceptance Criteria

### AC-1: Project Initialization and Build
- **Type**: `rule`
- **Given**: Repository empty before implementation
- **When**: Run `npm install` then `npm run build`
- **Then**: Build exits with code 0; no TypeScript errors; `.env.example` file exists with required env var names
- **Pass Condition**: Build succeeds; `.env.example` present; README has install/env/run instructions
- **Evidence**: `npm run build` terminal output; file listing of project root

### AC-2: Inngest Endpoint Registered
- **Type**: `rule`
- **Given**: Next.js dev server running (`npm run dev`)
- **When**: `GET /api/inngest` returns a list of registered functions
- **Then**: Response includes exactly one workflow function for AI workflow execution
- **Pass Condition**: Endpoint responds with 2xx and lists the run function
- **Evidence**: HTTP response from Inngest serve endpoint (via curl or fetch test)

### AC-3: Workflow Editor Core Interactions
- **Type**: `rule`
- **Given**: App loaded in browser with blank or restored workflow
- **When**: User (1) clicks Add Node, (2) edits prompt, (3) connects YES from node A to node B, (4) connects NO from node A to node C, (5) refreshes the page
- **Then**: After refresh, nodes A/B/C and the YES/NO edges are restored exactly as saved in localStorage
- **Pass Condition**: Serialized graph after reload matches before reload (by nodes/edges arrays)
- **Evidence**: localStorage dump + snapshot before/after refresh

### AC-4: Connection Validation
- **Type**: `rule`
- **Given**: Node A already has a YES connection to B
- **When**: User attempts to create a second YES connection from A to C
- **Then**: Either the connection is rejected, or the existing YES edge is atomically replaced (no duplicate YES outs); same for NO
- **Pass Condition**: After attempt, A has at most 1 YES and 1 NO outgoing edge
- **Evidence**: Edge list inspection after connection attempt

### AC-5: Full Workflow Execution E2E
- **Type**: `rule`
- **Given**: 3-node graph (A → YES → B, A → NO → C) with valid prompts; API key set
- **When**: User clicks "Run Workflow"
- **Then**: 
  1. Inngest event is sent and the workflow function runs
  2. For each executed node, an AI call happens server-side and returns YES or NO
  3. YES/NO response is validated and normalized
  4. Execution history contains entries in order: node id, branch taken, timestamp
  5. UI highlights completed nodes and the edges taken; logs panel shows progression; final entry "Workflow completed" or error
- **Pass Condition**: Execution completes without uncaught exceptions; final run state has ordered steps; UI state reflects completion
- **Evidence**: Inngest run output (or function run logs); execution history object; UI screenshot showing nodes colored and logs

### AC-6: Graph Traversal Correctness
- **Type**: `rule`
- **Given**: A graph with start node A, YES→B, NO→C, B→YES→D, B→NO→E, C has no outgoing edges; max steps = 100
- **When**: A returns NO on first run; on second run A returns YES and B returns YES
- **Then**: First run executes A→C→complete (2 steps); second run executes A→B→D→complete (3 steps); both runs stop correctly when no outgoing edge on selected branch
- **Pass Condition**: Execution order arrays match exactly expected paths
- **Evidence**: Two run histories compared to expected order

### AC-7: Invalid AI Response Handling
- **Type**: `rule`
- **Given**: AI returns something other than YES/NO (e.g., "MAYBE") for a node
- **When**: Engine processes it
- **Then**: The step errors without corrupting traversal; error is recorded in execution history; user sees an error message in UI
- **Pass Condition**: Execution history contains error entry; workflow run marked errored; no uncaught throw in Next process
- **Evidence**: Execution history entry with error field; UI alert visible

### AC-8: Loop Prevention
- **Type**: `rule`
- **Given**: Graph with A→YES→B, B→YES→A (cycle); max steps limit configured
- **When**: Workflow is run
- **Then**: Execution stops after reaching max steps; records loop error; UI shows failure
- **Pass Condition**: Total steps ≤ maxSteps + 1 and final state = error/loop-detected
- **Evidence**: Step count in final execution result

### AC-9: Export/Import Round Trip
- **Type**: `rule`
- **Given**: A graph with 3 nodes and 2 edges
- **When**: User exports JSON → clears canvas → imports the same JSON
- **Then**: Imported graph nodes and edges exactly match exported (by id + prompt + branch), and canvas renders them
- **Pass Condition**: Deep equality of exported vs imported nodes/edges after stripping volatile UI-only fields like position (or positions preserved)
- **Evidence**: Exported JSON compared to re-imported JSON structure

### AC-10: Visual Execution Polish Active
- **Type**: `rubric`
- **Dimension**: Visual clarity of execution state in the UI
- **Scale**: 1-5
- **Anchors**:
  1 = No visual distinction between completed/current/failed nodes; edges identical
  3 = Nodes colored by state but edges not animated; logs missing timestamps
  5 = Nodes clearly color-coded (current/completed/failed); YES/NO handles visually distinct; traveled edges animated/highlighted; logs show timestamp + step order
- **Pass Threshold**: >= 4
- **Evidence**: UI screenshot during in-progress and completed runs

### AC-11: Code Architecture Quality
- **Type**: `rubric`
- **Dimension**: Separation of concerns, small components, meaningful names
- **Scale**: 1-5
- **Anchors**:
  1 = Everything in one file, any types, global vars
  3 = Some separation but API logic mixed with UI; a few `any`
  5 = Clean layers (types → state → engine → server route → inngest → UI components), no core `any`, reusable component per concern
- **Pass Threshold**: >= 4
- **Evidence**: File tree + representative code samples

### AC-12: Error Messages Understandable
- **Type**: `rubric`
- **Dimension**: User-facing error message clarity and coverage of failure modes
- **Scale**: 1-5
- **Anchors**:
  1 = Raw stack traces thrown to user, no toast/alerts
  3 = Alerts for some errors but missing missing-key and invalid-workflow
  5 = Dedicated alerts for missing API key, invalid AI output, missing branch, invalid graph, Inngest/network errors, all in plain language
- **Pass Threshold**: >= 4
- **Evidence**: Trigger each failure mode and screenshot/read the UI message

## Open Questions
- [ ] None currently; all open points resolved via assumptions above.
