---
type: Feature
title: "Add a loading skeleton to the contracts view"
labels: type:feature, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a contracts loading skeleton

### Description
The contracts view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Render a skeleton matching the contracts layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/contracts-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(contracts): add loading skeleton`

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
title: "Make the contracts controls fully keyboard-operable"
labels: type:a11y, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate contracts

### Description
Some contracts controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Ensure every interactive contracts control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/contracts-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(contracts): full keyboard operability`

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
title: "Add client-side validation and inline errors to the contracts inputs"
labels: type:feature, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate contracts inputs

### Description
The contracts inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Validate contracts inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/contracts-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(contracts): add client-side validation`

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
title: "Wrap the contracts section in an error boundary with a retry"
labels: type:refactor, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard contracts with an error boundary

### Description
An unexpected render error in contracts currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an error boundary around the contracts section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/contracts-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(contracts): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the contracts view"
labels: type:test, area:contracts, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the contracts view

### Description
The contracts view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add jest-axe assertions for the contracts view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/contracts-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(contracts): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the milestones view"
labels: type:feature, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a milestones loading skeleton

### Description
The milestones view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Render a skeleton matching the milestones layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/milestones-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(milestones): add loading skeleton`

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
title: "Make the milestones controls fully keyboard-operable"
labels: type:a11y, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate milestones

### Description
Some milestones controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Ensure every interactive milestones control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/milestones-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(milestones): full keyboard operability`

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
title: "Add client-side validation and inline errors to the milestones inputs"
labels: type:feature, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate milestones inputs

### Description
The milestones inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Validate milestones inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/milestones-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(milestones): add client-side validation`

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
title: "Wrap the milestones section in an error boundary with a retry"
labels: type:refactor, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard milestones with an error boundary

### Description
An unexpected render error in milestones currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an error boundary around the milestones section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/milestones-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(milestones): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the milestones view"
labels: type:test, area:milestones, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the milestones view

### Description
The milestones view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add jest-axe assertions for the milestones view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/milestones-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(milestones): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the reputation view"
labels: type:feature, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a reputation loading skeleton

### Description
The reputation view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Render a skeleton matching the reputation layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/reputation-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(reputation): add loading skeleton`

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
title: "Make the reputation controls fully keyboard-operable"
labels: type:a11y, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate reputation

### Description
Some reputation controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Ensure every interactive reputation control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/reputation-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(reputation): full keyboard operability`

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
title: "Add client-side validation and inline errors to the reputation inputs"
labels: type:feature, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate reputation inputs

### Description
The reputation inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Validate reputation inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/reputation-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(reputation): add client-side validation`

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
title: "Wrap the reputation section in an error boundary with a retry"
labels: type:refactor, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard reputation with an error boundary

### Description
An unexpected render error in reputation currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an error boundary around the reputation section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/reputation-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(reputation): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the reputation view"
labels: type:test, area:reputation, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the reputation view

### Description
The reputation view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add jest-axe assertions for the reputation view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/reputation-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(reputation): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the wallet view"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a wallet loading skeleton

### Description
The wallet view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Render a skeleton matching the wallet layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add loading skeleton`

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
title: "Make the wallet controls fully keyboard-operable"
labels: type:a11y, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate wallet

### Description
Some wallet controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Ensure every interactive wallet control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/wallet-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(wallet): full keyboard operability`

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
title: "Add client-side validation and inline errors to the wallet inputs"
labels: type:feature, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate wallet inputs

### Description
The wallet inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Validate wallet inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/wallet-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(wallet): add client-side validation`

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
title: "Wrap the wallet section in an error boundary with a retry"
labels: type:refactor, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard wallet with an error boundary

### Description
An unexpected render error in wallet currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an error boundary around the wallet section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/wallet-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(wallet): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the wallet view"
labels: type:test, area:wallet, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the wallet view

### Description
The wallet view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add jest-axe assertions for the wallet view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/wallet-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(wallet): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the forms view"
labels: type:feature, area:forms, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a forms loading skeleton

### Description
The forms view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Render a skeleton matching the forms layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/forms-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(forms): add loading skeleton`

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
title: "Make the forms controls fully keyboard-operable"
labels: type:a11y, area:forms, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate forms

### Description
Some forms controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Ensure every interactive forms control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/forms-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(forms): full keyboard operability`

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
title: "Add client-side validation and inline errors to the forms inputs"
labels: type:feature, area:forms, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate forms inputs

### Description
The forms inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Validate forms inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/forms-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(forms): add client-side validation`

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
title: "Wrap the forms section in an error boundary with a retry"
labels: type:refactor, area:forms, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard forms with an error boundary

### Description
An unexpected render error in forms currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an error boundary around the forms section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/forms-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(forms): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the forms view"
labels: type:test, area:forms, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the forms view

### Description
The forms view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add jest-axe assertions for the forms view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/forms-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(forms): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the dialogs view"
labels: type:feature, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a dialogs loading skeleton

### Description
The dialogs view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Render a skeleton matching the dialogs layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/dialogs-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(dialogs): add loading skeleton`

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
title: "Make the dialogs controls fully keyboard-operable"
labels: type:a11y, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate dialogs

### Description
Some dialogs controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Ensure every interactive dialogs control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/dialogs-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(dialogs): full keyboard operability`

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
title: "Add client-side validation and inline errors to the dialogs inputs"
labels: type:feature, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate dialogs inputs

### Description
The dialogs inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Validate dialogs inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/dialogs-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(dialogs): add client-side validation`

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
title: "Wrap the dialogs section in an error boundary with a retry"
labels: type:refactor, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard dialogs with an error boundary

### Description
An unexpected render error in dialogs currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an error boundary around the dialogs section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/dialogs-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(dialogs): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the dialogs view"
labels: type:test, area:dialogs, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the dialogs view

### Description
The dialogs view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add jest-axe assertions for the dialogs view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/dialogs-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(dialogs): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the settings view"
labels: type:feature, area:settings, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a settings loading skeleton

### Description
The settings view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Render a skeleton matching the settings layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/settings-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(settings): add loading skeleton`

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
title: "Make the settings controls fully keyboard-operable"
labels: type:a11y, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate settings

### Description
Some settings controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Ensure every interactive settings control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/settings-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(settings): full keyboard operability`

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
title: "Add client-side validation and inline errors to the settings inputs"
labels: type:feature, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate settings inputs

### Description
The settings inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Validate settings inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/settings-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(settings): add client-side validation`

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
title: "Wrap the settings section in an error boundary with a retry"
labels: type:refactor, area:settings, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard settings with an error boundary

### Description
An unexpected render error in settings currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an error boundary around the settings section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/settings-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(settings): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the settings view"
labels: type:test, area:settings, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the settings view

### Description
The settings view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add jest-axe assertions for the settings view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/settings-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(settings): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the navigation view"
labels: type:feature, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a navigation loading skeleton

### Description
The navigation view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Render a skeleton matching the navigation layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/navigation-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(navigation): add loading skeleton`

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
title: "Make the navigation controls fully keyboard-operable"
labels: type:a11y, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate navigation

### Description
Some navigation controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Ensure every interactive navigation control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/navigation-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(navigation): full keyboard operability`

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
title: "Add client-side validation and inline errors to the navigation inputs"
labels: type:feature, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate navigation inputs

### Description
The navigation inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Validate navigation inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/navigation-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(navigation): add client-side validation`

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
title: "Wrap the navigation section in an error boundary with a retry"
labels: type:refactor, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard navigation with an error boundary

### Description
An unexpected render error in navigation currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an error boundary around the navigation section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/navigation-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(navigation): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the navigation view"
labels: type:test, area:navigation, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the navigation view

### Description
The navigation view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add jest-axe assertions for the navigation view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/navigation-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(navigation): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the toast view"
labels: type:feature, area:toast, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a toast loading skeleton

### Description
The toast view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Render a skeleton matching the toast layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/toast-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(toast): add loading skeleton`

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
title: "Make the toast controls fully keyboard-operable"
labels: type:a11y, area:toast, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate toast

### Description
Some toast controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Ensure every interactive toast control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/toast-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(toast): full keyboard operability`

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
title: "Add client-side validation and inline errors to the toast inputs"
labels: type:feature, area:toast, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate toast inputs

### Description
The toast inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Validate toast inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/toast-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(toast): add client-side validation`

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
title: "Wrap the toast section in an error boundary with a retry"
labels: type:refactor, area:toast, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard toast with an error boundary

### Description
An unexpected render error in toast currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an error boundary around the toast section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/toast-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(toast): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the toast view"
labels: type:test, area:toast, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the toast view

### Description
The toast view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add jest-axe assertions for the toast view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/toast-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(toast): add jest-axe accessibility tests`

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
title: "Add a loading skeleton to the theme view"
labels: type:feature, area:theme, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Add a theme loading skeleton

### Description
The theme view shows nothing (or a spinner) while loading, causing layout shift. This issue adds a content-shaped skeleton.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Render a skeleton matching the theme layout during load; swap to content on settle.
- Mark it aria-hidden and expose a busy state; no layout shift.
- Cover the skeleton in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/theme-11-skeleton`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: fast load, slow load, error replaces skeleton.
- Include the full test output in the PR description.

### Example commit message
`feat(theme): add loading skeleton`

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
title: "Make the theme controls fully keyboard-operable"
labels: type:a11y, area:theme, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Keyboard-operate theme

### Description
Some theme controls are mouse-only. This issue ensures full keyboard operation with a sensible focus order.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Ensure every interactive theme control is reachable and operable by keyboard with a logical focus order.
- Add visible focus styles; do not change visual layout.
- Add tests for keyboard activation.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b a11y/theme-11-keyboard`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: tab order, Enter/Space activation, focus visible.
- Include the full test output in the PR description.

### Example commit message
`a11y(theme): full keyboard operability`

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
title: "Add client-side validation and inline errors to the theme inputs"
labels: type:feature, area:theme, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Validate theme inputs

### Description
The theme inputs accept invalid values silently. This issue adds client-side validation with accessible inline errors.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Validate theme inputs and show accessible inline errors (aria-describedby); block submit while invalid.
- Do not weaken any server-side checks; mirror them client-side.
- Cover valid/invalid paths in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b feature/theme-12-validation`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: empty, out-of-range, format error, valid submit.
- Include the full test output in the PR description.

### Example commit message
`feat(theme): add client-side validation`

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
title: "Wrap the theme section in an error boundary with a retry"
labels: type:refactor, area:theme, stack:nextjs, stack:react, stack:typescript, priority:medium, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## Guard theme with an error boundary

### Description
An unexpected render error in theme currently blanks the page. This issue wraps it in an error boundary with a retry.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add an error boundary around the theme section that shows an accessible fallback with a retry.
- Log the error via the existing seam; do not swallow it silently.
- Cover the fallback and retry in tests.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b refactor/theme-11-error-boundary`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: child throws, retry re-renders, normal render unaffected.
- Include the full test output in the PR description.

### Example commit message
`refactor(theme): add error boundary with retry`

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
title: "Add automated accessibility (jest-axe) tests for the theme view"
labels: type:test, area:theme, stack:nextjs, stack:react, stack:typescript, priority:high, Stellar Wave, MAYBE REWARDED, GRANTFOX OSS, OFFICIAL CAMPAIGN, Official Campaign | FWC26
assignees: ''
---

## A11y-test the theme view

### Description
The theme view lacks automated accessibility assertions. This issue adds jest-axe checks.

### Requirements and context
- **Repository scope:** Talenttrust/Talenttrust-Frontend only.
- Add jest-axe assertions for the theme view's key states (loaded, empty, error).
- Fix any violations surfaced, or document why they are acceptable.
- Keep the test deterministic.

### Suggested execution
- Fork the repo and create a branch
- `git checkout -b test/theme-11-axe`
- Implement changes
  - **Write code in:** the relevant module.
  - **Write comprehensive tests in:** cover the new behaviour and edge cases.
- Test and commit

### Test and commit
- Run `npm run lint`, `npm test`, and `npm run build`.
- Cover edge cases: loaded, empty, error states pass axe.
- Include the full test output in the PR description.

### Example commit message
`test(theme): add jest-axe accessibility tests`

### Guidelines
- **Minimum 95 percent test coverage** for impacted modules.
- Clear, reviewer-focused documentation.
- **Timeframe: 96 hours.**

### Community & contribution rewards
- 💬 **Join the TalentTrust community on Discord:** https://discord.gg/WqnGpcPx
- ⭐ This is a **GrantFox OSS / Official Campaign** task and **may be rewarded**. When your PR is merged you'll be prompted to rate the project — a **5-star rating** is much appreciated.
