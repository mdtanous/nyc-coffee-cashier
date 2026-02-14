import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("ELEVENLABS_API_KEY is not set");
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("file") as Blob;

    if (!audioFile) {
      console.error("No file field in form data");
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    console.log(
      `STT: Received audio file - size: ${audioFile.size} bytes, type: ${audioFile.type}`
    );

    // Convert Blob to a proper File for the ElevenLabs API
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const file = new Blob([buffer], { type: audioFile.type || "audio/webm" });

    // Send to ElevenLabs Speech-to-Text API
    const elevenLabsForm = new FormData();
    elevenLabsForm.append("file", file, "recording.webm");
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
      console.error(
        `ElevenLabs STT error (${response.status}):`,
        errorText
      );
      return NextResponse.json(
        { error: `Speech-to-text failed: ${response.status}`, details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log("STT result:", JSON.stringify(data).slice(0, 200));
    return NextResponse.json({ text: data.text || "" });
  } catch (error) {
    console.error("STT route error:", error);
    return NextResponse.json(
      { error: "Speech-to-text failed" },
      { status: 500 }
    );
  }
}
