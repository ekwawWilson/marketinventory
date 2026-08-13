# CLAUDE.md — point-of-sale

Guidance for Claude Code (claude.ai/code) working in this repository.

## Branch flow — open PRs against `staging`, never `main`

**A pull request targets `staging`. `main` is reached only by promoting
`staging`, never by a feature branch.** Both branches deploy; they are not
"unreleased" and "released".

The image tag a box runs comes from the tenant's `env` in the eyo-deploy
manifest (`manifest/fleet.yml`), so the branch a PR targets decides which host
gets it:

| Branch | Tag | `env` | Host |
|---|---|---|---|
| `staging` | `:staging` | `demo` | `pos-demo.eyosolutions.com` |
| `main` | `:main` | `prod` | `citizen-pos.eyosolutions.com` |

**`citizen-pos` is a live client taking real money.** It settles payments and
sends SMS through Hubtel, whose whitelist admits the pool's source addresses.
A PR merged straight to `main` therefore reaches a paying deployment having
never run on the demo host — and nothing anywhere reports that: CI is green
either way, the reconciler converges either way, and the only symptom is a demo
host quietly lacking the change, which reads as a deploy still in flight.

### This repository diverges, so promoting is not always a fast-forward

Most repos on this fleet promote with a plain fast-forward, because nothing
lands on `main` that did not come through `staging`. **point-of-sale is not one
of them.** On 12 Aug 2026 `main` carried a 70-line job that `staging` had never
seen — the guard that refuses destructive migrations against the client's
database. A plain `staging → main` promotion would have deleted it.

So, every time:

```sh
git fetch origin
# 1. ASK first. `diverged` means main has commits staging does not.
gh api repos/eyosolutionsgh/point-of-sale/compare/main...staging \
  --jq '"\(.status) ahead=\(.ahead_by) behind=\(.behind_by)"'

# 2a. `ahead` with behind=0 — safe to promote directly.
git push origin origin/staging:main

# 2b. `diverged` — bring main's work onto staging FIRST, check both halves
#     survived, and only then promote.
git checkout -B promote origin/staging
git merge origin/main --no-edit
#     ...verify: the feature you are promoting is still there, AND whatever
#     main carried is still there. Then:
git push origin HEAD:staging
git push origin origin/staging:main
```

Push `origin/<branch>`, not the bare branch name. `git push origin staging:main`
pushes your **local** `staging`, which is stale the moment anything merges
through the GitHub UI — that silently promoted the wrong commit on foerps.

The real fix is to stop committing directly to `main`. Until that holds, the
check above is not optional. Losing that migration guard on a client's database
is not a recoverable mistake.

## CI runs on the self-hosted pool

`runs-on: [self-hosted, linux, x64, eyo]`, two org-scoped runners on the
`devops` box. GitHub-hosted runners are metered on private repos and the
account's allowance is exhausted — a blocked job is created, assigned no
runner, and fails in about three seconds with no steps and no log, which reads
as a broken workflow rather than a billing block.

No job here uses a service container, so every job runs directly on the runner.
If one is ever added, it will need `container:` as well: the runners are
themselves containers on a rootless Docker daemon, so a service container comes
up as a SIBLING and `localhost` from a step reaches nothing while the service
reports healthy.

## The payment callback trusts the LAST proxy hop, not the first

`app/api/momo/callback/route.ts` reads the client address from
`X-Forwarded-For` by taking the **last** entry, not the first. A client can put
anything in that header; only the hop Caddy appends is trustworthy. Taking
`hops[0]` would let a caller forge an allowed source address and post a forged
settlement. Hubtel's callback URL is set per request from the Settings → SMS
page — it is not pre-registered, so there is no registry to check against.
