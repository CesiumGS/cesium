#!/usr/bin/env node

import process, { exit } from "process";
import fs from "fs/promises";

const stdin = process.openStdin();

let output = "";

stdin.setEncoding("utf8");
stdin.on("data", (chunk) => {
  output += chunk;
});

stdin.on("end", function () {
  const outputLines = output.split("\r\n");
  outputLines.forEach((outputLine) => {
    outputLine = outputLine.replace("\r\n", "");
    if (outputLine.startsWith("C:\\")) {
      fs.readFile(outputLine).then((buffer) => {
        let contents = buffer.toString();
        const lines = contents.split("\n");
        console.log(`${outputLine}: ${lines.length}`);

        let combinedImportLine = "import { ";
        lines.filter((line) => {
          const search = /import \{ ([A-Za-z0-9]+) \} from \"((..\/)+)Source\/Cesium\.js\";$/.exec(
            line
          );

          const importModule = search?.at(1);

          if (search) {
            contents = contents.replace(line, "");
            combinedImportLine += `${importModule}, \n`;
          }
        });

        combinedImportLine += `} from \"${"../".repeat(
          outputLine.split("\\").length - 5
        )}Source/Cesium.js\"\n`;

        const newContents = combinedImportLine + contents;

        return fs.writeFile(outputLine, newContents).then(() => {
          exit();
        });
      });
    }
  });
});

// Regex that will match to each file in the ESLint output.
