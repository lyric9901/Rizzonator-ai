"use client";

import { useEffect, useState } from "react";
import Onboarding from "./onboarding";
import Upload from "./upload";
import Bot from "./bot";
import Profile from "./profile";
import { Analytics } from "@vercel/analytics/next";

export default function Home() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("upload");

  useEffect(() => {
    const done = localStorage.getItem("onboarded") === "true";
    setReady(done);
  }, []);

  if (!ready) {
    return <Onboarding onComplete={() => setReady(true)} />;
  }

  return (
    <main className="min-h-screen text-white bg-[#050505] overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* GLOBAL BACKGROUND GLOW */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* ACTIVE SCREEN */}
      <div className="relative z-10 h-full w-full pb-32 transition-all duration-300 animate-fadeIn">
        {tab === "upload" && <Upload />}
        {tab === "bot" && <Bot />}
        {tab === "profile" && <Profile />}
      </div>

      {/* FLOATING GLASS NAV */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm h-16 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex justify-between items-center px-2">
        <NavBtn active={tab === "bot"} onClick={() => setTab("bot")} label="BeanZ">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
        </NavBtn>

        <NavBtn active={tab === "upload"} onClick={() => setTab("upload")} label="Scan" isCenter>
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30 text-black">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </div>
        </NavBtn>

        <NavBtn active={tab === "profile"} onClick={() => setTab("profile")} label="Profile">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </NavBtn>
      </nav>
      <Analytics />
    </main>
  );
}

function NavBtn({ active, children, onClick, label, isCenter }) {
  if (isCenter) {
    return (
      <button onClick={onClick} className="flex flex-col items-center justify-center -translate-y-4 active:scale-95 transition-transform">
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 transition-all duration-200 ${
        active ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" : "text-white/40 hover:text-white/70"
      }`}
    >
      {children}
      <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
  );
}
