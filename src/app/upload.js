"use client";

import { useState, useEffect } from "react";
import Tesseract from "tesseract.js";

export default function Upload() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [userProfile, setUserProfile] = useState({});

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("rizzonator_profile") || "{}");
      setUserProfile(p);
    } catch (e) {}
  }, []);

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  /* ---------- FILE HANDLING ---------- */
  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setReplies([]);
  };

  const removeImage = () => {
    triggerHaptic();
    setImage(null);
    setPreview(null);
    setReplies([]);
  };

  /* ---------- DRAG EVENTS ---------- */
  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  /* ---------- OCR + AI ---------- */
  // Resize large images on mobile to avoid memory / timeout issues
  const resizeImageFile = (file, maxDim = 1024) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const { width, height } = img;
          let w = width;
          let h = height;

          if (Math.max(width, height) > maxDim) {
            if (width > height) {
              w = maxDim;
              h = Math.round((height * maxDim) / width);
            } else {
              h = maxDim;
              w = Math.round((width * maxDim) / height);
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              if (blob) resolve(blob);
              else reject(new Error("Failed to create blob from canvas"));
            },
            "image/jpeg",
            0.8
          );
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error("Image load error"));
      };
      img.src = url;
    });

  const analyze = async () => {
    if (!image) return;
    triggerHaptic();
    setLoading(true);
    setReplies([]);

    try {
      // Resize to reduce memory/timeouts on mobile
      const input = await resizeImageFile(image, 1024);

      const { data } = await Tesseract.recognize(input, "eng");

      // attempt to get image width (use preview created earlier)
      const imgSize = await new Promise((res) => {
        const i = new Image();
        i.onload = () => res({ width: i.naturalWidth, height: i.naturalHeight });
        i.onerror = () => res({ width: 0, height: 0 });
        i.src = preview;
      });

      // use Tesseract lines with bbox when possible, otherwise split text
      const ocrLines = (data.lines && data.lines.length)
        ? data.lines.map((l) => {
            const bbox = l.bbox || l.boundingBox || l.box || (l.words && l.words[0] && l.words[0].bbox) || {};
            const centerX = bbox.x0 !== undefined && bbox.x1 !== undefined ? (bbox.x0 + bbox.x1) / 2 : undefined;
            const side = centerX !== undefined && imgSize.width ? (centerX > imgSize.width / 2 ? "right" : "left") : "unknown";
            return { text: (l.text || "").trim(), side };
          })
        : data.text
            .split("\n")
            .map((t) => ({ text: t.trim(), side: "unknown" }))
            .filter((l) => l.text);

      const filtered = ocrLines
        .filter((l) => l.text && !/double tap|today|yesterday|am|pm|seen|active|message|unread|end-to-end|encrypted|blocked/i.test(l.text))
        .slice(-6);

      if (!filtered || filtered.length === 0) {
        setReplies(["No readable text found. Try a different screenshot or crop it."]);
        setLoading(false);
        return;
      }

      const style = userProfile.preferredRizz || "smooth";

      const res = await fetch("/api/rizz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: filtered, copyMode: true, style }),
      });

      if (!res.ok) throw new Error("Network response was not ok");

      const out = await res.json();
      setReplies(out.replies || []);

      if ((out.replies || []).length > 0) {
        try {
          await navigator.clipboard.writeText(out.replies[0]);
        } catch (err) {
          // ignore clipboard errors (some mobile browsers restrict clipboard)
        }
      }
    } catch (err) {
      console.error(err);
      setReplies(["Something went wrong. Try a smaller image or a different browser."]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="flex flex-col h-full px-4 pt-6 overflow-y-auto pb-32 hide-scrollbar">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Scanner</h2>
          <p className="text-sm text-white/50">Upload chat screenshot</p>
        </div>
      </div>

      {/* UPLOAD / DROP ZONE */}
      {!preview && (
        <label 
          className={`relative w-full h-64 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden group
          ${dragging ? "border-cyan-400 bg-cyan-400/10 scale-[1.02]" : "border-white/20 bg-white/5 hover:border-white/40"}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFile(e.target.files[0])}
          />
          
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-y-full transition-all duration-1000 ease-in-out" />
          
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 text-cyan-400 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="font-semibold text-white/90 text-lg">Tap or Drop Image</p>
          <p className="text-sm text-white/40 mt-1">PNG, JPG up to 10MB</p>
        </label>
      )}

      {/* IMAGE PREVIEW */}
      {preview && (
        <div className="flex flex-col gap-4">
          <div className="relative w-full h-[300px] rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl">
            <img
              src={preview}
              alt="Scan"
              className="w-full h-full object-cover opacity-80"
            />
            
            {loading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center flex-col z-10">
                <div className="w-12 h-12 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-semibold animate-pulse text-cyan-400 tracking-wide">Decoding chat...</p>
              </div>
            )}

            <button
              onClick={removeImage}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 hover:bg-black transition-colors z-20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* ACTION BUTTON */}
          {!replies.length && (
            <button
              onClick={analyze}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold bg-white text-black active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] mt-2"
            >
              {loading ? "Analyzing..." : "Generate Rizz"}
            </button>
          )}
        </div>
      )}

      {/* REPLIES */}
      {replies.length > 0 && (
        <div className="mt-6 space-y-3 pb-8">
          <h3 className="text-sm font-semibold text-white/50 pl-2 uppercase tracking-wider">Top Suggestions</h3>
          {replies.map((r, i) => (
            <button
              key={i}
              onClick={(e) => {
                triggerHaptic();
                navigator.clipboard.writeText(r);
                const btn = e.currentTarget;
                const og = btn.innerHTML;
                btn.innerHTML = `<span class="text-green-400 font-semibold flex items-center justify-center gap-2 w-full"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> Copied</span>`;
                setTimeout(() => { btn.innerHTML = og; }, 1000);
              }}
              className="w-full text-left px-5 py-4 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all group backdrop-blur-sm active:bg-white/10 relative overflow-hidden"
            >
              <span className="block pr-6 text-[15px] font-medium leading-relaxed">{r}</span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
