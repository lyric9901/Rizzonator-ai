"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { generateUniqueUID } from "../lib/uid";

export default function Profile() {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("/pepe.svg");
  const [gender, setGender] = useState("");
  const [uid, setUid] = useState("");

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("rizzonator_profile") || "{}");
      if (p?.name) {
        setName(p.name);
        // set or generate UID
        if (p.uid) {
          setUid(p.uid);
        } else {
          const newUid = generateUniqueUID();
          setUid(newUid);
          try {
            localStorage.setItem("rizzonator_profile", JSON.stringify({ ...p, uid: newUid }));
          } catch (e) {
            // ignore
          }
        }

        // select avatar based on saved gender
        if (p.userGender && typeof p.userGender === "string") {
          setGender(p.userGender);
          const g = p.userGender.toLowerCase();
          if (g === "female" || g === "woman" || g === "girl") {
            setAvatar("https://i.pinimg.com/736x/86/7b/2d/867b2d486fe4dd120adfb3f576b9b17f.jpg");
          } else if (g === "male" || g === "man" || g === "boy") {
            setAvatar("https://i.pinimg.com/1200x/0a/ae/7c/0aae7c7ef29a21e83e464efd5370c36a.jpg");
          } else {
            setAvatar("/pepe.svg");
          }
        }
        return;
      }
      const tmp = JSON.parse(localStorage.getItem("rizzonator_profile_temp") || "{}");
      if (tmp?.name) setName(tmp.name);
      if (tmp?.userGender && typeof tmp.userGender === "string") {
        setGender(tmp.userGender);
        const g2 = tmp.userGender.toLowerCase();
        if (g2 === "female" || g2 === "woman" || g2 === "girl") {
          setAvatar("https://i.pinimg.com/736x/86/7b/2d/867b2d486fe4dd120adfb3f576b9b17f.jpg");
        } else if (g2 === "male" || g2 === "man" || g2 === "boy") {
          setAvatar("https://i.pinimg.com/1200x/0a/ae/7c/0aae7c7ef29a21e83e464efd5370c36a.jpg");
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);


  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="fixed inset-0 bg-gradient-to-br from-[#0b0d1a] via-[#14163a] to-black text-white px-5 pt-8"
      style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      {/* BACKGROUND BLOBS */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl" />
      </div>

      {/* HEADER */}
      <div className="flex items-center gap-3 mb-4 z-10 relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center">
          👤
        </div>
        <div>
          <h1 className="text-xl font-semibold">Profile</h1>
          <p className="text-sm opacity-60">Manage your account</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/20 text-sm">Free</span>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="relative overflow-y-auto space-y-6 pr-1 hide-scrollbar profile-scroll">
        {/* AVATAR */}
        <div className="flex justify-center">
          <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center shadow-lg">
            <img
              src={avatar}
              alt="Avatar"
              onError={(e) => { e.currentTarget.src = "/pepe.svg" }}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>

        {/* DETAILS */}
        <div className="mx-auto max-w-xl px-2">
          <div className="mt-6 bg-white/6 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="text-sm opacity-60">Name</div>
                <div className="font-medium">{name || "Your name"}</div>
                <div className="text-xs opacity-60">UID: {uid || "—"}</div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="text-sm opacity-60">Gender</div>
                <div className="font-medium">{gender || "Your gender"}</div>
              </div>
              <div className="flex bg-black/40 rounded-full p-1">
                <button className={`px-3 py-1 rounded-full ${gender?.toLowerCase() === "male" ? "bg-cyan-400 text-black font-medium" : "opacity-50"}`}>♂</button>
                <button className={`px-3 py-1 rounded-full ${gender?.toLowerCase() === "female" ? "bg-cyan-400 text-black font-medium" : "opacity-50"}`}>♀</button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm opacity-60">Plan</div>
                <div className="font-medium">Free</div>
              </div>
              <button className="text-sm px-3 py-1 rounded-full bg-white/10">Upgrade</button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <button className="w-full text-left bg-white/6 rounded-2xl px-4 py-3 flex justify-between items-center">
              <div>
                <div className="font-medium">Become an Affiliate</div>
                <div className="text-xs opacity-60">Earn rewards by referring friends</div>
              </div>
              <span className="opacity-60">›</span>
            </button>

            <a href="https://forms.gle/dwBB7YY3JTUAezWk7" target="_blank" rel="noopener noreferrer" className="w-full text-left bg-white/6 rounded-2xl px-4 py-3 flex justify-between items-center">
              <div>
                <div className="font-medium">Feedback</div>
                <div className="text-xs opacity-60">Help improve Rizzonator</div>
              </div>
              <span className="opacity-60">›</span>
            </a>

            <button className="w-full text-left bg-white/6 rounded-2xl px-4 py-3 flex justify-between items-center">
              <div>
                <div className="font-medium">Privacy</div>
                <div className="text-xs opacity-60">Manage data and permissions</div>
              </div>
              <span className="opacity-60">›</span>
            </button>


          </div>
        </div>

        <div className="h-24" />
      </div>

      {/* LOGO */}
      <div className="absolute bottom-6 left-0 right-0 text-center opacity-80">
        <span className="text-2xl font-bold tracking-widest">Rizzonator<span className="text-cyan-400">AI</span></span>
      </div>
    </motion.div>
  );
}

