//requiring path and fs modules
const path = require("path");
const fs = require("fs");
const directoryPath = path.join(__dirname, "traces");
fs.readdir(directoryPath, function (err, files) {
  if (err) {
    return console.log("Unable to scan directory: " + err);
  }
  let fileObjects = files.map((file) => {
    const reg = new RegExp("(\\d+).json").exec(file);
    const ts = parseInt(reg[1]);
    return {
      name: file,
      ts,
    };
  });
  let sortedFileObjects = fileObjects.sort((a, b) => a.ts - b.ts);

  sortedFileObjects.forEach(function (file) {
    // Do whatever you want to do with the file
    const timestamp = new Date(file.ts).toLocaleString();
    var data = fs.readFileSync("traces/" + file.name, "utf8");
    if (err) throw err;
    obj = JSON.parse(data);

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
  });
});
