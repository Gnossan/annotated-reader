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

    if (message.type === "REFRESH_AND_GET_CONFIG") {
        chrome.storage.local.get(["modell", "temperature", "lang"], async (result) => {
            const modell = result.modell || "claude-opus-4-7";
            const temperature = result.temperature ?? 1.0;
            const lang = result.lang || "en";
            const t = AR_LOCALES[lang] || AR_LOCALES.en;
            const nyToken = await förnyaToken();
            const token = nyToken || await hämtaToken();
            sendResponse({ token, prompt: t.annoteringsPrompt(message.text), model: modell, temperature });
        });
        return true;
    }

    if (message.type === "LOOKUP_WORD") {
        chrome.storage.local.get("lang", async ({ lang = "en" }) => {
            const token = await hämtaToken();

            const fleraOrd = message.word.trim().includes(" ");
            let response;
            if (token) {
                // Inloggad — använd autentiserad chat-endpoint
                const LANG_NAMES = { en: "English", "en-GB": "English", sv: "Swedish", da: "Danish", no: "Norwegian", de: "German", fr: "French", es: "Spanish", it: "Italian" };
                const targetLang = LANG_NAMES[lang] || "English";
                const prompt = fleraOrd
                    ? `Translate "${message.word}" into ${targetLang}. Respond with only the translation, nothing else.`
                    : `Define "${message.word}" in one concise dictionary-style sentence in ${targetLang}. No extra commentary, just the definition.`;
                const system = fleraOrd
                    ? `You are a translator. Respond only with the translation in ${targetLang}.`
                    : `You are a dictionary. Respond only with a single concise definition in ${targetLang}.`;
                response = await fetchMedToken(
                    `${BACKEND}/api/chat`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            historik: [{ role: "user", content: prompt }],
                            systemprompt: system,
                            model: "claude-haiku-4-5-20251001",
                            temperature: 0.3
                        })
                    },
                    token
                );
                if (!response.ok) { sendResponse({ error: "fetch_error" }); return; }
                const data = await response.json();
                sendResponse({ definition: data.result?.content?.[0]?.text?.trim() || "" });
            } else {
                // Anonym — gratis-endpoint med extension-ID och dagsgräns
                response = await fetch(`${BACKEND}/api/word-lookup-free`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Extension-Id": chrome.runtime.id
                    },
                    body: JSON.stringify({ word: message.word, lang })
                });
                if (response.status === 429) {
                    sendResponse({ error: "daily_limit" });
                    return;
                }
                if (!response.ok) { sendResponse({ error: "fetch_error" }); return; }
                const data = await response.json();
                sendResponse({ definition: data.definition || "" });
            }
        });
        return true;
    }

    if (message.type === "ANALYZE_WORDS") {
        chrome.storage.local.get(null, async (result) => {
            const token = await hämtaToken();
            if (!token) { sendResponse({ error: "not_logged_in" }); return; }

            const response = await fetchMedToken(
                `${BACKEND}/api/word-difficulty`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: message.text,
                        level: message.level,
                        lang: result.lang || "en"
                    })
                },
                token
            );

            if (response.status === 429) {
                const errData = await response.json().catch(() => ({}));
                sendResponse({ error: "quota_exceeded", plan: errData.plan });
                return;
            }
            const data = await response.json();
            sendResponse({ words: data.words, error: data.error });
        });
        return true;
    }

    if (message.type === "GET_ANNOTATE_CONFIG") {
        chrome.storage.local.get(["modell", "temperature", "lang"], async (result) => {
            const modell = result.modell || "claude-opus-4-7";
            const temperature = result.temperature ?? 1.0;
            const lang = result.lang || "en";
            const t = AR_LOCALES[lang] || AR_LOCALES.en;
            const token = await hämtaToken();
            sendResponse({ token, prompt: t.annoteringsPrompt(message.text), model: modell, temperature });
        });
        return true;
    }

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

            if (response.status === 429) {
                console.warn("⚠ KVOT SLUT [ANNOTATE]: Användaren har nått sin månadsgräns.\n→ Logga in på Firebase och höj kvoten, eller vänta till nästa månad.\n→ Admin: https://console.firebase.google.com");
                const errData = await response.json().catch(() => ({}));
                sendResponse({ error: "quota_exceeded", plan: errData.plan });
                return;
            }
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

            if (response.status === 429) {
                console.warn("⚠ KVOT SLUT [CHAT]: Användaren har nått sin månadsgräns.\n→ Logga in på Firebase och höj kvoten, eller vänta till nästa månad.\n→ Admin: https://console.firebase.google.com");
                const errData = await response.json().catch(() => ({}));
                sendResponse({ error: "quota_exceeded", plan: errData.plan });
                return;
            }
            const data = await response.json();
            console.log("CHAT råsvar:", JSON.stringify(data));
            if (data.result?.usage) loggaTokens("CHAT", data.result.usage);
            sendResponse({ result: data.result, error: data.error, plan: data.plan });
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
        // Spara kontext per flik för automatiskt byte vid flikbyte
        chrome.storage.session.set({ [`ar_tab_${sender.tab.id}`]: kontext });
        chrome.sidePanel.open({ windowId: sender.tab.windowId });
        setTimeout(() => {
            chrome.runtime.sendMessage({ type: "OPEN_PANEL", ...kontext });
        }, 500);
        sendResponse({});
        return true;
    }

    if (message.type === "TOOLBAR_ANNOTATE") {
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            files: ["content.js"]
        });
        sendResponse({});
        return true;
    }

    if (message.type === "TOOLBAR_SEARCH") {
        chrome.search.query({ text: message.query, disposition: "NEW_TAB" });
        sendResponse({});
        return true;
    }
});

// --- Automatiskt sidopanelsbyte vid flikbyte ---
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const key = `ar_tab_${tabId}`;
    const stored = await chrome.storage.session.get(key);
    if (stored[key]) {
        chrome.runtime.sendMessage({ type: "OPEN_PANEL", ...stored[key] });
    }
});

// --- Streaming-ordanalys via port ---
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "word-difficulty-stream") return;

    let cancelled = false;
    port.onDisconnect.addListener(() => { cancelled = true; });

    port.onMessage.addListener(async ({ text, level, lang }) => {
        let token = await hämtaToken();
        if (!token) {
            if (!cancelled) port.postMessage({ error: "not_logged_in" });
            return;
        }

        const doFetch = async (tok) => fetch(`${BACKEND}/api/word-difficulty-stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tok}` },
            body: JSON.stringify({ text, level, lang })
        });

        let resp = await doFetch(token);
        if (resp.status === 401) {
            const nyToken = await förnyaToken();
            if (nyToken) { token = nyToken; resp = await doFetch(token); }
        }

        if (!resp.ok) {
            if (!cancelled) port.postMessage({ error: resp.status === 429 ? "quota_exceeded" : "fetch_error" });
            return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        const keepAlive = setInterval(() => chrome.storage.local.get("_keepAlive"), 20000);

        try {
            while (true) {
                if (cancelled) { reader.cancel(); return; }
                const { done, value } = await reader.read();
                if (done) break;
                sseBuffer += decoder.decode(value, { stream: true });
                const lines = sseBuffer.split("\n");
                sseBuffer = lines.pop();
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.text) port.postMessage({ chunk: data.text });
                        if (data.done) { port.postMessage({ done: true }); return; }
                        if (data.error) { port.postMessage({ error: data.error }); return; }
                    } catch {}
                }
            }
            if (!cancelled) port.postMessage({ done: true });
        } catch (e) {
            if (!cancelled) port.postMessage({ error: "stream_error" });
        } finally {
            clearInterval(keepAlive);
        }
    });
});

// --- Streaming-annotering via port (undviker content-scriptets 30s-timeout) ---
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "annotate-stream") return;

    let cancelled = false;
    port.onDisconnect.addListener(() => { cancelled = true; });

    port.onMessage.addListener(async ({ text }) => {
        const result = await chrome.storage.local.get(["modell", "temperature", "lang"]);
        const modell = result.modell || "claude-opus-4-7";
        const temperature = result.temperature ?? 1.0;
        const lang = result.lang || "en";
        const t = AR_LOCALES[lang] || AR_LOCALES.en;

        let token = await hämtaToken();
        if (!token) {
            if (!cancelled) port.postMessage({ error: "not_logged_in" });
            return;
        }

        const doFetch = async (tok) => fetch(`${BACKEND}/api/annotate-stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tok}` },
            body: JSON.stringify({ text, prompt: t.annoteringsPrompt(text), model: modell, temperature })
        });

        let resp = await doFetch(token);
        if (resp.status === 401) {
            const nyToken = await förnyaToken();
            if (nyToken) { token = nyToken; resp = await doFetch(token); }
        }

        if (!resp.ok) {
            if (!cancelled) port.postMessage({ error: resp.status === 429 ? "quota_exceeded" : "fetch_error" });
            return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";

        // Håll service workern vid liv under hela streamen (MV3 dödar annars SW efter ~30s)
        const keepAlive = setInterval(() => chrome.storage.local.get("_keepAlive"), 20000);

        try {
            while (true) {
                if (cancelled) { reader.cancel(); return; }
                const { done, value } = await reader.read();
                if (done) break;
                sseBuffer += decoder.decode(value, { stream: true });
                const lines = sseBuffer.split("\n");
                sseBuffer = lines.pop();
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.text) port.postMessage({ chunk: data.text });
                        if (data.done) { port.postMessage({ done: true }); return; }
                        if (data.error) { port.postMessage({ error: data.error }); return; }
                    } catch {}
                }
            }
            if (!cancelled) port.postMessage({ done: true });
        } catch (e) {
            console.error("annotate-stream port fel:", e.message);
            if (!cancelled) port.postMessage({ error: "stream_error" });
        } finally {
            clearInterval(keepAlive);
        }
    });
});
