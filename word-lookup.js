// AIuda Reader — word lookup
// Körs automatiskt på alla sidor. Lyssnar tyst på textmarkering
// och visar en ?-knapp. Endast det markerade ordet skickas till Claude.

(function () {
    const DAGSGRANS_MEDDELANDEN = {
        en:      "You've reached your free daily limit (20 lookups). Sign in to AIuda Reader for unlimited access.",
        "en-GB": "You've reached your free daily limit (20 lookups). Sign in to AIuda Reader for unlimited access.",
        sv:      "Du har nått din gratis dagsgräns (20 uppslagningar). Logga in på AIuda Reader för obegränsad åtkomst.",
        da:      "Du har nået din gratis daglige grænse (20 opslag). Log ind på AIuda Reader for ubegrænset adgang.",
        no:      "Du har nådd din gratis dagsgrense (20 oppslag). Logg inn på AIuda Reader for ubegrenset tilgang.",
        de:      "Sie haben Ihr kostenloses Tageslimit erreicht (20 Nachschläge). Melden Sie sich bei AIuda Reader an für unbegrenzten Zugang.",
        fr:      "Vous avez atteint votre limite quotidienne gratuite (20 recherches). Connectez-vous à AIuda Reader pour un accès illimité.",
        es:      "Has alcanzado tu límite diario gratuito (20 búsquedas). Inicia sesión en AIuda Reader para acceso ilimitado.",
        it:      "Hai raggiunto il limite giornaliero gratuito (20 ricerche). Accedi ad AIuda Reader per un accesso illimitato.",
    };

    // Aktivera textmarkering på sidor som blockerar den
    const selStyle = document.createElement("style");
    selStyle.textContent = `
        a { -webkit-user-select: text !important; user-select: text !important; }
        a[aria-hidden="true"] { pointer-events: none !important; }
    `;
    document.head.appendChild(selStyle);

    let lookupKnapp = null;
    let currentLang = "en";
    chrome.storage.local.get("lang", ({ lang = "en" }) => { currentLang = lang; });

    document.addEventListener("mouseup", (e) => {
        if (e.target === lookupKnapp) return;
        lookupKnapp?.remove();
        lookupKnapp = null;

        const urval = window.getSelection();
        if (!urval || urval.isCollapsed) return;
        const text = urval.toString().trim();
        if (!text || text.length > 80 || text.includes("\n")) return;

        const range = urval.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const knapp = document.createElement("button");
        knapp.textContent = "?";
        knapp.style.cssText = `
            position: fixed;
            left: ${Math.min(rect.right + 6, window.innerWidth - 36)}px;
            top: ${rect.top - 4}px;
            background: #1a1610;
            color: #f0c040;
            border: 1px solid #f0c040;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            z-index: 2147483647;
            padding: 0;
            line-height: 1;
            font-family: sans-serif;
            box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        `;
        document.body.appendChild(knapp);
        lookupKnapp = knapp;

        knapp.addEventListener("mousedown", async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            knapp.remove();
            lookupKnapp = null;

            const x = Math.min(rect.right + 8, window.innerWidth - 280);
            const y = rect.bottom + 8;

            // Visa laddnings-popup med studsande punkter
            visaLaddPopup(x, y, text);

            const svar = await chrome.runtime.sendMessage({ type: "LOOKUP_WORD", word: text });

            if (svar?.definition) {
                visaPopup(x, y, text, svar.definition);
            } else if (svar?.error === "daily_limit") {
                visaPopup(x, y, text, DAGSGRANS_MEDDELANDEN[currentLang] || DAGSGRANS_MEDDELANDEN.en);
            } else {
                document.getElementById("ar-lookup-popup")?.remove();
            }
        });
    });

    document.addEventListener("mousedown", (e) => {
        if (e.target === lookupKnapp) return;
        lookupKnapp?.remove();
        lookupKnapp = null;
    });

    // Ta bort ?-knappen vid högerklick så annoteringskontextmenyn inte störs
    document.addEventListener("contextmenu", () => {
        lookupKnapp?.remove();
        lookupKnapp = null;
    });

    // 🥕 Easter egg — Konami-kod ersätter Trump-bilder med morötter
    const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown",
                    "ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
    let konamiPos = 0;

    function morotDataUri() {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 200;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#f5f5f5";
        ctx.fillRect(0, 0, 200, 200);
        ctx.font = "120px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🥕", 100, 110);
        return canvas.toDataURL();
    }

    function ärTrumpBild(img) {
        const sökord = ["trump", "donald"];
        const text = [
            img.alt, img.title, img.src,
            img.closest("a")?.href || "",
            img.parentElement?.textContent || ""
        ].join(" ").toLowerCase();
        return sökord.some(s => text.includes(s));
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === KONAMI[konamiPos]) {
            konamiPos++;
            if (konamiPos === KONAMI.length) {
                konamiPos = 0;
                const morot = morotDataUri();
                let antal = 0;
                document.querySelectorAll("img").forEach(img => {
                    if (ärTrumpBild(img)) {
                        img.src = morot;
                        img.alt = "🥕";
                        img.style.objectFit = "contain";
                        antal++;
                    }
                });
                if (antal > 0) {
                    const toast = document.createElement("div");
                    toast.textContent = `🥕 ${antal} morot${antal > 1 ? "er" : ""} serverad${antal > 1 ? "e" : ""}`;
                    toast.style.cssText = `
                        position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
                        background:#1a1610;color:#f5f0e8;padding:10px 20px;
                        border-radius:20px;font-family:sans-serif;font-size:14px;
                        z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,0.4);
                    `;
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 3000);
                }
            }
        } else {
            konamiPos = e.key === KONAMI[0] ? 1 : 0;
        }
    });

    function visaLaddPopup(x, y, word) {
        document.getElementById("ar-lookup-popup")?.remove();
        const popup = document.createElement("div");
        popup.id = "ar-lookup-popup";
        popup.style.cssText = `
            position: fixed; left: ${x}px; top: ${y}px;
            background: #1a1610; color: #f5f0e8;
            padding: 12px 14px; border-radius: 8px;
            font-family: sans-serif; font-size: 13px;
            max-width: 260px; z-index: 2147483647;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5);
            line-height: 1.5; border: 1px solid #333;
        `;
        popup.innerHTML = `
            <style>
                @keyframes ar-studsa {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
                    40% { transform: translateY(-5px); opacity: 1; }
                }
                .ar-lp { display:inline-block; width:6px; height:6px; border-radius:50%;
                    background:#f5f0e8; margin:0 2px;
                    animation: ar-studsa 1.2s infinite ease-in-out; }
                .ar-lp:nth-child(2) { animation-delay: 0.2s; }
                .ar-lp:nth-child(3) { animation-delay: 0.4s; }
            </style>
            <div style="font-weight:600;margin-bottom:8px;">${word}</div>
            <div><span class="ar-lp"></span><span class="ar-lp"></span><span class="ar-lp"></span></div>
        `;
        document.body.appendChild(popup);
    }

    function visaPopup(x, y, word, definition) {
        document.getElementById("ar-lookup-popup")?.remove();

        const popup = document.createElement("div");
        popup.id = "ar-lookup-popup";
        popup.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: #1a1610;
            color: #f5f0e8;
            padding: 12px 14px;
            border-radius: 8px;
            font-family: sans-serif;
            font-size: 13px;
            max-width: 260px;
            z-index: 2147483647;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5);
            line-height: 1.5;
            border: 1px solid #333;
        `;
        const sidSprak = document.documentElement.lang || "en";
        popup.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
                <span style="font-weight:600;">${word}</span>
                <button id="ar-tala-knapp" title="Listen" style="
                    background:transparent;border:none;cursor:pointer;
                    font-size:15px;padding:0 0 0 8px;opacity:0.7;line-height:1;
                ">🔊</button>
            </div>
            <div style="opacity:0.85;font-size:12px;">${definition}</div>
        `;
        popup.querySelector("#ar-tala-knapp").addEventListener("click", (e) => {
            e.stopPropagation();
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(word);
            u.lang = sidSprak;
            window.speechSynthesis.speak(u);
        });
        document.body.appendChild(popup);

        // Justera om popupen hamnar utanför skärmen
        const r = popup.getBoundingClientRect();
        if (r.right  > window.innerWidth)  popup.style.left = `${x - r.width}px`;
        if (r.bottom > window.innerHeight) popup.style.top  = `${y - r.height - rect?.height - 16}px`;

        setTimeout(() => {
            document.addEventListener("click", () => {
                document.getElementById("ar-lookup-popup")?.remove();
            }, { once: true });
        }, 0);
    }
})();
