# CLA Check Automation

This document explains the Contributor License Agreement (CLA) automation process used by CesiumJS CI.

It covers:

- the general CLA architecture,
- when to rotate/update credentials,
- and where maintainers can access the required credentials.

See also: https://github.com/CesiumGS/alkali/issues/30

## CLA Process Overview

When a pull request is opened, the CLA workflow runs and checks whether the PR author has a signed CLA on file.

- Workflow: `.github/workflows/cla.yml`
- Script: `.github/actions/check-for-CLA/index.js`
- Trigger: `pull_request_target` on `opened`

The script looks up the GitHub username in Microsoft-hosted CLA data and then:

- posts a confirmation comment when a CLA is found, or
- posts CLA instructions and applies `PR - Needs Signed CLA` when a CLA is not found.

## Architecture Summary

### SharePoint Resources

```text
┌──────────────────┐      ┌──────────────────┐      ┌─────────────────────────┐
│  Microsoft Forms │ ───> │  Power Automate  │ ───> │  Excel Workbook         │
│      Survey      │      │     Flow         │      │  (SharePoint)           │
└──────────────────┘      └──────────────────┘      └─────────────────────────┘
```

- CLA data is stored in Excel workbooks in OneDrive/SharePoint.
- Workbooks are accessible from the file tree in OneDrive/SharePoint:
  - https://bentley-my.sharepoint.com/
  - https://bentley.sharepoint.com/:f:/r/sites/Platform/Shared%20Documents/CLAs
- Permissions:
  - Platform members and visitors can view.
  - Limited teams/users (eg. CesiumJS and Cesium Native maintainers) can edit.

#### Forms and Flow ownership

- Microsoft Forms survey is managed at https://forms.office.com/
- Power Automate flow is managed at https://make.powerautomate.com/
- We use a **dedicated service account** as the owner for both:
  1. Microsoft Forms survey
  2. Power Automate flow

#### Flow behavior

1. Trigger: _When a new response is submitted_
2. Action: _Get response details_
3. Action: _Add a row into a table (Excel Online Business)_

### GitHub Actions Script Access to SharePoint Resources

```text
┌──────────────────┐      ┌──────────────────┐      ┌─────────────────────────┐
│  GitHub Actions  │ ───> │ Microsoft Graph  │ ───> │  Excel Workbook         │
│                  │      │       API        │      │  (Microsoft SharePoint) │
└──────────────────┘      └──────────────────┘      └─────────────────────────┘
```

- The CI script accesses SharePoint via the Microsoft Graph REST API:
  - https://learn.microsoft.com/en-us/graph/
- This is done using a Microsoft Entra app registration.
- The runtime auth/config data (including app credentials and workbook metadata) is stored in a single GitHub Actions secret:
  - `MICROSOFT_GRAPH_INFO_JSON`
- The script exchanges these values for an OAuth access token at runtime before reading workbook tables.

## Credential and Metadata Contents

`MICROSOFT_GRAPH_INFO_JSON` contains the values required for Graph auth and workbook lookups, including:

- `tenantId`
- `clientId`
- `clientSecret`
- `siteId`
- `driveId`
- `individualWorkbookItemId`
- `individualTableName`
- `individualColumnName`
- `corporateWorkbookItemId`
- `corporateTableName`
- `corporateColumnName`

## When to Update Credentials

Update credentials and/or metadata whenever any of the following occurs:

1. Client secret rotation or expiration for the Entra app
   - File a request with Bentley IT to rotate secret in the Entra app
2. Service account ownership changes
3. SharePoint site/drive/workbook item changes
4. Workbook table or column name changes
5. CI authentication failures or CLA lookup failures

Additionally, a yearly reminder workflow creates a tracking issue each July 1:

- Workflow: `.github/workflows/cla-rotation-reminder.yml`
- Label: `priority - next release`
- Follow process outlined above to rotate secret in the Entra app
- Request token expiration be set to after the July 1 the following

## How to Access Credentials

Credential access is limited to maintainers with appropriate permissions.

- GitHub Actions secrets
- Repository settings: https://github.com/CesiumGS/cesium/settings/secrets/actions
- Secret name: `MICROSOFT_GRAPH_INFO_JSON`

- Backup storage
  - Backup copies are stored in Bitwarden.
  - Dedicated service account for Forms/Flow ownership: `cesium-cla-automation@bentley.com`
  - Graph credential entry: `CLA Automation - Microsoft Graph Credentials for GitHub CI`

## Rotation / Validation Checklist

After any credential update:

1. Update `MICROSOFT_GRAPH_INFO_JSON` in GitHub Actions secrets.
2. Open a test PR (or re-run the CLA workflow) to validate behavior.
3. Verify signed users are recognized.
4. Verify unsigned users receive CLA instructions and label.
5. Confirm backup credentials in Bitwarden are current.
