import { Octokit } from "@octokit/core";
import { google } from "googleapis";
import Handlebars from "handlebars";
import fs from "fs-extra";

const PULL_REQUST_INFO = {
    id: 11781,
    owner: process.env.GITHUB_REPOSITORY.split('/')[0],
    repoName: process.env.GITHUB_REPOSITORY.split('/')[1],
    username: process.env.GITHUB_ACTOR,
    gitHubToken: process.env.GITHUB_TOKEN
};

/* TODO: Store in repo secrets */
/* TODO: Replace with actual Cesium spreadsheet Ids - these are test sheets so okay to git push */
const GOOGLE_SHEETS_INFO = {
    individualCLASheetId: '1oRRS8OG4MfXaQ8uA4uWQWukaOqxEE3N-JuqzrqGGeaE',
    corporateCLASheetId: '1dnoqifzpXB81G1V4bsVJYM3D19gXuwyVZZ-IgNgCkC8'
};

/* TODO: Change to actual link */
const LINKS = {
    contributorsListURL: 'https://google.com'
};

const main = async () => {
    console.log('main()');
    console.log(PULL_REQUST_INFO.repoName, PULL_REQUST_INFO.owner, PULL_REQUST_INFO.username);

    let hasSignedCLA;
    let errorFoundOnCLACheck;

    try {
        hasSignedCLA = await checkIfUserHasSignedAnyCLA();
    } catch (error) {
      console.log('ERROR2 ', error);
      errorFoundOnCLACheck = error.toString();
    }

    console.log('pre-comment...');
    const response = await postCommentOnPullRequest(hasSignedCLA, errorFoundOnCLACheck);
    console.log('post-comment, response: ', response);
};

const checkIfUserHasSignedAnyCLA = async () => {    
    const googleSheetsApi = await getGoogleSheetsApiClient();

    let foundIndividualCLA = await checkIfIndividualCLAFound(googleSheetsApi);
    console.log('CLA #1 ', foundIndividualCLA);
    if (foundIndividualCLA) {
        return true;
    }

    let foundCorporateCLA = await checkIfCorporateCLAFound(googleSheetsApi);
    console.log('CLA #2 ', foundCorporateCLA);
    return foundCorporateCLA;
};

const getGoogleSheetsApiClient = async () => {
    const auth = new google.auth.GoogleAuth({
        // This json contains keys for my personal Google Sheets with no sensitive company data 
        // and I'm fine with exposing those for now
        keyFile: 'TempGoogleConfig.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const googleAuthClient = await auth.getClient();

    return google.sheets({version: 'v4', auth: googleAuthClient });
};

const checkIfIndividualCLAFound = async (googleSheetsApi) => {
    const response = await googleSheetsApi.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEETS_INFO.individualCLASheetId,
        range: 'D2:D'
    });

    const rows = response.data.values;
    for (let i = 0; i < rows.length; i++) {
        if(rows[i].length === 0) {
            continue;
        }

        const rowUsername = rows[i][0].toLowerCase();
        if (PULL_REQUST_INFO.username.toLowerCase() === rowUsername) {
            return true;
        }
    }

    return false;
};

const checkIfCorporateCLAFound = async (googleSheetsApi) => {
    const response = await googleSheetsApi.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEETS_INFO.corporateCLASheetId,
        range: 'H2:H'
    });

    const rows = response.data.values;
    for (let i = 0; i < rows.length; i++) {
        if(rows[i].length === 0) {
            continue;
        }

        // We're more lenient with the ScheduleA username check since it's an unformatted text field.
        let rowScheduleA = rows[i][0].toLowerCase();
        rowScheduleA = rowScheduleA.replace(/\n/g, ' ');
        const words = rowScheduleA.split(' ');

        for (let j = 0; j < words.length; j++) {
            // Checking for substrings because many input their 
            // GitHub username as "github.com/username".
            if (words[j].includes(PULL_REQUST_INFO.username.toLowerCase())) {
                return true;
            }
        }
    }

    return false;
};

const postCommentOnPullRequest = async (hasSignedCLA, errorFoundOnCLACheck) => {
  console.log('adding comment...');

    const octokit = new Octokit();  
    return octokit.request(`POST /repos/${PULL_REQUST_INFO.owner}/${PULL_REQUST_INFO.repoName}/issues/${PULL_REQUST_INFO.id}/comments`, {
        owner: PULL_REQUST_INFO.username,
        repo: PULL_REQUST_INFO.repoName,
        issue_number: PULL_REQUST_INFO.id,
        body: getCommentBody(hasSignedCLA, errorFoundOnCLACheck),
        headers: {
            authorization: `bearer ${PULL_REQUST_INFO.gitHubToken}`,
            accept: 'application/vnd.github+json',    
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });
};

const getCommentBody = (hasSignedCLA, errorFoundOnCLACheck) => {
    console.log('getting comment template...');

    const commentTemplate = fs.readFileSync('./.github/actions/check-for-cla/templates/pullRequestComment.hbs', 'utf-8');
    const getTemplate = Handlebars.compile(commentTemplate);
    const commentBody = getTemplate({ 
        errorCla: errorFoundOnCLACheck,
        hasCla: hasSignedCLA,
        username: PULL_REQUST_INFO.username,
        contributorsUrl: LINKS.contributorsListURL
     });
 
    return commentBody;
};

main();