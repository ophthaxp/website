import { NextResponse } from "next/server";

export const runtime = "nodejs";

// POST /api/ai-chat
// Body: { message: string, history?: { role: 'user'|'assistant', content: string }[] }
//
// If ANTHROPIC_API_KEY is set, this forwards to the Claude Messages API.
// Otherwise, it returns a deterministic stub so local development works without keys.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { message?: string; history?: { role: "user" | "assistant"; content: string }[] }
    | null;

  const message = body?.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 422 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ reply: stubReply(message) });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system:
          "You are the OphthaXP assistant. Help final-year MBBS students and practising ophthalmologists choose mentorship cohorts (cataract, retina, glaucoma, cornea, paediatric, neuro, refractive, uveitis). Keep replies under 4 sentences. Suggest a relevant program slug when helpful.",
        messages: [
          ...(body.history ?? []).map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: message },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Upstream error", details: text },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const reply =
      data.content
        ?.filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("\n") ?? "";

    return NextResponse.json({ reply: reply || stubReply(message) });
  } catch (err) {
    console.error("[ai-chat] failed", err);
    return NextResponse.json({ reply: stubReply(message) });
  }
}

function stubReply(message: string) {
  const m = message.toLowerCase();
  if (m.includes("mbbs") || m.includes("student"))
    return "If you've just finished MBBS and want to specialise in ophthalmology, start with the Cornea & Refractive Fellowship Prep cohort or the Cataract Mastery Cohort — both are designed to bridge from MBBS to confident clinical practice.";
  if (m.includes("compare"))
    return "Cataract is best for surgical volume; Retina/Vitreo-Retinal for posterior segment depth; Cornea/Refractive for high-precision day-care surgery; Glaucoma for long-term medical decision-making.";
  if (m.includes("what is") || m.includes("ophthaxp"))
    return "OphthaXP is a live, cohort-based mentorship platform where senior ophthalmologists teach practising clinicians and MBBS graduates through real cases, small groups and a practice-first curriculum.";
  return "Tell me your current qualification and which subspecialty interests you — I'll match you to the right cohort.";
}
