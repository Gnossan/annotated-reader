// browser_plugin/kryptering.js — AIuda Suite kryptering
// Delas av popup.js och content.js via chrome.storage.session

const AR_BACKEND = "https://annotated-reader-backend.vercel.app";

// ── Hjälpfunktioner ────────────────────────────────────────────────────────

function bufferTillBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64TillBuffer(base64) {
    const bin = atob(base64);
    return Uint8Array.from(bin, c => c.charCodeAt(0));
}

// ── Kryptera / Dekryptera (använder råbytes från session) ──────────────────

async function hämtaNyckel() {
    const { arKrypteringsNyckel } = await chrome.storage.session.get("arKrypteringsNyckel");
    if (!arKrypteringsNyckel) return null;
    return crypto.subtle.importKey(
        "raw", base64TillBuffer(arKrypteringsNyckel),
        { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
    );
}

async function kryptera(obj) {
    const nyckel = await hämtaNyckel();
    if (!nyckel) throw new Error("Ingen krypteringsnyckel");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(obj));
    const krypterad = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, nyckel, data);
    return { data: bufferTillBase64(krypterad), iv: bufferTillBase64(iv) };
}

async function dekryptera(payload) {
    try {
        const nyckel = await hämtaNyckel();
        if (!nyckel) return null;
        const iv = base64TillBuffer(payload.iv);
        const data = base64TillBuffer(payload.data);
        const dekrypterad = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, nyckel, data);
        return JSON.parse(new TextDecoder().decode(dekrypterad));
    } catch { return null; }
}

// ── PBKDF2-nyckelderivering ────────────────────────────────────────────────

async function härledNyckel(lösenord, salt, iterations = 310000) {
    const keyMaterial = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(lösenord), "PBKDF2", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
}

// ── Exportera nyckel skyddad av lösenord (för Firebase-lagring) ────────────

async function exporteraNyckelMedLösenord(lösenord) {
    const nyckel = await hämtaNyckel();
    if (!nyckel) throw new Error("Ingen nyckel att exportera");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv   = crypto.getRandomValues(new Uint8Array(12));
    const wrappingKey = await härledNyckel(lösenord, salt);
    const wrappedKey  = await crypto.subtle.wrapKey("raw", nyckel, wrappingKey, { name: "AES-GCM", iv });
    return {
        wrappedKey: bufferTillBase64(wrappedKey),
        salt:       bufferTillBase64(salt),
        iv:         bufferTillBase64(iv)
    };
}

// ── Importera nyckel med lösenord, spara råbytes i session ────────────────

async function importeraNyckelMedLösenord(lösenord, nyckelData) {
    const salt       = base64TillBuffer(nyckelData.salt);
    const iv         = base64TillBuffer(nyckelData.iv);
    const wrappedKey = base64TillBuffer(nyckelData.wrappedKey);
    const keyMaterial = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(lösenord), "PBKDF2", false, ["deriveKey"]
    );
    const unwrappingKey = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, false, ["unwrapKey"]
    );
    const nyckel = await crypto.subtle.unwrapKey(
        "raw", wrappedKey, unwrappingKey,
        { name: "AES-GCM", iv }, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
    );
    // Spara råbytes i session så content.js kan använda nyckeln
    const råbytes = await crypto.subtle.exportKey("raw", nyckel);
    await chrome.storage.session.set({ arKrypteringsNyckel: bufferTillBase64(råbytes) });
    return nyckel;
}

// ── Generera ny nyckel och spara i session ─────────────────────────────────

async function genereraNyNyckel() {
    const nyckel = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
    );
    const råbytes = await crypto.subtle.exportKey("raw", nyckel);
    await chrome.storage.session.set({ arKrypteringsNyckel: bufferTillBase64(råbytes) });
    return nyckel;
}

// ── Hämta krypterad nyckel från backend ───────────────────────────────────

async function hämtaKrypteringsnyckelFrånBackend(token) {
    const resp = await fetch(`${AR_BACKEND}/api/encryption-key`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (resp.status === 404) return null;
    if (!resp.ok) return null;
    return resp.json();
}

// ── Spara krypterad nyckel till backend ───────────────────────────────────

async function sparaKrypteringsnyckelTillBackend(token, nyckelData) {
    await fetch(`${AR_BACKEND}/api/encryption-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(nyckelData)
    });
}

// ── Exportera publika funktioner ───────────────────────────────────────────

window.AR_KRYPTERING = {
    kryptera,
    dekryptera,
    hämtaNyckel,
    exporteraNyckelMedLösenord,
    importeraNyckelMedLösenord,
    genereraNyNyckel,
    hämtaKrypteringsnyckelFrånBackend,
    sparaKrypteringsnyckelTillBackend
};
