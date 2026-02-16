# ADR 0014: Dashboard Charts via Recharts

Date: 2026-02-15
Status: Accepted

## Context

The MVP dashboard needs charts for spending, cash flow, and debt payoff projections. We already use shadcn-style UI components and want a lightweight charting library.

## Decision

- Use Recharts for MVP charts, integrated with shadcn styling.
- Start with three core charts: category spend, cash flow over time, and debt payoff projection.

## Alternatives Considered

- Chart.js
- ECharts
- D3 custom charts

## Consequences

- Positive: Quick implementation with a React-native charting API.
- Negative: Recharts customization limits may require extra work for advanced visuals.
- Follow-ups: Evaluate chart performance and theme integration once dashboard usage grows.
