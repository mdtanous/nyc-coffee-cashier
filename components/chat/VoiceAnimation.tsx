"use client";

interface VoiceAnimationProps {
  isRecording: boolean;
  isSpeaking: boolean;
  isProcessing: boolean; // transcribing or loading
}

export default function VoiceAnimation({
  isRecording,
  isSpeaking,
  isProcessing,
}: VoiceAnimationProps) {
  // Recording state — red pulsing ring with mic icon
  if (isRecording) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative flex items-center justify-center">
          {/* Outer pulse ring */}
          <div className="absolute h-40 w-40 animate-ping rounded-full bg-red-200 opacity-30" />
          {/* Middle pulse ring */}
          <div
            className="absolute h-32 w-32 animate-ping rounded-full bg-red-300 opacity-40"
            style={{ animationDuration: "1.5s" }}
          />
          {/* Inner circle */}
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-200">
            {/* Mic icon */}
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"
              />
            </svg>
          </div>
        </div>
        <p className="text-sm font-medium text-red-600">Listening...</p>
      </div>
    );
  }

  // Processing state — animated dots
  if (isProcessing) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-4 w-4 animate-bounce rounded-full bg-gray-400"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
            />
          ))}
        </div>
        <p className="text-sm font-medium text-gray-500">Processing...</p>
      </div>
    );
  }

  // Speaking state — animated waveform bars
  if (isSpeaking) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative flex items-center justify-center">
          {/* Outer glow */}
          <div
            className="absolute h-36 w-36 animate-pulse rounded-full bg-blue-100 opacity-50"
            style={{ animationDuration: "2s" }}
          />
          {/* Waveform bars */}
          <div className="relative flex h-24 items-end justify-center gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
              // Create different animation patterns for each bar
              const heights = [
                "h-8 animate-wave-1",
                "h-12 animate-wave-2",
                "h-16 animate-wave-3",
                "h-20 animate-wave-4",
                "h-16 animate-wave-3",
                "h-12 animate-wave-2",
                "h-8 animate-wave-1",
              ];
              return (
                <div
                  key={i}
                  className={`w-2 rounded-full bg-blue-500 transition-all ${heights[i]}`}
                  style={{
                    animation: `waveform ${0.6 + i * 0.1}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              );
            })}
          </div>
        </div>
        <p className="text-sm font-medium text-blue-600">Speaking...</p>
        {/* Inline keyframes for waveform animation */}
        <style jsx>{`
          @keyframes waveform {
            0% {
              height: 8px;
            }
            100% {
              height: 48px;
            }
          }
        `}</style>
      </div>
    );
  }

  // Idle state — gentle pulse with coffee icon
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="relative flex items-center justify-center">
        {/* Subtle pulse ring */}
        <div
          className="absolute h-32 w-32 animate-pulse rounded-full bg-gray-100"
          style={{ animationDuration: "3s" }}
        />
        {/* Inner circle */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gray-900 shadow-lg">
          {/* Mic icon */}
          <svg
            className="h-8 w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"
            />
          </svg>
        </div>
      </div>
      <p className="text-sm text-gray-400">Tap the button below to speak</p>
    </div>
  );
}
