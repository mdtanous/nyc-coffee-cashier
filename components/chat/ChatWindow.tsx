"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "./ChatMessage";
import OrderReceipt from "./OrderReceipt";
import ModificationReceipt from "./ModificationReceipt";
import VoiceAnimation from "./VoiceAnimation";
import useVoiceRecorder from "@/hooks/useVoiceRecorder";
import useTextToSpeech from "@/hooks/useTextToSpeech";

interface OrderItemData {
  item_name: string;
  size: string;
  temperature: string;
  milk_type: string;
  sweetness: string;
  ice_level: string;
  extra_shots: number;
  syrups: { name: string; pumps: number }[];
  item_price: number;
  modifiers_price: number;
}

interface ModificationChange {
  field: string;
  old_value: string;
  new_value: string;
}

interface ModificationData {
  order_number: number;
  changes: ModificationChange[];
  added_items: { description: string; price: number }[];
  new_total: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  order?: {
    order_number: number;
    total_price: number;
    items: OrderItemData[];
  };
  modification?: ModificationData;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey there! Welcome to NYC Coffee. What can I get started for you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isRecording, startRecording, stopRecording, error: voiceError } =
    useVoiceRecorder();
  const { isSpeaking, speak, stop: stopSpeaking } = useTextToSpeech();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendText = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: Message = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) throw new Error("Failed to get response");

        const data = await response.json();
        const assistantContent = data.content;

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: assistantContent,
            ...(data.order && { order: data.order }),
            ...(data.modification && { modification: data.modification }),
          },
        ]);

        // In voice mode, speak the response (always uses text content, not visual receipt)
        if (isVoiceMode) {
          speak(assistantContent);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I'm having trouble right now. Could you try again?",
          },
        ]);
      } finally {
        setIsLoading(false);
        if (!isVoiceMode) {
          inputRef.current?.focus();
        }
      }
    },
    [messages, isLoading, isVoiceMode, speak]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText(input);
    }
  };

  const handleVoiceToggle = () => {
    if (isRecording) return;
    if (isSpeaking) stopSpeaking();
    setIsVoiceMode((prev) => !prev);
  };

  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording and transcribe
      setIsTranscribing(true);
      const transcript = await stopRecording();
      setIsTranscribing(false);

      if (transcript) {
        sendText(transcript);
      }
    } else {
      // Stop any current speech and start recording
      if (isSpeaking) stopSpeaking();
      await startRecording();
    }
  };

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col bg-white">
      {/* Voice/Text Toggle */}
      <div className="flex items-center justify-center gap-2 border-b border-gray-100 py-2">
        <button
          onClick={handleVoiceToggle}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !isVoiceMode
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Text
        </button>
        <button
          onClick={handleVoiceToggle}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            isVoiceMode
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Voice
        </button>
      </div>

      {/* Main Content Area */}
      {isVoiceMode ? (
        // Voice mode: show animation with last assistant message as context
        <VoiceAnimation
          isRecording={isRecording}
          isSpeaking={isSpeaking}
          isProcessing={isTranscribing || isLoading}
          lastAssistantMessage={(() => {
            const last = messages.filter((m) => m.role === "assistant").pop();
            if (!last) return undefined;
            if (last.order) {
              return `Order #${last.order.order_number} confirmed - $${last.order.total_price.toFixed(2)}`;
            }
            if (last.modification) {
              return `Order #${last.modification.order_number} updated - $${last.modification.new_total.toFixed(2)}`;
            }
            return last.content;
          })()}
        />
      ) : (
        // Text mode or transcript visible: show messages
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto max-w-2xl">
            {messages.map((msg, i) =>
              msg.order ? (
                <OrderReceipt
                  key={i}
                  orderNumber={msg.order.order_number}
                  totalPrice={msg.order.total_price}
                  items={msg.order.items}
                />
              ) : msg.modification ? (
                <ModificationReceipt
                  key={i}
                  orderNumber={msg.modification.order_number}
                  changes={msg.modification.changes}
                  addedItems={msg.modification.added_items}
                  newTotal={msg.modification.new_total}
                />
              ) : (
                <ChatMessage key={i} role={msg.role} content={msg.content} />
              )
            )}
            {isLoading && (
              <div className="mb-3 flex justify-start">
                <div className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm text-gray-400">
                  Typing...
                </div>
              </div>
            )}
            {isTranscribing && (
              <div className="mb-3 flex justify-end">
                <div className="rounded-2xl bg-gray-200 px-4 py-2.5 text-sm text-gray-400">
                  Transcribing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Voice Error */}
      {voiceError && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-xs text-red-600">
          {voiceError}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl gap-2">
          {isVoiceMode ? (
            // Voice mode: big mic button
            <button
              onClick={handleMicClick}
              disabled={isLoading || isTranscribing}
              className={`flex-1 rounded-full py-3 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              {isRecording
                ? "Tap to stop recording"
                : isTranscribing
                ? "Transcribing..."
                : "Tap to speak"}
            </button>
          ) : (
            // Text mode: text input + send button
            <>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your order..."
                className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-500 focus:outline-none"
                disabled={isLoading}
              />
              <button
                onClick={() => sendText(input)}
                disabled={isLoading || !input.trim()}
                className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
