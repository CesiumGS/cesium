# Sandcastle-only Release Guide

Use this process when you need to publish selected Sandcastle changes to [sandcastle.cesium.com](https://sandcastle.cesium.com/) without doing a full CesiumJS version release.

## Why this exists

- We sometimes need to publish Sandcastle fixes or planned feature updates sooner than the monthly package release.
- We do not want to deploy the full `main` branch because it may contain unreleased `@cesium/engine` or `@cesium/widgets` changes.

## Approach

Start from the production baseline on `cesium.com`, then selectively apply only approved commits, validate, and open a PR back to `cesium.com`.

- Workflow: `.github/workflows/sandcastle-release.yml`
- Trigger: manual (`workflow_dispatch`)
- Contract: release PRs must include the GitHub label `sandcastle-only-release` so `.github/workflows/prod.yml` can detect Sandcastle-only provenance.

## Release procedure

This workflow is invoked manually in the GitHub Actions UI.

1. Identify one or more commit SHAs already merged to `main` that should be released to Sandcastle.
2. Open GitHub, go to **Actions**, select **sandcastle-release**, and click **Run workflow**.
3. Choose the ref to run from (typically `main`).
4. Fill in `commit_shas` (required) with SHAs to cherry-pick onto `cesium.com`, using either comma-separated (`abc1234,def5678,9876fed`) or newline-separated values in the exact cherry-pick order.
5. Optionally set `dry_run=true` to validate without pushing a branch or opening a PR.
6. Start the workflow, review the generated PR targeting `cesium.com`, and merge after approval.
7. Confirm `prod.yml` completes and verify deployment on [sandcastle.cesium.com](https://sandcastle.cesium.com/).

## Guardrails and safeguards

The workflow enforces the following:

- The base branch must be `origin/cesium.com` (not `main`).
- Each selected commit must be reachable from `origin/main`. The workflow rejects SHAs that are only on a feature branch, fork branch, or unrelated history. This ensures Sandcastle-only releases are based on changes already merged to `main`.
- Changed files are restricted to Sandcastle-related paths and release inputs.
- Build safeguards are run before PR creation: `npm run build-ts` and `npm run build-sandcastle -- --outer-origin="https://sandcastle.cesium.com"`.

If a commit changes files outside allowed scope, the workflow fails and no release PR is created.

## Rollback

If a Sandcastle-only release needs to be reverted, revert the corresponding PR on `cesium.com`. Pushing the revert to `cesium.com` triggers the normal production deployment workflow.
