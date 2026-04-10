# Research: Account deletion in finance apps

Date: 2026-04-10
Related: TREK-71 / EPIC-9

## Summary

Researched account deletion patterns across YNAB, Monarch Money,
Lunch Money, Actual Budget, and SaaS apps (GitHub, Notion, Twitter)
before implementing the grace period deletion flow.

## GDPR Article 17

- Right to erasure: must respond within 1 month
- Can extend by 2 months for complex requests
- Must delete from active DB, backups, and sub-processors
- Exception: can retain billing/tax records for 7 years under
  national tax law (legal obligation basis)
- Must inform the data subject which data is retained and why
- Sub-processors (PostHog, email provider) must also delete

## How finance apps handle deletion

- **YNAB:** Cancellation and deletion are separate actions.
  Data retained 12 months after cancellation. Explicit delete
  removes everything immediately. No grace period.
- **Monarch Money:** Immediate irreversible delete via Settings.
  No grace period. Cannot be recovered even by support.
- **Lunch Money:** Full account deletion via support contact,
  not self-serve in-app.
- **Actual Budget:** Self-hosted, user owns the data. No vendor
  deletion concern.

## Industry grace period standards

| Platform  | Grace Period | Recovery               |
| --------- | ------------ | ---------------------- |
| GitHub    | 30 days      | Contact support        |
| Notion    | 30 days      | Contact support        |
| Twitter/X | 30 days      | Log in to cancel       |
| Atlassian | 14 + 30 days | No recovery after 30d  |
| Linear    | 30 days      | No self-serve recovery |

## Community pain points

- YNAB: confusion between "cancel subscription" and "delete account"
- Monarch: no grace period, all-or-nothing with no undo
- No export prompt before deletion (common across apps)
- Unclear what gets deleted vs retained
- No confirmation email on initiation (catches unauthorized deletes)
- Irreversible without grace period
- Billing continues after "deletion" for App Store subscribers

## Community wishlist

- Export prompt before deletion (proactive, not buried)
- Grace period of 14-30 days with easy cancellation
- Confirmation email at initiation and completion
- Clear countdown: "deleted on {date}"
- Summary of what gets deleted vs retained (tax records exception)
- No marketing emails after deletion

## Security considerations

- Type-to-confirm (type email/DELETE) is more effective than modal
  clicks — breaks auto-pilot confirmation
- Out-of-band email on initiation catches unauthorized attempts
- Re-authentication via password is baseline; email confirmation
  is stronger
- Log initiation with IP, user agent, timestamp for audit trail
- Apple/Google require in-app deletion (not support-only)

## Dark patterns to avoid

- Confirmshaming ("I don't want to save money")
- Forcing phone call or support chat to delete
- Deactivation presented as deletion
- Deletion button initiating a retention flow
- Deletion maze (buried 5-6 levels deep)
