# FIZZL AI Process Agent

Standalone FIZZL portfolio project demonstrating controlled AI business-process automation with human-in-the-loop decision making.

## Workflow
Customer case → AI analysis → knowledge retrieval → decision engine → risk assessment → action planner → safety gate → human review / safe preparation.

## Safety model
- LOW: analysis, retrieval and preparation.
- MEDIUM: commercial actions require human review.
- HIGH: refunds, cancellation, subscription changes and other financial actions are blocked from autonomous execution.
- AI confidence below 0.75 forces human review.
- Demo execution is simulated only; no real customer/account systems are connected.

## Run locally

```bash
npm test
ANTHROPIC_API_KEY=your_key npm start
```

Open `http://localhost:3000`.

## API
`POST /api/process-case` with `{ "message": "..." }`.

`POST /api/approve-action` with `{ "caseId": "CASE-..." }` performs a simulated approval/execution only.

## Render
Use Node 18+ and start command `npm start`. Add `ANTHROPIC_API_KEY` and optionally `ANTHROPIC_MODEL` as environment variables.


## v1.0.1 safety fix

Financial complaint intents such as `klacht_over_onterechte_afschrijving` are treated as HIGH risk.
The LLM may classify the case, but the deterministic Decision Engine controls the risk level and
keeps financial/subscription execution blocked until human review.


## v1.0.2 action-plan metadata fix

High-risk policy checks use the explicit `POLICY_CHECK` action type and
carry the correct HIGH risk, human-review requirement, and REQUIRED status.


## v1.1.0 — Human-friendly workflow UI

The interface now presents the agent workflow in plain Dutch for non-technical users. Technical action types remain available under a collapsible developer section. The UI also shows risk, human approval requirements, execution state, and an audit trail. A1/A2 are marked completed after processing so the displayed workflow matches the actual case state.


## v1.2.0 — Human approval & audit trail

The demo now records who approved a high-risk case and why. The UI asks for a reviewer name and approval reason before the simulated execution gate can be opened. No real financial or subscription action is executed.
