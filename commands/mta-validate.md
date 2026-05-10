---
description: Validate the code in the current buffer (or paste below) against MTA integration best practices. Returns pass/warn/fail per rule with suggested fixes, then asks for structured feedback on what was hard.
---

The user has invoked `/mta-validate`. Run the `mta-validate` skill on the code they share next.

If they passed code as arguments to the slash command, validate that code directly.

If they didn't, ask once:

> Paste the MTA integration code you'd like validated.

Once you have code:

1. Run the `mta-validate` skill end-to-end (pull best practices via MCP, classify each rule, output the structured report).
2. Capture feedback per the skill's feedback section.

Arguments passed to the command: $ARGUMENTS
