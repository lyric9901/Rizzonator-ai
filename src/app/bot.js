"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  { text: "How to start a conversation?", icon: "🧠" },
  { text: "What should I text her?", icon: "💬" },
  { text: "Should I follow her on IG?", icon: "📱" },
  { text: "How to improve my Instagram?", icon: "✨" },
];

export default function Bot() {
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]);
  const [copied, setCopied] = useState(null);
  const [copyMode, setCopyMode] = useState(false);

  const chatRef = useRef(null);
  const bottomRef = useRef(null);

  // custom scrollbar refs & state
  const thumbRef = useRef(null);
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);

  const updateThumb = () => {
    const el = chatRef.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;

    const { scrollHeight, clientHeight, scrollTop } = el;

    // hide thumb when no scroll needed
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

  /* ===============================
     SCROLL ONLY CHAT (NOT WINDOW)
  =============================== */
  useEffect(() => {
    if (!chatRef.current) return;

    if (chat.length === 0) {
      chatRef.current.scrollTop = 0;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);

  // keep the custom thumb size/position up-to-date
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

  /* ===============================
     SEND MESSAGE
  =============================== */
  const sendMessage = async (text) => {
    if (!text.trim()) return;

    setChat((c) => [...c, { role: "user", text }]);

    const history = [...chat.map((c) => c.text), text];

    const res = await fetch("/api/rizz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, copyMode }),
    });

    const out = await res.json();

    if (copyMode && out.replies && out.replies.length > 0) {
      // copy-mode: show each message as copy-ready buttons
      out.replies.forEach((r) => {
        setChat((c) => [...c, { role: "bot-copy", text: r }]);
      });
    } else {
      // AI-mode: show a single assistant message (join multiple lines if present)
      const text = Array.isArray(out.replies) ? out.replies.join("\n\n") : out.replies?.[0] || "";
      setChat((c) => [...c, { role: "bot", text }]);
    }
  };

  const copyText = (text, i) => {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 900);
  };

  return (
    /* 🔒 SCREEN LOCKED */
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 bg-gradient-to-br from-[#0b0d1a] via-[#14163a] to-black text-white px-5 pt-8"
    >
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center">
          🤖
        </div>
        <div>
          <h2 className="text-xl font-semibold">BeanZ Bot</h2>
          <p className="text-sm opacity-60">AI Wingman</p>
        </div>

        <div className="ml-auto">
          <button
            onClick={() => setCopyMode((v) => !v)}
            className={`px-3 py-1 rounded-full text-sm ${copyMode ? "bg-cyan-400 text-black" : "bg-white/10"}`}
          >
            {copyMode ? "Copy Mode" : "AI Mode"}
          </button>
        </div>
      </div>

      {/* CHAT (ONLY THIS SCROLLS) */}
      <div
        ref={chatRef}
        className="relative overflow-y-auto space-y-4 pr-1 hide-scrollbar chat-area"
      >
        {chat.length === 0 && (
          <div className="bg-white/15 rounded-2xl px-4 py-3 text-sm max-w-[85%]">
            Hey 👋 I’m BeanZ Bot.  
            Ask for advice or what to text.
          </div>
        )}

        <AnimatePresence>
          {chat.map((c, i) => {
            if (c.role === "user") {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="ml-auto bg-cyan-500/30 rounded-2xl px-4 py-3 text-sm max-w-[85%]"
                >
                  {c.text}
                </motion.div>
              );
            }

            if (c.role === "bot-copy") {
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => copyText(c.text, i)}
                  className="w-full text-left bg-[#0b1020]/70 border border-blue-900/40 rounded-xl px-4 py-3 text-sm"
                >
                  <div className="flex justify-between gap-3">
                    <span>{c.text}</span>
                    {copied === i ? (
                      <span className="text-xs text-green-400">✓ Copied</span>
                    ) : (
                      <span className="text-xs opacity-60">📋</span>
                    )}
                  </div>
                </motion.button>
              );
            }

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/15 rounded-2xl px-4 py-3 text-sm max-w-[85%]"
              >
                <ReactMarkdown>{c.text}</ReactMarkdown>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <div ref={bottomRef} />

        {/* custom scrollbar */}
        <div
          className="custom-scroll"
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
          <div className="track" onClick={(e) => e.stopPropagation()}>
            <div
              ref={thumbRef}
              className="thumb"
              onMouseDown={(e) => {
                e.preventDefault();
                startDrag(e);
              }}
            />
          </div>
        </div>
      </div>

      {/* SUGGESTIONS */}
      {chat.length === 0 && (
        <div className="grid grid-cols-2 gap-3 fixed bottom-36 left-5 right-5">
          {SUGGESTIONS.map((s, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.94 }}
              onClick={() => sendMessage(s.text)}
              className="bg-white/15 rounded-2xl px-3 py-3 text-sm text-left"
            >
              {s.icon} {s.text}
            </motion.button>
          ))}
        </div>
      )}

      {/* INPUT */}
      <div className="fixed bottom-14 sm:bottom-20 left-5 right-5 flex gap-3">
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type your situation…"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const t = msg;
              setMsg("");
              sendMessage(t);
            }
          }}
          className="flex-1 bg-black/60 rounded-2xl px-4 py-3 outline-none resize-none"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            const t = msg;
            setMsg("");
            sendMessage(t);
          }}
          className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"
        >
          ➤
        </motion.button>
      </div>
    </motion.div>
  );
}
