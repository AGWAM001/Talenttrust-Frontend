#519 Memoize contracts rendering to avoid re-renders on unrelated state
Repo Avatar
Talenttrust/Talenttrust-Frontend
Reduce contracts re-renders
Description
The contracts view re-renders on unrelated state changes, hurting responsiveness on larger data sets. This issue memoizes the expensive parts.

Requirements and context
Repository scope: Talenttrust/Talenttrust-Frontend only.
Memoize the derived contracts data and row rendering so unrelated state changes do not re-render it.
Behaviour and output unchanged; verified by tests.
No new dependencies.
Suggested execution
Fork the repo and create a branch
git checkout -b refactor/contracts-01-memoize
Implement changes
Write code in: the relevant module.
Write comprehensive tests in: cover the new behaviour and edge cases.
Test and commit
Test and commit
Run npm run lint, npm test, and npm run build.
Cover edge cases: large data set, filter change still updates.
Include the full test output in the PR description.
Example commit message
refactor(contracts): memoize rendering

Guidelines
Minimum 95 percent test coverage for impacted modules.
Clear, reviewer-focused documentation.
Timeframe: 96 hours.
Community & contribution rewards
💬 Join the TalentTrust community on Discord: https://discord.gg/WqnGpcPx
⭐ This is a GrantFox OSS / Official Campaign task and may be rewarded. When your PR is merged you'll be prompted to rate the project — a 5-star rating is much appreciated.

