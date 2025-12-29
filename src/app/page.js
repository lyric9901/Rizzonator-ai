"use client";

import { useEffect, useState } from "react";
import Onboarding from "./onboarding";
import Upload from "./upload";
import Bot from "./bot";
import Profile from "./profile";
import { Analytics } from "@vercel/analytics/next"

export default function Home() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("upload");
  const [gender, setGender] = useState("Profile");


  
  useEffect(() => {
    const done = localStorage.getItem("onboarded") === "true";
    setReady(done);

    const g = localStorage.getItem("beanz_gender");
    if (g) setGender(g);
  }, []);

  if (!ready) {
    return <Onboarding onComplete={() => setReady(true)} />;
  }

  return (
    <main className="min-h-screen text-white bg-gradient-to-br from-black via-[#050b1a] to-black overflow-hidden">

      {/* ACTIVE SCREEN */}
      <div className="pb-28 px-3 transition-all duration-300 animate-fadeIn">
        {tab === "upload" && <Upload />}
        {tab === "bot" && <Bot />}
        {tab === "profile" && <Profile setGender={setGender} />}
      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 glass-nav flex justify-around items-center text-xs">
        <NavBtn active={tab === "bot"} onClick={() => setTab("bot")}>
          🤖<span>BeanZ</span>
        </NavBtn>

        <NavBtn active={tab === "upload"} onClick={() => setTab("upload")}>
          📸<span>Upload</span>
        </NavBtn>

        <NavBtn active={tab === "profile"} onClick={() => setTab("profile")}>
          👤<span>Profile</span>
        </NavBtn>
      </nav>
    </main>
  );
}

function NavBtn({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`nav-btn ${active ? "active" : ""}`}
    >
      {children}
    </button>
  );
}
