Test reputation states
Description
reputation's state transitions (loading->success/empty/error) aren't fully tested. This issue adds coverage.

Requirements and context
Repository scope: Talenttrust/Talenttrust-Frontend only.
Add tests asserting reputation renders the right UI for loading, empty, error, and success, and transitions correctly.
Deterministic; mutually-exclusive states.
Do not change behaviour unless a defect is found.
Suggested execution
Fork the repo and create a branch
git checkout -b test/reputation-51-states
Implement changes
Write code in: the relevant module.
Write comprehensive tests in: cover the new behaviour and edge cases.
Test and commit
Test and commit
Run npm run lint, npm test, and npm run build.
Cover edge cases: loading, empty, error, success exclusivity.
Include the full test output in the PR description.
Example commit message
test(reputation): cover state transitions

Guidelines
Minimum 95 percent test coverage for impacted modules.
Clear, reviewer-focused documentation.