// ============================================
// IMAGEAI - PWA avec IA GRATUITE
// Application Logic avec Hugging Face
// ============================================

// === APP STATE ===
const AppState = {
    currentScreen: 'generator',
    history: [],
    selectedSize: 'square',
    isGenerating: false,
    selectedModel: 'flux', // <--- AJOUTE CETTE LIGNE
};

const SURPRISE_PROMPTS = [
    "Un astronaute faisant du skate sur les anneaux de Saturne, style cyberpunk",
    "Un petit dragon endormi dans une tasse de café, style Pixar 3D",
    "Portrait d'une guerrière viking avec des peintures de guerre, hyper-réaliste",
    "Un chat samouraï en armure traditionnelle japonaise, style estampe",
    "Une forêt enchantée avec des champignons géants lumineux et des fées",
    "Une ville futuriste sous l'océan avec des dômes de verre et des poissons néons",
    "Un vieux renard bibliothécaire portant des lunettes, style peinture à l'huile",
    "Une île flottante avec une cascade tombant dans les nuages au coucher du soleil",
    "Un robot géant rouillé dans un champ de fleurs sauvages, style Ghibli",
    "Le portrait d'un lion fait entièrement de galaxies et de nébuleuses étoilées",
    "Une villa moderne en verre suspendue à une falaise au-dessus de la mer",
    "Un combat épique entre un guerrier de glace et un démon de feu, style manga"
];

// === CONSTANTS ===
const POLLINATIONS_API = 'https://image.pollinations.ai/prompt/'; // API gratuite
const STORAGE_KEYS = {
    HISTORY: 'imageai_history',
    SETTINGS: 'imageai_settings'
};

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Hide splash screen after 3.0s
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) splash.style.display = 'none';
    }, 3000);

    // Load saved data
    loadHistory();
    loadSettings();

    // Setup event listeners
    setupEventListeners();

    // Update UI
    updateHistoryDisplay();
    updateStats();

    // Register service worker
    registerServiceWorker();

    // Setup PWA install prompt
    setupPWAInstall();
}

// === SERVICE WORKER ===
// function registerServiceWorker() {
//     if ('serviceWorker' in navigator) {
//         navigator.serviceWorker.register('sw.js')
//             .then(reg => console.log('Service Worker registered'))
//             .catch(err => console.error('SW error:', err));
//     }
// }

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(reg => {
            // Surveille les mises à jour
            reg.onupdatefound = () => {
                const installingWorker = reg.installing;
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // Une nouvelle version a été trouvée et installée !
                            showToast("Mise à jour disponible ! Rechargez la page.", "info");
                            // Optionnel : Forcer le rechargement après 2 secondes
                            // setTimeout(() => { window.location.reload(); }, 2000);
                        }
                    }
                };
            };
        });
    }
}

// === PWA INSTALL PROMPT configure l'installation===
let deferredPrompt;

function setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        // Show install prompt after 10 seconds if not in standalone mode
        if (!window.matchMedia('(display-mode: standalone)').matches) {
            setTimeout(showInstallPrompt, 10000);
        }
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA installed');
        hideInstallPrompt();
        showToast('Application installée avec succès !', 'success');
        deferredPrompt = null;
    });
}

function showInstallPrompt() {
    const installPrompt = document.getElementById('install-prompt');
    if (installPrompt && deferredPrompt) {
        installPrompt.style.display = 'block';
    }
}

function hideInstallPrompt() {
    const installPrompt = document.getElementById('install-prompt');
    if (installPrompt) {
        installPrompt.style.display = 'none';
    }
}

// === EVENT LISTENERS ===
function setupEventListeners() {
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const screen = item.dataset.screen;
            switchScreen(screen);
        });
    });

    // Generator
    const generateBtn = document.getElementById('generate-btn');
    const promptInput = document.getElementById('prompt-input');
    const charCount = document.getElementById('char-count');
    const sizeOptions = document.querySelectorAll('.size-option');

    generateBtn?.addEventListener('click', handleGenerate);
    promptInput?.addEventListener('input', (e) => {
        charCount.textContent = e.target.value.length;
    });

    // pour les prompts aleatoires
    document.getElementById('surprise-btn')?.addEventListener('click', handleSurprise);

    sizeOptions.forEach(option => {
        option.addEventListener('click', () => {
            sizeOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            AppState.selectedSize = option.dataset.size;
        });
    });

    // Preview download
    const previewDownloadBtn = document.getElementById('preview-download-btn');
    previewDownloadBtn?.addEventListener('click', () => {
        const img = document.getElementById('preview-image');
        if (img.src) downloadImage(img.src, 'imageai-' + Date.now() + '.png');
    });

    // Partage depuis le générateur
    document.getElementById('preview-share-btn')?.addEventListener('click', () => {
        const img = document.getElementById('preview-image');
        if (img.src) {
            shareImage(img.src, 'Ma création ImageAI', 'Regarde ce que j\'ai généré !');
        }
    });

    // Partage depuis la modal (historique)
    document.getElementById('modal-share-btn')?.addEventListener('click', () => {
        if (!currentModalImageId) return;
        const item = AppState.history.find(h => h.id === currentModalImageId);
        if (item) {
            shareImage(item.imageUrl, 'Image de ma galerie', item.prompt);
        }
    });

    // Gestion du sélecteur de modèle
    const modelSelect = document.getElementById('model-select');
    const modelInfo = document.getElementById('model-info'); // Ajoute un petit <span> ou <p> dans ton HTML

    modelSelect?.addEventListener('change', (e) => {
        AppState.selectedModel = e.target.value;
        // Petite description dynamique
        const desc = {
            'flux': 'Le plus équilibré et précis.',
            'flux-realism': 'Idéal pour les visages et paysages réels.',
            'any-v4-5': 'Parfait pour les dessins et le style manga.',
            'turbo': 'Moins précis mais génère en un éclair.'
        };

        if (modelInfo) modelInfo.textContent = desc[AppState.selectedModel];
        saveSettings(); // On sauvegarde ce choix
    });

    // History
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    clearHistoryBtn?.addEventListener('click', handleClearHistory);

    // Settings
    const resetAppBtn = document.getElementById('reset-app-btn');
    resetAppBtn?.addEventListener('click', handleResetApp);

    // Modal
    const modalClose = document.getElementById('modal-close');
    const modalDownloadBtn = document.getElementById('modal-download-btn');
    const modalDeleteBtn = document.getElementById('modal-delete-btn');
    const imageModal = document.getElementById('image-modal');
    const modalOverlay = imageModal?.querySelector('.modal-overlay');

    modalClose?.addEventListener('click', closeModal);
    modalOverlay?.addEventListener('click', closeModal);
    modalDownloadBtn?.addEventListener('click', handleModalDownload);
    modalDeleteBtn?.addEventListener('click', handleModalDelete);

    // PWA Install
    const installBtn = document.getElementById('install-btn');
    const dismissInstallBtn = document.getElementById('dismiss-install-btn');

    installBtn?.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('User accepted install');
            }
            deferredPrompt = null;
            hideInstallPrompt();
        }
    });

    dismissInstallBtn?.addEventListener('click', () => {
        hideInstallPrompt();
    });
}

// === SCREEN NAVIGATION ===
function switchScreen(screenName) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(`screen-${screenName}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.screen === screenName) {
            item.classList.add('active');
        }
    });

    const pageTitles = {
        'generator': 'Générer',
        'history': 'Historique',
        'settings': 'Paramètres',
        'about': 'À propos'
    };

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = pageTitles[screenName] || 'ImageAI';
    }

    AppState.currentScreen = screenName;
}

// traduction en anglais pour les bon prompt
async function translateToEnglish(text) {
    // Si le texte est très court ou vide, on ne traduit pas
    if (!text || text.length < 3) return text;

    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|en`);
        const data = await response.json();

        const translatedText = data.responseData.translatedText;

        // Le fameux console.log pour inspecter la magie
        console.log("================================");
        console.log("🌐 TRADUCTION IMAGEAI");
        console.log("🇫🇷 Original :", text);
        console.log("🇺🇸 Traduit  :", translatedText);
        console.log("================================");

        return translatedText;
    } catch (error) {
        console.error("Erreur de traduction, utilisation du texte original:", error);
        return text; // En cas d'erreur, on garde le texte de base
    }
}

// === Lance la génération de l'image ===
async function handleGenerate() {
    const promptInput = document.getElementById('prompt-input');
    const originalPrompt = promptInput.value.trim(); // On garde l'original pour l'historique

    if (!originalPrompt) {
        showToast('Veuillez entrer une description', 'warning');
        return;
    }

    if (AppState.isGenerating) return;

    AppState.isGenerating = true;
    showLoading();

    try {
        // --- ÉTAPE DE TRADUCTION ---
        // On traduit le prompt avant de l'envoyer à l'IA
        const translatedPrompt = await translateToEnglish(originalPrompt);

        // On envoie le prompt TRADUIT à l'API de génération
        const imageUrl = await generateImageWithPollinations(translatedPrompt, AppState.selectedSize);

        // On sauvegarde dans l'historique avec le prompt original (en français) 
        // pour que l'utilisateur s'y retrouve
        const historyItem = {
            id: Date.now(),
            prompt: originalPrompt,
            imageUrl: imageUrl,
            size: AppState.selectedSize,
            timestamp: new Date().toISOString()
        };

        AppState.history.unshift(historyItem);
        saveHistory();
        showPreviewImage(imageUrl);
        updateStats();
        showToast('Image générée avec succès !', 'success');

    } catch (error) {
        console.error('Erreur génération:', error);
        showToast('Erreur lors de la génération.', 'error');
        hideLoading();
    } finally {
        AppState.isGenerating = false;
    }
}

//Prompt de generation suprise
function handleSurprise() {
    const promptInput = document.getElementById('prompt-input');
    const charCount = document.getElementById('char-count');
    
    // 1. Choisir un prompt au hasard
    const randomIndex = Math.floor(Math.random() * SURPRISE_PROMPTS.length);
    const randomPrompt = SURPRISE_PROMPTS[randomIndex];

    // 2. L'ajouter dans le champ avec un petit effet fluide
    promptInput.value = randomPrompt;
    
    // 3. Mettre à jour le compteur de caractères
    if(charCount) charCount.textContent = randomPrompt.length;

    // 4. Petit effet visuel sur le champ
    promptInput.classList.add('pulse-highlight');
    setTimeout(() => promptInput.classList.remove('pulse-highlight'), 500);
}

//====Appel l'API====      
// async function generateImageWithPollinations(prompt, size) {
//     const generateBtn = document.getElementById('generate-btn');
//     generateBtn.disabled = true;

//     try {
//         // Encode prompt for URL
//         const encodedPrompt = encodeURIComponent(prompt);

//         // Determine dimensions based on size
//         let width = 1024;
//         let height = 1024;

//         if (size === 'landscape') {
//             width = 1792;
//             height = 1024;
//         } else if (size === 'portrait') {
//             width = 1024;
//             height = 1792;
//         }

//         // Pollinations.ai URL format //enhance=true meilleur qualité  // nologo=true pas de watermark
//         const imageUrl = `${POLLINATIONS_API}${encodedPrompt}?width=${width}&height=${height}&nologo=true&enhance=true`;

//         // Preload image to ensure it's generated attends que l'image soit charger
//         await new Promise((resolve, reject) => {
//             const img = new Image();
//             img.onload = () => resolve();
//             img.onerror = () => reject(new Error('Failed to load image'));
//             img.src = imageUrl;
//         });

//         return imageUrl;
//     } catch (error) {
//         console.error('API Error:', error);
//         throw error;
//     } finally {
//         generateBtn.disabled = false;
//     }
// }

// le model le plus performant reste turbo
async function generateImageWithPollinations(prompt, size) {
    const generateBtn = document.getElementById('generate-btn');
    generateBtn.disabled = true;

    try {
        // 1. On prépare une base de prompt robuste
        let finalPrompt = prompt;

        // 2. "BOOSTER" selon le modèle choisi
        if (AppState.selectedModel === 'flux-realism') {
            // Flux Realism a besoin d'être guidé vers la photo
            finalPrompt = `High-end photography portrait of ${prompt}, extremely detailed skin texture, 8k uhd, cinematic lighting, f/1.8, professional color grading`;
        } else if (AppState.selectedModel === 'flux') {
            // Flux standard aime la précision artistique
            finalPrompt = `A high-quality artistic rendering of ${prompt}, masterpiece, trending on artstation, highly detailed, sharp focus`;
        } else if (AppState.selectedModel === 'any-v4-5') {
            // Pour l'anime, on force le style
            finalPrompt = `Anime style illustration of ${prompt}, high quality anime art, vibrant colors, detailed background`;
        }

        const encodedPrompt = encodeURIComponent(finalPrompt);

        // 3. Dimensions
        let width = 1024;
        let height = 1024;
        if (size === 'landscape') { width = 1280; height = 720; } // Dimensions plus standards
        else if (size === 'portrait') { width = 720; height = 1280; }

        // 4. L'URL avec des paramètres de qualité
        // On ajoute &enhance=false pour Flux car il fait déjà le travail
        const isFlux = AppState.selectedModel.includes('flux');
        const imageUrl = `${POLLINATIONS_API}${encodedPrompt}?width=${width}&height=${height}&model=${AppState.selectedModel}&seed=${Math.floor(Math.random() * 1000000)}&nologo=true&enhance=${isFlux ? 'false' : 'true'}`;

        console.log("URL générée : ", imageUrl); // Pour que tu puisses vérifier dans la console

        await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageUrl;
        });

        return imageUrl;
    } catch (error) {
        throw error;
    } finally {
        generateBtn.disabled = false;
    }
}

// === UI UPDATES ===
function showLoading() {
    const placeholder = document.getElementById('preview-placeholder');
    const loading = document.getElementById('preview-loading');
    const imageContainer = document.getElementById('preview-image-container');

    placeholder.style.display = 'none';
    loading.style.display = 'flex';
    imageContainer.style.display = 'none';
}

function hideLoading() {
    const loading = document.getElementById('preview-loading');
    const placeholder = document.getElementById('preview-placeholder');

    loading.style.display = 'none';
    placeholder.style.display = 'flex';
}

// Affiche l'image
function showPreviewImage(imageUrl) {
    const loading = document.getElementById('preview-loading');
    const placeholder = document.getElementById('preview-placeholder');
    const imageContainer = document.getElementById('preview-image-container');
    const previewImage = document.getElementById('preview-image');

    loading.style.display = 'none';
    placeholder.style.display = 'none';
    imageContainer.style.display = 'block';
    previewImage.src = imageUrl;
}

function hidePreviewImage() {
    const placeholder = document.getElementById('preview-placeholder');
    const imageContainer = document.getElementById('preview-image-container');

    placeholder.style.display = 'flex';
    imageContainer.style.display = 'none';
}

// === HISTORY met a jour la grille===
function updateHistoryDisplay() {
    const historyGrid = document.getElementById('history-grid');
    if (!historyGrid) return;

    if (AppState.history.length === 0) {
        historyGrid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="60" cy="60" r="40" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                    <path d="M 40 60 L 50 70 L 70 50" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
                </svg>
                <p>Aucune image générée</p>
                <small>Vos créations apparaîtront ici</small>
            </div>
        `;
        return;
    }

    historyGrid.innerHTML = AppState.history.map(item => `
        <div class="history-item" data-id="${item.id}">
            <img src="${item.imageUrl}" alt="${item.prompt}" loading="lazy" />
            <div class="history-item-overlay">
                <p class="history-item-prompt">${item.prompt}</p>
            </div>
        </div>
    `).join('');

    const historyItems = historyGrid.querySelectorAll('.history-item');
    historyItems.forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id);
            openImageModal(id);
        });
    });
}

function updateStats() {
    const totalImages = document.getElementById('total-images');

    if (totalImages) {
        totalImages.textContent = AppState.history.length;
    }
}

function handleClearHistory() {
    if (!confirm('Voulez-vous vraiment effacer tout l\'historique ?')) {
        return;
    }

    AppState.history = [];
    saveHistory();
    updateHistoryDisplay();
    updateStats();
    showToast('Historique effacé', 'success');
}

// === IMAGE MODAL ===
let currentModalImageId = null;

function openImageModal(id) {
    const item = AppState.history.find(h => h.id === id);
    if (!item) return;

    currentModalImageId = id;

    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const modalPrompt = document.getElementById('modal-prompt');

    modalImage.src = item.imageUrl;
    modalPrompt.textContent = item.prompt;
    modal.classList.add('active');

    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('image-modal');
    modal.classList.remove('active');
    currentModalImageId = null;

    document.body.style.overflow = '';
}

function handleModalDownload() {
    if (!currentModalImageId) return;

    const item = AppState.history.find(h => h.id === currentModalImageId);
    if (item) {
        downloadImage(item.imageUrl, `imageai-${item.id}.png`);
        showToast('Téléchargement démarré', 'success');
    }
}

function handleModalDelete() {
    if (!currentModalImageId) return;

    if (!confirm('Supprimer cette image ?')) return;

    AppState.history = AppState.history.filter(h => h.id !== currentModalImageId);
    saveHistory();
    updateHistoryDisplay();
    updateStats();
    closeModal();
    showToast('Image supprimée', 'success');
}

// === DOWNLOAD ===
async function downloadImage(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Erreur téléchargement:', error);
        showToast('Erreur lors du téléchargement', 'error');
    }
}

async function shareImage(url, title, text) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], 'imageai-creation.png', { type: blob.type });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            // Partage du fichier (Mobile récent)
            await navigator.share({
                files: [file],
                title: title,
                text: text
            });
        } else {
            // Repli sur le partage de lien
            await navigator.share({
                title: title,
                text: text,
                url: url
            });
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error("Erreur de partage:", err);
            showToast('Le partage a échoué', 'error');
        }
    }
}

// === SETTINGS ===
function handleResetApp() {
    if (!confirm('Voulez-vous vraiment réinitialiser l\'application ? Toutes vos données seront supprimées.')) {
        return;
    }

    localStorage.clear();
    AppState.history = [];

    updateHistoryDisplay();
    updateStats();

    showToast('Application réinitialisée', 'success');
}

// === STORAGE ===
function loadHistory() {
    const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (savedHistory) {
        try {
            AppState.history = JSON.parse(savedHistory);
        } catch (error) {
            console.error('Erreur chargement historique:', error);
            AppState.history = [];
        }
    }
}

function saveHistory() {
    try {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(AppState.history));
    } catch (error) {
        console.error('Erreur sauvegarde historique:', error);
    }
}

function loadSettings() {
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            AppState.selectedSize = settings.selectedSize || 'square';
            AppState.selectedModel = settings.selectedModel || 'flux'; // pour garder le choix du model

            // Mettre à jour le menu déroulant HTML pour qu'il affiche le bon modèle au démarrage
            const modelSelect = document.getElementById('model-select');
            if (modelSelect) modelSelect.value = AppState.selectedModel;
        } catch (error) {
            console.error('Erreur chargement paramètres:', error);
        }
    }
}

function saveSettings() {
    const settings = {
        selectedSize: AppState.selectedSize,
        selectedModel: AppState.selectedModel // <-- AJOUT
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

// === TOAST NOTIFICATIONS ===
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type}`;

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// === NETWORK STATUS ===
window.addEventListener('online', () => {
    showToast('Connexion rétablie', 'success');
});

window.addEventListener('offline', () => {
    showToast('Hors ligne - Génération désactivée', 'warning');
});