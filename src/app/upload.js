"use client";

import { useState } from "react";
import Tesseract from "tesseract.js";

export default function Upload() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  /* ---------- FILE HANDLING ---------- */
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
        .filter((l) => l.text && !/double tap|today|yesterday|am|pm|seen|active|message/i.test(l.text))
        .slice(-6);

      if (!filtered || filtered.length === 0) {
        setReplies(["No readable text found. Try a different screenshot or crop it."]);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/rizz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: filtered, copyMode: true }),
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
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-28 flex flex-col gap-4" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}>
      {/* ↑ pb-28 is the FIX (space for bottom nav) */}

      <h1 className="text-blue-400 font-semibold text-lg">
        Screenshot Replies
      </h1>

      {/* UPLOAD / DROP ZONE */}
      {!preview && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`w-full h-44 flex flex-col items-center justify-center rounded-2xl border border-dashed transition
            ${
              dragging
                ? "border-blue-500 bg-blue-900/20"
                : "border-blue-900/40 bg-[#0b1020]/60"
            }`}
        >
          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <p className="font-medium">Upload screenshot</p>
            <p className="text-xs opacity-60 mt-1">
              Drag & drop or tap
            </p>
          </label>
        </div>
      )}

      {/* IMAGE PREVIEW */}
      {preview && (
        <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-blue-900/40 bg-[#0b1020]/80">
          <img
            src={preview}
            alt="preview"
            className="w-full object-cover"
          />
          <button
            onClick={removeImage}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-xs flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}

      {/* ACTION BUTTON */}
      {image && (
        <button
          onClick={analyze}
          className="w-full py-3 sm:py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-700 active:scale-95 transition"
        >
          {loading ? "Analyzing…" : "Get replies"}
        </button>
      )}

      {/* REPLIES */}
      {replies.length > 0 && (
        <div className="flex flex-col gap-2">
          {replies.map((r, i) => (
            <button
              key={i}
              onClick={() => navigator.clipboard.writeText(r)}
              className="text-left text-sm px-4 py-3 sm:py-2 rounded-lg border border-blue-900/40 bg-[#0b1020]/60 hover:border-blue-500 hover:bg-blue-500/10 transition"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
