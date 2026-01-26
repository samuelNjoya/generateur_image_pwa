// ============================================
// IMAGEAI - Logicielle PWA
// ============================================

const AppState = {
    currentScreen: 'generator',
    history: [],
    selectedSize: 'square',
    isGenerating: false,
    selectedModel: 'flux',
};

const SURPRISE_PROMPTS = [
    "Un astronaute faisant du skate sur les anneaux de Saturne, style cyberpunk",
    "Un petit dragon endormi dans une tasse de café, style Pixar 3D",
    "Portrait d'une guerrière viking avec des peintures de guerre, hyper-réaliste",
    "Un chat samouraï en armure traditionnelle japonaise, style estampe",
    "Une forêt enchantée avec des champignons géants lumineux et des fées",
    "Un vieux renard bibliothécaire portant des lunettes, style peinture à l'huile",
    "Un robot géant rouillé dans un champ de fleurs sauvages, style Ghibli",
    "Le portrait d'un lion fait entièrement de galaxies et de nébuleuses étoilées"
];

const POLLINATIONS_API = 'https://image.pollinations.ai/prompt/';
const STORAGE_KEYS = { HISTORY: 'imageai_history', SETTINGS: 'imageai_settings' };

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Splash screen (3s)
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) splash.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => splash?.remove(), 500);
    }, 2500);

    loadHistory();
    loadSettings();
    setupEventListeners();
    updateHistoryDisplay();
    updateStats();
    registerServiceWorker();
}

// === EVENT LISTENERS ===
function setupEventListeners() {
    // Navigation (Correction des classes Tailwind)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchScreen(item.dataset.screen));
    });

    // Auto-resize Textarea (Le style ChatGPT)
    const promptInput = document.getElementById('prompt-input');
    promptInput?.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        document.getElementById('char-count').textContent = this.value.length;
    });

    // Bouton Générer
    document.getElementById('generate-btn')?.addEventListener('click', handleGenerate);
    
    // Surprise
    document.getElementById('surprise-btn')?.addEventListener('click', handleSurprise);

    // Formats d'image
    document.querySelectorAll('.size-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-option-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.selectedSize = btn.dataset.size;
        });
    });

    // Modèles
    document.getElementById('model-select')?.addEventListener('change', (e) => {
        AppState.selectedModel = e.target.value;
        saveSettings();
    });

    // Actions Image
    document.getElementById('preview-download-btn')?.addEventListener('click', () => {
        const img = document.getElementById('preview-image');
        if (img.src) downloadImage(img.src, `imageai-${Date.now()}.png`);
    });

    document.getElementById('preview-share-btn')?.addEventListener('click', () => {
        const img = document.getElementById('preview-image');
        if (img.src) shareImage(img.src, 'Ma création ImageAI', 'Regarde cette image !');
    });

    // Modal & Historique
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('clear-history-btn')?.addEventListener('click', handleClearHistory);
}

// === NAVIGATION ===
function switchScreen(screenName) {
    // 1. Gérer les écrans
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenName}`)?.classList.add('active');

    // 2. Gérer les icônes de navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        const link = item.querySelector('.nav-item-link');
        if (item.dataset.screen === screenName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    AppState.currentScreen = screenName;
    window.scrollTo(0, 0);
}

// === GENERATION LOGIC ===
async function handleGenerate() {
    const promptInput = document.getElementById('prompt-input');
    const originalPrompt = promptInput.value.trim();

    if (!originalPrompt) {
        showToast('Écris quelque chose d\'abord !', 'warning');
        return;
    }

    if (AppState.isGenerating) return;

    AppState.isGenerating = true;
    toggleLoading(true);

    try {
        // Traduction automatique
        const translatedPrompt = await translateToEnglish(originalPrompt);
        
        // Construction de l'URL Pollinations
        let finalPrompt = translatedPrompt;
        if (AppState.selectedModel === 'flux-realism') finalPrompt += ", ultra realistic, 8k, photography";
        if (AppState.selectedModel === 'any-v4-5') finalPrompt += ", anime style, high quality";

        const width = AppState.selectedSize === 'landscape' ? 1280 : (AppState.selectedSize === 'portrait' ? 720 : 1024);
        const height = AppState.selectedSize === 'landscape' ? 720 : (AppState.selectedSize === 'portrait' ? 1280 : 1024);
        const seed = Math.floor(Math.random() * 999999);
        
        const imageUrl = `${POLLINATIONS_API}${encodeURIComponent(finalPrompt)}?width=${width}&height=${height}&model=${AppState.selectedModel}&seed=${seed}&nologo=true`;

        // Pré-chargement de l'image
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
        });

        // Mise à jour UI & Histoire
        const historyItem = { id: Date.now(), prompt: originalPrompt, imageUrl, size: AppState.selectedSize, timestamp: new Date() };
        AppState.history.unshift(historyItem);
        saveHistory();
        
        document.getElementById('preview-image').src = imageUrl;
        document.getElementById('preview-image-container').classList.remove('hidden');
        document.getElementById('preview-placeholder').classList.add('hidden');
        
        updateHistoryDisplay();
        updateStats();
        showToast('Image créée ! ✨', 'success');

    } catch (error) {
        showToast('Erreur de génération...', 'error');
    } finally {
        AppState.isGenerating = false;
        toggleLoading(false);
    }
}

// === UTILS ===
async function translateToEnglish(text) {
    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|en`);
        const data = await res.json();
        return data.responseData.translatedText || text;
    } catch { return text; }
}

function toggleLoading(isLoading) {
    const loader = document.getElementById('preview-loading');
    const btn = document.getElementById('generate-btn');
    
    if (isLoading) {
        loader.classList.remove('hidden');
        loader.classList.add('flex');
        btn.disabled = true;
        btn.classList.add('opacity-50');
    } else {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        btn.disabled = false;
        btn.classList.remove('opacity-50');
    }
}

function handleSurprise() {
    const input = document.getElementById('prompt-input');
    input.value = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
    input.dispatchEvent(new Event('input')); // Trigger auto-resize
}

function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white text-sm font-medium z-50 transition-all duration-300 show ${type === 'success' ? 'bg-green-500' : 'bg-indigo-500'}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// === STORAGE & HISTORY ===
function saveHistory() { localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(AppState.history)); }
function loadHistory() { 
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    AppState.history = data ? JSON.parse(data) : [];
}
function saveSettings() { localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ model: AppState.selectedModel, size: AppState.selectedSize })); }
function loadSettings() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
    if(data.model) AppState.selectedModel = data.model;
    if(data.size) AppState.selectedSize = data.size;
}

function updateHistoryDisplay() {
    const grid = document.getElementById('history-grid');
    if (!grid) return;
    grid.innerHTML = AppState.history.map(item => `
        <div class="image-card relative aspect-square rounded-2xl overflow-hidden bg-gray-800" onclick="openImageModal(${item.id})">
            <img src="${item.imageUrl}" class="w-full h-full object-cover" loading="lazy">
            <div class="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <p class="text-white text-xs truncate">${item.prompt}</p>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    const el = document.getElementById('total-images');
    if(el) el.textContent = AppState.history.length;
}

// === MODAL ===
function openImageModal(id) {
    const item = AppState.history.find(h => h.id === id);
    if (!item) return;
    document.getElementById('modal-image').src = item.imageUrl;
    document.getElementById('modal-prompt').textContent = item.prompt;
    document.getElementById('image-modal').classList.add('active');
}
function closeModal() { document.getElementById('image-modal').classList.remove('active'); }

// === PWA & SERVICE WORKER ===
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.log("SW error", err));
    }
}

async function downloadImage(url, name) {
    const res = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
}