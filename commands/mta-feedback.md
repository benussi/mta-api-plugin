---
description: Submit structured feedback to the MTA platform team about your integration experience — what was confusing, what worked, what you had to work around. Used by the platform engineer to prioritize docs and API improvements.
---

The user has invoked `/mta-feedback`. They want to give standalone feedback on their MTA integration experience (not tied to a specific code review).

Prompt them with the three structured questions:

> Quick feedback for the MTA platform team. You can skip any question.
>
> 1. **Missing docs** — What documentation did you wish existed?
> 2. **Behavior mismatch** — Did anything in the API behave differently than the docs suggested?
> 3. **Time sink** — What took longer than it should have?
>
> Optionally:
> 4. Which feed group(s) were you working with? (e.g. subway-ace, lirr, alerts)

Once the user responds, write the feedback to:

```
${CLAUDE_PLUGIN_ROOT}/feedback/<YYYYMMDD-HHMMSS>-<6char-id>.json
```

Schema:

```json
{
  "submitted_at": "ISO-8601 timestamp",
  "developer_team": "internal | external | unknown",
  "feed_group_used": "subway-ace | lirr | ... | unknown",
  "validation_findings": [],
  "open_text": {
    "missing_docs": "verbatim from user",
    "behavior_mismatch": "verbatim from user",
    "time_sink": "verbatim from user"
  },
  "source": "mta-feedback-slash-command"
}
```

**Skeleton note (for the MTA platform engineer reading this):** In production,
replace the local file write with a POST to your internal feedback endpoint
(Linear API, internal feedback queue, or — for the dreaming integration —
push onto a Claude Managed Agents queue so a separate agent can cluster
submissions and surface trends without you reading every one).

Confirm to the user that feedback was captured. Do not echo the raw JSON back at them — just thank them and tell them the platform team uses these to prioritize doc and API improvements.

Arguments passed to the command: $ARGUMENTS
