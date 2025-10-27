import OpenAI from "openai";

export default async function handler(req, res) {
  // CORS (allow your site + preflight)
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (ALLOWED_ORIGIN && req.headers.origin && req.headers.origin !== ALLOWED_ORIGIN) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const { messages } = req.body || {};
    if (!messages?.length) return res.status(400).json({ error: "messages required" });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID;

    const systemPrompt = `You are "Ask Matt", a friendly assistant who ONLY answers about Matt Bagley’s
career, projects, skills, and results. Use the attached files for facts.
If asked anything unrelated, reply: "I’m here to talk about Matt’s experience and work."
Prefer specifics (dates, roles, outcomes, tools). Keep answers short and human.`;

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

    return res.status(200).json({ answer: response.output_text ?? "Sorry, I couldn’t find that yet." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
