import { NextRequest, NextResponse } from "next/server";

// Default to a friendly female voice — "Rachel"
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

async function callElevenLabs(
  apiKey: string,
  voiceId: string,
  text: string,
  modelId: string,
  languageCode?: string
): Promise<Response> {
  const body: Record<string, unknown> = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: 0.4,
      similarity_boost: 0.75,
    },
  };
  if (languageCode) {
    body.language_code = languageCode;
  }

  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const voiceId = DEFAULT_VOICE_ID;

    // Try ElevenLabs v3 first (supports expressive audio tags like [cheerfully])
    let response = await callElevenLabs(apiKey, voiceId, text, "eleven_v3", "en");

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `ElevenLabs v3 failed [${response.status}]: voice=${voiceId}, text_length=${text.length}, error=${errorText}. Falling back to turbo_v2_5.`
      );

      // Fallback: strip expressive tags (e.g. [cheerfully]) and retry with turbo_v2_5
      const fallbackText = text.replace(/^\[.*?\]\s*/, "");
      response = await callElevenLabs(apiKey, voiceId, fallbackText, "eleven_turbo_v2_5");

      if (!response.ok) {
        const fallbackError = await response.text();
        console.error(
          `ElevenLabs turbo_v2_5 fallback also failed [${response.status}]: ${fallbackError}`
        );
        return NextResponse.json(
          { error: "Text-to-speech failed", detail: fallbackError },
          { status: 500 }
        );
      }
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS route error:", error);
    return NextResponse.json(
      { error: "Text-to-speech failed" },
      { status: 500 }
    );
  }
}
