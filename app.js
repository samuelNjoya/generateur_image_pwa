// ============================================
// IMAGEAI - PWA DALL-E 3
// Main Application Logic
// ============================================

// === APP STATE ===
const AppState = {
    apiKey: null,
    currentScreen: 'generator',
    history: [],
    selectedSize: '1024x1024',
    isGenerating: false
};

// === CONSTANTS ===
const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations';
const STORAGE_KEYS = {
    API_KEY: 'imageai_api_key',
    HISTORY: 'imageai_history',
    SETTINGS: 'imageai_settings'
};

const IMAGE_COSTS = {
    '1024x1024': 0.040,
    '1792x1024': 0.040,
    '1024x1792': 0.040
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
    loadApiKey();
    loadHistory();
    loadSettings();

    // Setup event listeners
    setupEventListeners();

    // Update UI
    updateHistoryDisplay();
    updateStats();

    // Check if API key exists
    if (!AppState.apiKey) {
        setTimeout(() => {
            showToast('Veuillez configurer votre clé API dans les paramètres', 'warning');
        }, 3000);
    }

    // Register service worker
    registerServiceWorker();
}

// === SERVICE WORKER ===
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker enregistré:', reg.scope))
            .catch(err => console.error('Erreur Service Worker:', err));
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
    const refreshBtn = document.getElementById('refresh-btn');

    generateBtn?.addEventListener('click', handleGenerate);
    promptInput?.addEventListener('input', (e) => {
        charCount.textContent = e.target.value.length;
    });

    sizeOptions.forEach(option => {
        option.addEventListener('click', () => {
            sizeOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            AppState.selectedSize = option.dataset.size;
            updateCostEstimate();
        });
    });

    refreshBtn?.addEventListener('click', () => {
        promptInput.value = '';
        charCount.textContent = '0';
        hidePreviewImage();
        showToast('Interface réinitialisée', 'success');
    });

    // Preview download
    const previewDownloadBtn = document.getElementById('preview-download-btn');
    previewDownloadBtn?.addEventListener('click', () => {
        const img = document.getElementById('preview-image');
        if (img.src) downloadImage(img.src, 'imageai-' + Date.now() + '.png');
    });

    // History
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    clearHistoryBtn?.addEventListener('click', handleClearHistory);

    // Settings
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const testApiKeyBtn = document.getElementById('test-api-key-btn');
    const toggleApiVisibilityBtn = document.getElementById('toggle-api-visibility');
    const resetAppBtn = document.getElementById('reset-app-btn');

    saveApiKeyBtn?.addEventListener('click', handleSaveApiKey);
    testApiKeyBtn?.addEventListener('click', handleTestApiKey);
    toggleApiVisibilityBtn?.addEventListener('click', toggleApiKeyVisibility);
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
}

// === SCREEN NAVIGATION ===
function switchScreen(screenName) {
    // Update screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(`screen-${screenName}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    // Update nav
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.screen === screenName) {
            item.classList.add('active');
        }
    });

    // Update header title
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

// === GENERATE IMAGE ===
async function handleGenerate() {
    const promptInput = document.getElementById('prompt-input');
    const prompt = promptInput.value.trim();

    if (!prompt) {
        showToast('Veuillez entrer une description', 'warning');
        return;
    }

    if (!AppState.apiKey) {
        showToast('Clé API manquante. Configurez-la dans les paramètres', 'error');
        switchScreen('settings');
        return;
    }

    if (AppState.isGenerating) {
        return;
    }

    AppState.isGenerating = true;
    showLoading();

    try {
        const imageUrl = await generateImage(prompt, AppState.selectedSize);
        
        // Save to history
        const historyItem = {
            id: Date.now(),
            prompt: prompt,
            imageUrl: imageUrl,
            size: AppState.selectedSize,
            timestamp: new Date().toISOString(),
            cost: IMAGE_COSTS[AppState.selectedSize]
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
        let errorMessage = 'Erreur lors de la génération';
        
        if (error.message.includes('API key')) {
            errorMessage = 'Clé API invalide';
        } else if (error.message.includes('quota')) {
            errorMessage = 'Quota dépassé';
        } else if (error.message.includes('content_policy')) {
            errorMessage = 'Contenu non autorisé';
        }
        
        showToast(errorMessage, 'error');
        hideLoading();
    } finally {
        AppState.isGenerating = false;
    }
}

async function generateImage(prompt, size) {
    const generateBtn = document.getElementById('generate-btn');
    generateBtn.disabled = true;

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AppState.apiKey}`
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: prompt,
                n: 1,
                size: size,
                quality: 'standard'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API error');
        }

        const data = await response.json();
        return data.data[0].url;
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

function updateCostEstimate() {
    const costEstimate = document.querySelector('.cost-estimate strong');
    if (costEstimate) {
        costEstimate.textContent = `~$${IMAGE_COSTS[AppState.selectedSize].toFixed(3)}`;
    }
}

// === HISTORY ===
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

    // Add click handlers
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
    const totalCost = document.getElementById('total-cost');

    if (totalImages) {
        totalImages.textContent = AppState.history.length;
    }

    if (totalCost) {
        const cost = AppState.history.reduce((sum, item) => sum + (item.cost || 0.04), 0);
        totalCost.textContent = `$${cost.toFixed(2)}`;
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

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('image-modal');
    modal.classList.remove('active');
    currentModalImageId = null;

    // Restore body scroll
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

// === SETTINGS ===
function handleSaveApiKey() {
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        showToast('Veuillez entrer une clé API', 'warning');
        return;
    }

    if (!apiKey.startsWith('sk-')) {
        showToast('Format de clé invalide (doit commencer par sk-)', 'error');
        return;
    }

    AppState.apiKey = apiKey;
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    
    const apiKeyStatus = document.getElementById('api-key-status');
    apiKeyStatus.textContent = '✓ Clé API enregistrée';
    apiKeyStatus.className = 'api-key-status success';

    showToast('Clé API enregistrée avec succès', 'success');
}

async function handleTestApiKey() {
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKey = apiKeyInput.value.trim() || AppState.apiKey;

    if (!apiKey) {
        showToast('Aucune clé API à tester', 'warning');
        return;
    }

    const testBtn = document.getElementById('test-api-key-btn');
    const apiKeyStatus = document.getElementById('api-key-status');
    
    testBtn.disabled = true;
    apiKeyStatus.textContent = 'Test en cours...';
    apiKeyStatus.className = 'api-key-status';

    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (response.ok) {
            apiKeyStatus.textContent = '✓ Clé API valide';
            apiKeyStatus.className = 'api-key-status success';
            showToast('Clé API valide !', 'success');
        } else {
            throw new Error('Invalid API key');
        }
    } catch (error) {
        apiKeyStatus.textContent = '✗ Clé API invalide';
        apiKeyStatus.className = 'api-key-status error';
        showToast('Clé API invalide', 'error');
    } finally {
        testBtn.disabled = false;
    }
}

function toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('api-key-input');
    const type = apiKeyInput.type === 'password' ? 'text' : 'password';
    apiKeyInput.type = type;
}

function handleResetApp() {
    if (!confirm('Voulez-vous vraiment réinitialiser l\'application ? Toutes vos données seront supprimées.')) {
        return;
    }

    localStorage.clear();
    AppState.apiKey = null;
    AppState.history = [];
    
    updateHistoryDisplay();
    updateStats();
    
    const apiKeyInput = document.getElementById('api-key-input');
    if (apiKeyInput) apiKeyInput.value = '';
    
    showToast('Application réinitialisée', 'success');
}

// === STORAGE ===
function loadApiKey() {
    const savedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    if (savedKey) {
        AppState.apiKey = savedKey;
        const apiKeyInput = document.getElementById('api-key-input');
        if (apiKeyInput) {
            apiKeyInput.value = savedKey;
        }
    }
}

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
            AppState.selectedSize = settings.selectedSize || '1024x1024';
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
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);

    // Hide toast after 3s
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// === INSTALL PROMPT ===
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install banner after 5 seconds
    setTimeout(() => {
        showToast('Installez ImageAI sur votre appareil !', 'info');
    }, 5000);
});

window.addEventListener('appinstalled', () => {
    console.log('PWA installée');
    showToast('Application installée avec succès !', 'success');
    deferredPrompt = null;
});

// === NETWORK STATUS ===
window.addEventListener('online', () => {
    showToast('Connexion rétablie', 'success');
});

window.addEventListener('offline', () => {
    showToast('Hors ligne - Certaines fonctionnalités sont limitées', 'warning');
});
