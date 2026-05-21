import { exit } from "node:process";
import { format, setDate } from "date-fns";
import { getKnownTokens } from "./ionTokenUpdater.js";

const ION_TOKEN_CONTROLLER_TOKEN = process.env.ION_TOKEN_CONTROLLER_TOKEN;

if (!ION_TOKEN_CONTROLLER_TOKEN) {
  console.error("Missing token for the ion key deleter");
  exit(1);
}

const BASE_URL = "https://api.cesium.com";

async function deleteOldTokens() {
  const existingTokens = await getKnownTokens();
  for (const token of existingTokens) {
    console.log(`Checking token "${token.name}"`);

    // This is expected to run at the end of the release process.
    // The token to delete should be labeled as "Delete on [first of the current month]"
    const dateToDelete = setDate(new Date(), 1);
    const deleteDateString = format(dateToDelete, "MMMM d, yyyy");

    if (token.name.includes(deleteDateString)) {
      console.log("  deleting token");
      try {
        const resp = await fetch(`${BASE_URL}/v2/tokens/${token.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${ION_TOKEN_CONTROLLER_TOKEN}`,
          },
        });
        if (!resp.ok) {
          throw new Error(`Response status: ${resp.status}`);
        }
      } catch (error) {
        console.error(error);
        exit(1);
      }
    }
  }
}

await deleteOldTokens();
