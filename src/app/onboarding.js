"use client";
import { useState, useEffect } from "react";

/* ===============================
   RIZZ CALIBRATION LINES
================================ */
const RIZZ_LINES = [
  { text: "Are you tired? You've been running through my mind all day.", type: "smooth" },
  { text: "Do you play football? Because you're a keeper.", type: "smooth" },

  { text: "Are you a charger? Because I'm dying without you.", type: "funny" },
  { text: "Are you a loan? You've got my interest.", type: "funny" },

  { text: "I never believed in love at first sight, then I saw you.", type: "bold" },
  { text: "My mom told me not to talk to strangers online, but I'll make an exception for you.", type: "bold" },

  { text: "Do you have Instagram? My parents told me to follow my dreams.", type: "witty" },
  { text: "Angels should be in heaven. How’d you escape?", type: "witty" },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [rizzIndex, setRizzIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [nameInput, setNameInput] = useState("");

  const [profile, setProfile] = useState({
    name: "",
    userGender: "",
    targetGender: "",
    struggle: "",
    platform: "",
    blocker: "",
    preferredRizz: "",
    rizzScore: { smooth: 0, funny: 0, bold: 0, witty: 0 },
  });

  useEffect(() => {
    localStorage.setItem("rizzonator_profile_temp", JSON.stringify(profile));
  }, [profile]);

  const next = () => {
    setAnimate(false);
    setTimeout(() => {
      setStep(s => s + 1);
      setAnimate(true);
    }, 120);
  };

  const saveAndNext = (key, value) => {
    setProfile(p => ({ ...p, [key]: value }));
    next();
  };

  const voteRizz = (yes) => {
    const line = RIZZ_LINES[rizzIndex];

    setProfile(p => {
      const updated = { ...p };
      if (yes) {
        updated.rizzScore = {
          ...p.rizzScore,
          [line.type]: p.rizzScore[line.type] + 1,
        };
      }
      return updated;
    });

    if (rizzIndex < RIZZ_LINES.length - 1) {
      setAnimate(false);
      setTimeout(() => {
        setRizzIndex(i => i + 1);
        setAnimate(true);
      }, 120);
    } else {
      setTimeout(finishOnboarding, 150);
    }
  };

  const finishOnboarding = () => {
    const scores = profile.rizzScore;
    const dominant = Object.keys(scores).reduce((a, b) =>
      scores[a] > scores[b] ? a : b
    );

    localStorage.setItem(
      "rizzonator_profile",
      JSON.stringify({ ...profile, preferredRizz: dominant })
    );
    localStorage.setItem("onboarded", "true");
    localStorage.removeItem("rizzonator_profile_temp");
    onComplete?.();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-[#050b1a] to-black text-white flex flex-col items-center px-4 py-8">

      {/* PROGRESS */}
      <div className="w-full max-w-sm mb-6">
        <div className="h-1 bg-white/10 rounded overflow-hidden">
          <div
            className="h-1 bg-blue-500 transition-all duration-300"
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>
        <p className="text-xs opacity-60 mt-2 text-center">
          Step {step} of 8
        </p>
      </div>

      {/* CARD */}
      <section
        className={`onboard-card ${animate ? "animate-cardIn" : "opacity-0"}`}
      >
        {renderStep(step, saveAndNext, voteRizz, rizzIndex, nameInput, setNameInput)}
      </section>
    </main>
  );
}

/* ===============================
   STEP RENDERER
================================ */
function renderStep(step, saveAndNext, voteRizz, rizzIndex, nameInput, setNameInput) {
  const btn = "onboard-btn";

  if (step === 1)
    return (
      <>
        <h2 className="onboard-title">What's your name?</h2>
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Enter your name"
          className="w-full mt-4 bg-black/6 rounded-2xl px-4 py-3 outline-none"
        />
        <div className="mt-4">
          <button
            onClick={() => saveAndNext("name", nameInput)}
            className={btn}
            disabled={!nameInput || !nameInput.trim()}
          >
            Continue
          </button>
        </div>
      </>
    );

  if (step === 2)
    return gender("Your gender?", saveAndNext, btn, "userGender");
  if (step === 3)
    return gender("Who are you trying to pull?", saveAndNext, btn, "targetGender");
  if (step === 4)
    return list("What’s your dating struggle?", [
      "Starting conversations",
      "Keeping chats interesting",
      "Confidence",
      "Getting replies",
    ], saveAndNext, "struggle", btn);
  if (step === 5)
    return list("Where will you use Rizzonator?", [
      "Instagram / DMs",
      "In Person",
      "Tinder / Bumble / Hinge",
    ], saveAndNext, "platform", btn);
  if (step === 6)
    return list("What’s stopping you?", [
      "Overthinking",
      "Fear of rejection",
      "Bad past experiences",
      "Not knowing what to say",
    ], saveAndNext, "blocker", btn);
  if (step === 7)
    return list("What rizz style do you like?", [
      "Smooth",
      "Funny",
      "Bold",
      "Witty",
    ], saveAndNext, "preferredRizz", btn, true);

  return (
    <>
      <h2 className="text-lg font-semibold mb-3">Is this your rizz?</h2>
      <p className="mb-6 text-sm opacity-80 min-h-[64px] text-center">
        {RIZZ_LINES[rizzIndex].text}
      </p>
      <div className="flex gap-3">
        <button onClick={() => voteRizz(false)} className="vote-btn no">❌ No</button>
        <button onClick={() => voteRizz(true)} className="vote-btn yes">✅ Yes</button>
      </div>
    </>
  );
}

const gender = (title, save, btn, key) => (
  <>
    <h2 className="onboard-title">{title}</h2>
    {["Male", "Female"].map(v => (
      <button key={v} onClick={() => save(key, v)} className={btn}>{v}</button>
    ))}
  </>
);

const list = (title, items, save, key, btn, lower) => (
  <>
    <h2 className="onboard-title">{title}</h2>
    {items.map(v => (
      <button
        key={v}
        onClick={() => save(key, lower ? v.toLowerCase() : v)}
        className={`${btn} text-left`}
      >
        {v}
      </button>
    ))}
  </>
);
