import express from "express";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { exit } from "process";
import { fileURLToPath } from "url";

let config = {
  serviceapp: {
    clientId: "",
    clientSecret: "",
  },
  port: 3000,
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "./config.json");
try {
  const configFile = readFileSync(configPath, { encoding: "utf-8" });
  config = JSON.parse(configFile);
} catch {
  console.log("config file missing, default written to", configPath);
  console.log("Please update the config with the desired values");
  writeFileSync(configPath, JSON.stringify(config, undefined, 2));
  exit(1);
}

const app = express();
const port = config.port ?? 3000;

// eslint-disable-next-line no-unused-vars
app.get("/service", async (req, res) => {
  console.log("/service request received");

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", config.serviceapp.clientId);
  body.set("client_secret", config.serviceapp.clientSecret);
  body.set("scope", "itwin-platform");

  const response = await fetch("https://ims.bentley.com/connect/token", {
    method: "POST",
    body,
  });

  const result = await response.json();

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!response.ok || !result) {
    console.log("  bad response/no result");
    res.status(response.status).send();
    return;
  }
  const { access_token } = result;
  if (access_token) {
    console.log("  token acquired, returned");
    res.status(200).send({ token: access_token });
    return;
  }
  console.log("  token not found");
  res.status(404).send("token not found");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
