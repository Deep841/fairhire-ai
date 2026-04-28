import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles, ChevronDown } from "lucide-react";
import { chatService } from "../services/api";
import { useJobs } from "../context/JobContext";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTION_GROUPS = [
  {
    label: "Candidates",
    chips: [
      "Who are the top candidates?",
      "Which candidates to shortlist?",
      "Show hiring decisions",
      "Why were candidates rejected?",
    ],
  },
  {
    label: "Pipeline",
    chips: [
      "Show pipeline breakdown",
      "How many candidates applied?",
      "Show upcoming interviews",
      "Common skill gaps?",
    ],
  },
  {
    label: "Templates",
    chips: [
      "Write interview questions for a React developer",
      "Draft a job description for a data scientist",
      "Draft offer letter",
      "How to improve resumes?",
    ],
  },
];

// Minimal markdown renderer: bold, bullets, numbered lists, line breaks
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={key++} className="flex gap-2 text-sm leading-relaxed">
          <span className="text-emerald-400 font-bold flex-shrink-0 w-5">{numMatch[1]}.</span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Bullet list
    const bulletMatch = line.match(/^[-•]\s+(.*)/);
    if (bulletMatch) {
      elements.push(
        <div key={key++} className="flex gap-2 text-sm leading-relaxed">
          <span className="text-emerald-400 flex-shrink-0 mt-0.5">•</span>
          <span>{renderInline(bulletMatch[1])}</span>
        </div>
      );
      continue;
    }

    // Indented bullet (2 spaces)
    const indentMatch = line.match(/^\s{2,}[-•]\s+(.*)/);
    if (indentMatch) {
      elements.push(
        <div key={key++} className="flex gap-2 text-sm leading-relaxed ml-4">
          <span className="text-slate-400 flex-shrink-0 mt-0.5">◦</span>
          <span>{renderInline(indentMatch[1])}</span>
        </div>
      );
      continue;
    }

    // Regular line
    elements.push(
      <p key={key++} className="text-sm leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function RecruiterChat() {
  const { activeJob } = useJobs();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Hi! I'm your **FairHire AI Assistant**.\n\nAsk me anything about your candidates, pipeline, skill gaps, or hiring decisions. You can also use the quick suggestions below.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput("");

    const updated: Message[] = [...messages, { role: "user", content: msg }];
    setMessages(updated);
    setLoading(true);

    try {
      const { data } = await chatService.send(
        msg,
        updated.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        activeJob?.id,
      );
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const lastIsAssistant = messages[messages.length - 1]?.role === "assistant";

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-glow flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        title="FairHire AI Assistant"
      >
        {open ? <X className="h-5 w-5 text-white" /> : <MessageCircle className="h-6 w-6 text-white" />}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col glass rounded-2xl shadow-card overflow-hidden"
          style={{
            width: "420px",
            maxHeight: "620px",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0"
            style={{ background: "rgba(16,185,129,0.20)" }}
          >
            <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">FairHire Assistant</p>
              <p className="text-xs text-emerald-300">
                {activeJob ? `Context: ${activeJob.title}` : "AI hiring co-pilot"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    msg.role === "assistant" ? "bg-emerald-600" : "bg-white/20"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl ${
                    msg.role === "assistant"
                      ? "bg-white/10 text-slate-200 rounded-tl-sm"
                      : "bg-emerald-600 text-white rounded-tr-sm text-sm"
                  }`}
                >
                  {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions — always visible when last message is from assistant */}
          {lastIsAssistant && !loading && (
            <div className="flex-shrink-0 border-t border-white/10 px-3 pt-2 pb-1" style={{ background: "rgba(0,0,0,0.15)" }}>
              {/* Group tabs */}
              <div className="flex gap-1 mb-2">
                {SUGGESTION_GROUPS.map((g, idx) => (
                  <button
                    key={g.label}
                    onClick={() => setActiveGroup(idx)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                      activeGroup === idx
                        ? "bg-emerald-600 text-white"
                        : "bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              {/* Chips */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                {SUGGESTION_GROUPS[activeGroup].chips.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-slate-300 hover:bg-emerald-500/40 hover:text-white transition-colors border border-white/10 text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/10 flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
              placeholder="Ask anything about hiring…"
              className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={loading}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
