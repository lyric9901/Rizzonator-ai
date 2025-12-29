// Utility for generating and reserving unique 6-digit UIDs in localStorage

const UID_KEY = "rizzonator_uids";

function readUIDSet() {
  try {
    const raw = localStorage.getItem(UID_KEY) || "[]";
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}

function writeUIDSet(set) {
  try {
    localStorage.setItem(UID_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    // ignore
  }
}

export function generateUniqueUID(maxAttempts = 1000) {
  const uids = readUIDSet();

  for (let i = 0; i < maxAttempts; i++) {
    const n = Math.floor(Math.random() * 1_000_000);
    const uid = String(n).padStart(6, "0");
    if (!uids.has(uid)) {
      uids.add(uid);
      writeUIDSet(uids);
      return uid;
    }
  }

  // Fallback: use timestamp-derived uid (last 6 digits)
  const fallback = String(Date.now() % 1_000_000).padStart(6, "0");
  uids.add(fallback);
  writeUIDSet(uids);
  return fallback;
}

export function reserveUID(uid) {
  const uids = readUIDSet();
  if (!uids.has(uid)) {
    uids.add(uid);
    writeUIDSet(uids);
  }
}
