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

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setReplies([]);
  };

  const removeImage = () => {
    setImage(null);
    setPreview(null);
    setReplies([]);
  };

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
      const input = await resizeImageFile(image, 1024);
      const { data } = await Tesseract.recognize(input, "eng");

      const imgSize = await new Promise((res) => {
        const i = new Image();
        i.onload = () => res({ width: i.naturalWidth, height: i.naturalHeight });
        i.onerror = () => res({ width: 0, height: 0 });
        i.src = preview;
      });

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

      // Enhanced Filtering to remove system UI elements in screenshots
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
        } catch (err) {}
      }
    } catch (err) {
      console.error(err);
      setReplies(["Something went wrong. Try a smaller image or a different browser."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-28 flex flex-col gap-4" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}>
      <h1 className="text-cyan-400 font-semibold text-lg flex items-center gap-2">
        <span>📸</span> Screenshot Replies
      </h1>

      {!preview && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`w-full h-44 flex flex-col items-center justify-center rounded-2xl border border-dashed transition-all
            ${
              dragging
                ? "border-cyan-500 bg-cyan-900/20 scale-105"
                : "border-blue-900/40 bg-[#0b1020]/60 hover:border-cyan-500/50"
            }`}
        >
          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3">
              <span className="text-xl">⬆️</span>
            </div>
            <p className="font-medium text-white/90">Upload screenshot</p>
            <p className="text-xs text-white/50 mt-1">
              Drag & drop or tap to browse
            </p>
          </label>
        </div>
      )}

      {preview && (
        <div className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden border border-blue-900/40 bg-[#0b1020]/80 shadow-2xl">
          <img
            src={preview}
            alt="preview"
            className="w-full object-cover max-h-[400px]"
          />
          <button
            onClick={() => {
              triggerHaptic();
              removeImage();
            }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/80 text-white text-xs flex items-center justify-center backdrop-blur-sm border border-white/20 hover:bg-black transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {image && (
        <button
          onClick={analyze}
          disabled={loading}
          className="w-full py-3.5 mt-2 rounded-xl text-sm font-semibold bg-cyan-500 text-black active:scale-95 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-70 disabled:active:scale-100"
        >
          {loading ? "Analyzing Chat..." : "Get Replies"}
        </button>
      )}

      {replies.length > 0 && (
        <div className="flex flex-col gap-3 mt-4">
          {replies.map((r, i) => (
            <button
              key={i}
              onClick={(e) => {
                triggerHaptic();
                navigator.clipboard.writeText(r);
                const btn = e.currentTarget;
                const originalText = btn.innerHTML;
                btn.innerHTML = `<span class="text-green-400">✓ Copied!</span>`;
                setTimeout(() => { btn.innerHTML = originalText; }, 1000);
              }}
              className="text-left text-sm px-5 py-4 rounded-xl border border-blue-900/40 bg-[#0b1020]/80 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all shadow-lg relative group"
            >
              <span className="block pr-6">{r}</span>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400 text-xs">Copy</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
