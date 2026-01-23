// ============================================
// IMAGEAI - PWA avec IA GRATUITE
// Application Logic avec Hugging Face
// ============================================

// === APP STATE ===
const AppState = {
    currentScreen: 'generator',
    history: [],
    selectedSize: 'square',
    isGenerating: false
};

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
    // Hide splash screen after 2.5s
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) splash.style.display = 'none';
    }, 2500);

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

// === Lance la génération de l'image ===
async function handleGenerate() {
    const promptInput = document.getElementById('prompt-input');
    const prompt = promptInput.value.trim();

    if (!prompt) {
        showToast('Veuillez entrer une description', 'warning');
        return;
    }

    if (AppState.isGenerating) {
        return;
    }

    AppState.isGenerating = true;
    showLoading();

    try {
        const imageUrl = await generateImageWithPollinations(prompt, AppState.selectedSize);

        // Save to history
        const historyItem = {
            id: Date.now(),
            prompt: prompt,
            imageUrl: imageUrl,
            size: AppState.selectedSize,
            timestamp: new Date().toISOString()
        };

        AppState.history.unshift(historyItem);
        saveHistory();

        // Display image
        showPreviewImage(imageUrl);

        // Update stats
        updateStats();

        showToast('Image générée avec succès !', 'success');
    } catch (error) {
        console.error('Erreur génération:', error);
        showToast('Erreur lors de la génération. Réessayez.', 'error');
        hideLoading();
    } finally {
        AppState.isGenerating = false;
    }
}

//====Appel l'API====      
async function generateImageWithPollinations(prompt, size) {
    const generateBtn = document.getElementById('generate-btn');
    generateBtn.disabled = true;

    try {
        // Encode prompt for URL
        const encodedPrompt = encodeURIComponent(prompt);

        // Determine dimensions based on size
        let width = 1024;
        let height = 1024;

        if (size === 'landscape') {
            width = 1792;
            height = 1024;
        } else if (size === 'portrait') {
            width = 1024;
            height = 1792;
        }

        // Pollinations.ai URL format //enhance=true meilleur qualité  // nologo=true pas de watermark
        const imageUrl = `${POLLINATIONS_API}${encodedPrompt}?width=${width}&height=${height}&nologo=true&enhance=true`;

        // Preload image to ensure it's generated attends que l'image soit charger
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageUrl;
        });

        return imageUrl;
    } catch (error) {
        console.error('API Error:', error);
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
        } catch (error) {
            console.error('Erreur chargement paramètres:', error);
        }
    }
}

function saveSettings() {
    const settings = {
        selectedSize: AppState.selectedSize
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