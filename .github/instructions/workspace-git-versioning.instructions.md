---
description: "Use for every Lessgo workspace change: coordinate branches, staging merges, main releases, and version bumps across involved repositories."
applyTo: "**"
---

# Workspace branching and versioning

## Coordinated branches

- Identify every repository involved in the task. Leave unrelated repositories unchanged.
- Before implementation, fetch the latest `staging` and create the same descriptive feature-branch name from `origin/staging` in every involved repository. Reuse an existing task branch only when it belongs to the same task.
- Do not implement directly on `staging` or `main`. Preserve existing local work; ask before resolving conflicting branch or worktree state.
- Complete and validate the changes across all involved repositories, then merge each feature branch into `staging` through the repository's required review, checks, and branch protections.
- For a production release, promote `staging` to `main` through the existing release process. The actual branch names are lowercase `staging` and `main`.

## Cumulative version updates

Use each repository's own current version `A.B.C`:

| Event | Required version update |
| --- | --- |
| Completed feature change set, before merging into `staging` | `A.B.C` -> `A.B.(C+1)` |
| Every successful push updating `staging`, including a merge | `A.B.C` -> `A.(B+1).C` |
| Every successful push updating `main`, including a merge | `A.B.C` -> `(A+1).B.C` |

- Bump the patch component once per completed feature change set, not once per edited file.
- These rules are cumulative: `1.2.3` -> feature completion `1.2.4` -> `staging` push `1.3.4` -> `main` push `2.3.4`.
- Increment only the specified component and preserve the others; do not reset lower components.
- Count each push once, regardless of its commit count. Include its version update in that same push; do not create a follow-up version-only push that causes a bump loop.
- Keep each repository's corresponding version manifests and release metadata synchronized using its existing tooling and checks. Different repositories do not need identical version numbers.
- If a repository has no established version source or its release automation conflicts with this policy, ask for guidance instead of inventing a version source or silently skipping an update.
