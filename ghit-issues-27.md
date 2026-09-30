---
type: Feature
title: "Add optimistic UI updates to contracts mutations"
labels: type:feature, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic contracts

### Description
contracts mutations wait for the server before updating the UI, feeling sluggish. This issue adds optimistic updates with rollback.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Apply contracts mutations optimistically and roll back on error with a clear message.
- Guard against stale overwrites.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/contracts-61-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success keeps update, error rolls back.
- Include the full test output in the PR description.

### Example commit message
`feat(contracts): optimistic updates`

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
title: "Add focus-trap and escape handling to contracts modals"
labels: type:a11y, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Trap focus in contracts

### Description
contracts modals don't trap focus or close on escape, hurting keyboard/AT users. This issue fixes both.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Trap focus within open contracts modals, restore focus to the trigger on close, and close on Escape.
- No visual change.
- Cover trap, escape, and focus-restore in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/contracts-61-focustrap`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: focus trapped, escape closes, focus restored.
- Include the full test output in the PR description.

### Example commit message
`a11y(contracts): add modal focus trap`

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
title: "Add tests for contracts form validation messages"
labels: type:test, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test contracts validation

### Description
contracts's inline form validation messages aren't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add tests asserting contracts shows the right validation message per invalid field and clears it on fix.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/contracts-61-formval`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: per-field message, clears on fix.
- Include the full test output in the PR description.

### Example commit message
`test(contracts): cover form validation`

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
title: "Add a relative 'last updated' timestamp to contracts"
labels: type:feature, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Timestamp contracts

### Description
contracts doesn't show how fresh its data is. This issue adds a relative last-updated indicator.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Show a relative last-updated timestamp on contracts that updates as time passes; use a stable formatter.
- Accessible text alternative with the absolute time.
- Cover formatting in tests with a fixed clock.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/contracts-62-updatedts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: just now, minutes, hours with fixed clock.
- Include the full test output in the PR description.

### Example commit message
`feat(contracts): add last-updated timestamp`

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
title: "Add usage examples for the contracts hooks"
labels: type:docs, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document contracts hooks

### Description
contracts's custom hooks lack usage examples. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add a docs entry with usage examples for the contracts hooks (inputs, returns, states).
- Keep accurate to the current signatures.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/contracts-61-hooks`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against source.
- Include the full test output in the PR description.

### Example commit message
`docs(contracts): document hooks`

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
title: "Add optimistic UI updates to milestones mutations"
labels: type:feature, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic milestones

### Description
milestones mutations wait for the server before updating the UI, feeling sluggish. This issue adds optimistic updates with rollback.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Apply milestones mutations optimistically and roll back on error with a clear message.
- Guard against stale overwrites.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/milestones-61-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success keeps update, error rolls back.
- Include the full test output in the PR description.

### Example commit message
`feat(milestones): optimistic updates`

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
title: "Add focus-trap and escape handling to milestones modals"
labels: type:a11y, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Trap focus in milestones

### Description
milestones modals don't trap focus or close on escape, hurting keyboard/AT users. This issue fixes both.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Trap focus within open milestones modals, restore focus to the trigger on close, and close on Escape.
- No visual change.
- Cover trap, escape, and focus-restore in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/milestones-61-focustrap`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: focus trapped, escape closes, focus restored.
- Include the full test output in the PR description.

### Example commit message
`a11y(milestones): add modal focus trap`

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
title: "Add tests for milestones form validation messages"
labels: type:test, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test milestones validation

### Description
milestones's inline form validation messages aren't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add tests asserting milestones shows the right validation message per invalid field and clears it on fix.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/milestones-61-formval`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: per-field message, clears on fix.
- Include the full test output in the PR description.

### Example commit message
`test(milestones): cover form validation`

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
title: "Add a relative 'last updated' timestamp to milestones"
labels: type:feature, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Timestamp milestones

### Description
milestones doesn't show how fresh its data is. This issue adds a relative last-updated indicator.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Show a relative last-updated timestamp on milestones that updates as time passes; use a stable formatter.
- Accessible text alternative with the absolute time.
- Cover formatting in tests with a fixed clock.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/milestones-62-updatedts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: just now, minutes, hours with fixed clock.
- Include the full test output in the PR description.

### Example commit message
`feat(milestones): add last-updated timestamp`

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
title: "Add usage examples for the milestones hooks"
labels: type:docs, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document milestones hooks

### Description
milestones's custom hooks lack usage examples. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add a docs entry with usage examples for the milestones hooks (inputs, returns, states).
- Keep accurate to the current signatures.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/milestones-61-hooks`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against source.
- Include the full test output in the PR description.

### Example commit message
`docs(milestones): document hooks`

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
title: "Add optimistic UI updates to reputation mutations"
labels: type:feature, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic reputation

### Description
reputation mutations wait for the server before updating the UI, feeling sluggish. This issue adds optimistic updates with rollback.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Apply reputation mutations optimistically and roll back on error with a clear message.
- Guard against stale overwrites.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/reputation-61-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success keeps update, error rolls back.
- Include the full test output in the PR description.

### Example commit message
`feat(reputation): optimistic updates`

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
title: "Add focus-trap and escape handling to reputation modals"
labels: type:a11y, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Trap focus in reputation

### Description
reputation modals don't trap focus or close on escape, hurting keyboard/AT users. This issue fixes both.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Trap focus within open reputation modals, restore focus to the trigger on close, and close on Escape.
- No visual change.
- Cover trap, escape, and focus-restore in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/reputation-61-focustrap`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: focus trapped, escape closes, focus restored.
- Include the full test output in the PR description.

### Example commit message
`a11y(reputation): add modal focus trap`

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
title: "Add tests for reputation form validation messages"
labels: type:test, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test reputation validation

### Description
reputation's inline form validation messages aren't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add tests asserting reputation shows the right validation message per invalid field and clears it on fix.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/reputation-61-formval`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: per-field message, clears on fix.
- Include the full test output in the PR description.

### Example commit message
`test(reputation): cover form validation`

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
title: "Add a relative 'last updated' timestamp to reputation"
labels: type:feature, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Timestamp reputation

### Description
reputation doesn't show how fresh its data is. This issue adds a relative last-updated indicator.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Show a relative last-updated timestamp on reputation that updates as time passes; use a stable formatter.
- Accessible text alternative with the absolute time.
- Cover formatting in tests with a fixed clock.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/reputation-62-updatedts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: just now, minutes, hours with fixed clock.
- Include the full test output in the PR description.

### Example commit message
`feat(reputation): add last-updated timestamp`

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
title: "Add usage examples for the reputation hooks"
labels: type:docs, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document reputation hooks

### Description
reputation's custom hooks lack usage examples. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add a docs entry with usage examples for the reputation hooks (inputs, returns, states).
- Keep accurate to the current signatures.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/reputation-61-hooks`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against source.
- Include the full test output in the PR description.

### Example commit message
`docs(reputation): document hooks`

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
title: "Add optimistic UI updates to wallet mutations"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic wallet

### Description
wallet mutations wait for the server before updating the UI, feeling sluggish. This issue adds optimistic updates with rollback.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Apply wallet mutations optimistically and roll back on error with a clear message.
- Guard against stale overwrites.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-61-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success keeps update, error rolls back.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): optimistic updates`

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
title: "Add focus-trap and escape handling to wallet modals"
labels: type:a11y, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Trap focus in wallet

### Description
wallet modals don't trap focus or close on escape, hurting keyboard/AT users. This issue fixes both.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Trap focus within open wallet modals, restore focus to the trigger on close, and close on Escape.
- No visual change.
- Cover trap, escape, and focus-restore in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/wallet-61-focustrap`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: focus trapped, escape closes, focus restored.
- Include the full test output in the PR description.

### Example commit message
`a11y(wallet): add modal focus trap`

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
title: "Add tests for wallet form validation messages"
labels: type:test, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test wallet validation

### Description
wallet's inline form validation messages aren't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add tests asserting wallet shows the right validation message per invalid field and clears it on fix.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/wallet-61-formval`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: per-field message, clears on fix.
- Include the full test output in the PR description.

### Example commit message
`test(wallet): cover form validation`

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
title: "Add a relative 'last updated' timestamp to wallet"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Timestamp wallet

### Description
wallet doesn't show how fresh its data is. This issue adds a relative last-updated indicator.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Show a relative last-updated timestamp on wallet that updates as time passes; use a stable formatter.
- Accessible text alternative with the absolute time.
- Cover formatting in tests with a fixed clock.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-62-updatedts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: just now, minutes, hours with fixed clock.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add last-updated timestamp`

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
title: "Add usage examples for the wallet hooks"
labels: type:docs, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document wallet hooks

### Description
wallet's custom hooks lack usage examples. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add a docs entry with usage examples for the wallet hooks (inputs, returns, states).
- Keep accurate to the current signatures.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/wallet-61-hooks`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against source.
- Include the full test output in the PR description.

### Example commit message
`docs(wallet): document hooks`

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
title: "Add optimistic UI updates to forms mutations"
labels: type:feature, area:forms, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic forms

### Description
forms mutations wait for the server before updating the UI, feeling sluggish. This issue adds optimistic updates with rollback.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Apply forms mutations optimistically and roll back on error with a clear message.
- Guard against stale overwrites.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/forms-61-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success keeps update, error rolls back.
- Include the full test output in the PR description.

### Example commit message
`feat(forms): optimistic updates`

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
title: "Add focus-trap and escape handling to forms modals"
labels: type:a11y, area:forms, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Trap focus in forms

### Description
forms modals don't trap focus or close on escape, hurting keyboard/AT users. This issue fixes both.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Trap focus within open forms modals, restore focus to the trigger on close, and close on Escape.
- No visual change.
- Cover trap, escape, and focus-restore in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/forms-61-focustrap`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: focus trapped, escape closes, focus restored.
- Include the full test output in the PR description.

### Example commit message
`a11y(forms): add modal focus trap`

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
title: "Add tests for forms form validation messages"
labels: type:test, area:forms, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test forms validation

### Description
forms's inline form validation messages aren't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add tests asserting forms shows the right validation message per invalid field and clears it on fix.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/forms-61-formval`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: per-field message, clears on fix.
- Include the full test output in the PR description.

### Example commit message
`test(forms): cover form validation`

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
title: "Add a relative 'last updated' timestamp to forms"
labels: type:feature, area:forms, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Timestamp forms

### Description
forms doesn't show how fresh its data is. This issue adds a relative last-updated indicator.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Show a relative last-updated timestamp on forms that updates as time passes; use a stable formatter.
- Accessible text alternative with the absolute time.
- Cover formatting in tests with a fixed clock.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/forms-62-updatedts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: just now, minutes, hours with fixed clock.
- Include the full test output in the PR description.

### Example commit message
`feat(forms): add last-updated timestamp`

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
title: "Add usage examples for the forms hooks"
labels: type:docs, area:forms, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document forms hooks

### Description
forms's custom hooks lack usage examples. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add a docs entry with usage examples for the forms hooks (inputs, returns, states).
- Keep accurate to the current signatures.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/forms-61-hooks`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against source.
- Include the full test output in the PR description.

### Example commit message
`docs(forms): document hooks`

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
title: "Add optimistic UI updates to dialogs mutations"
labels: type:feature, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Optimistic dialogs

### Description
dialogs mutations wait for the server before updating the UI, feeling sluggish. This issue adds optimistic updates with rollback.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Apply dialogs mutations optimistically and roll back on error with a clear message.
- Guard against stale overwrites.
- Cover success and rollback in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/dialogs-61-optimistic`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: success keeps update, error rolls back.
- Include the full test output in the PR description.

### Example commit message
`feat(dialogs): optimistic updates`

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
title: "Add focus-trap and escape handling to dialogs modals"
labels: type:a11y, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Trap focus in dialogs

### Description
dialogs modals don't trap focus or close on escape, hurting keyboard/AT users. This issue fixes both.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Trap focus within open dialogs modals, restore focus to the trigger on close, and close on Escape.
- No visual change.
- Cover trap, escape, and focus-restore in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/dialogs-61-focustrap`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: focus trapped, escape closes, focus restored.
- Include the full test output in the PR description.

### Example commit message
`a11y(dialogs): add modal focus trap`

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
title: "Add tests for dialogs form validation messages"
labels: type:test, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Test dialogs validation

### Description
dialogs's inline form validation messages aren't tested. This issue adds coverage.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add tests asserting dialogs shows the right validation message per invalid field and clears it on fix.
- Deterministic; no real network.
- Do not change behaviour unless a defect is found.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/dialogs-61-formval`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: per-field message, clears on fix.
- Include the full test output in the PR description.

### Example commit message
`test(dialogs): cover form validation`

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
title: "Add a relative 'last updated' timestamp to dialogs"
labels: type:feature, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Timestamp dialogs

### Description
dialogs doesn't show how fresh its data is. This issue adds a relative last-updated indicator.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Show a relative last-updated timestamp on dialogs that updates as time passes; use a stable formatter.
- Accessible text alternative with the absolute time.
- Cover formatting in tests with a fixed clock.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/dialogs-62-updatedts`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: just now, minutes, hours with fixed clock.
- Include the full test output in the PR description.

### Example commit message
`feat(dialogs): add last-updated timestamp`

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
title: "Add usage examples for the dialogs hooks"
labels: type:docs, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:low, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Document dialogs hooks

### Description
dialogs's custom hooks lack usage examples. This issue adds a concise reference.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add a docs entry with usage examples for the dialogs hooks (inputs, returns, states).
- Keep accurate to the current signatures.
- Link from the docs index.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b docs/dialogs-61-hooks`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: n/a — verify against source.
- Include the full test output in the PR description.

### Example commit message
`docs(dialogs): document hooks`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
