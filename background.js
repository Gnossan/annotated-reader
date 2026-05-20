console.log("background.js laddad");

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
        chrome.storage.local.get(["apiKey", "modell", "temperature"], async (result) => {
            const apiKey = result.apiKey;
            if (!apiKey) {
                sendResponse({ error: "Ingen API-nyckel" });
                return;
            }

            const modell = result.modell || "claude-opus-4-7";
            const temperature = result.temperature ?? 1.0;

            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "anthropic-dangerous-direct-browser-access": "true"
                },
                body: JSON.stringify({
                    model: modell,
                    max_tokens: 4096,
                    temperature,
                    messages: [
                        {
                            role: "user",
                            content: `Analysera följande text och returnera ENDAST ett JSON-objekt utan förklaringar eller markdown.

Identifiera själv 3-5 meningsfulla kategorier som passar textens innehåll och tema.
För varje kategori, välj en distinkt färg i hex-format.
Annotera sedan texten med fraser som tillhör kategorierna.

Format:
{
  "sammanfattning": "En eller ett par meningar om vad texten handlar om",
  "kategorier": [
    {"namn": "kategorinamn", "farg": "#hexfarg", "beskrivning": "kort beskrivning av kategorin"}
  ],
  "annoteringar": [
    {"text": "...", "kategori": "kategorinamn", "beskrivning": "..."}
  ]
}

Text:
${message.text}`
                        }
                    ]
                })
            });

            const data = await response.json();
            if (data.usage) loggaTokens("ANNOTATE", data.usage);
            sendResponse({ result: data });
        });
        return true;
    }

    if (message.type === "CHAT") {
        chrome.storage.local.get(["apiKey", "modell", "temperature"], async (result) => {
            const apiKey = result.apiKey;
            if (!apiKey) {
                sendResponse({ error: "Ingen API-nyckel" });
                return;
            }

            const modell = result.modell || "claude-opus-4-7";
            const temperature = result.temperature ?? 1.0;

            // --- Cache-kontroll på sista meddelandet i historiken ---
            const historikMedCache = message.historik.map((msg, index) => {
                const { silent, ...renMsg } = msg;
                if (index === message.historik.length - 1) {
                    let contentText;
                    try {
                        contentText = typeof renMsg.content === "string"
                            ? renMsg.content
                            : renMsg.content?.[0]?.text ?? "";
                    } catch (e) {
                        console.error("Cache-fel: msg =", JSON.stringify(msg), "fel =", e.message);
                        contentText = "";
                    }
                    return {
                        ...renMsg,
                        content: [{ type: "text", text: contentText, cache_control: { type: "ephemeral" } }]
                    };
                }
                return renMsg;
            });

            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "anthropic-dangerous-direct-browser-access": "true"
                },
                body: JSON.stringify({
                    model: modell,
                    max_tokens: 1024,
                    temperature,
                    system: [
                        {
                            type: "text",
                            text: message.systemprompt,
                            cache_control: { type: "ephemeral" }
                        }
                    ],
                    messages: historikMedCache
                })
            });

            const data = await response.json();
            console.log("CHAT råsvar:", JSON.stringify(data));
            if (data.usage) loggaTokens("CHAT", data.usage);
            sendResponse({ result: data });
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
            kategorier: message.kategorier
        };
        chrome.sidePanel.open({ windowId: sender.tab.windowId });
        setTimeout(() => {
            chrome.runtime.sendMessage({ type: "OPEN_PANEL", ...kontext });
        }, 500);
        sendResponse({});
        return true;
    }
});