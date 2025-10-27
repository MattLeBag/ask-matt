import "dotenv/config";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  const store = await client.vectorStores.create({ name: "matt-cv-store" });
  const files = fs.readdirSync("./docs")
    .filter(f => !f.startsWith("."))
    .map(f => fs.createReadStream(path.join("./docs", f)));
  await client.vectorStores.fileBatches.uploadAndPoll(store.id, { files });
  console.log("✅ VECTOR_STORE_ID:", store.id);
}
main().catch(err => { console.error(err); process.exit(1); });
