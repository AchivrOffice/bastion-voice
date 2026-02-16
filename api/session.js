module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  var apiKey = process.env.OPENAI_API_KEY || (req.body && req.body.apiKey);
  if (!apiKey) {
    return res.status(400).json({
      error: "NO_KEY",
      message: "Set OPENAI_API_KEY in Vercel env vars, or pass apiKey in request body."
    });
  }

  var voice = (req.body && req.body.voice) || "ash";
  var instructions = (req.body && req.body.instructions) || "You are a helpful assistant.";
  var model = (req.body && req.body.model) || "gpt-realtime-mini";

  try {
    var r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: model,
          instructions: instructions,
          output_modalities: ["audio"],
          audio: {
            input: {
              transcription: { model: "gpt-4o-mini-transcribe" },
              turn_detection: { type: "semantic_vad", eagerness: "medium" }
            },
            output: { voice: voice }
          }
        }
      })
    });

    var data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({
        error: "OPENAI_ERROR",
        message: (data.error && data.error.message) || "OpenAI API error",
        details: data
      });
    }

    return res.status(200).json({
      clientSecret: data.value || (data.client_secret && data.client_secret.value),
      expiresAt: data.expires_at || (data.client_secret && data.client_secret.expires_at)
    });
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
};
