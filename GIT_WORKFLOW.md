# Git workflow — commit, push, PR, deploy

This is the team's commit-and-release process for this repo
(`skotipalli/ai-founder`). It governs every agent working in this
repo (pm, dev, qa, ux, devops) and is enforced by the `git-workflow`
skill at `.claude/skills/git-workflow/`.

## Branches

- **`main`** — protected, deployable. Only updated by merging an
  approved PR. The product is deployed from `main`, never from `dev`
  or a feature branch.
- **`dev`** — integration branch. The only branch any agent other
  than DevOps should expect their work to land on before release.
  **Only the DevOps agent pushes to `origin/dev`.**

## The flow

1. **Any agent makes a change** (pm, dev, qa, ux, or devops itself) →
   `git add` + `git commit` **locally**, on `dev` (or a local branch
   off `dev`). **Do not `git push`.** This applies even if you are
   confident the change is correct — the push itself is a DevOps-only
   action, not a review gate you can skip because you're sure.
2. **Hand off to DevOps** once a change is ready for integration —
   post it as a blackboard directive or message DevOps directly with
   what changed and where (branch/commit).
3. **DevOps integrates and tests.** DevOps pulls in the pending local
   commits (or the peer's local branch), runs the test suite against
   `dev`. Only after tests pass does DevOps push to `origin/dev`.
4. **DevOps raises the PR.** Once `dev` is pushed and green, DevOps
   opens a PR from `dev` into `main` (`gh pr create --base main --head
   dev`), summarizing what's included and the test results.
5. **A human approves the PR.** No agent approves or merges its own
   PR, and no agent merges on the human's behalf — the merge button is
   the human's call, every time.
6. **Deploy from `main`.** Once the PR is merged, the product is
   deployed from `main`. DevOps owns the deploy step.

## Why it's shaped this way

- A single push owner (DevOps) means there's one place that knows the
  true state of `origin/dev` and `origin/main` — no two agents racing
  to push and fighting over conflicts on a shared remote branch.
- Tests run before `dev` is pushed, not after — so a broken `dev`
  never becomes a PR someone has to debug.
- Human approval on every PR keeps a person in the loop before
  anything reaches `main`, regardless of how routine the change looks.

## Recommended (DevOps to execute, not done yet)

Branch protection on `main` in GitHub (require PR review, disallow
direct pushes) so this process is enforced by GitHub itself, not just
by convention. Flagging here rather than configuring it myself since
it's a repo-admin setting that affects everyone with push access.
