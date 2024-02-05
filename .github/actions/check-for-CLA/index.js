import { Octokit } from "@octokit/core";
import { google } from "googleapis";
import Handlebars from "handlebars";
import fs from "fs-extra";

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

const main = async () => {
  let hasSignedCLA;
  let errorFoundOnCLACheck;

  try {
    hasSignedCLA = await checkIfUserHasSignedAnyCLA();
  } catch (error) {
    errorFoundOnCLACheck = error.toString();
  }

  const response = await postCommentOnPullRequest(
    hasSignedCLA,
    errorFoundOnCLACheck
  );
};

const checkIfUserHasSignedAnyCLA = async () => {
  let foundIndividualCLA = await checkIfIndividualCLAFound();
  if (foundIndividualCLA) {
    return true;
  }

  let foundCorporateCLA = await checkIfCorporateCLAFound();
  return foundCorporateCLA;
};

const checkIfIndividualCLAFound = async () => {
  const response = await getValuesFromGoogleSheet(
    GOOGLE_SHEETS_INFO.individualCLASheetId,
    "D2:D"
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
    "H2:H"
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
      // Checking for substrings cause many GitHub usernames added as "github.com/username".
      if (words[j].includes(PULL_REQUST_INFO.username.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
};

const getValuesFromGoogleSheet = async (sheetId, cellRanges) => {
  const googleSheetsApi = await getGoogleSheetsApiClient();

  return googleSheetsApi.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: cellRanges,
  });
};

const TEMP_KEY_OBJECT = {
  type: "service_account",
  project_id: "nifty-inn-314413",
  private_key_id: "c0bb98a93e6c80ee2ec082c0914d96fe37217b72",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/O3h3ned28/Dl\nKxDCYPqAuzeFENwI4swmK7zO/lTUh8BK8zg63ItyWaHCljvMJB7+MG3Fi9//LVnL\n8xKY35DdArG7UtQh1dTFkLMP4s+EkjKeadZNWMx+6XYm+Ye40Pc7B6jz2JUVz52y\nQjagtpned2I8TqlhHqEiwuJXhxAwvpDWDuDYiWcUI4Xlq8XWsv6Eu8iXk0JlE5NB\nj43GYGDo1XAVXASdj+f1RaQZRhHpUpFDkX6hCw6aaMfiTSj5cj2bPGHpYSqbun8R\nsmOiZEG/sG5ax0jBn3ho1fFddonPnYGMejniOzPSW+qr/GmB8XjFW63G6lvtYWrf\n/qH1/zPTAgMBAAECggEAHEtPpF3SqiunEDadANrvIC490AxnN1Fcj1FCsFsPxhpd\nKI8ar2rY9GRaphCAbHtJB/xhDCzenuzg2meZRXvep99cLgaFUzRGNQJshq8yW7/I\niYkd/M0PWhUaNuNjYhmuWtI5UfWmVAHR/Vav/9DErMEmjHG/EfBBkIPGkC4bBnsJ\nvFfPIo3AfyhonLFeSxB9PWjacMo2sxh4VdAr8baNKMl8zCd0vT4vjXBvNn8Li7k/\n3QTqV5gUBfkSCRQOlbhItb2FWnfSs558PVBUGWDKTkPsD5Ll40ZNnfhemU06or8k\nocnFbZmPVURwnzsiBGouE1zWYs90MIou3eBKdL5qAQKBgQD51lpuKvWY4aY3FD9J\npTNi8cfckunGcuL5e6EktAHNvudJvzeGL+em1gjiIs2cltBl/zCLvz6il9kbLhfc\nm+bgBIYNY7H3TmNGtadAeVyWQlK95ne/Cc64fTXYnfzevJNJNEvgrAF3xGL/44i0\n3MbEeVPJ9L7+xarjBFyap1xZUwKBgQDD8wtkD1w2eVxQG+jpn0Uhck0koYk8X53l\nw85LvBQVemaH5+LR+jDZTmg7Pb73CSDd0U2oZpDjrL9NLowT8aXOz/pzW9EadwFM\nSeZiorbbQ9Lh+l3KgEfYv2DBPyd5sBhwrUThWeAxjTZzmcykuodXM8DO1TNvCZaw\nenuHAc3rgQKBgBHA0qI7eUJI3pfRX4HrNFCWn74jzmrkpQ5XY6cJB4vIQgUyik6F\nvu9TDESNdpDnAp4M2TVE/L1vDuVojBeIGIrYp3HyIKZTMqjGpcDmHtcqlVibNO0l\nVEQ12YqwB1UIj2rHRZEMh/orwWEvmPpJKfKyMGsMcjoGb9M77xyqQdyzAoGBAL5n\nMtBd5JrCPqNRG3e33fLsIG3R0Yqq1sFnDNSmw1VDhNHWz5594G2oNLwr+Z4ObrNc\nKHvUfkHdoF4dNtxCWX2mtpTVyVBQByDcRlPeDJTvSMFxCSY2lJnXDOt6tJ8YMAd9\nNotLTACaWSjnb+U5oz1m+pmArePdi2GdAt9jL3cBAoGAV4k+3RuyQhB9go/JEogL\nNLoeznBHGPr6gjjVOJ7soFHb3MN2husL/6fTWzXbNUiQVQmMo5+hfuqLMEwAY0mi\n7BLszt34c+fu+cD51ywTy4zVIVQkyKY77AxquX+6lnaGT0oNMfHwj12jnUgHtVWk\nGfz0Q0isFwNwTFfX0BbVTws=\n-----END PRIVATE KEY-----\n",
  client_email: "cla-checking-test@nifty-inn-314413.iam.gserviceaccount.com",
  client_id: "112198629386958476933",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/cla-checking-test%40nifty-inn-314413.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

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
    }
  );
};

const getCommentBody = (hasSignedCLA, errorFoundOnCLACheck) => {
  const commentTemplate = fs.readFileSync(
    "./.github/actions/check-for-CLA/templates/pullRequestComment.hbs",
    "utf-8"
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

main();
