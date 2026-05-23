// AIuda Reader — word lookup
// Körs automatiskt på alla sidor. Lyssnar tyst på textmarkering
// och visar en ?-knapp. Endast det markerade ordet skickas till Claude.

(function () {
    let lookupKnapp = null;

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
        popup.innerHTML = `
            <div style="font-weight:600;margin-bottom:5px;">${word}</div>
            <div style="opacity:0.85;font-size:12px;">${definition}</div>
        `;
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
