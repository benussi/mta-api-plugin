# Building your own plugin: a framework

The MTA plugin in this repository is one instance of a pattern. This guide is for the customer engineer (or platform engineer, or anyone running developer experience) who wants to spot the next instance of that pattern in their own organisation, scope it, and build it.

## Why MTA was the example

Two reasons MTA earned the slot, both relevant to the choice you'll make for your own customer.

The first is enterprise relevance. The feeds are open: no API key, no partnership contract, no per-call billing. The consumers are enterprise teams. Airlines telling a landed passenger which train to catch from JFK. Hotels surfacing arrival directions to a guest. Ride-share platforms routing pickups near subway entrances. Real-estate apps showing transit access for a listing. The MTA API is not a hobbyist toy. It is the integration layer those teams already depend on, even if they have not yet wired it into a Claude Code plugin.

The second is that MTA is a deliberately harder demonstration case than the obvious alternatives. Most other enterprise APIs already have official Claude Code plugins: Stripe, Twilio, Datadog, GitHub, Salesforce, Atlassian, Snowflake. MTA does not. The MTA documentation page checks request headers, so anything that does not look like a real browser receives a 403. The list of which subway lines map to which feed URL is not published in any structured form. The endpoints have two probe-discovered gotchas (HEAD returns 403 even when GET on the same URL works, and the path must contain `%2F` not `/`). If the framework holds up on this case, it holds up on the easier ones.

## The three questions

The framework is three questions. Walk a team and ask them in order.

The first question is about toil. What repetitive task is stealing time from higher-value work? Look for the activity that engineers do over and over without it feeling like real engineering. For the MTA platform engineer, the toil was answering the same integration questions over and over. For a customer-engineering team, it might be the same compliance audit step before every release. For a developer-advocacy team, the same Slack channel question. The toil is the candidate workload for the plugin to absorb.

The second question is about signal. What are you missing because you are too busy answering questions to think about the pattern? When you are heads-down on toil you cannot see what the toil is telling you about the underlying system. For the MTA, no structured view of which parts of the API were actually confusing developers. For a compliance team, no structured view of which checks the team consistently fails. For developer advocacy, no view of which docs paragraph causes the same Slack question every week. The signal is the data the plugin should capture as a side-effect of doing the work.

The third question is about outcome. What would change if you solved both at once? Self-service for the developer, structured signal for the team. For the MTA: faster integration, fewer interruptions, prioritised API improvements informed by actual usage, the platform engineer's time back. For each candidate you walk, you should be able to write down the outcome plainly. If you cannot, the plugin is not worth building.

## Designing the plugin

Once the three questions resolve, the design work is straightforward and the shape is consistent.

The agent does the work that previously required a human. The agent prompt should be specific: what to look for in the user's request, what reference material to call, what to surface before the user asks. For MTA, the agent identifies the feed group, calls the MCP server for the spec, and generates code with the relevant gotchas pre-handled.

The skill validates and captures. The validation rules live in one place (in this repository, in `registry.js`, alongside the curated registry) and the skill pulls them through the MCP server so the agent and the skill share one source of truth. The feedback step inside the skill writes structured JSON the moment the developer's review is complete, before they navigate away.

The MCP server is the connective tissue. Live-fetches whatever the upstream system publishes in machine-readable form. Curated entries for whatever it does not. The split should be honest, labelled in the code, not hidden. For MTA, the live side is the GitHub documentation repository and the proto specification file. The curated side is the feed-group catalogue (because MTA does not publish it in structured form) and the eight best-practices rules (because they came out of probing the endpoints rather than reading any documentation).

The slash commands are the entry points for users who want to invoke the skill directly without going through the agent. `/mta-validate` for code-paste-and-check. `/mta-feedback` for standalone feedback submission.

That is the whole shape. Agent for the work. Skill for the rules. MCP server for the data. Slash commands for the entry points. Adapt the names and the rules. Keep the shape.

## Measuring impact

Before building, do the maths. The number gives you a business case to defend the investment and a metric to measure success against afterwards.

For the MTA plugin: fifteen minutes per integration question, twenty-five teams using the plugin twice a week, eighty percent deflection from the human. That is twelve and a half hours of platform engineer time reclaimed every week. Twenty-six full working days per year.

Adapt to your customer's case. How many times per week does the toil happen? How long is one instance? How many people across how many teams hit it? If the plugin cuts that by eighty percent, what is the value of the reclaimed time? Write the number down. After the plugin ships, measure invocations per week and compare.

## The long arc: dreaming-based rule extraction

The first version of any plugin like this has its rule set written by the platform engineer who suffered through the underlying API first-hand. That is fine and is the right way to bootstrap. It is not where the plugin should stay.

Wire the captured feedback to a Claude Managed Agent with dreaming enabled. As feedback accumulates, the agent extracts patterns on whatever cadence makes sense. Something like: eight developers in two weeks confused `feed_id` with `feed_group_name`. That pattern becomes a candidate validation rule automatically. The platform engineer reviews the candidates monthly and either accepts them as new rules or addresses the root cause in the documentation.

This is the long arc. The plugin captures friction. Dreaming extracts patterns. The platform engineer fixes either the API, the documentation, or the plugin's ruleset. The plugin gets smarter without anyone writing new code. The signal compounds because every developer's session adds to the corpus, and the platform engineer's intervention is now monthly and pattern-level rather than per-question.

In production this is the bit that justifies the plugin existing beyond month three. Without dreaming, the plugin is a useful but static resource. With dreaming, the plugin is an asset that gets better the more it is used.

## What is in this repository that is skeleton today

Two pieces of the production shape are skeletons here. Both are wired up in the right shape for a customer to extend, not absent.

The feedback collection sink. The `/mta-feedback` command writes structured JSON to a local `feedback/` directory. In production this writes to your internal feedback endpoint: Linear, an internal API, a Claude Managed Agents queue. The JSON shape is already designed for that handoff.

The dreaming-based rule extraction described above. The validation rules are pulled live by the skill via the MCP server, so the integration point for a dreaming-extracted rule already exists. The missing piece is the managed-agent pipeline that does the extraction.

These are deliberate. The plugin demonstrates the pattern. The customer wires it to the production substrate that already exists in their environment.

## Distribution

When the plugin is ready, distribution is whatever channel your developers already use. Internal documentation portal. Slack. Package manager. A GitHub link in the engineering onboarding doc. The install instructions in the README of this repository are the on-ramp. The plugin itself just needs to work cleanly when developers follow them.
