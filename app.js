// ============================================
// IMAGEAI - VERSION INTEGRALE CORRIGÉE
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
    "Un robot géant rouillé dans un champ de fleurs sauvages, style Ghibli",
    "Le portrait d'un lion fait entièrement de galaxies",
    "Une villa moderne en verre suspendue à une falaise"
];

const POLLINATIONS_API = 'https://image.pollinations.ai/prompt/';
const STORAGE_KEYS = { HISTORY: 'imageai_history', SETTINGS: 'imageai_settings' };

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Splash screen : Disparition après 2.5s
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) splash.style.display = 'none';
    }, 2500);

    loadHistory();
    loadSettings();
    setupEventListeners();
    updateHistoryDisplay();
    updateStats();
    
    // Initialiser l'écran par défaut
    switchScreen('generator');
}

// === SYSTÈME DE NAVIGATION (CORRIGÉ) ===
function switchScreen(screenName) {
    console.log("Navigation vers :", screenName);

    // 1. Gérer les écrans (sections)
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none'; // Force le masquage
    });

    const targetScreen = document.getElementById(`screen-${screenName}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
        targetScreen.style.display = 'flex'; // Force l'affichage
    }

    // 2. Gérer les icônes de la barre de navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        const link = item.querySelector('.nav-item-link');
        if (item.dataset.screen === screenName) {
            link.classList.add('active', 'text-indigo-600', 'bg-indigo-50');
            link.classList.remove('text-gray-500');
        } else {
            link.classList.remove('active', 'text-indigo-600', 'bg-indigo-50');
            link.classList.add('text-gray-500');
        }
    });

    AppState.currentScreen = screenName;
    window.scrollTo(0, 0);
}

// === GESTION DU TOAST (CORRIGÉ - AUTO-HIDE) ===
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    // Reset des styles
    toast.className = "toast fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white text-sm font-medium z-50 transition-all duration-500 shadow-lg show";
    
    // Application de la couleur selon le type
    if (type === 'success') toast.style.backgroundColor = '#10b981'; // Green
    else if (type === 'warning') toast.style.backgroundColor = '#f59e0b'; // Amber
    else if (type === 'error') toast.style.backgroundColor = '#ef4444'; // Red
    else toast.style.backgroundColor = '#4f46e5'; // Indigo

    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, 0)";

    // Disparition automatique garantie
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translate(-50%, 20px)";
        setTimeout(() => toast.classList.remove('show'), 500);
    }, 3000);
}

// === ÉCOUTEURS D'ÉVÉNEMENTS ===
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchScreen(item.dataset.screen);
        });
    });

    // Textarea auto-resize (Style ChatGPT)
    const promptInput = document.getElementById('prompt-input');
    promptInput?.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        document.getElementById('char-count').textContent = this.value.length;
    });

    // Boutons Action
    document.getElementById('generate-btn')?.addEventListener('click', handleGenerate);
    document.getElementById('surprise-btn')?.addEventListener('click', handleSurprise);
    document.getElementById('clear-history-btn')?.addEventListener('click', handleClearHistory);

    // Formats d'image
    document.querySelectorAll('.size-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-option-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.selectedSize = btn.dataset.size;
        });
    });

    // Choix du modèle
    document.getElementById('model-select')?.addEventListener('change', (e) => {
        AppState.selectedModel = e.target.value;
        saveSettings();
    });

    // Partage & Téléchargement
    document.getElementById('preview-share-btn')?.addEventListener('click', () => {
        const img = document.getElementById('preview-image');
        if (img.src && !img.src.includes('placeholder')) {
            shareImage(img.src, "Ma création ImageAI", "Regarde ce que j'ai généré !");
        }
    });

    document.getElementById('preview-download-btn')?.addEventListener('click', () => {
        const img = document.getElementById('preview-image');
        if (img.src) downloadImage(img.src, `imageai-${Date.now()}.png`);
    });

    // Modale Historique
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
}

// === LOGIQUE DE GÉNÉRATION ===
async function handleGenerate() {
    const promptInput = document.getElementById('prompt-input');
    const originalPrompt = promptInput.value.trim();

    if (!originalPrompt) {
        showToast('Veuillez entrer une description', 'warning');
        return;
    }

    AppState.isGenerating = true;
    toggleLoading(true);

    try {
        // 1. Traduction
        const translatedPrompt = await translateToEnglish(originalPrompt);
        
        // 2. Préparation du prompt final selon le modèle
        let finalPrompt = translatedPrompt;
        if (AppState.selectedModel === 'flux-realism') finalPrompt += ", professional photography, 8k, highly detailed";
        if (AppState.selectedModel === 'any-v4-5') finalPrompt += ", high quality anime style, vibrant";

        // 3. Dimensions
        let w = 1024, h = 1024;
        if (AppState.selectedSize === 'landscape') { w = 1280; h = 720; }
        if (AppState.selectedSize === 'portrait') { w = 720; h = 1280; }

        const seed = Math.floor(Math.random() * 999999);
        const imageUrl = `${POLLINATIONS_API}${encodeURIComponent(finalPrompt)}?width=${w}&height=${h}&model=${AppState.selectedModel}&seed=${seed}&nologo=true`;

        // 4. Attendre le chargement réel de l'image
        const imgCheck = new Image();
        imgCheck.src = imageUrl;
        await imgCheck.decode();

        // 5. Mise à jour UI
        document.getElementById('preview-image').src = imageUrl;
        document.getElementById('preview-image-container').classList.remove('hidden');
        document.getElementById('preview-placeholder').classList.add('hidden');

        // 6. Sauvegarde
        const newItem = { id: Date.now(), prompt: originalPrompt, imageUrl: imageUrl, timestamp: new Date() };
        AppState.history.unshift(newItem);
        saveHistory();
        updateHistoryDisplay();
        updateStats();

        showToast('Image créée ! ✨', 'success');

    } catch (error) {
        console.error(error);
        showToast('Erreur de génération', 'error');
    } finally {
        AppState.isGenerating = false;
        toggleLoading(false);
    }
}

// === FONCTIONS UTILITAIRES ===
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
        btn.style.opacity = "0.5";
    } else {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}

function handleSurprise() {
    const input = document.getElementById('prompt-input');
    const randomPrompt = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
    input.value = randomPrompt;
    input.dispatchEvent(new Event('input')); // Pour l'auto-resize
}

async function shareImage(url, title, text) {
    if (!navigator.share) {
        showToast("Partage non supporté (HTTPS requis)", "warning");
        return;
    }
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], 'imageai.png', { type: 'image/png' });
        await navigator.share({ files: [file], title, text });
    } catch (err) {
        // Fallback lien simple
        navigator.share({ title, text, url }).catch(() => {});
    }
}

async function downloadImage(url, name) {
    showToast("Téléchargement...");
    const res = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
}

// === HISTORIQUE & STOCKAGE ===
function updateHistoryDisplay() {
    const grid = document.getElementById('history-grid');
    if (!grid) return;
    if (AppState.history.length === 0) {
        grid.innerHTML = '<p class="col-span-2 text-center text-gray-400 py-10">Aucune image pour le moment</p>';
        return;
    }
    grid.innerHTML = AppState.history.map(item => `
        <div class="image-card relative aspect-square rounded-2xl overflow-hidden bg-gray-800" onclick="openImageModal(${item.id})">
            <img src="${item.imageUrl}" class="w-full h-full object-cover" loading="lazy">
            <div class="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <p class="text-white text-[10px] truncate">${item.prompt}</p>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    const el = document.getElementById('total-images');
    if (el) el.textContent = AppState.history.length;
}

function handleClearHistory() {
    if (confirm("Effacer tout l'historique ?")) {
        AppState.history = [];
        saveHistory();
        updateHistoryDisplay();
        updateStats();
        showToast("Historique vidé");
    }
}

// === MODALE ===
function openImageModal(id) {
    const item = AppState.history.find(h => h.id === id);
    if (!item) return;
    document.getElementById('modal-image').src = item.imageUrl;
    document.getElementById('modal-prompt').textContent = item.prompt;
    document.getElementById('image-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('image-modal').classList.remove('active');
}

// === PERSISTENCE ===
function saveHistory() { localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(AppState.history)); }
function loadHistory() { 
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    AppState.history = data ? JSON.parse(data) : [];
}
function saveSettings() { 
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
        size: AppState.selectedSize,
        model: AppState.selectedModel
    })); 
}
function loadSettings() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
    if (data.size) AppState.selectedSize = data.size;
    if (data.model) AppState.selectedModel = data.model;
}