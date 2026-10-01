---
type: Feature
title: "Add a CSV/JSON export button to contracts"
labels: type:feature, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Export contracts

### Description
Users can't export contracts data. This issue adds a client-side CSV/JSON export of the current view.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Export the currently filtered contracts view as CSV and JSON with safe escaping; trigger a client download.
- Accessible control; no server round-trip.
- Cover escaping, filter-respect, and empty view in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/contracts-51-export`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: escaping, respects filter, empty view.
- Include the full test output in the PR description.

### Example commit message
`feat(contracts): add CSV/JSON export`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add descriptive labels and roles to contracts icon buttons"
labels: type:a11y, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Label contracts icon buttons

### Description
contracts's icon-only buttons lack accessible names. This issue adds labels and correct roles.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Give every icon-only contracts control an accessible name (aria-label) and correct role; no visual change.
- Verify with an a11y check if available.
- Cover accessible names in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/contracts-51-iconlabels`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each icon button has an accessible name.
- Include the full test output in the PR description.

### Example commit message
`a11y(contracts): label icon buttons`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add tests for contracts empty/loading/error state transitions"
labels: type:test, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test contracts states

### Description
contracts's state transitions (loading->success/empty/error) aren't fully tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add tests asserting contracts renders the right UI for loading, empty, error, and success, and transitions correctly.
- Deterministic; mutually-exclusive states.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/contracts-51-states`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loading, empty, error, success exclusivity.
- Include the full test output in the PR description.

### Example commit message
`test(contracts): cover state transitions`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a copy-to-clipboard affordance to contracts identifiers"
labels: type:feature, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Copy contracts ids

### Description
contracts identifiers can't be copied easily. This issue adds a copy control with a toast and fallback.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an accessible copy control for contracts identifiers; Clipboard API with a documented fallback and a toast.
- Keyboard-operable with a clear label.
- Cover success and fallback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/contracts-52-copyid`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success, clipboard-unavailable fallback.
- Include the full test output in the PR description.

### Example commit message
`feat(contracts): add copy-to-clipboard for ids`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a component API reference for contracts"
labels: type:docs, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Reference contracts API

### Description
contracts's component props/API aren't documented. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add a docs entry listing contracts's components, props, and a minimal usage example.
- Keep accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/contracts-51-apiref`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify props against source.
- Include the full test output in the PR description.

### Example commit message
`docs(contracts): add component API reference`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a CSV/JSON export button to milestones"
labels: type:feature, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Export milestones

### Description
Users can't export milestones data. This issue adds a client-side CSV/JSON export of the current view.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Export the currently filtered milestones view as CSV and JSON with safe escaping; trigger a client download.
- Accessible control; no server round-trip.
- Cover escaping, filter-respect, and empty view in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/milestones-51-export`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: escaping, respects filter, empty view.
- Include the full test output in the PR description.

### Example commit message
`feat(milestones): add CSV/JSON export`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add descriptive labels and roles to milestones icon buttons"
labels: type:a11y, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Label milestones icon buttons

### Description
milestones's icon-only buttons lack accessible names. This issue adds labels and correct roles.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Give every icon-only milestones control an accessible name (aria-label) and correct role; no visual change.
- Verify with an a11y check if available.
- Cover accessible names in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/milestones-51-iconlabels`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each icon button has an accessible name.
- Include the full test output in the PR description.

### Example commit message
`a11y(milestones): label icon buttons`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add tests for milestones empty/loading/error state transitions"
labels: type:test, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test milestones states

### Description
milestones's state transitions (loading->success/empty/error) aren't fully tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add tests asserting milestones renders the right UI for loading, empty, error, and success, and transitions correctly.
- Deterministic; mutually-exclusive states.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/milestones-51-states`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loading, empty, error, success exclusivity.
- Include the full test output in the PR description.

### Example commit message
`test(milestones): cover state transitions`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a copy-to-clipboard affordance to milestones identifiers"
labels: type:feature, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Copy milestones ids

### Description
milestones identifiers can't be copied easily. This issue adds a copy control with a toast and fallback.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an accessible copy control for milestones identifiers; Clipboard API with a documented fallback and a toast.
- Keyboard-operable with a clear label.
- Cover success and fallback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/milestones-52-copyid`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success, clipboard-unavailable fallback.
- Include the full test output in the PR description.

### Example commit message
`feat(milestones): add copy-to-clipboard for ids`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a component API reference for milestones"
labels: type:docs, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Reference milestones API

### Description
milestones's component props/API aren't documented. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add a docs entry listing milestones's components, props, and a minimal usage example.
- Keep accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/milestones-51-apiref`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify props against source.
- Include the full test output in the PR description.

### Example commit message
`docs(milestones): add component API reference`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a CSV/JSON export button to reputation"
labels: type:feature, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Export reputation

### Description
Users can't export reputation data. This issue adds a client-side CSV/JSON export of the current view.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Export the currently filtered reputation view as CSV and JSON with safe escaping; trigger a client download.
- Accessible control; no server round-trip.
- Cover escaping, filter-respect, and empty view in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/reputation-51-export`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: escaping, respects filter, empty view.
- Include the full test output in the PR description.

### Example commit message
`feat(reputation): add CSV/JSON export`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add descriptive labels and roles to reputation icon buttons"
labels: type:a11y, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Label reputation icon buttons

### Description
reputation's icon-only buttons lack accessible names. This issue adds labels and correct roles.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Give every icon-only reputation control an accessible name (aria-label) and correct role; no visual change.
- Verify with an a11y check if available.
- Cover accessible names in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/reputation-51-iconlabels`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each icon button has an accessible name.
- Include the full test output in the PR description.

### Example commit message
`a11y(reputation): label icon buttons`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add tests for reputation empty/loading/error state transitions"
labels: type:test, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test reputation states

### Description
reputation's state transitions (loading->success/empty/error) aren't fully tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add tests asserting reputation renders the right UI for loading, empty, error, and success, and transitions correctly.
- Deterministic; mutually-exclusive states.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/reputation-51-states`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loading, empty, error, success exclusivity.
- Include the full test output in the PR description.

### Example commit message
`test(reputation): cover state transitions`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a copy-to-clipboard affordance to reputation identifiers"
labels: type:feature, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Copy reputation ids

### Description
reputation identifiers can't be copied easily. This issue adds a copy control with a toast and fallback.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an accessible copy control for reputation identifiers; Clipboard API with a documented fallback and a toast.
- Keyboard-operable with a clear label.
- Cover success and fallback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/reputation-52-copyid`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success, clipboard-unavailable fallback.
- Include the full test output in the PR description.

### Example commit message
`feat(reputation): add copy-to-clipboard for ids`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a component API reference for reputation"
labels: type:docs, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Reference reputation API

### Description
reputation's component props/API aren't documented. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add a docs entry listing reputation's components, props, and a minimal usage example.
- Keep accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/reputation-51-apiref`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify props against source.
- Include the full test output in the PR description.

### Example commit message
`docs(reputation): add component API reference`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a CSV/JSON export button to wallet"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Export wallet

### Description
Users can't export wallet data. This issue adds a client-side CSV/JSON export of the current view.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Export the currently filtered wallet view as CSV and JSON with safe escaping; trigger a client download.
- Accessible control; no server round-trip.
- Cover escaping, filter-respect, and empty view in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-51-export`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: escaping, respects filter, empty view.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add CSV/JSON export`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add descriptive labels and roles to wallet icon buttons"
labels: type:a11y, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Label wallet icon buttons

### Description
wallet's icon-only buttons lack accessible names. This issue adds labels and correct roles.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Give every icon-only wallet control an accessible name (aria-label) and correct role; no visual change.
- Verify with an a11y check if available.
- Cover accessible names in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/wallet-51-iconlabels`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each icon button has an accessible name.
- Include the full test output in the PR description.

### Example commit message
`a11y(wallet): label icon buttons`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add tests for wallet empty/loading/error state transitions"
labels: type:test, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test wallet states

### Description
wallet's state transitions (loading->success/empty/error) aren't fully tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add tests asserting wallet renders the right UI for loading, empty, error, and success, and transitions correctly.
- Deterministic; mutually-exclusive states.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/wallet-51-states`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loading, empty, error, success exclusivity.
- Include the full test output in the PR description.

### Example commit message
`test(wallet): cover state transitions`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a copy-to-clipboard affordance to wallet identifiers"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Copy wallet ids

### Description
wallet identifiers can't be copied easily. This issue adds a copy control with a toast and fallback.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an accessible copy control for wallet identifiers; Clipboard API with a documented fallback and a toast.
- Keyboard-operable with a clear label.
- Cover success and fallback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-52-copyid`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success, clipboard-unavailable fallback.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add copy-to-clipboard for ids`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a component API reference for wallet"
labels: type:docs, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Reference wallet API

### Description
wallet's component props/API aren't documented. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add a docs entry listing wallet's components, props, and a minimal usage example.
- Keep accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/wallet-51-apiref`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify props against source.
- Include the full test output in the PR description.

### Example commit message
`docs(wallet): add component API reference`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a CSV/JSON export button to forms"
labels: type:feature, area:forms, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Export forms

### Description
Users can't export forms data. This issue adds a client-side CSV/JSON export of the current view.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Export the currently filtered forms view as CSV and JSON with safe escaping; trigger a client download.
- Accessible control; no server round-trip.
- Cover escaping, filter-respect, and empty view in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/forms-51-export`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: escaping, respects filter, empty view.
- Include the full test output in the PR description.

### Example commit message
`feat(forms): add CSV/JSON export`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add descriptive labels and roles to forms icon buttons"
labels: type:a11y, area:forms, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Label forms icon buttons

### Description
forms's icon-only buttons lack accessible names. This issue adds labels and correct roles.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Give every icon-only forms control an accessible name (aria-label) and correct role; no visual change.
- Verify with an a11y check if available.
- Cover accessible names in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/forms-51-iconlabels`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each icon button has an accessible name.
- Include the full test output in the PR description.

### Example commit message
`a11y(forms): label icon buttons`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add tests for forms empty/loading/error state transitions"
labels: type:test, area:forms, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test forms states

### Description
forms's state transitions (loading->success/empty/error) aren't fully tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add tests asserting forms renders the right UI for loading, empty, error, and success, and transitions correctly.
- Deterministic; mutually-exclusive states.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/forms-51-states`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loading, empty, error, success exclusivity.
- Include the full test output in the PR description.

### Example commit message
`test(forms): cover state transitions`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a copy-to-clipboard affordance to forms identifiers"
labels: type:feature, area:forms, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Copy forms ids

### Description
forms identifiers can't be copied easily. This issue adds a copy control with a toast and fallback.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an accessible copy control for forms identifiers; Clipboard API with a documented fallback and a toast.
- Keyboard-operable with a clear label.
- Cover success and fallback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/forms-52-copyid`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success, clipboard-unavailable fallback.
- Include the full test output in the PR description.

### Example commit message
`feat(forms): add copy-to-clipboard for ids`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a component API reference for forms"
labels: type:docs, area:forms, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Reference forms API

### Description
forms's component props/API aren't documented. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add a docs entry listing forms's components, props, and a minimal usage example.
- Keep accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/forms-51-apiref`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify props against source.
- Include the full test output in the PR description.

### Example commit message
`docs(forms): add component API reference`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a CSV/JSON export button to dialogs"
labels: type:feature, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Export dialogs

### Description
Users can't export dialogs data. This issue adds a client-side CSV/JSON export of the current view.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Export the currently filtered dialogs view as CSV and JSON with safe escaping; trigger a client download.
- Accessible control; no server round-trip.
- Cover escaping, filter-respect, and empty view in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/dialogs-51-export`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: escaping, respects filter, empty view.
- Include the full test output in the PR description.

### Example commit message
`feat(dialogs): add CSV/JSON export`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add descriptive labels and roles to dialogs icon buttons"
labels: type:a11y, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Label dialogs icon buttons

### Description
dialogs's icon-only buttons lack accessible names. This issue adds labels and correct roles.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Give every icon-only dialogs control an accessible name (aria-label) and correct role; no visual change.
- Verify with an a11y check if available.
- Cover accessible names in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/dialogs-51-iconlabels`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: each icon button has an accessible name.
- Include the full test output in the PR description.

### Example commit message
`a11y(dialogs): label icon buttons`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add tests for dialogs empty/loading/error state transitions"
labels: type:test, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test dialogs states

### Description
dialogs's state transitions (loading->success/empty/error) aren't fully tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add tests asserting dialogs renders the right UI for loading, empty, error, and success, and transitions correctly.
- Deterministic; mutually-exclusive states.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/dialogs-51-states`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loading, empty, error, success exclusivity.
- Include the full test output in the PR description.

### Example commit message
`test(dialogs): cover state transitions`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a copy-to-clipboard affordance to dialogs identifiers"
labels: type:feature, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Copy dialogs ids

### Description
dialogs identifiers can't be copied easily. This issue adds a copy control with a toast and fallback.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an accessible copy control for dialogs identifiers; Clipboard API with a documented fallback and a toast.
- Keyboard-operable with a clear label.
- Cover success and fallback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/dialogs-52-copyid`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success, clipboard-unavailable fallback.
- Include the full test output in the PR description.

### Example commit message
`feat(dialogs): add copy-to-clipboard for ids`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
++++++
---
type: Feature
title: "Add a component API reference for dialogs"
labels: type:docs, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Reference dialogs API

### Description
dialogs's component props/API aren't documented. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add a docs entry listing dialogs's components, props, and a minimal usage example.
- Keep accurate to the current API.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/dialogs-51-apiref`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify props against source.
- Include the full test output in the PR description.

### Example commit message
`docs(dialogs): add component API reference`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
