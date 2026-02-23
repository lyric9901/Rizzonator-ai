export async function POST(req) {
  try {
    const { messages, copyMode, style } = await req.json();

    // SAFETY
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({
        replies: ["Hey 👋 How can I help?"],
      });
    }

    const rizzStyle = style || "smooth"; // Fallback to smooth if no style provided

    // JOIN USER INPUT (plain text for intent detection)
    const plainTexts = messages
      .map((m) => (typeof m === "string" ? m : (m.text || "").trim()))
      .filter(Boolean);
    const userText = plainTexts.join(" ").toLowerCase();

    // FORMAT messages for model with explicit LEFT/RIGHT prefixes if objects provided
    const modelInput = messages
      .map((m) => (typeof m === "string" ? m : `${(m.side || "UNKNOWN").toUpperCase()}: ${m.text}`))
      .join("\n");

    // INTENT DETECTION
    const isCopyMode =
      copyMode === true ||
      /what should i text|what can i say|how to start|start a convo|give me a reply|write a message|reply to|text her|text him|conversation starter/.test(
        userText
      );

    // SYSTEM PROMPT (DYNAMIC)
    const systemPrompt = isCopyMode
      ? `
You are BeanZ Bot 🤖 — a texting wingman.

IMPORTANT: You will receive conversation lines prefixed with RIGHT or LEFT (e.g., RIGHT: Hey). **RIGHT** indicates messages from the main user. **LEFT** indicates messages from the other person. Use the last message's side to decide whether the latest message is INCOMING (LEFT) or OUTGOING (RIGHT).

The user's preferred texting style is: **${rizzStyle.toUpperCase()}**.
Ensure all your generated messages heavily lean into this ${rizzStyle} persona.

The first line of your reply MUST be either **INCOMING** or **OUTGOING** (uppercase). After that, provide EXACTLY 3 DIFFERENT send-ready messages, each on its own line. Do NOT include any extra explanation or lines.

STRICT RULES:
- First line must be INCOMING or OUTGOING (uppercase).
- Generate EXACTLY 3 DIFFERENT messages (no duplicates).
- Messages must be SEND-READY (can be copied and sent).
- NO explanations, NO coaching, NO meta commentary.
- Do NOT include numbering or bullets — each message must be on a separate line.
- Casual Gen Z English.
- Short, confident, human tone.
- Use emojis where appropriate.
`
      : `
You are BeanZ Bot 🤖 — a helpful AI wingman.

OUTPUT FORMAT (STRICT):
- ALWAYS reply in bullet points
- NO paragraphs
- Use **bold** for key words or decisions
- Max 5 bullet points
- Each bullet = one clear idea
- End with ONE short action line (not a paragraph)

STYLE:
- Friendly, confident, human, humorous.
- The user prefers a ${rizzStyle} approach.
- Sound like a smart friend, not a blog
- No over-explaining

CONTENT RULES:
- Give advice, NOT messages to send
- Do NOT generate copy-paste texts
- Do NOT switch into texting mode
- Give ONE clear answer only
- Can give examples if relevant
- Ask user a question to help user accurately only if needed
`;

    // CALL OPENROUTER
    const aiRes = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "BeanZ Bot",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat",
          temperature: 0.9,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: modelInput,
            },
          ],
        }),
      }
    );

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content || "";

    // Parse and FORMAT RESPONSE
    const lines = raw
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    let replies;
    if (isCopyMode) {
      const header = (lines[0] || "").toUpperCase();
      if (header.startsWith("INCOMING") || header.startsWith("OUTGOING")) {
        replies = lines.slice(1, 4);
      } else {
        replies = lines.slice(0, 3);
      }
    } else {
      replies = [raw.trim()];
    }

    return Response.json({
      replies:
        replies && replies.length > 0
          ? replies
          : ["Hmm… try asking that a different way."],
    });
  } catch (e) {
    return Response.json({
      replies: ["Something went wrong 😅 Try again."],
    });
  }
}
