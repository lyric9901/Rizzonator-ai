"use client";

import { useState, useRef } from "react";
import Tesseract from "tesseract.js";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useProfile } from "./providers";

export default function Upload() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [dragging, setDragging] = useState(false);

  // Cropper State
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

  // Use Global Context
  const { userProfile } = useProfile();

  // Haptic Feedback Utility for Mobile
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
    setCrop(null);
    setCompletedCrop(null);
  };

  const removeImage = () => {
    triggerHaptic();
    setImage(null);
    setPreview(null);
    setReplies([]);
    setLoadingText("");
    setCrop(null);
    setCompletedCrop(null);
  };

  /* ---------- DRAG EVENTS ---------- */
  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => {
    setDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  /* ---------- CROP UTILITY ---------- */
  const getCroppedImgBlob = (imageElement, cropConfig) => {
    const canvas = document.createElement("canvas");
    const scaleX = imageElement.naturalWidth / imageElement.width;
    const scaleY = imageElement.naturalHeight / imageElement.height;
    
    canvas.width = cropConfig.width;
    canvas.height = cropConfig.height;
    const ctx = canvas.getContext("2d");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      imageElement,
      cropConfig.x * scaleX,
      cropConfig.y * scaleY,
      cropConfig.width * scaleX,
      cropConfig.height * scaleY,
      0,
      0,
      cropConfig.width,
      cropConfig.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas is empty"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        1.0
      );
    });
  };

  /* ---------- OCR + AI ---------- */
  const resizeImageFile = (fileOrBlob, maxDim = 1024) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(fileOrBlob);
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
      
      img.onerror = () => {
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
    setLoadingText("Extracting text data...");

    try {
      // 1. Determine Image Source (Cropped vs Original)
      let sourceBlob = image;
      if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0 && imgRef.current) {
        setLoadingText("Processing cropped area...");
        sourceBlob = await getCroppedImgBlob(imgRef.current, completedCrop);
      }

      // 2. Resize Image
      const input = await resizeImageFile(sourceBlob, 1024);

      // 3. Run Tesseract OCR
      // NOTE: For future server-side OCR upgrade, you would convert `input` to Base64 
      // here and send it to your /api/rizz route instead of running Tesseract locally.
      const { data } = await Tesseract.recognize(input, "eng");
      
      setLoadingText("Filtering noise...");
      
      // 4. Calculate Final Image Width for L/R Detection based on what was actually scanned
      const inputUrl = URL.createObjectURL(input);
      const imgSize = await new Promise((res) => {
        const i = new Image();
        i.onload = () => res({ width: i.naturalWidth, height: i.naturalHeight });
        i.onerror = () => res({ width: 0, height: 0 });
        i.src = inputUrl;
      });
      URL.revokeObjectURL(inputUrl);

      // 5. Advanced OCR Parsing
      const ocrLines = (data.lines && data.lines.length)
        ? data.lines
            .filter((l) => l.confidence > 40) // Reject blurry garbage
            .map((l) => {
              const bbox = l.bbox || l.boundingBox || l.box || (l.words && l.words[0] && l.words[0].bbox) || {};
              const centerX = bbox.x0 !== undefined && bbox.x1 !== undefined ? (bbox.x0 + bbox.x1) / 2 : undefined;
              const side = centerX !== undefined && imgSize.width ? (centerX > imgSize.width / 2 ? "right" : "left") : "unknown";
              
              return { text: (l.text || "").trim(), side };
            })
        : data.text
            .split("\n")
            .map((t) => ({ text: t.trim(), side: "unknown" }))
            .filter((l) => l.text);

      // 6. Contextual System Text Filtering
      const filtered = ocrLines
        .filter((l) => {
          const isSystemText = /double tap|today|yesterday|am|pm|seen|active|message|unread|end-to-end|encrypted|blocked|type a message|reply/i.test(l.text);
          return l.text && !isSystemText;
        })
        .slice(-6); // Take only the last 6 real messages

      if (!filtered || filtered.length === 0) {
        setReplies(["No readable text found. Try cropping closer to the chat bubbles."]);
        setLoading(false);
        return;
      }

      setLoadingText("Generating tactical Rizz...");

      // 7. Call the AI API
      const res = await fetch("/api/rizz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: filtered, 
          copyMode: true, 
          profile: userProfile 
        }),
      });

      if (!res.ok) throw new Error("Network response was not ok");

      const out = await res.json();
      setReplies(out.replies || []);

    } catch (err) {
      console.error("Analysis Error:", err);
      setReplies(["Something went wrong. Try a smaller image or crop it closer."]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI RENDER ---------- */
  return (
    <div className="flex flex-col h-full px-4 pt-6 overflow-y-auto pb-32 hide-scrollbar">
      
      {/* HEADER SECTION */}
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
          <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V8.25m-18 0V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6v2.25m-18 0h18M5.25 6h.008v.008H5.25V6zM7.5 6h.008v.008H7.5V6zm2.25 0h.008v.008H9.75V6z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Visual Rizz</h2>
          <p className="text-sm text-cyan-100/50">Upload chat & crop for analysis</p>
        </div>
      </div>

      {/* UPLOAD / DROP ZONE */}
      {!preview && (
        <label 
          className={`relative w-full h-72 flex flex-col items-center justify-center rounded-[2rem] border border-white/10 transition-all cursor-pointer overflow-hidden group shadow-2xl
          ${
            dragging 
              ? "bg-cyan-500/20 scale-[1.02] border-cyan-400" 
              : "bg-[#0b1020]/80 hover:border-cyan-500/50"
          }`}
          onDragOver={onDragOver} 
          onDragLeave={onDragLeave} 
          onDrop={onDrop}
        >
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
          
          <input 
            type="file" 
            accept="image/*" 
            hidden 
            onChange={(e) => handleFile(e.target.files[0])} 
          />
          
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-4 text-cyan-400 group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(34,211,238,0.1)] relative z-10 border border-cyan-500/20">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
          </div>
          
          <p className="font-bold text-white text-lg relative z-10 tracking-wide">Select Screenshot</p>
          <p className="text-sm text-white/40 mt-1 relative z-10">Tap or drop image here</p>
        </label>
      )}

      {/* IMAGE PREVIEW WITH CROPPER & LASER SCAN */}
      {preview && (
        <div className="flex flex-col gap-4">
          <div className="relative w-full rounded-[2rem] overflow-hidden border border-white/10 bg-black shadow-2xl flex items-center justify-center min-h-[340px]">
            
            {/* Cropper wrapped around Image */}
            <div className={`w-full flex justify-center transition-opacity duration-500 ${loading ? "opacity-40 grayscale-[50%] pointer-events-none" : "opacity-100"}`}>
              <ReactCrop 
                crop={crop} 
                onChange={(c) => setCrop(c)} 
                onComplete={(c) => setCompletedCrop(c)}
                className="max-h-[500px]"
              >
                <img 
                  ref={imgRef}
                  src={preview} 
                  alt="Scan" 
                  className="max-h-[500px] w-auto object-contain" 
                />
              </ReactCrop>
            </div>

            {/* Instruction Banner when not loading */}
            {!loading && !crop?.width && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                <span className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-xs font-semibold text-cyan-400 border border-cyan-500/30 animate-pulse">
                  Drag to crop chat bubbles
                </span>
              </div>
            )}
            
            {/* Animated Laser Scanner Elements */}
            {loading && (
              <>
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_20px_4px_rgba(34,211,238,0.7)] z-20 animate-[scan_2.5s_ease-in-out_infinite]" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent z-10 animate-[scanGlow_2.5s_ease-in-out_infinite]" />
                <div className="absolute inset-0 flex items-center justify-center flex-col z-30 pointer-events-none">
                  <div className="bg-black/80 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10 flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-3"></div>
                    <p className="text-sm font-bold animate-pulse text-cyan-400 tracking-wider uppercase text-center max-w-[200px]">
                      {loadingText}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Remove Image Button */}
            {!loading && (
              <button 
                onClick={removeImage} 
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 hover:bg-black hover:scale-105 transition-all z-40 shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* GENERATE BUTTON */}
          {!replies.length && (
            <button 
              onClick={analyze} 
              disabled={loading} 
              className="w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-black active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] mt-2 text-[15px] tracking-wide"
            >
              {loading ? "Processing..." : "Generate Rizz"}
            </button>
          )}
        </div>
      )}

      {/* RESULTS / REPLIES */}
      {replies.length > 0 && (
        <div className="mt-8 space-y-4 pb-8 animate-fadeIn">
          <div className="flex items-center gap-2 pl-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              Tactical Suggestions
            </h3>
          </div>
          
          {replies.map((r, i) => (
            <button
              key={i}
              onClick={(e) => {
                triggerHaptic();
                navigator.clipboard.writeText(r);
                
                const btn = e.currentTarget;
                const originalText = btn.innerHTML;
                btn.innerHTML = `
                  <span class="text-green-400 font-bold flex items-center justify-center gap-2 w-full h-full">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg> 
                    Copied to Clipboard
                  </span>
                `;
                setTimeout(() => { 
                  btn.innerHTML = originalText; 
                }, 1500);
              }}
              className="w-full text-left px-5 py-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-cyan-400/50 hover:bg-cyan-500/5 transition-all group backdrop-blur-md active:scale-[0.98] relative overflow-hidden shadow-lg min-h-[80px]"
            >
              <span className="block pr-8 text-[15px] font-medium leading-relaxed text-white/90">
                {r}
              </span>
              
              <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all group-hover:bg-cyan-500/20">
                 <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                 </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* GLOBAL CSS FOR SCANNER ANIMATIONS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        
        @keyframes scanGlow {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}} />

    </div>
  );
}