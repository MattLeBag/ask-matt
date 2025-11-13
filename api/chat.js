import OpenAI from "openai";

export default async function handler(req, res) {
  //
  // ✅ CORS (allow multiple origins, tolerant parsing, normalize origin)
  //
  const raw = process.env.ALLOWED_ORIGIN || "";
  const ALLOWED_ORIGINS = raw
    .split(/[, \n\r]+/)            // allow comma or newline/space separated
    .map(s => s.trim())
    .filter(Boolean)
    .map(u => u.replace(/\/+$/, "")); // strip trailing slash

  const origin = (req.headers.origin || "").replace(/\/+$/, "");
  const isAllowed = ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*') : true;

  // helpful when debugging in Vercel logs
  console.log("CORS check:", { origin, ALLOWED_ORIGINS, isAllowed });

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", isAllowed ? origin : "");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (!isAllowed) return res.status(403).json({ error: "Forbidden" });
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const { message } = req.body || {};
    if (!message?.length) {
      return res.status(400).json({ error: "messages required" });
    }

    //
    // ✅ OpenAI setup
    //
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID;

    //
    // ✅ System prompt: defines the chatbot’s role
    //
    const systemPrompt = `
      You are "Ask Matt", a friendly assistant who ONLY answers about Matt Bagley’s
      career, projects, skills, and results. Use the attached files for facts.
      If asked anything unrelated, reply: "I’m here to talk about Matt’s experience and work."
      Prefer specifics (dates, roles, outcomes, tools). Keep answers short and human.
    `;

    //
    // ✅ Create response (Responses API + file_search via attachments)
    //
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: 'user', content: message} // last user turn
      ],
      tools: [{ type: "file_search" }],
      attachments: [
        {
          // this is the correct place to pass your vector store for file_search
          file_search: { vector_store_ids: [VECTOR_STORE_ID] },
        },
      ],
      stream: false,
    });

    return res.status(200).json({
      answer: response.output_text ?? "Sorry, I couldn’t find that yet.",
    });
  } catch (e) {
    console.error("Server error:", e?.response?.data || e);
    return res.status(500).json({ error: "Server error" });
  }
}
