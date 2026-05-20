const status = document.getElementById("status");

const MODELLER = {
    "claude-opus-4-7":          { fixedTemp: true },
    "claude-sonnet-4-6":        { fixedTemp: false },
    "claude-haiku-4-5-20251001": { fixedTemp: false }
};

// --- Ladda sparade inställningar ---
chrome.storage.local.get(["apiKey", "modell", "temperature"], (result) => {
    if (result.apiKey) {
        document.getElementById("api-key").placeholder = "Nyckel sparad";
        status.textContent = "Nyckel sparad";
    }

    const modell = result.modell || "claude-opus-4-7";
    const temp = result.temperature ?? 1.0;

    document.getElementById("modell-val").value = modell;
    document.getElementById("temp-slider").value = temp;
    document.getElementById("temp-värde").textContent = parseFloat(temp).toFixed(1);
    uppdateraTempUI(modell);
});

// --- API-nyckel ---
document.getElementById("save-btn").addEventListener("click", () => {
    const key = document.getElementById("api-key").value.trim();
    if (!key) return;
    chrome.storage.local.set({ apiKey: key }, () => {
        status.textContent = "Sparad";
        document.getElementById("api-key").value = "";
        document.getElementById("api-key").placeholder = "Nyckel sparad";
    });
});

// --- Annotera ---
document.getElementById("annotate-btn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["content.js"]
        });
        window.close();
    });
});

// --- Avancerat-panel ---
document.getElementById("avancerat-btn").addEventListener("click", () => {
    const panel = document.getElementById("avancerat-panel");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
});

document.getElementById("modell-val").addEventListener("change", (e) => {
    uppdateraTempUI(e.target.value);
});

document.getElementById("temp-slider").addEventListener("input", (e) => {
    document.getElementById("temp-värde").textContent = parseFloat(e.target.value).toFixed(1);
});

document.getElementById("spara-avancerat").addEventListener("click", () => {
    const modell = document.getElementById("modell-val").value;
    const temp = parseFloat(document.getElementById("temp-slider").value);
    chrome.storage.local.set({ modell, temperature: temp }, () => {
        status.textContent = "Inställningar sparade";
        setTimeout(() => { status.textContent = ""; }, 2000);
    });
});

function uppdateraTempUI(modell) {
    const slider = document.getElementById("temp-slider");
    const not = document.getElementById("temp-not");
    const fixad = MODELLER[modell]?.fixedTemp ?? false;

    if (fixad) {
        slider.value = 1.0;
        slider.disabled = true;
        document.getElementById("temp-värde").textContent = "1.0";
        not.textContent = "Opus 4.7 kräver temperature 1.0";
    } else {
        slider.disabled = false;
        not.textContent = "";
    }
}
