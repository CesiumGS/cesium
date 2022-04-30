import puppeteer from "puppeteer";
import fs from "fs";
import shell from "shelljs";

const arcGISTerrainUrl =
  "http://localhost:8080/Apps/Sandcastle/standalone.html#c=nVRtb9owEP4rFh8mqrVOQhKSMKjWN22V6F5UtGoS0mSSI1h1bGY70G7iv++SAIOWbtq+XXIvzz3PnW/BNFkqLbIRaM24JANyAYaXBU01MAt3O772z7EkRMP3Eoy9Q6e+Yea+R6wu4XjH9QW0hYcPShdMmK17dfRmLMdygYBMpzk366qftFrwDDQiS1hu0M90+u76dsQFZFcCFsxyJZ8ktCvIuiVCSi16jUXIuDWzdm56jgObTD+jDSZNVeE0pqOxVceAXvAUjFMT3UL5l84aDa3rguVwi4Ggx62a6Gosf7NZcFg+bf9L/a89bqX194WSFmvV+U3Ldp9L77Am+7LNmBmCzO3sHECe8xwhp6gw1AHTUqZV50SofI1+1EAZsCNegCptexu08RFSFdZQICiXeaW3IYONkg0zalKQQHOhJkC/mVJPWYqGxdihYtnnEkp4z/MZFXVz5PW/p99AVqn2/wWGarnOftMk8ylpP6F1SsIta3JIzGpR1+mrF6sMBgPiklevnhXYqZ2ptCxAWjpR2SNNBTNmyI2lLMtwJZZwwjScZErCuHW0D7gzvNqxOia+61b2qhryvhu34rlAINkEhcF5WOz5N6tqzpbpHOz+pl4wfKyGM+nX7wnRosiloRtHHT9O/DioFz7s+kHidajne34ShHFY/+0kUeyFHdqJu2EYhJ7Xbd5FhaWmU/MXLKwZ0CQK3CTuRnHY7dRFT6LEp37gJVESu7EXBV6DFSQJTbCvuOtGXd/rdtZYjQQpK0AzKpS6P7PthujxuomXwkaaSTPFM9Ve93fDrOYPAb2+vPowuh59bURuHbf6xj4KON3M9y0v5krb6uq0KXUsFHOB59A4kzK9B0tTYzZz7Tu7qf2MLwjPBgfuAqnXBD3TUohb/gN347TvYPyzVIFLj6P9iOdIsMcqbOadDpuflNK+g5+HM61SYsIQbMtkx9dcnhuQ5RPk3agfShXnpbVKmj9EZYCsxBAWIP4QZRjKBoer7dqof3XQ8Z4LlTIxU8b2cDNc52w+N84tk1nKjBXg5EwI0I/OLw";
const cesiumWorldTerrainUrl =
  "http://localhost:8080/Apps/Sandcastle/standalone.html#c=nVRtb9owEP4rFh8mqrVOQhKSMKjWdtNWiXabilpNQppMcgSrjs1sB9pO/PddEqDQl03bt0vu5bnnufMtmCZLpUU2Aq0Zl2RAzsDwsqCpBmbhZsfX/jWWhGj4WYKxN+jUF8zc9ojVJRzuuK5BW7i7VLpgwmzdq4N3YzmWCwRkOs25WVf9qtWCZ6ARWcJyg36i00/nVyMuIPsoYMEsV/JJQruCrFsipNSi11iEjFsza+em5ziwyfQz2mDSVBVOYzoaW3UM6AVPwTg10S2U/8FZo6F1XrAcrjAQ9LhVE12N5SObBYfl0/av63/tcSutv8+UtFirzm9atvtcentD2FdrxswQZG5npwDylOeINEVhoQ6YljKtGiZC5WvQgwbBgB3xAlRp29ugjY+QqrCGAsG4zCuZDRlsBGwIUZOCBJoLNQH6w5R6ylI0LMYOFcu+lVDCZ57PqKibI2//Pf0Cskqs/y8wVMt19rsmmU9J+wmtYxJuWZOXxKz2c52+erXKYDAgLnnz5lmBndqZSssCpKUTld3TVDBjhtxYyrIMN2EJR0zDUaYkjFsH+4A7w6sdq0Piu25lr6oh77txK54LBJJNUBich8WeH1lVc7ZM52D3F/SM4Rs1nEm/fkaIFkUuDd046vhx4sdBvedh1w8Sr0M93/OTIIzD+m8niWIv7NBO3A3DIPS8bvMcKiw1nZq/YGHNgCZR4CZxN4rDbqcuehQlPvUDL4mS2I29KPAarCBJaIJ9xV036vpet7PGaiRIWQGaUaHU7YltN0QP1028FjbSTJopXqf2ur8LZjW/C+j5h4+Xo/PR90bk1mGrb+y9gOPNfN/zYq60rY5Nm1LHQjEXeAWNMynTW7A0NWYz176zm9rP+ILwbPDCOSD1mqBnWgpxxR9wN477DsY/SxW49DjaL3iFBLuvwmbe8bD5SSntO/j5cqZVSkwYgm2Z7Piai3MBsnyCvBv1oFRxWlqrpPlDVAbISgxhAeIPUYahbPBytV0b9a/uOJ5xoVImZsrYHm6G65zM58a5YjJLmbECnJwJAfre+Q0";

(async () => {
  process.argv;
  const now = Date.now();

  let commit = shell.exec("git rev-parse --short HEAD");
  commit = `${commit}`.trim();

  if (!fs.existsSync("Apps/Sandcastle/traces/")) {
    fs.mkdirSync("Apps/Sandcastle/traces/");
  }
  const path = `Apps/Sandcastle/traces/cesium_trace_${commit}__${now}.json`;
  const logPath = `Apps/Sandcastle/traces/cesium_trace_${commit}__${now}.txt`;
  const access = fs.createWriteStream(logPath);

  var stdoutWrite = process.stdout.write;
  var stderrWrite = process.stderr.write;

  function write() {
    stdoutWrite.apply(process.stdout, arguments);
    access.write.apply(access, arguments);
  }

  function writeErr() {
    stderrWrite.apply(process.stderr, arguments);
    access.write.apply(access, arguments);
  }

  process.stdout.write = write;
  process.stderr.write = writeErr;

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: false,
    dumpio: true,
    product: "chrome",
    // product: "firefox",
    args: [
      `--window-size=${1800},${1800}`,
      `--js-flags=--trace-opt --trace-deopt`,
    ],
  });
  let page;
  try {
    const url = arcGISTerrainUrl;
    page = await browser.newPage();
    await page.goto(url);

    console.log(`starting trace ${path}`);
    await page.tracing.start({ path, screenshots: false });
    console.log("waiting for page to be ready");
    await page.waitForFunction(
      `document.body.classList.contains("we-are-done")`,
      { timeout: 60000 }
    );
  } finally {
    if (page) {
      console.log("stopping trace");
      await page.tracing.stop();
    }
    console.log("closing browser");
    await browser.close();
  }
})();
