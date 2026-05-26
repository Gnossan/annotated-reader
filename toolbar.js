// AIuda Reader — flytande verktygsfält
(function () {
    if (document.getElementById("ar-toolbar")) return;

    const toolbar = document.createElement("div");
    toolbar.id = "ar-toolbar";
    toolbar.style.cssText = `
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        background: #fff;
        border: 1px solid rgba(0,0,0,0.12);
        border-right: none;
        border-radius: 8px 0 0 8px;
        box-shadow: -2px 2px 8px rgba(0,0,0,0.08);
        padding: 6px 5px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        z-index: 2147483646;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `;

    document.body.appendChild(toolbar);

    function lagaKnapp(emoji, title, onClick) {
        const btn = document.createElement("button");
        btn.title = title;
        btn.textContent = emoji;
        btn.style.cssText = `
            width: 34px; height: 34px;
            border: none; background: transparent;
            border-radius: 5px; cursor: pointer;
            font-size: 16px; line-height: 1;
            display: flex; align-items: center; justify-content: center;
            padding: 0; transition: background 0.12s;
        `;
        btn.addEventListener("mouseenter", () => btn.style.background = "rgba(0,0,0,0.06)");
        btn.addEventListener("mouseleave", () => btn.style.background = "transparent");
        btn.addEventListener("click", onClick);
        return btn;
    }

    // 📖 Annotera sidan
    const annotateBtn = lagaKnapp("📖", "Annotate this page", () => {
        chrome.runtime.sendMessage({ type: "TOOLBAR_ANNOTATE" });
    });

    // 🔍 Öppna AIuda Mentor (om installerad)
    const mentorBtn = lagaKnapp("🔍", "Open AIuda Mentor", () => {
        chrome.runtime.sendMessage({ type: "TOOLBAR_SEARCH", query: "" });
    });

    toolbar.appendChild(annotateBtn);
    toolbar.appendChild(mentorBtn);
})();
