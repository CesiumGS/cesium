import puppeteer from "puppeteer";
import fs from "fs";
import shell from "shelljs";

(async () => {
  process.argv;
  const now = Date.now();

  let commit = shell.exec("git rev-parse --short HEAD");
  commit = `${commit}`.trim();

  const path = `traces/cesium_trace_${commit}__${now}.json`;

  const logPath = `traces/cesium_trace_${commit}__${now}.txt`;

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
    args: [
      `--window-size=${1800},${1800}`,
      `--js-flags=--trace-opt --trace-deopt`,
    ],
  });
  let page;
  try {
    const url = `http://localhost:8080/Apps/Sandcastle/standalone.html#c=zVZtb9s2EP4rhD8UDpZQLyQlKk2C5aVdAzjdhhgthnkYGOnsCKHFjKScpkP++06SldhOsiXFBswfbMr3+txzp+NCWXJjrC7GYK0qK7JPjsGV9ZzmFpSHzyuy4Z+TihALf9Tg/GcU2jPlrnaJtzVsr4g+gfXw5aOxc6Xdvfhu6+2kmlQLDKhsPivd0utP1izKAixGruCmj35o8x9Oz8elhuKdhoXypak2DIZNyDYlQmqrd7sTIZPBpffXbjcIoLdkBe1i0tzMg+4YWEw1cGAXZQ4uaIHeh2InwTIank7nagbnqAh2MmiB3k2qBzSLEm420//U/jecDPL2+dhUHn219l3Kfh3L7tM1WS/bpXIjqGb+8gigOipnGHKKFYZWYVpXeZM50Wa2jL7VhXLgx+UcTO2H90q9jJDGsYU5Bi2rWVNvR/b7SnbIqMuhAjrT5gLo7662U5XjwaPuyKji5xpq+FDOLqlukyPfvd78DIqmat/uYGRultZvO+NySoYbsA6IuEdNnipm06hL87tnvezv75OQvHnzyMGK78Lk9RwqTy9McUtzrZwblc5TVRTYEjewoyzsFKaCyWBrPeAKea3gbptEYRg2D3cNy+vySRUEDb1EY/k9pki8aVFgvzwuHVTqAkvWq97jnVTnqipy5byGJsUTmKpa+7Ex+kLZM6jqdtJ+7TK8B4kj7ndx2M5MXXnyDocD52k5H83HVA7nL0edJ7quw2quDv2ZX5oO+1I0qJdF2X4m5gelp+TEzOE18ZpO98rOsF5rs3qs8HXlSlWx4YMyITsxl1kSCxpKlsSxiHi6vSbnLGMZjyjHDwtjviZlUsaCCZpxwaOUySx9kD4A7ZIy06l7aVKJFCnlYRbGIUsFT9aC8iimLJZcMpFknAm5Jo0RARUCE4oTGcVhzJ5JqWudXM3BKtqxNOwKt73M9Z/Ux1ZVbooLYLiEc6a8Lb9wenry7uP4dPzLK7jG5iTv0V9eutyQI3X7n3KehlJGnEohJMMG2GA8RjJFRrkIJRdZmG5QnkU8ZA3lKY8z/PlXKE/DhMc0SULssTDjiVjPiUVJElERpRnSHqVyMykhQkFRmmVpxBljyf+P9N/a78ngqzHzo9p7ZHUy6Dfsyl7beF10PL+YYRaGaRpSpC6NkSom+4EVCeMZTk7EIpxnIfsCx1kqIxHTWCbN1ERRW7oOxIs5RN+cZilOrExSKZJ46XwnzRhlPMrSTIYySnnUR+VZRjPMUiZhmiC78UrUl5L0zfS0S2awPdhz/lbDQc/X9+X82ljfXLOGlAYe5tca738uuKjzK/A0d64ndy9YNd0rygUpi/0nLkKk3YsomdZan5df8V1+sBeg/iNTjVseN9aPSLxuxv9g7zI6GHV/Ukr3Anx82tJ3OwxNeiQrsu6q1ey3jcirWms9+axWAYhKj2AB+m+0nMKywdPeVs9Y/+YGixdYbXKlL43zu9gkYXB4fe2Ch2UdzJTWYG+DvwA`;
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
