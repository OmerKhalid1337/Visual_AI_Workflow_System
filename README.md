# 🤖 Visual AI Workflow System

> A visual, node-based AI decision workflow engine powered by **React Flow**, **Inngest**, and **OpenAI**. Design branching AI pipelines in a drag-and-drop canvas, then execute them in real time — each node sends its prompt to an LLM and routes execution based on a `YES` or `NO` decision.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![React Flow](https://img.shields.io/badge/React%20Flow-12-purple?logo=react)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai)
![Inngest](https://img.shields.io/badge/Inngest-Event%20Driven-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

---

## ✨ Features

- **Visual Drag-and-Drop Editor** — Build AI decision workflows on an infinite canvas using React Flow
- **YES / NO Branching** — Each node sends its prompt to GPT-4o-mini and routes execution along the matching branch
- **Real-Time Execution Visualisation** — Watch nodes light up (running → completed / failed) as the workflow executes live
- **Step Reasoning Panel** — See the model's reasoning, decision, and duration for every executed step
- **Execution History** — Browse and replay past workflow runs stored in your browser
- **Save / Load Workflows** — Persist named workflows to `localStorage` and reload them any time
- **JSON Import / Export** — Share or version-control your workflow graph as a JSON file
- **Pre-built Templates** — Three ready-to-run example workflows (Customer Support Triage, Lead Qualifier, Bug Severity Classifier)
- **Inngest Integration** — Optional durable step execution with automatic retries; falls back to direct execution if Inngest is not configured
- **Robust Validation** — Catch empty prompts, dangling edges, duplicate branches, and missing start nodes before running

---

## 🖥️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Visual Editor | React Flow (`@xyflow/react`) |
| UI Components | shadcn/ui + Tailwind CSS |
| AI Integration | OpenAI SDK (`gpt-4o-mini`, structured JSON outputs) |
| Workflow Engine | Inngest (event-driven durable functions) |
| State | React hooks + `localStorage` |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `>= 18.x` — [Download](https://nodejs.org/)
- **npm** `>= 9.x` (included with Node.js)
- An **OpenAI API key** — [Get one here](https://platform.openai.com/api-keys) ← **Required to execute workflows**

---

### 1. Clone the Repository

```bash
git clone https://github.com/OmerKhalid1337/Visual_AI_Workflow_System.git
cd Visual_AI_Workflow_System
```

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. ⚠️ Configure Environment Variables (REQUIRED)

> **The app will not execute any AI workflow without a valid OpenAI API key.**

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Then open `.env.local` and set your keys:

```env
# ─────────────────────────────────────────────────────────────
# REQUIRED — Your OpenAI API key.
# Get one at: https://platform.openai.com/api-keys
# The app uses gpt-4o-mini for cost-efficient YES/NO decisions.
# ─────────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...your-key-here...

# ─────────────────────────────────────────────────────────────
# OPTIONAL — Inngest keys for durable/queued execution.
# Leave blank to use direct in-process execution instead.
# Only needed if you run the Inngest Dev Server (see below).
# Get keys from: https://app.inngest.com
# ─────────────────────────────────────────────────────────────
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

> **Security note:** `.env.local` is listed in `.gitignore` and will **never** be committed to Git. Your API key is only ever read server-side — it is never exposed to the browser.

---

### 4. Run the Development Server

```bash
npm run dev
```

Open your browser at **[http://localhost:3000](http://localhost:3000)**.

That's it — you're ready to design and run AI workflows! 🎉

---

## 🔌 Optional: Inngest Dev Server (Durable Execution)

By default the app executes workflows **directly** in the Next.js process. If you want **durable, retryable, queued** execution via Inngest:

**1. Start the Inngest Dev Server** (in a separate terminal):
```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

**2. Add your Inngest keys** to `.env.local` (from [app.inngest.com](https://app.inngest.com)):
```env
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
```

**3. Restart** `npm run dev`.

> When Inngest keys are present, the app automatically sends the workflow event to Inngest. If they are missing or the send fails, the app transparently falls back to direct execution — so everything still works without Inngest configured.

---

## 🗺️ How to Use the App

### Building a Workflow

1. **Add a node** — Click **+ Add Node** in the left sidebar or load one of the pre-built templates.
2. **Edit the node** — Give it a meaningful title and write the **LLM decision prompt**. The prompt must be phrased as a yes/no question (e.g. *"Is this a customer support inquiry?"*).
3. **Connect nodes** — Drag from the green **YES** handle or red **NO** handle at the bottom of a node to the input handle (top) of the next node.
4. **Repeat** — Add as many branching steps as needed. A node with no outgoing edge on a branch is a terminal (end) node for that path.

### Running a Workflow

1. Click **▶ Run Workflow** in the top-right header.
2. Watch nodes animate in real time: amber pulsing = running, green = completed, red = failed.
3. The **Execution Panel** on the right shows each step's decision, AI reasoning, and duration.

### Saving & Loading

- **Save** — Click **Save Workflow**, give it a name; it persists to `localStorage`.
- **Load** — Select from your saved list in the sidebar.
- **Export JSON** — Download the graph as a `.json` file to share or back up.
- **Import JSON** — Load a previously exported workflow file.

---

## 🏗️ Architecture

```
React Flow Canvas (browser)
       │
       │  POST /api/workflow/start  (graph JSON)
       ▼
Next.js API Route  ──► validates graph ──► creates runId
       │
       ├─ [Inngest available] ──► inngest.send("ai/workflow.start")
       │                               │
       │                               ▼
       │                     Inngest Function: aiWorkflowExecute
       │                               │
       └─ [fallback] ──► executeWorkflowDirect()
                                       │
                              For each node in graph:
                                       │
                              callOpenAIDecision(prompt)
                              (gpt-4o-mini · structured JSON output)
                                       │
                              decision: "YES" | "NO" + reasoning
                                       │
                              follow matching edge → next node
                                       │
                              runStore.set(runId, state)   ← server-side Map
                                       │
       Browser polls GET /api/workflow/runs/:id  (every 600ms)
       └─► Updates node colours + Execution Panel in real time
```

---

## 📁 Project Structure

```
├── app/
│   ├── page.tsx                    # Main application page
│   ├── layout.tsx                  # Root layout + Toaster
│   ├── globals.css
│   └── api/
│       ├── inngest/route.ts        # Inngest webhook endpoint
│       └── workflow/
│           ├── start/route.ts      # POST — start a workflow run
│           └── runs/[runId]/       # GET  — poll run status
├── components/
│   ├── workflow/
│   │   ├── DecisionNode.tsx        # Custom React Flow node component
│   │   ├── WorkflowEditor.tsx      # React Flow canvas wrapper
│   │   ├── WorkflowControls.tsx    # Left sidebar (add, save, templates…)
│   │   ├── ExecutionPanel.tsx      # Right sidebar (steps, history)
│   │   └── Icons.tsx
│   └── ui/                         # shadcn/ui components
├── hooks/
│   ├── useWorkflow.ts              # Core graph state management hook
│   └── use-toast.ts
├── inngest/
│   ├── client.ts                   # Inngest client instance
│   └── functions.ts                # aiWorkflowExecute durable function
├── lib/
│   ├── ai.ts                       # OpenAI callOpenAIDecision()
│   ├── runStore.ts                 # In-memory run state store
│   ├── workflow-helpers.ts         # Validation, templates, graph utils
│   └── utils.ts
├── types/
│   └── workflow.ts                 # Shared TypeScript types
├── .env.example                    # ← Copy this to .env.local and fill in keys
└── README.md
```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ **Yes** | Your OpenAI secret key. Read server-side only, never sent to the browser. |
| `INNGEST_EVENT_KEY` | ⬜ Optional | Inngest event key for durable execution. App falls back to direct execution if absent. |
| `INNGEST_SIGNING_KEY` | ⬜ Optional | Inngest signing key for webhook verification. |

> ⚠️ **Never commit** your `.env.local` file. It is already in `.gitignore`.

---

## 🛠️ Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server at `http://localhost:3000` |
| `npm run build` | Create an optimised production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint checks |

---

## 🐛 Troubleshooting

### "Missing OpenAI API key" when running a workflow
Make sure you created `.env.local` (not `.env`) and that `OPENAI_API_KEY=sk-...` is set. Restart `npm run dev` after editing the file — Next.js reads env vars only at startup.

### Workflow stays "running" indefinitely
Check your browser's Network tab for errors on `GET /api/workflow/runs/:id`. If the server restarted mid-run the in-memory state is lost; simply run the workflow again.

### "Invalid Workflow" toast on Run
Every node must have a non-empty **Title** and **Prompt**. Use the **Validate** button in the sidebar for a detailed error list before running.

### `cp .env.example .env.local` not available on Windows
Use this PowerShell command instead:
```powershell
Copy-Item .env.example .env.local
```

---

## 📄 License

MIT — feel free to use, modify, and distribute.
