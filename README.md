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
