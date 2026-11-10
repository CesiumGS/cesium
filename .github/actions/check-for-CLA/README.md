# CLA Check Automation

This document explains the [Contributor License Agreement (CLA)](../../../CONTRIBUTING.md#contributor-license-agreement-cla) automation process used by CesiumJS CI.

It covers:

- the general CLA architecture,
- when to update credentials,
- and where maintainers can access the required credentials.

## CLA Process Overview

When a pull request is opened, the CLA workflow runs and checks whether the PR author has a signed CLA on file.

- **Workflow**: [`.github/workflows/cla.yml`](../../workflows/cla.yml)
- **Script**: [`.github/actions/check-for-CLA/index.js`](./index.js)

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

We use a **dedicated service account**, `cesium-cla-automation@bentley.com`, as the owner for both:

1. [Microsoft Forms surveys](https://forms.office.com/)
2. [Power Automate flow](https://make.powerautomate.com/)

CLA data is stored in [Excel workbooks in OneDrive/SharePoint](https://bentley.sharepoint.com/:f:/r/sites/Platform/Shared%20Documents/CLAs)

- Platform members and visitors can **view**
- Limited teams/users (eg. CesiumJS and Cesium Native maintainers) can **edit**

#### Power Automate Flow behavior

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

The CI script accesses SharePoint data via the [Microsoft Graph REST API](https://learn.microsoft.com/en-us/graph/) using a Microsoft Entra app registration. The app credentials and workbook metadata are configured in a JSON string stored in a [GitHub Actions secret](https://github.com/CesiumGS/cesium/settings/secrets/actions).

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

If a Sharepoint resource is migrated to a new location, or a workbook table or column name changes, `MICROSOFT_GRAPH_INFO_JSON` and [`.github/actions/check-for-CLA/index.js`](./index.js) must be updated to reflect changes.

## Accessing Credentials

Credential access is limited to maintainers with appropriate permissions.

- **GitHub Actions secrets**: Accessable by users with the CesiumJS **maintainer** role in [**Repository settings / Actions secrets and variables**](https://github.com/CesiumGS/cesium/settings/secrets/actions). Backup copies are stored in Bitwarden.
- **Sharepoint access**: Credentials are shared in Bitwarden.
  - Dedicated service account for Forms/Flow ownership: `cesium-cla-automation@bentley.com`
  - Graph credential entry: `CLA Automation - Microsoft Graph Credentials for GitHub CI`

## Updating Credentials

Entra app access credentials are configured to expire after one year. A yearly reminder workflow, [`.github/workflows/cla-rotation-reminder.yml`](../../workflows/cla-rotation-reminder.yml) creates a tracking issue on July 1.

Follow process outlined in the issue to rotate the client secret in the Entra app:

1. File a request with Bentley IT to rotate the client secret in the Entra app. Request token expiration be set to **August 1 the following year**.
2. Update the value of `MICROSOFT_GRAPH_INFO_JSON` in GitHub Actions secrets.
3. (Optional) Open a test PR or re-run the CLA workflow to validate behavior.
   - Verify signed users are recognized.
   - Verify unsigned users receive CLA instructions and label.
4. Confirm backup credentials in Bitwarden are current.
