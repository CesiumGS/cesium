import express from "express";

const port = 8081;

const app = express();

app.use(express.static("./Apps/Sandcastle2/"));
app.use(express.static("."));

app.listen(port, () => {
  //TODO: remove
  // eslint-disable-next-line
  console.log(`Sandcastle server started on port: ${port}`);
});
