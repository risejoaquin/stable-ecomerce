# AGENTS.md
# SolidBit / Stable-Ecommerce

## 1. Purpose

This repository uses human-controlled agent-assisted engineering.

The authoritative roles are:

- Technical and Release Authority: Joaquin (`@risejoaquin`).
- Backend / database domain owner: Rogelio (`@bonjourrog`).
- Frontend / Web POS / E2E domain owner: Julian (`@Julian716`).
- Primary local execution/orchestration tool: Antigravity CLI.
- ChatGPT: analysis, planning, review, remediation design, evidence synthesis, and connector-assisted administration.

Autonomous agents are execution units. They are not release authorities.

## 2. Authority boundaries

Only the Technical and Release Authority may authorize:

- merge to `main`;
- production deploy;
- destructive or production database mutations;
- production credential changes;
- GitHub ruleset or production-environment protection changes;
- security-policy exceptions;
- architecture or frozen-contract changes.

An agent must stop at these gates unless explicit authorization for that exact action exists.

CI success, local PASS, peer review, or an agent recommendation does not itself authorize a merge or deployment.

## 3. Source-of-truth order

When information conflicts, prefer:

1. repository state and current Git history;
2. approved/frozen engineering contracts and ADRs;
3. current Jira acceptance criteria and dependencies;
4. current CI evidence;
5. approved operational runbooks;
6. transient chat prompts.

Do not treat stale prompt text or old evidence as authoritative.

## 4. Worktree isolation

All agent implementation or remediation work must occur in an isolated Git worktree.

Required invariants:

- never implement directly in the primary checkout;
- never modify a sibling worktree;
- never delete another agent's worktree;
- never assume the primary checkout is clean;
- create the worktree from the explicitly selected remote baseline;
- record the base SHA before modifications;
- use one branch per ticket/remediation;
- stage exact files only.

The primary checkout may contain legitimate uncommitted work. Do not clean, reset, stash, overwrite, or discard it unless the user explicitly authorizes that exact operation.

## 5. WIP limit

Maximum active implementation:

- 1 primary implementation ticket;
- 1 secondary non-blocking/review ticket.

Parallel agents are allowed for read-only analysis, testing, evidence collection, or independent review when file ownership does not overlap.

Do not run concurrent writers against the same files.

## 6. Git safety

Prohibited unless explicitly authorized for a specific recovery case:

- direct development on `main`;
- `git push origin main`;
- force push;
- `git reset --hard`;
- broad staging with `git add .` or `git add -A`;
- rewriting shared history;
- deleting remote branches belonging to another active task.

Before modifying a worktree:

- capture `git status --short --branch`;
- capture `git rev-parse HEAD`;
- capture `git rev-parse origin/main` when `main` is the selected baseline.

Before commit:

- `git diff --check`;
- `git diff --stat`;
- `git diff --cached --name-only`;
- confirm only authorized files are staged.

## 7. Antigravity permission policy

`--dangerously-skip-permissions` is an exception mechanism, not normal authority.

It may be used only when all of the following are true:

- the task is running inside an isolated non-`main` worktree;
- the task scope is explicit and bounded;
- merge and deploy are not implicitly authorized;
- secrets are not printed, copied into prompts, or committed;
- stdout/stderr and final evidence are captured;
- destructive operations are excluded or separately authorized;
- the caller explicitly acknowledges bypass use.

A governed wrapper should be preferred over direct `agy` invocation.

If Antigravity gains a narrower permission mode that satisfies the task, prefer the narrower mode.

## 8. Production and external-system safety

Never perform any of the following without explicit authorization:

- Railway production deploy or environment mutation;
- Supabase production DDL/DML outside an approved migration/recovery action;
- destructive Jira project configuration changes;
- GitHub ruleset/environment protection changes;
- payment, authentication, or credential mutations;
- Meta/third-party production credential rotation.

Read-only inspection and evidence collection are allowed when credentials and user data are not exposed.

## 9. Secrets and sensitive data

Never print or commit:

- passwords;
- API secrets;
- private keys;
- database passwords;
- Stripe secrets;
- webhook signing secrets;
- full bearer/session tokens;
- service-role keys;
- PAN/CVV;
- private customer data not required for the task.

Use environment variables or the existing secret manager. Redact evidence where necessary.

## 10. Native command execution on Windows PowerShell 5.1

The primary Windows environment may use Windows PowerShell 5.1.

Operational scripts must account for:

- native tools writing normal informational output to stderr;
- `$ErrorActionPreference = "Stop"` turning native stderr into `NativeCommandError`;
- ambiguous interpolation such as `"$Var:"`; use `"${Var}:"`;
- encoding/parser problems from non-ASCII PowerShell source.

For critical automation:

- prefer ASCII-only PowerShell source where practical;
- capture stdout and stderr separately;
- judge native command success by the real process exit code;
- avoid fragile exact-block replacements when line/regex matching is safer.

## 11. QA and evidence

A PASS requires evidence for the requested level.

Keep these distinct:

- LOCAL PASS;
- PR CI PASS;
- PEER REVIEW PASS;
- QA PASS;
- STAGING PASS;
- PROD PASS.

One level never substitutes for another.

Every agent execution report should contain:

- ticket/task;
- base SHA;
- worktree path;
- branch;
- files changed;
- commands and exit codes;
- tests/checks executed;
- PR URL when applicable;
- Jira evidence when applicable;
- unresolved risks;
- next authorized step.

## 12. Failure protocol

On a non-trivial failure:

1. stop the failing phase;
2. preserve logs/evidence;
3. do not improvise a destructive workaround;
4. do not merge or deploy;
5. report the exact failure and affected state;
6. resume only with a bounded remediation.

Do not declare PASS because most checks passed.

## 13. Pull requests

Every change must be tied to Jira/governance evidence.

Pull requests must:

- target the approved base;
- contain only scoped files;
- use the repository PR template;
- pass required CI;
- receive required CODEOWNERS review;
- resolve review threads before merge.

Creating a PR is not merge authorization.

## 14. Deployment

Production deployment is a separate manually authorized release action.

A merge to `main` must never be interpreted as automatic authorization to deploy.

Release execution follows the approved release runbooks and GO/NO-GO gates.

## 15. Scope discipline

Prefer the smallest correct change.

Do not:

- perform opportunistic refactors;
- update dependencies without a ticket;
- invent database RPCs, tables, or policies before their approved contract;
- rewrite unrelated files;
- change architecture from an agent prompt;
- convert provisional evidence into a production claim.

When uncertain about authority or scope, stop and return evidence.
