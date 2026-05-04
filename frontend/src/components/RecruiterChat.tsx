import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles } from "lucide-react";
import { chatService } from "../services/api";
import { useJobs } from "../context/JobContext";

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTION_GROUPS = [
  { label: "Candidates", chips: ["Who are the top candidates?", "Which candidates to shortlist?", "Show hiring decisions", "Why were candidates rejected?"] },
  { label: "Pipeline",   chips: ["Show pipeline breakdown", "How many candidates applied?", "Show upcoming interviews", "Common skill gaps?"] },
  { label: "Templates",  chips: ["Write interview questions for a React developer", "Draft offer letter", "How to improve resumes?"] },
];

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    if (!line.trim()) { elements.push(<div key={key++} className="h-2" />); continue; }
    const num = line.match(/^(\d+)\.\s+(.*)/);
    if (num) { elements.push(<div key={key++} className="flex gap-2 text-sm leading-relaxed"><span className="font-bold flex-shrink-0 w-5 text-slate-500">{num[1]}.</span><span>{renderInline(num[2])}</span></div>); continue; }
    const bullet = line.match(/^[-•]\s+(.*)/);
    if (bullet) { elements.push(<div key={key++} className="flex gap-2 text-sm leading-relaxed"><span className="flex-shrink-0 mt-0.5 text-slate-400">•</span><span>{renderInline(bullet[1])}</span></div>); continue; }
    elements.push(<p key={key++} className="text-sm leading-relaxed">{renderInline(line)}</p>);
  }
  return <div className="space-y-0.5">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

export default function RecruiterChat() {
  const { activeJob } = useJobs();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi, I'm your QuantumLogic assistant. Ask me anything about your candidates, pipeline, or hiring decisions." },
  ]);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open, loading]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput("");
    const updated: Message[] = [...messages, { role: "user", content: msg }];
    setMessages(updated);
    setLoading(true);
    try {
      const { data } = await chatService.send(msg, updated.slice(-12).map((m) => ({ role: m.role, content: m.content })), activeJob?.id);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally { setLoading(false); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid rgba(255,255,255,0.12)' }}
        title="AI Assistant"
      >
        <span className="relative z-10 flex items-center justify-center">
          {open
            ? <X className="h-5 w-5" style={{ color: '#fff' }} />
            : <img src="/message.png" alt="chat" className="h-7 w-7" style={{ filter: 'brightness(0) invert(1)' }} />
          }
        </span>
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed right-6 z-50 flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden" style={{ width: "400px", bottom: "80px", height: "560px" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <div>
              <p className="text-sm font-bold text-slate-900">QuantumLogic Assistant</p>
              <p className="text-xs text-slate-400">{activeJob ? activeJob.title : "AI hiring co-pilot"}</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  msg.role === "assistant"
                    ? "bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-sm"
                    : "bg-slate-900 rounded-tr-sm"
                } `} style={msg.role === "user" ? { color: '#fff' } : undefined}>
                  {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages[messages.length - 1]?.role === "assistant" && !loading && (
            <div className="flex-shrink-0 border-t border-slate-100 px-3 pt-2 pb-2 bg-slate-50">
              <div className="flex gap-1 mb-2">
                {SUGGESTION_GROUPS.map((g, idx) => (
                  <button key={g.label} onClick={() => setActiveGroup(idx)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                      activeGroup === idx ? "bg-slate-900" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
                    }`}
                    style={activeGroup === idx ? { color: '#fff' } : undefined}>
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTION_GROUPS[activeGroup].chips.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="text-xs px-2.5 py-1 rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors text-left">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
              placeholder="Ask anything about hiring…"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              disabled={loading}
            />
            <button onClick={() => send(input)} disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-xl btn-glass-dark disabled:opacity-40 flex items-center justify-center flex-shrink-0">
              <Send className="h-4 w-4" style={{ color: '#fff' }} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
