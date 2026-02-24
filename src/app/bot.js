"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

// Advanced Inline Copy Component (Hides quotes, makes text clickable)
const InlineCopyBubble = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-1 rounded-lg bg-cyan-500/15 text-cyan-300 font-bold hover:bg-cyan-500/25 transition-all active:scale-95 border border-cyan-500/30 cursor-pointer shadow-sm group align-middle"
      title="Tap to copy"
    >
      {text}
      {copied ? (
        <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </span>
  );
};

const SUGGESTIONS = [
  { 
    text: "How to start a convo?", 
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
  },
  { 
    text: "What should I text?", 
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
  },
  { 
    text: "Should I follow on IG?", 
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  },
  { 
    text: "Fix my Instagram bio", 
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  },
];

export default function Bot() {
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]);
  const [copied, setCopied] = useState(null);
  const [copyMode, setCopyMode] = useState(false);
  const [userProfile, setUserProfile] = useState({});

  const chatRef = useRef(null);
  const bottomRef = useRef(null);

  // custom scrollbar refs & state
  const thumbRef = useRef(null);
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);

  // Haptic feedback for mobile
  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("rizzonator_profile") || "{}");
      setUserProfile(p);
    } catch (e) {}
  }, []);

  const updateThumb = () => {
    const el = chatRef.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;

    const { scrollHeight, clientHeight, scrollTop } = el;

    if (scrollHeight <= clientHeight) {
      thumb.style.opacity = "0";
      return;
    } else {
      thumb.style.opacity = "1";
    }

    const ratio = clientHeight / scrollHeight;
    const thumbHeight = Math.max(ratio * clientHeight, 30);
    const maxThumbTop = clientHeight - thumbHeight;
    const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * maxThumbTop;

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${thumbTop}px)`;
  };

  const startDrag = (e) => {
    dragging.current = true;
    dragStartY.current = e.clientY;
    dragStartScroll.current = chatRef.current?.scrollTop || 0;
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
  };

  const onDrag = (e) => {
    if (!dragging.current) return;
    const el = chatRef.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;

    const { clientHeight, scrollHeight } = el;
    const thumbHeight = thumb.offsetHeight;
    const maxThumbTop = clientHeight - thumbHeight;
    const deltaY = e.clientY - dragStartY.current;

    const thumbTop0 = (dragStartScroll.current / (scrollHeight - clientHeight)) * maxThumbTop;
    const newThumbTop = Math.min(Math.max(thumbTop0 + deltaY, 0), maxThumbTop);
    const newScrollTop = (newThumbTop / maxThumbTop) * (scrollHeight - clientHeight);
    el.scrollTop = newScrollTop;
  };

  const stopDrag = () => {
    dragging.current = false;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
  };

  useEffect(() => {
    if (!chatRef.current) return;
    if (chat.length === 0) {
      chatRef.current.scrollTop = 0;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);

  useEffect(() => {
    updateThumb();
    const el = chatRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateThumb);
    const ro = new ResizeObserver(updateThumb);
    ro.observe(el);
    window.addEventListener("resize", updateThumb);

    return () => {
      el.removeEventListener("scroll", updateThumb);
      ro.disconnect();
      window.removeEventListener("resize", updateThumb);
    };
  }, [chat]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    setChat((c) => [...c, { role: "user", text }]);

    const history = [...chat.map((c) => c.text), text];
    const style = userProfile.preferredRizz || "smooth";

    const res = await fetch("/api/rizz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, copyMode, style }),
    });

    const out = await res.json();

    if (copyMode && out.replies && out.replies.length > 0) {
      out.replies.forEach((r) => {
        setChat((c) => [...c, { role: "bot-copy", text: r }]);
      });
    } else {
      const text = Array.isArray(out.replies) ? out.replies.join("\n\n") : out.replies?.[0] || "";
      setChat((c) => [...c, { role: "bot", text }]);
    }
  };

  const copyText = (text, i) => {
    triggerHaptic();
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 900);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 bg-[#050505] text-white px-5 pt-8 z-10"
    >
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6 shrink-0 relative z-20">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">BeanZ Bot</h2>
          <p className="text-sm text-white/50">Your AI Wingman</p>
        </div>

        <div className="ml-auto">
          <button
            onClick={() => {
              triggerHaptic();
              setCopyMode((v) => !v);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              copyMode ? "bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]" : "bg-white/10 text-white/70"
            }`}
          >
            {copyMode ? "Copy Mode" : "AI Mode"}
          </button>
        </div>
      </div>

      {/* CHAT (ONLY THIS SCROLLS) */}
      <div
        ref={chatRef}
        className="relative overflow-y-auto space-y-4 pr-3 hide-scrollbar chat-area pb-40 h-[calc(100vh-180px)]"
      >
        {chat.length === 0 && (
          <div className="mt-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-b from-white/10 to-transparent rounded-full flex items-center justify-center mb-4 border border-white/5">
              <span className="text-3xl">👋</span>
            </div>
            <p className="text-center text-white/60 text-sm max-w-[80%] mx-auto mb-8">
              Hey {userProfile.name || "there"}, I'm BeanZ. Ask for advice or tell me what to text.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { triggerHaptic(); sendMessage(s.text); }}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-2xl p-4 text-sm text-left flex flex-col gap-3 backdrop-blur-sm group"
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">{s.icon}</svg>
                  </div>
                  <span className="font-medium text-white/90">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {chat.map((c, i) => {
            if (c.role === "user") {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[80%] shadow-lg shadow-blue-500/20">
                    {c.text}
                  </div>
                </motion.div>
              );
            }

            if (c.role === "bot-copy") {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="flex justify-start w-full"
                >
                  <button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => copyText(c.text, i)}
                    className="w-full text-left bg-white/5 border border-white/10 hover:border-cyan-400/50 transition-colors rounded-2xl rounded-tl-sm px-4 py-3 text-sm group relative overflow-hidden backdrop-blur-md"
                  >
                    <div className="flex justify-between gap-3 items-start">
                      <span className="leading-relaxed block pr-6">{c.text}</span>
                      {copied === i ? (
                        <span className="text-xs text-green-400 font-medium bg-green-400/10 px-2 py-1 rounded mt-0.5 whitespace-nowrap">Copied</span>
                      ) : (
                        <svg className="w-4 h-4 text-white/30 group-hover:text-cyan-400 transition-colors mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                      )}
                    </div>
                  </button>
                </motion.div>
              );
            }

            // ADVANCED PARSING: Detects "quotes" and turns them into markdown inline `code`, 
            // which ReactMarkdown will render as our Interactive Copy Bubble.
            const textWithInlineCode = c.text.replace(/["“”]([^"“”]+)["“”]/g, '`$1`');

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-white/10 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[85%] backdrop-blur-md leading-relaxed prose prose-invert prose-sm">
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        if (inline) {
                          // Renders text inside quotes as a clickable, glowing copy button
                          return <InlineCopyBubble text={String(children)} />;
                        }
                        return <code className={className} {...props}>{children}</code>;
                      }
                    }}
                  >
                    {textWithInlineCode}
                  </ReactMarkdown>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <div ref={bottomRef} />

        {/* custom scrollbar */}
        <div
          className="custom-scroll absolute right-0 top-0 bottom-0 w-2"
          onClick={(e) => {
            const el = chatRef.current;
            if (!el) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const { clientHeight, scrollHeight } = el;
            const thumbHeight = Math.max((clientHeight / scrollHeight) * clientHeight, 30);
            const maxThumbTop = clientHeight - thumbHeight;
            const thumbTop = Math.min(Math.max(clickY - thumbHeight / 2, 0), maxThumbTop);
            el.scrollTop = (thumbTop / maxThumbTop) * (scrollHeight - clientHeight);
          }}
        >
          <div className="track w-full h-full relative" onClick={(e) => e.stopPropagation()}>
            <div
              ref={thumbRef}
              className="thumb absolute right-0 w-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                startDrag(e);
              }}
            />
          </div>
        </div>
      </div>

      {/* INPUT */}
      <div className="absolute bottom-[90px] left-0 right-0 px-4 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent pt-6 pb-2 z-30">
        <div className="flex gap-2 items-end bg-white/5 border border-white/10 rounded-3xl p-1.5 backdrop-blur-xl focus-within:border-cyan-500/50 transition-colors shadow-2xl">
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type your situation..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const t = msg; setMsg(""); sendMessage(t); }
            }}
            className="flex-1 bg-transparent px-4 py-3 outline-none resize-none max-h-32 text-sm placeholder:text-white/30"
          />
          <button
            onClick={() => { triggerHaptic(); const t = msg; setMsg(""); sendMessage(t); }}
            disabled={!msg.trim()}
            className="w-10 h-10 mb-0.5 mr-0.5 shrink-0 rounded-full bg-cyan-400 text-black flex items-center justify-center disabled:opacity-30 disabled:bg-white/20 disabled:text-white transition-all active:scale-90"
          >
            <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
