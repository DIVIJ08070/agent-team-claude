# 🤖 Agent Team

An autonomous software team that runs inside **Claude Code**. You hand it a PRD
(or plain context, or a Figma design) with one command — a Manager agent
analyzes it, splits it into typed tasks, and assigns them to specialist agents
who coordinate through a per-feature mapping file and report progress to your
**Telegram group** as five distinct bots.

```
                       YOU  (chat / Telegram)
                        │
                ┌───────▼────────┐
                │ 🧑‍💼 MANAGER    │   ← the /feature-dev command
                │ ├─ 📐 Architect (internal sub-agent → SPEC.md)
                │ └─ 📚 Documentation (internal sub-agent → docs)
                └───┬───────┬────┘
                    │       │
      ┌─────────────▼─┐   ┌─▼──────────┐   ┌──────────────┐
      │ 🎨 DESIGNER   │   │ 👨‍💻 DEVELOPER│   │ 🧪 QA        │
      │ DESIGN tasks  │   │ UI/BACKEND │   │ UI: Playwright│
      │ → DESIGN_SPEC │   │ + FIX      │   │  ss vs Figma  │
      └───────────────┘   │ └─ DevOps  │   │ BACKEND: PRD- │
                          │   (deploy) │   │  derived tests│
                          └────────────┘   └──────────────┘
                    ┌──────────────────────────┐
                    │ 📝 SCRIBE (observer)     │
                    │ → PROJECT_STATE.md       │
                    └──────────────────────────┘
```

## How it works

1. **You run** `/feature-dev docs/sample-prd.md` (optionally add a Figma URL).
2. **Manager** analyzes the input. Anything ambiguous → it asks *you* instead of
   guessing. Its internal **Architect** writes `features/<name>/SPEC.md` (stack,
   folder layout, exact API contracts, data model).
3. **Manager** creates `features/<name>/MAPPING.md` — **the communication bus**.
   Tasks are typed `DESIGN` / `UI` / `BACKEND` and assigned by skill. Agents are
   dispatched with just the mapping path + task ID; they read all context from
   the file and write results back into it. No agent relies on chat memory, so
   you can kill the session and resume the feature later.
4. **Designer** produces `DESIGN_SPEC.md` (exact tokens, states, breakpoints)
   from Figma when linked. **Developer** implements from the spec + design
   handoff, self-verifies, commits.
5. **QA** routes itself by task type:
   - `DESIGN` → spec review: verifies DESIGN_SPEC.md covers every PRD UI
     requirement, values are exact, contrast ratios pass — before any code
     depends on it.
   - `UI` → runs the app, captures **Playwright screenshots** at 375/768/1280 +
     interaction states, compares against **Figma via the Figma MCP** (or the
     design spec as fallback), plus an accessibility pass.
   - `BACKEND` → derives test cases **from the PRD before reading the code**,
     automates them, executes, and saves the results as evidence.
6. `QA_FAILED` → the agent whose artifact the bug is against (Developer for
   code, Designer for design-spec bugs) gets FIX mode → back to QA. After
   **3** failed cycles the Manager escalates to you. Only when **every** task is `QA_PASSED`
   does the Manager write the Final Summary (and deploy, if you asked).
7. **Scribe** keeps `PROJECT_STATE.md` under 100 lines the whole time — the
   team's persistent memory across sessions.

### Guardrails baked in

- QA can never be skipped; a verdict without evidence files is invalid.
- No agent verifies its own work — fixes always return to QA.
- Max 3 dev↔QA cycles per task, then human escalation.
- Spec ambiguity is escalated, never guessed.

## Repo layout

```
.claude/
├── commands/feature-dev.md        ← the /feature-dev command (Manager)
├── agents/
│   ├── designer.md  developer.md  qa.md  scribe.md      ← public team
│   └── architect.md documentation.md                    ← Manager's internal sub-agents
├── skills/                        ← each agent's separated skill set (tune here!)
│   ├── manager-skills/SKILL.md
│   ├── designer-skills/SKILL.md
│   ├── developer-skills/SKILL.md
│   ├── qa-ui-skills/SKILL.md
│   └── qa-backend-skills/SKILL.md
└── scripts/
    ├── telegram.sh                ← posts as 5 different bots
    └── telegram.env.example       ← copy to telegram.env, add tokens

features/
└── _template/MAPPING.md           ← per-feature communication bus template
docs/sample-prd.md                 ← test PRD (URL shortener w/ real UI + backend)
PROJECT_STATE.md                   ← Scribe-maintained team memory
```

## Setup

### 1. Requirements

- [Claude Code](https://claude.com/claude-code) installed and signed in.
- Node.js ≥ 18 (for the apps the team builds + Playwright screenshots).
- `git`, `curl`.

### 2. Telegram (optional but the fun part)

Everything works without Telegram — the script silently no-ops when
unconfigured. To watch the team talk:

1. In Telegram, message **@BotFather** → `/newbot` — repeat **5×** (manager,
   designer, developer, qa, scribe). Save each token.
2. Create a group; add all 5 bots.
3. Get the group chat id: temporarily add **@RawDataBot**, copy the `chat.id`
   (negative number), remove it.
4. `cp .claude/scripts/telegram.env.example .claude/scripts/telegram.env` and
   fill in the tokens + chat id. (`telegram.env` is gitignored.)
5. Test: `bash .claude/scripts/telegram.sh manager 'hello team'` — the message
   should appear in your group.

### 3. Figma MCP (optional — powers real design comparison)

For Figma-sourced design specs and QA screenshot-vs-Figma comparison, add the
Figma MCP server to Claude Code (see Figma's current **Dev Mode MCP server**
instructions — the exact command changes; typically
`claude mcp add --transport http figma <figma-mcp-url>` or their desktop-app
local server). Then always pass your Figma link to `/feature-dev`. Without it,
the designer derives specs from the PRD and QA compares against the spec —
still fully functional.

### 4. Run it

```bash
cd agent-team          # or copy .claude/ + features/_template/ into your own project
claude
```

Then inside Claude Code:

```
/feature-dev docs/sample-prd.md
```

or with a design:

```
/feature-dev path/to/your-prd.md https://www.figma.com/design/…
```

or fully inline:

```
/feature-dev build a pomodoro timer web app with a stats page
```

Watch your Telegram group: 🧑‍💼 posts the plan, 🎨 the design handoff, 👨‍💻 the
commits, 🧪 the verdicts and bugs, 📝 the digests — and you only get pinged for
decisions when the team is genuinely stuck.

## Tuning the team

Every behavior lives in a markdown file — no code:

| Want to change… | Edit |
|---|---|
| How tasks are divided/assigned, cycle limits | `.claude/skills/manager-skills/SKILL.md` |
| Design spec format, Figma extraction | `.claude/skills/designer-skills/SKILL.md` |
| Coding conventions, commit style, deploy ladder | `.claude/skills/developer-skills/SKILL.md` |
| Screenshot viewports, comparison strictness | `.claude/skills/qa-ui-skills/SKILL.md` |
| Test-case rigor, evidence rules | `.claude/skills/qa-backend-skills/SKILL.md` |
| The state file format / memory size | `.claude/agents/scribe.md` |
| Task board columns, statuses | `features/_template/MAPPING.md` |

## FAQ

**Where does the app code go?** In the repo root (per `SPEC.md`'s folder
layout). `features/<name>/` holds only coordination artifacts — mapping, spec,
design spec, QA evidence.

**Can I resume a feature tomorrow?** Yes — state lives in `MAPPING.md` +
`PROJECT_STATE.md`, not in chat. Start a new session and run
`/feature-dev features/<name>/MAPPING.md` — the Manager reads the board and
continues from where it stopped.

**Why one command instead of five separate bots with API keys?** Claude Code
*is* the orchestrator: the main session plays Manager and spawns the others as
subagents. Telegram is a notification layer, not the transport — which is also
why the bots don't need to read each other's messages.
