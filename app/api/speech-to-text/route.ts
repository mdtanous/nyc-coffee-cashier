import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Send to ElevenLabs Speech-to-Text API
    const elevenLabsForm = new FormData();
    elevenLabsForm.append("audio", audioFile, "recording.webm");
    elevenLabsForm.append("model_id", "scribe_v1");

    const response = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
        body: elevenLabsForm,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs STT error:", errorText);
      return NextResponse.json(
        { error: "Speech-to-text failed" },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ text: data.text || "" });
  } catch (error) {
    console.error("STT route error:", error);
    return NextResponse.json(
      { error: "Speech-to-text failed" },
      { status: 500 }
    );
  }
}
