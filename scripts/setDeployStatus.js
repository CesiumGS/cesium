import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_SHA = process.env.GITHUB_SHA;

export async function setDeployStatus({ status, url, context, message }) {
  if (!GITHUB_TOKEN) {
    throw new Error(`Environment variable is not defined:"GITHUB_TOKEN"`);
  }

  if (!GITHUB_REPO) {
    throw new Error(`Environment variable is not defined:"GITHUB_REPO"`);
  }

  if (!GITHUB_SHA) {
    throw new Error(`Environment variable is not defined:"GITHUB_SHA"`);
  }

  const body = {
    state: status,
    context: context ? `deploy / artifact: ${context}` : undefined,
    target_url: url,
    description: message,
  };

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/statuses/${GITHUB_SHA}`,
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

  const result = await response.json();
  return result;
}

await yargs()
  .command(
    "* <status> [context] [url] [message]",
    "set deploy status of a build artifact",
    async (yargs) => {
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
        });
    },
    setDeployStatus,
  )
  .parse(hideBin(process.argv));
