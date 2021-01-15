import path from "path";
import fs from "fs";
const name = path.resolve(path.dirname(""));
const directoryPath = path.join(name, "traces");

const methodNamesWeCareAbout = [
  "nodeAddTriangle",
  "getOverlap",
  "TrianglePicking",
  "computeVertices",
];

const isLastOnly = Array.from(process.argv).includes("--last");

fs.readdir(directoryPath, function (err, files) {
  if (err) {
    return console.log("Unable to scan directory: " + err);
  }

  let fileObjects = files
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const reg = new RegExp("(\\d+).json").exec(file);
      const ts = parseInt(reg[1]);
      return {
        name: file,
        ts,
      };
    });
  let sortedFileObjects = fileObjects.sort((a, b) => a.ts - b.ts);

  if (isLastOnly) {
    sortedFileObjects = [sortedFileObjects.pop()];
  }

  sortedFileObjects.forEach(function (file) {
    // Do whatever you want to do with the file
    const timestamp = new Date(file.ts).toLocaleString();
    let relevantLines = "";
    var data = fs.readFileSync("traces/" + file.name, "utf8");
    let logs;
    try {
      logs = fs.readFileSync(
        "traces/" + file.name.replace(".json", ".txt"),
        "utf8"
      );
    } catch (err) {}
    if (logs) {
      const logLines = logs
        .split("\n")
        .map((t) => t.trim())
        .filter((t) => t.length > 2);
      relevantLines = logLines
        .filter((l) =>
          methodNamesWeCareAbout.some((rel) =>
            l.toLowerCase().includes(rel.toLowerCase())
          )
        )
        .join("\n");
    }
    const obj = JSON.parse(data);

    function ms(v) {
      return `${Math.floor(v)}ms`;
    }

    function maxMinAvg(arr) {
      var max = arr[0];
      var min = arr[0];
      var sum = arr[0]; //changed from original post
      for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
          max = arr[i];
        }
        if (arr[i] < min) {
          min = arr[i];
        }
        sum = sum + arr[i];
      }
      return {
        count: arr.length,
        sum: ms(sum),
        max: ms(max),
        min: ms(min),
        mean: ms(sum / arr.length),
      }; //changed from original post
    }

    let begin,
      end,
      samples = {
        name: "creating octree",
        items: [],
      };
    for (const event of obj.traceEvents) {
      if (event.name === samples.name && event.ph === "b") {
        begin = event;
        if (end) {
          throw new Error("whoops!");
        }
      }
      if (event.name === samples.name && event.ph === "e") {
        end = event;
        if (!begin) {
          throw new Error("whoops!");
        }

        const time = end.ts - begin.ts;
        end = null;
        begin = null;
        samples.items.push(time / 1000);
      }
    }

    console.table({
      event: samples.name,
      ts: timestamp,
      ...maxMinAvg(samples.items),
    });
    console.log(relevantLines);
  });
});
