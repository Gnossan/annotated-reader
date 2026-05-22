importScripts('locales.js');
console.log("background.js laddad");

const BACKEND = "https://annotated-reader-backend.vercel.app";
const FIREBASE_API_KEY = "AIzaSyCmClubetYGavOEVHBUHKQ-_sZZdt-LIWc";

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    if (message.type === "AUTH_COMPLETE") {
        chrome.storage.local.set({
            arToken: message.token,
            arRefreshToken: message.refreshToken || null,
            arUser: { email: message.email, name: message.name, photo: message.photo }
        }, () => {
            chrome.action.openPopup();
        });
        sendResponse({ ok: true });
    }
});

async function hämtaToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get("arToken", ({ arToken }) => resolve(arToken || null));
    });
}

async function förnyaToken() {
    const { arRefreshToken } = await chrome.storage.local.get("arRefreshToken");
    if (!arRefreshToken) return null;

    try {
        const resp = await fetch(
            `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(arRefreshToken)}`
            }
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        await chrome.storage.local.set({
            arToken: data.id_token,
            arRefreshToken: data.refresh_token
        });
        console.log("Token förnyad automatiskt");
        return data.id_token;
    } catch (e) {
        console.error("Token-förnyelse misslyckades:", e);
        return null;
    }
}

async function fetchMedToken(url, options, token) {
    let resp = await fetch(url, {
        ...options,
        headers: { ...options.headers, "Authorization": `Bearer ${token}` }
    });

    if (resp.status === 401) {
        console.log("401 – försöker förnya token automatiskt...");
        const nyToken = await förnyaToken();
        if (nyToken) {
            resp = await fetch(url, {
                ...options,
                headers: { ...options.headers, "Authorization": `Bearer ${nyToken}` }
            });
        }
    }

    return resp;
}

// --- Token-loggning ---
function loggaTokens(typ, usage) {
    const total = (usage.input_tokens || 0) + (usage.output_tokens || 0);
    const cacheLäst = usage.cache_read_input_tokens || 0;
    const cacheSkriven = usage.cache_creation_input_tokens || 0;
    console.log(`[${typ}] input: ${usage.input_tokens} | output: ${usage.output_tokens} | cache_read: ${cacheLäst} | cache_write: ${cacheSkriven} | TOTALT: ${total}`);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Meddelande mottaget:", message.type);

    if (message.type === "ANNOTATE") {
        chrome.storage.local.get(["modell", "temperature", "lang"], async (result) => {
            const modell = result.modell || "claude-opus-4-7";
            const temperature = result.temperature ?? 1.0;
            const lang = result.lang || "en";
            const t = AR_LOCALES[lang] || AR_LOCALES.en;
            const token = await hämtaToken();

            if (!token) { sendResponse({ error: "Ej inloggad" }); return; }

            const response = await fetchMedToken(
                `${BACKEND}/api/annotate`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: message.text,
                        prompt: t.annoteringsPrompt(message.text),
                        model: modell,
                        temperature
                    })
                },
                token
            );

            const data = await response.json();
            if (data.result?.usage) loggaTokens("ANNOTATE", data.result.usage);
            sendResponse({ result: data.result });
        });
        return true;
    }

    if (message.type === "CHAT") {
        chrome.storage.local.get(["modell", "temperature"], async (result) => {
            const modell = result.modell || "claude-opus-4-7";
            const temperature = result.temperature ?? 1.0;
            const token = await hämtaToken();

            if (!token) { sendResponse({ error: "Ej inloggad" }); return; }

            const response = await fetchMedToken(
                `${BACKEND}/api/chat`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        historik: message.historik,
                        systemprompt: message.systemprompt,
                        model: modell,
                        temperature
                    })
                },
                token
            );

            const data = await response.json();
            console.log("CHAT råsvar:", JSON.stringify(data));
            if (data.result?.usage) loggaTokens("CHAT", data.result.usage);
            sendResponse({ result: data.result });
        });
        return true;
    }

    if (message.type === "OPEN_SIDEPANEL") {
        const kontext = {
            fras: message.fras,
            markeringId: message.markeringId,
            kategori: message.kategori,
            beskrivning: message.beskrivning,
            sammanfattning: message.sammanfattning,
            kategorier: message.kategorier,
            helText: message.helText
        };
        chrome.sidePanel.open({ windowId: sender.tab.windowId });
        setTimeout(() => {
            chrome.runtime.sendMessage({ type: "OPEN_PANEL", ...kontext });
        }, 500);
        sendResponse({});
        return true;
    }
});
