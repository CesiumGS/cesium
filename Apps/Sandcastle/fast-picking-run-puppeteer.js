/* eslint-disable */

import puppeteer from "puppeteer";
import fs from "fs";
import shell from "shelljs";

const arcGISTerrainUrl =
  "http://localhost:8080/Apps/Sandcastle/standalone.html#c=nVRtb9s4DP4rQj4MKZbKdmzHdpcUa7thVyDdC5rbcECAg2LTjlBZyiQ5WXbofx/9kixpsx3uvkniQz7kQ4prpslGaZHNQGvGJZkQtmHckhswvCppqoFZ+HKAuDJbmfb/mUtCNHytwNgviNB3zDxcEKsrGByYPoO28O290iUTZm9+PHs1l3O5Rm6m04KbLvRHrdY8A/00iSudvru9n3EB2VsBa2a5kk9caK5V+acWfQzcW1q7MheOAzuwn9GWiKaqdNqjozE/x4Be8xSM05S4j+6/cToCPN2WrIB7BIKe9+byZ/JrDpsmWwmbXa6fm7f+vJc29xslLUapPQekEc0eJ35xWoJjlZbMTEEWdnkNIK95gZQ5CgoNIK9kWudMhCo69rOWyoCd8RJUZft70M5GSB1YQ4mkXBa1uIZMWgvpKqMmBQm0EGoB9G9T6ZyleLCInSqWfaqggj94saSiSY68/O/ud5DVqv3/AFO16bxftc48J/0nZV2ScF81OSVmPZed++Mvo0wmE+KSFy+eBTiInam0KkFaulDZlqaCGTPlxlKWZTgSGzhnGs4zJWHeOzsmPGheY3gcEN916/Nj3eRjM07Fc4FAsgUKg/2wmPPPquo+W6YLsMeTesPwbxrOpN+vCZEtilwaunE09OPEj4PmI4cjP0i8IfV8z0+CMA6b12ESxV44pMN4FIZB6Hmj9l/UXCrPzb9wYcyAJlHgJvEoisPRsAl6HiU+9QMviZLYjb0o8FquIElognnFIzca+d5o2HG1EqSsBM2oUOrhyvbbQgddEr+CzTSTJset1O/yu2NW828BvX3z9v3sdvZXK3Jv0BsbuxVwuevva16ulLakwk1DqWOhXAncfsZZVOkDWJoas+vr2Dl0HWd8TXg2ObEXSDMmaMkrIe75d5yNy7GD+GeuAoceW/sBF5Fg2xq29C6n7SOldOzg9bSnVUosGJLtKzmwtZvnDmT1hPkQ9V2p8rqyVknzG1QGWJWYwhrEb1CGoWxwOtrhGfWvVzlucqFSJpbK2AucDNe5Wq2Mc89kljJjBTgFEwL01vkB";
const cesiumWorldTerrainUrl =
  "http://localhost:8080/Apps/Sandcastle/standalone.html#c=nVRtb9s2EP4rhD8UDuZQkiVZUmoHS9JiDeB0G+K1GGCgoKWTTIQiPZKy6xb57zu92JWTtMP6jeQ9d8/dc8fbMk12SotsAVozLsmMsB3jltyA4VVJUw3Mwsce4srsZTr8upSEaPinAmM/IkLfMfNwQayuYNQzfQBt4fN7pUsmzNH8ePZ6KZdyi9xMpwU3Xeg/tNryDPTTJK50+tvt/YILyN4K2DLLlXziQnOtyr+0GCL5crC2dmMuHAcOaD+jLRNNVem0R0djgo4BveUpGKep8Rjef+N0DHi6LVkB9wgEvRx8y33LYdckK2F3SPVD8zZcDtLmfqOkxRi134g0mtnTvC9O1D/VZs3MHGRh19cA8poXyJSjjNAA8kqmdaJEqKIjPWsZDNgFL0FVdngEHWyE1IE1lEjGZVFLasistZCuIGpSkEALoVZAP5lK5yzFg0XsXLHszwoqeMeLNRVNcuSX/+9+B1kt1s8HmKtd5/26deY5GT4p65KEx6rJS2LW09i5P343ymw2Iy559epZgF7sTKVVCdLSlcr2NBXMmDk3lrIsw0nYwTnTcJ4pCe309Ah7zWsMjyPiu259fqybfGrGqXguEEi2QmGwHxZz/lZV3WfLdAH2dEBvGP5Iw5n0669Ss0WRS0M3jsZ+nPhx0HzfcOIHiTemnu/5SRDGYfM6TqLYC8d0HE/CMAg9b7KUZx2XynPzH1wYM6BJFLhJPInicDJugp5HiU/9wEuiJHZjLwq8litIEppgXvHEjSa+Nxl3XK0EKStBMyqUeriyw7bQUZfE92ALzaTJcRcNu/zumNX8c0Bv37x9v7hd/N2KPBgNpsbuBVwe+vsrLzdKW1LhfqHUsVBuBO4846yq9AEsTY059HXq9F2nGd8Sns1eWAekGRO05JUQ9/wLzsbl1EH8M1eBQ4+t/R23j2D7Grb2LuftI6V06uD1ZU+rlFgxJDtW0rO1G+cOZPWEuY/6olR5XVmrpPkBKgOsSsxhC+IHKMNQNng5Wv+M+tf7G9e3UCkTa2XsBU6G61xtNsa5ZzJLmbECnIIJAXrv/As";

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
      { timeout: 60000 },
    );
  } catch (e) {
    console.error(e);
  } finally {
    if (page) {
      console.log("stopping trace");
      await page.tracing.stop();
    }
    console.log("closing browser");
    await browser.close();
  }
})();
