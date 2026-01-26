// ============================================
// IMAGEAI - LOGIQUE COMPLÈTE & CORRIGÉE
// ============================================

const AppState = {
    history: JSON.parse(localStorage.getItem('imageai_history') || '[]'),
    selectedSize: 'square',
    selectedModel: 'flux',
    isGenerating: false
};

const SURPRISE_PROMPTS = [
    "Un astronaute faisant du skate sur les anneaux de Saturne, cyberpunk",
    "Un petit dragon endormi dans une tasse de café, Pixar 3D",
    "Portrait d'une guerrière viking, hyper-réaliste",
    "Un chat samouraï en armure japonaise, style estampe",
    "Une forêt enchantée avec des champignons lumineux",
    "Un robot rouillé dans un champ de fleurs, style Ghibli"
];

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Splash Screen
    setTimeout(() => {
        document.getElementById('splash-screen').style.opacity = '0';
        setTimeout(() => document.getElementById('splash-screen').style.display = 'none', 500);
    }, 2000);

    initNavigation();
    initGenerator();
    initGallery();
    updateStats();
});

// --- 1. NAVIGATION (FIXÉE) ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetScreen = item.dataset.screen;
            
            // Masquer tous les écrans
            document.querySelectorAll('.screen').forEach(s => {
                s.classList.remove('active');
                s.style.display = 'none';
            });

            // Afficher l'écran choisi
            const activeScreen = document.getElementById(`screen-${targetScreen}`);
            activeScreen.classList.add('active');
            activeScreen.style.display = 'flex';

            // Mettre à jour les icônes
            document.querySelectorAll('.nav-item-link').forEach(l => {
                l.classList.remove('active');
                l.classList.add('text-gray-400');
            });
            item.querySelector('.nav-item-link').classList.add('active');
            item.querySelector('.nav-item-link').classList.remove('text-gray-400');

            if(targetScreen === 'history') renderHistory();
        });
    });
}

// --- 2. GÉNÉRATEUR ---
function initGenerator() {
    const input = document.getElementById('prompt-input');
    const genBtn = document.getElementById('generate-btn');

    // Auto-resize textarea
    input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        document.getElementById('char-count').textContent = this.value.length;
    });

    // Surprise
    document.getElementById('surprise-btn').addEventListener('click', () => {
        input.value = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
        input.dispatchEvent(new Event('input'));
    });

    // Modèle & Taille
    document.getElementById('model-select').addEventListener('change', (e) => AppState.selectedModel = e.target.value);
    document.querySelectorAll('.size-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-option-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.selectedSize = btn.dataset.size;
        });
    });

    // CLIC GÉNÉRER
    genBtn.addEventListener('click', handleGeneration);
}

async function handleGeneration() {
    const input = document.getElementById('prompt-input');
    const prompt = input.value.trim();

    if(!prompt || AppState.isGenerating) return showToast("Écris un message !", "error");

    AppState.isGenerating = true;
    updateUI('loading');

    try {
        // Traduction
        const transRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(prompt)}&langpair=fr|en`);
        const transData = await transRes.json();
        const enPrompt = transData.responseData.translatedText;

        // Configuration Image
        let w = 1024, h = 1024;
        if(AppState.selectedSize === 'landscape') { w = 1280; h = 720; }
        if(AppState.selectedSize === 'portrait') { w = 720; h = 1280; }

        const seed = Math.floor(Math.random() * 999999);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enPrompt)}?width=${w}&height=${h}&model=${AppState.selectedModel}&seed=${seed}&nologo=true`;

        // Chargement Image
        const img = new Image();
        img.src = url;
        img.onload = () => {
            document.getElementById('preview-image').src = url;
            updateUI('success');
            
            // Sauvegarde
            AppState.history.unshift({ id: Date.now(), prompt: prompt, url: url });
            localStorage.setItem('imageai_history', JSON.stringify(AppState.history));
            updateStats();
            showToast("Création réussie !", "success");
            AppState.isGenerating = false;
        };
    } catch (e) {
        showToast("Erreur de connexion", "error");
        updateUI('reset');
        AppState.isGenerating = false;
    }
}

// --- 3. GALERIE & MODALE ---
function renderHistory() {
    const grid = document.getElementById('history-grid');
    if(AppState.history.length === 0) {
        grid.innerHTML = '<p class="col-span-2 text-center text-gray-400 py-20">Aucune image</p>';
        return;
    }

    grid.innerHTML = AppState.history.map(item => `
        <div class="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-sm active:scale-95 transition-transform" onclick="openModal(${item.id})">
            <img src="${item.url}" class="w-full h-full object-cover">
        </div>
    `).join('');
}

window.openModal = (id) => {
    const item = AppState.history.find(h => h.id === id);
    if(!item) return;

    document.getElementById('modal-image').src = item.url;
    document.getElementById('modal-prompt').textContent = item.prompt;
    document.getElementById('image-modal').style.display = 'flex';
    
    // Actions Modale
    document.getElementById('modal-delete-btn').onclick = () => {
        if(confirm("Supprimer ?")) {
            AppState.history = AppState.history.filter(h => h.id !== id);
            localStorage.setItem('imageai_history', JSON.stringify(AppState.history));
            renderHistory();
            updateStats();
            document.getElementById('image-modal').style.display = 'none';
        }
    };

    document.getElementById('modal-share-btn').onclick = () => shareImage(item.url);
};

document.getElementById('modal-close').onclick = () => document.getElementById('image-modal').style.display = 'none';

// --- 4. FONCTIONS SYSTÈME ---
function updateUI(state) {
    const placeholder = document.getElementById('preview-placeholder');
    const loading = document.getElementById('preview-loading');
    const box = document.getElementById('preview-image-box');
    const btn = document.getElementById('generate-btn');

    if(state === 'loading') {
        placeholder.style.display = 'none';
        box.style.display = 'none';
        loading.style.display = 'flex';
        btn.disabled = true; btn.style.opacity = '0.5';
    } else if (state === 'success') {
        loading.style.display = 'none';
        box.style.display = 'block';
        btn.disabled = false; btn.style.opacity = '1';
    } else {
        placeholder.style.display = 'flex';
        loading.style.display = 'none';
        btn.disabled = false; btn.style.opacity = '1';
    }
}

function showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

async function shareImage(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], 'image.png', { type: 'image/png' });
        await navigator.share({ files: [file], title: 'ImageAI' });
    } catch (e) {
        showToast("Partage impossible", "error");
    }
}

function updateStats() {
    document.getElementById('total-images').textContent = AppState.history.length;
}

document.getElementById('clear-history-btn').onclick = () => {
    if(confirm("Vider la galerie ?")) {
        AppState.history = [];
        localStorage.removeItem('imageai_history');
        renderHistory();
        updateStats();
    }
};

document.getElementById('preview-download-btn').onclick = () => {
    const url = document.getElementById('preview-image').src;
    const a = document.createElement('a');
    a.href = url; a.download = 'creation.png'; a.click();
};