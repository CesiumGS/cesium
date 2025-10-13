import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import "@dotenvx/dotenvx/config";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY;
const GITHUB_WORKFLOW = process.env.GITHUB_WORKFLOW;
const COMMIT_SHA = process.env.COMMIT_SHA;
const CESIUM_VERSION = process.env.CESIUM_VERSION;

export async function setDeployStatus({ status, url, context, message }) {
  if (!GITHUB_TOKEN || GITHUB_TOKEN === "") {
    throw new Error(`Environment variable is not defined: "GITHUB_TOKEN"`);
  }

  if (!GITHUB_REPO || GITHUB_REPO === "") {
    throw new Error(`Environment variable is not defined: "GITHUB_REPO"`);
  }

  if (!COMMIT_SHA || COMMIT_SHA === "") {
    throw new Error(`Environment variable is not defined: "COMMIT_SHA"`);
  }

  const body = {
    state: status,
    context: context,
    target_url: url,
    description: message,
  };

  console.log(`Posting ${GITHUB_REPO} commit status of ${COMMIT_SHA}:
    ${JSON.stringify(body, null, 2)}`);

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/statuses/${COMMIT_SHA}`,
    {
      method: "post",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${GITHUB_TOKEN}`,
        "User-Agent": "Cesium",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Responded with ${response.status}`);
  }

  const result = await response.json();
  return result;
}

const getArtifactContext = (artifact) => {
  if (!GITHUB_WORKFLOW || GITHUB_WORKFLOW === "") {
    return `artifact: ${artifact}`;
  }

  return `${GITHUB_WORKFLOW} / artifact: ${artifact}`;
};

await yargs()
  .command(
    "* <status> [context] [url] [message]",
    "set deploy status of a build artifact",
    (yargs) =>
      yargs
        .positional("status", {
          type: "string",
          choices: ["error", "failure", "pending", "success"],
          describe: "The state that the commit will be marked as.",
        })
        .positional("context", {
          type: "string",
          describe: "A label to differentiate this status check.",
        })
        .positional("url", {
          type: "string",
          describe: "The linked URL to associate with this status.",
        })
        .positional("message", {
          type: "string",
          describe: "A short description of the status.",
        }),
    setDeployStatus,
  )
  .command(
    "coverage <status>",
    "set deploy status of a build artifact",
    () => {},
    async ({ status }) =>
      setDeployStatus({
        status,
        url: process.env.COVERAGE_URL,
        context: getArtifactContext("coverage report"),
      }),
  )
  .command(
    "zip <status>",
    "set deploy status of the zip file",
    () => {},
    async ({ status }) =>
      setDeployStatus({
        status,
        url: process.env.ZIP_URL,
        context: getArtifactContext(`Cesium-${CESIUM_VERSION}.zip`),
      }),
  )
  .command(
    "npm <status>",
    "set deploy status of the npm package",
    () => {},
    async ({ status }) =>
      setDeployStatus({
        status,
        url: process.env.NPM_URL,
        context: getArtifactContext(`cesium-${CESIUM_VERSION}.tgz`),
      }),
  )
  .command(
    "index <status>",
    "set deploy status of the static build",
    () => {},
    async ({ status }) =>
      setDeployStatus({
        status,
        url: process.env.INDEX_URL,
        context: getArtifactContext("index.html"),
      }),
  )
  .parse(hideBin(process.argv));
