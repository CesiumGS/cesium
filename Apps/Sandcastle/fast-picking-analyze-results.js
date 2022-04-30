import path from "path";
import fs from "fs";
const name = path.resolve(path.dirname(""));
const directoryPath = path.join(name, "Apps/Sandcastle/traces");

const methodNamesWeCareAbout = [
  "nodeAddTriangle",
  "getOverlap",
  "TrianglePicking",
  "computeVertices",
  "createOctree",
];

const isLastOnlyArg = Array.from(process.argv).find((arg) =>
  arg.toLowerCase().includes("--last")
);
const isIncludeLogsArg = Array.from(process.argv).find((arg) =>
  arg.toLowerCase().includes("--logs")
);

const isLastOnly = !!isLastOnlyArg;
const isLastOnlyValue = isLastOnly
  ? isLastOnlyArg.replace("--last", "").replace("=", "").trim()
  : undefined;
const lastCount = isLastOnlyValue ? parseInt(isLastOnlyValue) : 1;

const isIncludeLogs = !!isIncludeLogsArg;

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
    sortedFileObjects = sortedFileObjects.slice(
      sortedFileObjects.length - lastCount
    );
  }

  sortedFileObjects.forEach(function (file) {
    // Do whatever you want to do with the file
    const timestamp = new Date(file.ts).toLocaleString();
    let relevantLines = "";
    var data = fs.readFileSync("Apps/Sandcastle/traces/" + file.name, "utf8");
    let logs;
    try {
      logs = fs.readFileSync(
        "Apps/Sandcastle/traces/" + file.name.replace(".json", ".txt"),
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
      return Math.floor(v);
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

    // {
    //   "args": {},
    //   "cat": "devtools.timeline,disabled-by-default-v8.gc",
    //   "dur": 3,
    //   "name": "V8.GC_STOP_THE_WORLD",
    //   "ph": "X",
    //   "pid": 43656,
    //   "tdur": 3,
    //   "tid": 76035,
    //   "ts": 151218196413,
    //   "tts": 14835
    // }
    //
    // {
    //   "args": {},
    //   "cat": "devtools.timeline,disabled-by-default-v8.gc",
    //   "dur": 5,
    //   "name": "V8.GC_STOP_THE_WORLD",
    //   "ph": "X",
    //   "pid": 43656,
    //   "tdur": 4,
    //   "tid": 76035,
    //   "ts": 151218196701,
    //   "tts": 15123
    // }
    const measurements = {};

    for (const event of obj.traceEvents) {
      const isTimingEvent =
        event.cat === "blink.console" &&
        event.scope === "blink.console" &&
        ["b", "e"].includes(event.ph);
      if (!isTimingEvent) {
        continue;
      }

      const name = event.name;
      if (!measurements[name]) {
        measurements[name] = {
          name: name,
          samples: [],
          begin: null,
        };
      }
      const eventSamples = measurements[name];

      const isBeginEvent = event.ph === "b";
      const isEndEvent = event.ph === "e";

      if (!isEndEvent && !isBeginEvent) {
        throw new Error(`either begin or end event found: ${event}`);
      }
      if (isEndEvent && !eventSamples.begin) {
        console.warn("end event before begin event");
        continue;
      }

      if (isEndEvent) {
        const endTimestamp = event.ts;
        const beginTimestamp = eventSamples.begin;
        const time = endTimestamp - beginTimestamp;
        eventSamples.samples.push(time / 1000);
        eventSamples.begin = null;
      }

      if (isBeginEvent) {
        eventSamples.begin = event.ts;
      }
    }

    const tableData = [];

    for (const value of Object.values(measurements)) {
      tableData.push({
        event: value.name,
        ts: timestamp,
        ...maxMinAvg(value.samples),
      });
    }
    tableData.sort((a, b) => b.sum - a.sum);

    console.table(tableData);
    if (isIncludeLogs) {
      console.log(relevantLines);
    }
  });
});
