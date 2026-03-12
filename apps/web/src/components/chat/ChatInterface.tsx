"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import { createAPIClient } from "@/lib/api";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt?: string;
}

export default function ChatInterface() {
  const { getToken } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load projects for selector
  const { data: projectsData } = useSWR("projects-chat", async () => {
    const token = await getToken();
    if (!token) throw new Error("No token");
    return createAPIClient(token).getProjects();
  });

  // Load chat history when project selected
  const { data: historyData } = useSWR(
    selectedProjectId ? `chat-history-${selectedProjectId}` : null,
    async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      return createAPIClient(token).getChatHistory(selectedProjectId);
    }
  );

  useEffect(() => {
    if (historyData?.messages) {
      setMessages(historyData.messages as Message[]);
    }
  }, [historyData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !selectedProjectId || sending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "USER",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("No token");

      const result = await createAPIClient(token).sendMessage({
        projectId: selectedProjectId,
        message: userMessage.content,
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "ASSISTANT",
        content: result.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "ASSISTANT",
          content: `Error: ${err.message ?? "Something went wrong"}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  const projects = projectsData?.projects ?? [];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-zinc-200 px-8 py-4 flex items-center justify-between bg-white shrink-0">
        <h1 className="text-lg font-semibold text-zinc-950">AI Assistant</h1>
        <select
          value={selectedProjectId}
          onChange={(e) => {
            setSelectedProjectId(e.target.value);
            setMessages([]);
          }}
          className="border border-zinc-200 rounded-md text-sm px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white"
        >
          <option value="">Select project...</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {!selectedProjectId ? (
          <div className="text-center mt-20">
            <p className="text-sm text-zinc-500">
              Select a project to start chatting with your product data.
            </p>
            <div className="mt-6 space-y-2 text-xs text-zinc-400">
              <p>Try asking:</p>
              <p className="border border-zinc-200 rounded px-3 py-2 text-zinc-600 inline-block">
                "What should we build next?"
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center mt-20">
            <p className="text-sm text-zinc-500 mb-6">
              Ask about your product data
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "What are the top user problems?",
                "What feature should we build next?",
                "What do users complain about most?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-4 py-3 text-sm ${
                  msg.role === "USER"
                    ? "bg-zinc-950 text-white"
                    : "border border-zinc-200 text-zinc-700 bg-white"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                  {msg.content}
                </pre>
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="border border-zinc-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse-slow" />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse-slow" style={{ animationDelay: "0.2s" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse-slow" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 p-4 bg-white shrink-0">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={
              selectedProjectId
                ? "Ask about your product..."
                : "Select a project first"
            }
            disabled={!selectedProjectId || sending}
            className="flex-1 border border-zinc-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 placeholder:text-zinc-400 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!selectedProjectId || !input.trim() || sending}
            className="bg-zinc-950 text-white px-4 py-2.5 rounded-md text-sm hover:bg-zinc-800 disabled:opacity-40 shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
