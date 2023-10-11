import "dotenv/config";
import OpenAI from "openai";
import express from "express";
import { createGuid } from "@cesium/engine";

if (!process.env.OPENAI_API_KEY) {
  console.error("You must set the environment variable: OPENAI_API_KEY");
  throw new Error("You must set the environment variable: OPENAI_API_KEY");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** @type {Map<string, {startedAt: string, messages: object[]}>} */
const sessions = new Map();

export default function createAiServer(app) {
  // eslint-disable-next-line no-unused-vars
  app.get("/ai/start", (req, res) => {
    const sessionId = createGuid();

    sessions.set(sessionId, {
      startedAt: new Date().toISOString(),
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant producing javascript code for cesiumjs. You do not include an html wrapper",
        },
        {
          role: "system",
          content:
            "`createWorldTerrain` does not exist. you always replace 'terrainProvider: Cesium.createWorldTerrain()' with 'terrain: Cesium.Terrain.fromWorldTerrain()'",
        },
      ],
    });

    res.json({ sessionId });
  });

  app.get("/ai/:sessionId/end", (req, res) => {
    const { sessionId } = req.params;
    sessions.delete(sessionId);
    res.sendStatus(200);
  });

  app.post("/ai/:sessionId/ask", express.json(), async (req, res) => {
    const { message: newMessage } = req.body;

    if (!newMessage) {
      throw new Error("No message provided");
    }

    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!sessionId || !sessions.has(sessionId) || !session) {
      throw new Error(`Unknown sessionId: ${sessionId}`);
    }

    const messageHistory = session.messages;

    session.messages.push({ role: "user", content: newMessage });
    console.log(`session '${sessionId}' asked: "${newMessage}"`);
    console.log("  session history length", messageHistory.length);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [...messageHistory, { role: "user", content: newMessage }],
    });
    console.log(response);

    session.messages.push(response.choices[0].message);

    res.json(response);
  });
}
