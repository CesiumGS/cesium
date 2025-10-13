# Continuous Integration

- [Background](#background)
- [Actions and workflows](#actions-and-workflows)
- [Continuous deployment](#continuous-deployment)
- [Configuration](#configuration)
  - [Configure a different S3 bucket](#configure-a-different-s3-bucket)
  - [Configure S3 credentials](#configure-s3-credentials)

## Background

CesiumJS uses [GitHub Actions](https://docs.github.com/en/actions) for continuous integration (CI).

- [**CI for CesiumJS: A Deep Dive into Our GitHub Actions Workflow** (2024)](https://cesium.com/blog/2024/08/12/ci-for-cesiumjs-github-actions-workflow/)
- [**Cesium Continuous Integration** (2016)](https://cesium.com/blog/2016/04/07/cesium-continuous-integration/)

## Actions and workflows

Reusable actions are defined in `/.github/actions/` and workflows in `.github/workflows/`.

Workflows are triggered when a commit is pushed to the `cesium` repository and when a contributor opens or updates a pull request. After the build has completed, the overall status of the build is shown at the bottom of the pull request page.

In the dropdown menu, individual status checks are displayed. Logs and deployed build artifacts can be accessed by clicking the link associated with the individual check.

![GitHub Action Checks](github_action_checks.png)

The status checks for any branch are also accessible under the [Branches](https://github.com/CesiumGS/cesium/branches/all) page by clicking the icon next to the branch name.

![GitHub Branches](github_branches.png)

## Continuous deployment

Automated deployments make recent code changes available for convenient testing and review—No need to fetch or build locally. In the `cesium` repository, all continuous deployment artifacts are uploaded for commits authored by users with commit access.

Each of the following are deployed on a per-branch basis.

| Artifact         | Link pattern (`main`)                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sandcastle       | `https://ci-builds.cesium.com/cesium/<BRANCH>/Apps/Sandcastle/index.html` (i.e., [`https://ci-builds.cesium.com/cesium/main/Apps/Sandcastle/index.html`](https://ci-builds.cesium.com/cesium/main/Apps/Sandcastle/index.html))             |
| Documentation    | `https://ci-builds.cesium.com/cesium/<BRANCH>/Build/Documentation/index.html` (i.e., [`https://ci-builds.cesium.com/cesium/main/Build/Documentation/index.html`](https://ci-builds.cesium.com/cesium/main/Build/Documentation/index.html)) |
| Coverage results | `https://ci-builds.cesium.com/cesium/<BRANCH>/Build/Coverage/index.html` (i.e., [`https://ci-builds.cesium.com/cesium/main/Build/Coverage/index.html`](https://ci-builds.cesium.com/cesium/main/Build/Coverage/index.html))                |
| Release zip      | `https://ci-builds.cesium.com/cesium/<BRANCH>/Cesium-<VERSION>-<BRANCH>.0.zip` (i.e., [`https://ci-builds.cesium.com/cesium/main/Cesium-1.X.X-main.0.zip`](https://ci-builds.cesium.com/cesium/main/Cesium-1.X.X-main.0.zip))              |
| npm package      | `https://ci-builds.cesium.com/cesium/<BRANCH>/cesium-<VERSION>-<BRANCH>.0.tgz` (i.e., [`https://ci-builds.cesium.com/cesium/main/cesium-1.X.X-main.0.tgz`](https://ci-builds.cesium.com/cesium/main/cesium-1.X.X-main.0.tgz))              |

## Configuration

Additional set up is required for deployment _only_ if you do not have commit access to CesiumJS.

### Configure a different S3 bucket

It is possible to configure your development branch of CesiumJS to deploy build artifacts to a different [AWS S3 Bucket](http://docs.aws.amazon.com/AmazonS3/latest/dev/UsingBucket.html). If you are using the default "cesium-public-builds" bucket and have valid credentials, skip to [Configure S3 Credentials](#configure-s3-credentials)

In the environment file `.env`, update the following values:

- Replace the value of `BUILD_ARTIFACT_BUCKET` with the name of the target S3 bucket.
- Replace the value of `BUILD_ARTIFACT_URL` with the public URL correspondeding to the target S3 bucket.

### Configure S3 credentials

To configure CI for deployment for a fork of CesiumJS, you must have valid credentials to an S3 bucket.

- Go to your fork of CesiumJS
- Click the **Setting** tab
- In the left sidebar, under the **Security** section, click **Secrets and Variables** > **Actions**
- Under **Repository secrets** add two environment variables, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, with your access key and secret key

![GitHub Environment Variables](github_environment_variables.png)
