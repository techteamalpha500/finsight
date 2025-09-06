## toimplement: User-driven Monthly Expense for Stress Check

- Allow users to input their actual monthly expense in onboarding or settings.
- Use this value for stress check calculations (liquid coverage months).
- If not provided, fallback to a reasonable default (e.g., 3% of portfolio per year), but this logic should be removed for now.
- Remove the current fixed monthly expense estimate from the stress check calculation until user input is implemented.


FinSight – Current Implementation Overview (planenhancement)

This document captures what is implemented across frontend, backend, APIs, infra, data models, and UX flows as of now. It is designed to bootstrap another AI/developer to continue seamlessly.

1) High-level Architecture

- Frontend: Next.js 15 (App Router), React 19, Tailwind v4 tokens, Zustand for client state, Chart.js for charting, Amplify Auth (Cognito) for login.
- Backend (serverless web API): Next.js App Routes using AWS SDK (DynamoDB). Additional Python Lambda (expenses & portfolio APIs) wired via API Gateway (Terraform) for external access parity.
- Data: DynamoDB single-table (InvestApp) with GSI1 for flexible queries.
- AI: Groq LLM endpoint used for allocation refinement. Env-driven (GROQ_API_KEY, GROQ_MODEL).

2) Frontend – Routes and Features

2.1 /PortfolioManagement/Plan (Plan builder page)
- Displays current allocation plan. Modes: Advisor (engine/AI) and Custom.
- Plan editing controls:
  - Advisor mode: sliders with guardrails (safe ranges hidden now per request, only “free X%” shown).
  - Custom mode: unconstrained sliders with per-class “free capacity” and optional locks.
- AI toggle (Advisor mode only):
  - POST /api/plan/suggest?debug=1 with questionnaire + goals context + baseline plan.
  - On success: swaps buckets to AI-refined plan and shows rationale summary.
  - Endpoint enhanced to include `goal_context` in response and blend within ±5% per class with comfort clamping.
  - Note: To receive real AI output, set GROQ_API_KEY (and optional GROQ_MODEL). Without it, the endpoint returns 400.
- Answers modal to modify questionnaire inline; recalculates baseline plan.
- Save plan writes canonical + variant snapshots to DynamoDB via /api/portfolio/plan.
- Rebalancing (expandable sections):
  - Computes suggestions via /api/portfolio/rebalance/propose.
  - Accept writes snapshot via /api/portfolio/rebalance/accept.
- Investment Goals button: opens right-side drawer (see GoalsPanel below). Plan remains visible; live preview updates as values change; after Save, shows confirmation with impact.

2.2 PlanSummary component (PortfolioManagement/components/PlanSummary.tsx)
- Allocation table with icons per asset class; shows current % and adjustments.
- Advisor vs Custom UI:
  - Advisor: guardrails enforced internally; safe range text removed per request; “free X%” hint retained.
  - Custom: no guardrails, supports locks and normalization logic.
- KPI blocks, stress test summary, signal analysis, rebalancing suggestions sections.
- Emits callbacks for bucket changes, edit-answers, AI toggle, etc.

2.3 GoalsPanel (right drawer) (PortfolioManagement/components/GoalsPanel.tsx)
- Single-goal quick add/edit form only (no list within drawer):
  - Fields: Goal Type (pre-set/common + custom), Target Amount, Target Date, Priority.
  - Live Preview (desktop left pane): shows updated suggested allocation as user types; the parent Plan page computes `previewPlan` via `buildPlan({...questionnaire, goals:[existing + draft]})`.
  - On Save: persists to localStorage (temporary storage) and fires `onGoalsUpdated` + `goals-updated` event.
  - Confirmation card after save: shows goal summary and impact deltas (e.g., “Equity +3%, Debt –2%”). Buttons for “+ Add Another Goal” and “View All Goals & Insights →”.
  - Drawer backdrop is translucent/blurred; Plan stays visible underneath.
- Props:
  - `baselinePlan`: current plan before changes.
  - `previewPlan`: computed live preview from parent.
  - `onDraftGoalChanged(goal|null)`: parent receives draft updates to compute preview.
  - `onClose`, `onGoalsUpdated`.

2.4 /PortfolioManagement/Goals (Goals Dashboard)
- Purpose: All goals & insights (separate page to avoid cluttering the drawer).
- Current features:
  - Progress tracking per goal: target vs current, % funded, status (Ahead/On Track/Behind).
  - Funding gap advice: computes simple SIP suggestion (remaining/remaining months) and displays plain-language advice.
  - Timeline view: goals sorted by target date.
  - Placeholders (ready to wire):
    - Instruments Contribution (pie/stacked bar per goal from holdings mapping).
    - Impact of Changes (before/after comparisons across allocation/risk profile changes).
- “Add / Edit Goals” button navigates back to Plan drawer (Query param to auto-open is supported).
- Data source: reads localStorage `investmentGoals` (temporary until backend CRUD is integrated).

2.5 /PortfolioManagement/Onboarding (Questionnaire)
- Multi-step questionnaire with ProgressBar and modular QuestionCard components.
- Collects answers for plan computation. Goals context now integrated (read from API or Goals page where applicable).
- Final step triggers allocation engine and navigates to Plan.

2.6 /PortfolioManagement/Dashboard (Mini dashboard)
- Shows donuts/bar comparison between target vs actual (from holdings), KPIs, and rebalancing suggestions.

2.7 /PortfolioManagement/AddHolding (Holdings form/table)
- Add holdings by units/amount; computes invest/current/P&L; table with pagination and class coloring.
- Holdings stored in client state (Zustand) and can be pushed server-side by calling REST routes.

2.8 /login (Auth modal)
- Amplify Auth (Cognito) for signup/login; confirmation modal; responsive UI.

3) Reusable Components / Utilities

- Button, Card, Modal, Navbar, Badge, Progress, Input (updated to use theme tokens: bg-background, border-border, focus ring var(--color-ring); dark mode friendly).
- RiskProfile (investor-friendly and advisor-friendly displays), PlanKPIs.
- useChartTheme (chart color tokens), utils/format (formatCurrency, formatNumber).

4) Client State (Zustand store.ts)

- Persists user preferences, questionnaire, plan snapshots (not persisted by partialize), holdings, budgets, constraints, and cached per-portfolio custom/advisor plans.
- Provides actions for updating questionnaire, plan, holdings, constraints, etc.
- Local persistence key: finsight-v3.

5) Domain Logic (PortfolioManagement/domain)

- allocationEngine.ts: core Advisor engine producing buckets (Stocks, Mutual Funds, Debt, Liquid, Gold, Real Estate), ranges, rationale, signals, stress test, etc.
- riskScoring, goalAnalyzer (used internally by engine), advisorTune, languageTransform (investor/advisor explainers), rebalance and rebalancePropose calculators.

6) API Endpoints (Next.js App Routes)

- /api/portfolio (route.ts)
  - POST: create portfolio item in InvestApp (pk=USER#sub, sk=PORTFOLIO#{id}).
  - GET: list portfolios for user.
- /api/portfolio/plan (route.ts)
  - PUT: save canonical plan (sk=ALLOCATION#pid) and variant snapshot (advisor/custom), with compliance metadata (answersSig, policyVersion). Idempotent when unchanged.
  - GET: fetch plan; supports `?variant=advisor|custom` key selection.
- /api/portfolio/goals (route.ts)
  - GET: list goals (via GSI1), or fetch single.
  - POST/PUT: save goal (sk=GOAL#pid#goalId).
  - DELETE: delete a goal.
- /api/portfolio/constraints (route.ts)
  - GET/PUT: save EF months, short-term liquidity amount/months, notes; used within rebalance proposal.
- /api/portfolio/rebalance/propose (route.ts)
  - POST: composes trades to go from actual→target, respects cashOnly, turnover cap, constraints and goals (blended target from goal horizons and weights).
- /api/portfolio/rebalance/accept (route.ts)
  - POST: saves accepted proposal snapshot under sk=REBALANCE#pid#id.
- /api/plan/suggest (route.ts)
  - POST: calls Groq (if GROQ_API_KEY present) with questionnaire + goals context + baseline bucket ranges.
  - Returns aiPlan (clamped & normalized), rationale, confidence, per_asset_explanations, goal_context.
  - Debug: `?debug=1` includes diag.
- /api/transactions (route.ts)
  - POST: writes TRANSACTION# items; best-effort HOLDING snapshot update (aggregate units/invested, simple heuristic). Returns id.
  - GET: list transactions for portfolio (date filters).
- /api/holdings (route.ts)
  - POST: writes HOLDING# items; GET lists holdings for a portfolio.
- Expense-related routes (under /api/expenses/*, budgets, categories) maintained for the expense tracker feature.

7) Backend Lambda (Python) – expenses-api-py

- Contains endpoints for Expenses, Budgets, Category Rules, and portfolio proxies (create/list portfolios, save/fetch plan, holdings, transactions) mirroring the App Route functionality for external API Gateway access.
- Terraform wires this Lambda to API Gateway; IAM grants DynamoDB access to Expenses/CategoryRules/UserBudgets/InvestApp.

8) Infrastructure (Terraform)

- DynamoDB tables: Expenses, CategoryRules, UserBudgets, InvestApp (pk/sk, GSI1PK/GSI1SK).
- Lambda packaging and API Gateway (HTTP API) with optional JWT authorizer (Cognito) if user pool and audiences provided.
- IAM roles/policies for Lambda and app role.

9) Auth

- Frontend: Amplify Auth (Cognito) for login/signup/confirm. Token verification in App Routes via aws-jwt-verify.
- Dev mode: if COGNITO_USER_POOL_ID not provided or token missing, `getUserSubFromJwt` returns "dev-user" (non-production only).

10) Theming and UX

- Tailwind tokens: bg-background, text-foreground, border-border, ring var(--color-ring), dark mode variants.
- Input component updated to theme tokens; drawer UI polished to avoid black-out; Plan remains visible beneath.
- Advisor view ranges hidden; kept helpful “free X%” hints.

11) Data Models (effective shapes)

- Plan (advisor/custom)
  {
    riskLevel: string,
    buckets: Array<{ class: "Stocks"|"Mutual Funds"|"Debt"|"Liquid"|"Gold"|"Real Estate", pct: number, range?: [number,number] }>,
    origin?: 'engine'|'ai'|'custom',
    answersSig?: string,
    answersSnapshot?: Record<string,any>,
    policyVersion?: string,
    rationale?: string|string[],
    signals?: any[],
    stressTest?: any
  }

- Goal (localStorage temporary)
  {
    id: string,
    name: string,
    category?: string,
    targetAmount: number,
    targetDate: string|Date,
    priority: 'low'|'medium'|'high',
    currentProgress: number,
    isActive: boolean,
    createdAt: string|Date
  }

- Holding (client state)
  { id, instrumentClass, name, symbol?, units?, price?, investedAmount?, currentValue? }

- Constraint
  { efMonths?: number, liquidityAmount?: number, liquidityMonths?: number, notes?: string }

- Rebalance Propose response
  {
    trades: Array<{ class: string, action: 'Increase'|'Reduce', amount: number, actualPct: number, targetPct: number, reason: string }>,
    beforeMix: Record<string, number>, afterMix: Record<string, number>,
    constraints?: { efMonths?: number, liquidityAmount?: number, liquidityMonths?: number },
    goalsCount?: number, blendedTarget?: Record<string, number>,
    turnoverPct?: number, rationale?: string
  }

- Plan Suggest response
  {
    aiPlan: { riskLevel: string, buckets: Array<{ class: AllowedClass, pct: number, range: [number,number] }> },
    rationale?: string, confidence?: number,
    per_asset_explanations?: Record<string,string>,
    goal_context?: { count: number, examples: Array<{name?: string, targetAmount: number, date?: string}> },
    diag?: any
  }

12) Current Behavior Flows

- Investment Goals (drawer) flow:
  1) Click “Investment Goals” on Plan → opens right drawer.
  2) User enters goal fields; drawer emits draft to Plan; Plan computes previewPlan and shows live allocation preview.
  3) Save → persists to localStorage; Plan recalculates final suggested allocation; confirmation card shows summary + impact.
  4) Option to add another goal or open Goals Dashboard.

- Goals Dashboard flow:
  - Lists active goals, progress status and SIP advice; shows a basic timeline. Placeholders for contributions and impact are ready to be wired to real data.

13) Environment & Config

- Required to enable AI:
  - GROQ_API_KEY (string)
  - GROQ_MODEL (e.g., "llama-3.1-8b-instant") optional
- AWS: AWS_REGION, COGNITO_USER_POOL_ID, COGNITO_AUDIENCE (client ID), INVEST_TABLE (“InvestApp”).
- Frontend dev scripts:
  - npm run dev / build / start

14) Known Gaps / Next Steps

- Goals persistence: replace localStorage with DynamoDB via /api/portfolio/goals and wire drawer to CRUD endpoints; add server validation.
- Instruments contribution per goal: derive mapping from holdings to goal buckets; visualize per-goal class contribution (pie/stacked bar).
- Impact of changes: snapshot before/after when risk profile or plan changes and compute differences per goal.
- Plan save policy: reinforce compliance metadata; add audit log for changes.
- AI prompt tuning: expand with constraints and market regimes; allow multi-goal weighting strategy configuration.
- Mobile: ensure drawer and dashboard charting remain ergonomic on small screens (sticky actions, collapsible sections).
- Security: integrate Cognito-protected API calls in the frontend (attach bearer ID token) where applicable.

15) Recent Changes (this sprint)

- PlanSummary: removed safe range text in Advisor; kept free capacity hint.
- GoalsPanel: refactor to single-goal drawer; live preview; confirmation card; dark theme polishing; buttons to Add Another and View All.
- Goals Dashboard: implemented overview, progress tracking, advice, timeline; placeholders for contributions and impact.
- AI suggest endpoint: injected goals into prompt; returns goal_context; blending/clamping maintained; compiled cleanly.
- Input component: themed for dark mode and design tokens.
- Transactions API: adds best-effort holding snapshot updates.
- Goals page redirect previously used is replaced by a proper dashboard now.

This is the authoritative snapshot of the current codebase behavior and endpoints. Continue implementation from sections 14 (Next Steps) to evolve the product.

