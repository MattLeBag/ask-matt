import OpenAI from "openai";

export default async function handler(req, res) {
  //
  // ✅ CORS (Allow multiple origins, tolerant parsing, normalize origin)
  //
  const raw = process.env.ALLOWED_ORIGIN || "";
  const ALLOWED_ORIGINS = raw
    .split(/[, \n\r]+/) // allow comma or newline/space separated
    .map(s => s.trim())
    .filter(Boolean)
    .map(u => u.replace(/\/+$/, "")); // strip trailing slash from each allowed origin

  const origin = (req.headers.origin || "").replace(/\/+$/, ""); // normalize incoming origin
  const isAllowed = ALLOWED_ORIGINS.length
    ? ALLOWED_ORIGINS.includes(origin)
    : true; // fallback if no list provided (dev convenience)

  console.log("CORS check:", { origin, ALLOWED_ORIGINS, isAllowed });

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", isAllowed ? origin : "");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (!isAllowed) return res.status(403).json({ error: "Forbidden" });
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const { messages } = req.body || {};
    if (!messages?.length) {
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
    // ✅ Create response from OpenAI (using correct Responses API syntax)
    //
    const last = messages[messages.length - 1] || { role: "user", content: "" };

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_store_ids: [VECTOR_STORE_ID],
        },
      },
      input: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: typeof last === "string" ? last : (last.content ?? ""),
        },
      ],
    });

    //
    // ✅ Return the output
    //
    return res.status(200).json({
      answer: response.output_text ?? "Sorry, I couldn’t find that yet.",
    });

  } catch (e) {
    // ✅ Improved error visibility
    console.error("Server error:", e?.response?.data || e?.message || e);
    const msg = e?.response?.data?.error?.message || e?.message || "Server error";
    return res.status(500).json({ error: msg });
  }
}
