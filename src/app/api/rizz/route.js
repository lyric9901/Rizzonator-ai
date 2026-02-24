export async function POST(req) {
  try {
    const { messages, copyMode, profile } = await req.json();

    // 1. SAFETY & VALIDATION
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({
        replies: ["Hey 👋 How can I help?"],
      });
    }

    // 2. EXTRACT USER PROFILE (From Onboarding)
    // We use fallbacks just in case the profile isn't fully set up yet
    const name = profile?.name || "User";
    const userGender = profile?.userGender || "someone";
    const targetGender = profile?.targetGender || "someone";
    const struggle = profile?.struggle || "keeping the conversation interesting";
    const platform = profile?.platform || "texting/Instagram";
    const blocker = profile?.blocker || "overthinking";
    const preferredRizz = profile?.preferredRizz || "smooth";

    // 3. JOIN USER INPUT (plain text for intent detection)
    const plainTexts = messages
      .map((m) => (typeof m === "string" ? m : (m.text || "").trim()))
      .filter(Boolean);
    const userText = plainTexts.join(" ").toLowerCase();

    // 4. FORMAT MESSAGES FOR MODEL (explicit LEFT/RIGHT prefixes if objects provided)
    const modelInput = messages
      .map((m) => (typeof m === "string" ? m : `${(m.side || "UNKNOWN").toUpperCase()}: ${m.text}`))
      .join("\n");

    // 5. INTENT DETECTION
    const isCopyMode =
      copyMode === true ||
      /what should i text|what can i say|how to start|start a convo|give me a reply|write a message|reply to|text her|text him|conversation starter/.test(
        userText
      );

    // 6. DYNAMIC SYSTEM PROMPT
    const systemPrompt = isCopyMode
      ? `
You are BeanZ Bot 🤖 — an elite texting wingman.

USER PSYCHOLOGICAL PROFILE:
- Name: ${name}
- Identity: A ${userGender} trying to pull a ${targetGender} on ${platform}.
- Weakness: Their main struggle is "${struggle}" and their mental blocker is "${blocker}".
- Chosen Persona: **${preferredRizz.toUpperCase()}**. You MUST heavily embody this specific style.

IMPORTANT: You will receive conversation lines prefixed with RIGHT or LEFT (e.g., RIGHT: Hey). **RIGHT** indicates messages from the main user (the person using this app). **LEFT** indicates messages from the other person. Use the last message's side to decide whether the latest message is INCOMING (LEFT) or OUTGOING (RIGHT).

The first line of your reply MUST be either **INCOMING** or **OUTGOING** (uppercase). After that, provide EXACTLY 3 DIFFERENT send-ready messages, each on its own line. Do NOT include any extra explanation or lines.

STRICT RULES:
- First line must be INCOMING or OUTGOING (uppercase).
- Generate EXACTLY 3 DIFFERENT messages (no duplicates).
- Messages must be SEND-READY (can be copied and sent).
- Offset their blocker ("${blocker}") by making the texts confident and natural.
- NO explanations, NO coaching, NO meta commentary.
- Do NOT include numbering or bullets — each message must be on a separate line.
- Casual Gen Z English.
- Short, confident, human tone.
- Use emojis where appropriate.
- Do not provide a roadmap to copy-paste messages in this mode.
`
      : `
You are BeanZ Bot 🤖 — a highly advanced AI wingman, social strategist, and dating coach.

USER PSYCHOLOGICAL PROFILE:
- Name: ${name}
- Identity: A ${userGender} trying to pull a ${targetGender} on ${platform}.
- Weakness: Their main struggle is "${struggle}" and their mental blocker is "${blocker}".
- Chosen Persona: **${preferredRizz.toUpperCase()}**. Adopt this tone in your advice.

OUTPUT FORMAT (STRICT):
- ALWAYS reply in bullet points
- NO paragraphs
- Use **bold** for key words or decisions
- Max 5 bullet points
- Each bullet = one clear idea
- End with ONE short action line (not a paragraph)

MAGIC COPY FEATURE (CRITICAL):
- If you suggest a specific message, phrase, IG Note, or song name for the user to copy, you MUST wrap it exactly in double quotes. 
- Example: Send them this text: "I just heard a song that reminded me of you."
- Example 2: Set your IG Note to "Late night drives 🌙".
- Do NOT use double quotes for anything else. Only use them for text the user should interact with or copy.

STYLE:
- Friendly, confident, human, humorous
- Sound like a smart friend, not a boring blog
- No over-explaining

CONTENT RULES & ROADMAPS:
- Give advice, NOT just messages to send
- Do NOT generate a list of copy-paste texts here (that is for a different mode)
- Do NOT switch into texting mode
- Give ONE clear answer only
- Can give examples if relevant
- You CAN give the user a strategic roadmap to get a partner. For example: tell them to set their bio to ___, post stories about ___, text first with ___, set profile pic to ___, set IG story about ___ with song ___, set song on notes to ___, etc.
- If giving a roadmap, space it out! Do not tell them to do everything on Day 1. Break it down like Day 1, Day 2, Day 3, etc.
- Keep the advice actionable for ${platform}.
- Ask the user a question to help them accurately ONLY if absolutely needed.
- Tell user exactly what to set in.
`;

    // 7. CALL OPENROUTER AI
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
          model: "deepseek/deepseek-chat", // DeepSeek model as per original code
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

    // 8. PARSE AND FORMAT RESPONSE
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
        // Fallback: assume the first 3 non-empty lines are the messages
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
    console.error("AI Generation Error:", e);
    return Response.json({
      replies: ["Something went wrong 😅 Try again."],
    });
  }
}
