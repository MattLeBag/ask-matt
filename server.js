import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

app.post("/api/chat", async (req, res) => {
  try {
    if (ALLOWED_ORIGIN && req.headers.origin && req.headers.origin !== ALLOWED_ORIGIN) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { messages } = req.body || {};
    if (!messages?.length) return res.status(400).json({ error: "messages required" });

    const systemPrompt = `
You are "Ask Matt", a friendly assistant who ONLY answers about Matt Bagley’s
career, projects, skills, and results. Use the attached files for facts.
If asked anything unrelated, reply: "I’m here to talk about Matt’s experience and work."
Prefer specifics (dates, roles, outcomes, tools). Keep answers short and human.
`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: systemPrompt },
        messages[messages.length - 1]
      ],
      tools: [{ type: "file_search" }],
      attachments: [{ vector_store_id: VECTOR_STORE_ID }],
      stream: false
    });

    res.json({ answer: response.output_text ?? "Sorry, I couldn’t find that yet." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(3000, () => console.log("🚀 Ask Matt API is live at http://localhost:3000"));
