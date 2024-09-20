import { Octokit } from "@octokit/core";
import { google } from "googleapis";
import Handlebars from "handlebars";
import fs from "fs-extra";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const PULL_REQUST_INFO = {
  id: process.env.PULL_REQUEST_ID,
  owner: process.env.GITHUB_REPOSITORY.split("/")[0],
  repoName: process.env.GITHUB_REPOSITORY.split("/")[1],
  username: process.env.GITHUB_ACTOR,
  gitHubToken: process.env.GITHUB_TOKEN,
};

const GOOGLE_SHEETS_INFO = {
  APIKeys: process.env.GOOGLE_KEYS,
  individualCLASheetId: process.env.INDIVIDUAL_CLA_SHEET_ID,
  corporateCLASheetId: process.env.CORPORATE_CLA_SHEET_ID,
};

const CONTRIBUTORS_URL =
  "https://github.com/CesiumGS/cesium/blob/main/CONTRIBUTORS.md";

const getGoogleSheetsApiClient = async () => {
  const googleConfigFilePath = "GoogleConfig.json";
  fs.writeFileSync(googleConfigFilePath, GOOGLE_SHEETS_INFO.APIKeys);

  const auth = new google.auth.GoogleAuth({
    keyFile: googleConfigFilePath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const googleAuthClient = await auth.getClient();

  return google.sheets({ version: "v4", auth: googleAuthClient });
};

const getValuesFromGoogleSheet = async (sheetId, cellRanges) => {
  const googleSheetsApi = await getGoogleSheetsApiClient();

  return googleSheetsApi.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: cellRanges,
  });
};

const checkIfIndividualCLAFound = async () => {
  const response = await getValuesFromGoogleSheet(
    GOOGLE_SHEETS_INFO.individualCLASheetId,
    "D2:D",
  );

  const rows = response.data.values;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length === 0) {
      continue;
    }

    const rowUsername = rows[i][0].toLowerCase();
    if (PULL_REQUST_INFO.username.toLowerCase() === rowUsername) {
      return true;
    }
  }

  return false;
};

const checkIfCorporateCLAFound = async () => {
  const response = await getValuesFromGoogleSheet(
    GOOGLE_SHEETS_INFO.corporateCLASheetId,
    "H2:H",
  );

  const rows = response.data.values;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length === 0) {
      continue;
    }

    // We're more lenient with the ScheduleA username check since it's an unformatted text field.
    let rowScheduleA = rows[i][0].toLowerCase();
    rowScheduleA = rowScheduleA.replace(/\n/g, " ");
    const words = rowScheduleA.split(" ");

    for (let j = 0; j < words.length; j++) {
      // Checking for substrings because many GitHub usernames added as "github.com/username".
      if (words[j].includes(PULL_REQUST_INFO.username.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
};

const checkIfUserHasSignedAnyCLA = async () => {
  const foundIndividualCLA = await checkIfIndividualCLAFound();
  if (foundIndividualCLA) {
    return true;
  }

  const foundCorporateCLA = await checkIfCorporateCLAFound();
  return foundCorporateCLA;
};

const getCommentBody = (hasSignedCLA, errorFoundOnCLACheck) => {
  const commentTemplate = fs.readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "templates/pullRequestComment.hbs",
    ),
    "utf-8",
  );

  const getCommentFromTemplate = Handlebars.compile(commentTemplate);
  const commentBody = getCommentFromTemplate({
    errorCla: errorFoundOnCLACheck,
    hasCla: hasSignedCLA,
    username: PULL_REQUST_INFO.username,
    contributorsUrl: CONTRIBUTORS_URL,
  });

  return commentBody;
};

const postCommentOnPullRequest = async (hasSignedCLA, errorFoundOnCLACheck) => {
  const octokit = new Octokit();

  return octokit.request(
    `POST /repos/${PULL_REQUST_INFO.owner}/${PULL_REQUST_INFO.repoName}/issues/${PULL_REQUST_INFO.id}/comments`,
    {
      owner: PULL_REQUST_INFO.username,
      repo: PULL_REQUST_INFO.repoName,
      issue_number: PULL_REQUST_INFO.id,
      body: getCommentBody(hasSignedCLA, errorFoundOnCLACheck),
      headers: {
        authorization: `bearer ${PULL_REQUST_INFO.gitHubToken}`,
        accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
};

const main = async () => {
  let hasSignedCLA;
  let errorFoundOnCLACheck;

  try {
    hasSignedCLA = await checkIfUserHasSignedAnyCLA();
  } catch (error) {
    errorFoundOnCLACheck = error.toString();
  }

  await postCommentOnPullRequest(hasSignedCLA, errorFoundOnCLACheck);
};

main();
