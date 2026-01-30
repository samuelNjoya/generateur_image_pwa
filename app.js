// ============================================
// SMARTIMAGEAI - Version 2.0 CORRIGÉE
// Navigation harmonisée : Sidebar (Web) + Bottom Nav (Mobile)
// ============================================

// === APP STATE ===
const AppState = {
    currentScreen: 'generator',
    history: [],
    selectedSize: 'square',
    isGenerating: false,
    selectedModel: 'flux',
    deferredPrompt: null, // pour l'installation
};

const SURPRISE_PROMPTS = [
    "Un astronaute faisant du skate sur les anneaux de Saturne, style cyberpunk",
    "Un petit dragon endormi dans une tasse de café, style Pixar 3D",
    "Portrait d'une guerrière viking avec des peintures de guerre, hyper-réaliste",
    "Un chat samouraï en armure traditionnelle japonaise, style estampe",
    "Une forêt enchantée avec des champignons géants lumineux et des fées",
    "Un robot géant rouillé dans un champ de fleurs sauvages, style Ghibli",
    "Le portrait d'un lion fait entièrement de galaxies et de nébuleuses étoilées",
    "Une villa moderne en verre suspendue à une falaise au-dessus de la mer",
    "Une ville futuriste sous l'océan avec des dômes de verre et des poissons néons",
    "Un vieux renard bibliothécaire portant des lunettes, style peinture à l'huile",
    "Un phénix fait de flammes arc-en-ciel s'élevant d'un volcan de cristal",
    "Une baleine volante traversant des nuages roses au coucher du soleil",
    "Un temple japonais flottant dans l'espace entouré d'aurores boréales",
    "Un loup fantôme transparent courant dans une forêt de bambous la nuit",
    "Une bibliothèque infinie avec des escaliers impossibles, style M.C. Escher",
    "Un samouraï robot steampunk avec des engrenages dorés et vapeur",
    "Un jardin zen avec des rochers flottants et cascade inversée",
    "Une méduse bioluminescente géante illuminant les profondeurs océaniques",
    "Un dragon chinois fait de nuages dorés volant autour d'une montagne",
    "Une sorcière moderne dans son laboratoire high-tech avec potions holographiques",
    "Un cerf majestueux aux bois faits de branches d'arbres en fleurs",
    "Une cité maya futuriste mêlant pyramides anciennes et néons cyberpunk",
    "Un phoenix mécanique aux plumes métalliques brillantes s'envolant",
    "Un guerrier tribal africain avec armure tribale lumineuse, fond savane",
    "Une danseuse de ballet suspendue dans les airs entourée de papillons lumineux",
    "Un vaisseau spatial organique en forme de méduse traversant une nébuleuse",
    "Un château médiéval inversé accroché sous des îles flottantes",
    "Un samouraï cyberpunk avec katana laser dans une rue de Tokyo futuriste",
    "Une licorne cosmique galopant sur un arc-en-ciel entre les étoiles",
    "Un phoenix de glace aux ailes cristallines dans une tempête de neige arctique"
];

const POLLINATIONS_API = 'https://image.pollinations.ai/prompt/';
const STORAGE_KEYS = {
    HISTORY: 'imageai_history',
    SETTINGS: 'imageai_settings'
};

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    console.log("🚀 SmartImageAI - Initialisation...");

    // Masquer le splash screen après 2.5s
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) splash.style.display = 'none';
    }, 2500);

    // Charger les données sauvegardées
    loadHistory();
    loadSettings();

    // Configurer les écouteurs d'événements
    setupEventListeners();

    // Mettre à jour l'interface
    updateHistoryDisplay();
    updateStats();

    initPWAInstallation(); //initialisation de la detection de la pwa
    // Initialiser l'écran par défaut
    switchScreen('generator');

    console.log("✅ Application prête !");

    // Pour mise a jour automatique
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            // Cette fonction s'exécute quand un nouveau Service Worker est détecté
            reg.onupdatefound = () => {
                const installingWorker = reg.installing;
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // Une nouvelle version a été installée en arrière-plan !
                            console.log('✨ Nouvelle mise à jour détectée !');
                            showToast("Mise à jour installée ! Redémarrage...", "info");

                            // On attend 2 secondes pour que l'utilisateur lise le toast
                            setTimeout(() => {
                                window.location.reload();
                            }, 2000);
                        }
                    }
                };
            };
        });

        // Éviter les boucles de rechargement infinies
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                window.location.reload();
                refreshing = true;
            }
        });
    }
}

// === SYSTÈME DE NAVIGATION (CORRIGÉ) ===
function switchScreen(screenName) {
    console.log(`📍 Navigation vers : ${screenName}`);

    // 1. Masquer tous les écrans
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    // 2. Afficher l'écran cible
    const targetScreen = document.getElementById(`screen-${screenName}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    } else {
        console.error(`❌ Écran non trouvé : screen-${screenName}`);
        return;
    }

    // 3. Mettre à jour les boutons de navigation (sidebar + bottom nav)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.dataset.screen === screenName) {
            item.classList.add('active');
            item.classList.remove('opacity-40', 'opacity-60');
        } else {
            item.classList.remove('active');
            // Remettre l'opacité réduite pour les items inactifs
            if (item.closest('.lg\\:hidden')) {
                // Bottom nav (mobile)
                item.classList.add('opacity-40');
            } else {
                // Sidebar (desktop)
                item.classList.add('opacity-60');
            }
        }
    });

    // 4. Mettre à jour le titre sur mobile
    const pageTitles = {
        'generator': 'Générer',
        'history': 'Historique',
        'settings': 'Paramètres',
        'about': 'À propos'
    };

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = pageTitles[screenName] || 'SmartImageAI';
    }

    // 5. Sauvegarder l'état
    AppState.currentScreen = screenName;

    // 6. Scroll vers le haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// === ÉCOUTEURS D'ÉVÉNEMENTS ===
function setupEventListeners() {
    console.log("🎧 Configuration des écouteurs d'événements...");

    // ===== NAVIGATION =====
    // Correction : On écoute directement sur .nav-item (pas .nav-item-link)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const screen = item.dataset.screen;
            if (screen) {
                switchScreen(screen);
            }
        });
    });

    // ===== TEXTAREA AUTO-RESIZE =====
    const promptInput = document.getElementById('prompt-input');
    if (promptInput) {
        promptInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }

    // ===== BOUTON GÉNÉRER =====
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }

    // ===== BOUTON SURPRISE =====
    const surpriseBtn = document.getElementById('surprise-btn');
    if (surpriseBtn) {
        surpriseBtn.addEventListener('click', handleSurprise);
    }

    // ===== SÉLECTEUR DE FORMAT =====
    const sizeOptions = document.querySelectorAll('.size-option');
    sizeOptions.forEach(option => {
        option.addEventListener('click', () => {
            sizeOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            AppState.selectedSize = option.dataset.size;
            saveSettings();
            console.log(`📐 Format sélectionné : ${AppState.selectedSize}`);
        });
    });

    // ===== SÉLECTEUR DE MODÈLE =====
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            AppState.selectedModel = e.target.value;
            saveSettings();
            console.log(`🎨 Modèle sélectionné : ${AppState.selectedModel}`);
        });
    }

    // ===== BOUTONS DE PRÉVISUALISATION =====
    const previewShareBtn = document.getElementById('preview-share-btn');
    if (previewShareBtn) {
        previewShareBtn.addEventListener('click', () => {
            const img = document.getElementById('preview-image');
            if (img.src && !img.src.includes('placeholder')) {
                shareImage(img.src, "Ma création SmartImageAI", "Regarde ce que j'ai créé !");
            }
        });
    }

    const previewDownloadBtn = document.getElementById('preview-download-btn');
    if (previewDownloadBtn) {
        previewDownloadBtn.addEventListener('click', () => {
            const img = document.getElementById('preview-image');
            if (img.src) {
                downloadImage(img.src, `smartimageai-${Date.now()}.png`);
            }
        });
    }

    // ===== HISTORIQUE =====
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', handleClearHistory);
    }

    // ===== PARAMÈTRES =====
    const resetAppBtn = document.getElementById('reset-app-btn');
    if (resetAppBtn) {
        resetAppBtn.addEventListener('click', handleResetApp);
    }

    // ===== MODAL =====
    const modalClose = document.getElementById('modal-close');
    const modalOverlay = document.querySelector('.modal-overlay');

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeModal);
    }

    const modalDownloadBtn = document.getElementById('modal-download-btn');
    const modalShareBtn = document.getElementById('modal-share-btn');
    const modalDeleteBtn = document.getElementById('modal-delete-btn');

    if (modalDownloadBtn) {
        modalDownloadBtn.addEventListener('click', handleModalDownload);
    }
    if (modalShareBtn) {
        modalShareBtn.addEventListener('click', handleModalShare);
    }
    if (modalDeleteBtn) {
        modalDeleteBtn.addEventListener('click', handleModalDelete);
    }

    // ===== PWA INSTALLATION ===== 
    const pwaInstallBtn = document.getElementById('pwa-install-btn');
    const pwaCloseBtn = document.getElementById('pwa-close-btn');

    if (pwaInstallBtn) {
        pwaInstallBtn.addEventListener('click', async () => {
            if (AppState.deferredPrompt) {
                AppState.deferredPrompt.prompt();
                const { outcome } = await AppState.deferredPrompt.userChoice;
                console.log(`Résultat installation: ${outcome}`);
                AppState.deferredPrompt = null;
                hidePWABanner();
            }
        });
    }

    if (pwaCloseBtn) {
        pwaCloseBtn.addEventListener('click', () => {
            hidePWABanner();
            localStorage.setItem('pwa_dismissed', 'true');
        });
    }
}

// === LOGIQUE DE GÉNÉRATION ===
async function handleGenerate() {
    const promptInput = document.getElementById('prompt-input');
    const originalPrompt = promptInput.value.trim();

    if (!originalPrompt) {
        showToast(' Veuillez entrer une description', 'warning');
        return;
    }

    if (AppState.isGenerating) {
        showToast(' Génération en cours...', 'info');
        return;
    }

    AppState.isGenerating = true;
    toggleLoading(true);

    try {
        console.log("🎨 Début de la génération...");

        // 1. Traduction en anglais
        const translatedPrompt = await translateToEnglish(originalPrompt);
        console.log(`🌐 Traduit : ${translatedPrompt}`);

        // 2. Enrichissement selon le modèle
        let finalPrompt = translatedPrompt;
        if (AppState.selectedModel === 'flux-realism') {
            finalPrompt += ", professional photography, 8k, highly detailed, photorealistic";
        } else if (AppState.selectedModel === 'any-v4-5') {
            finalPrompt += ", high quality anime style, vibrant colors, detailed";
        } else if (AppState.selectedModel === 'flux') {
            finalPrompt += ", masterpiece, high quality, detailed";
        }

        // 3. Dimensions selon le format
        let width = 1024, height = 1024;
        if (AppState.selectedSize === 'landscape') {
            width = 1280;
            height = 720;
        } else if (AppState.selectedSize === 'portrait') {
            width = 720;
            height = 1280;
        }

        // 4. Génération de l'URL
        const seed = Math.floor(Math.random() * 999999);
        const imageUrl = `${POLLINATIONS_API}${encodeURIComponent(finalPrompt)}?width=${width}&height=${height}&model=${AppState.selectedModel}&seed=${seed}&nologo=true`;

        console.log("🔗 URL générée :", imageUrl);

        // 5. Préchargement de l'image
        const imgCheck = new Image();
        imgCheck.src = imageUrl;
        await imgCheck.decode();

        // 6. Affichage de l'image
        const previewImage = document.getElementById('preview-image');
        const previewImageContainer = document.getElementById('preview-image-container');
        const previewPlaceholder = document.getElementById('preview-placeholder');

        previewImage.src = imageUrl;
        previewImageContainer.classList.remove('hidden');
        previewPlaceholder.classList.add('hidden');

        // 7. Sauvegarde dans l'historique
        const newItem = {
            id: Date.now(),
            prompt: originalPrompt,
            imageUrl: imageUrl,
            size: AppState.selectedSize,
            model: AppState.selectedModel,
            timestamp: new Date().toISOString()
        };

        AppState.history.unshift(newItem);
        saveHistory();
        updateHistoryDisplay();
        updateStats();

        showToast(' Image créée avec succès !', 'success');
        console.log(" Génération terminée !");

        promptInput.value = '';
        promptInput.style.height = 'auto'; // Reset la hauteur
    } catch (error) {
        console.error("❌ Erreur de génération :", error);
        showToast(' Erreur lors de la génération', 'error');
    } finally {
        AppState.isGenerating = false;
        toggleLoading(false);
    }
}

// === TRADUCTION ===
async function translateToEnglish(text) {
    if (!text || text.length < 3) return text;

    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|en`);
        const data = await response.json();
        return data.responseData.translatedText || text;
    } catch (error) {
        console.warn(" Traduction échouée, utilisation du texte original");
        return text;
    }
}

// === GESTION DU LOADER ===
function toggleLoading(isLoading) {
    const loader = document.getElementById('preview-loading');
    const generateBtn = document.getElementById('generate-btn');

    if (isLoading) {
        loader.classList.remove('hidden');
        loader.classList.add('flex');
        generateBtn.disabled = true;
        generateBtn.style.opacity = "0.5";
    } else {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        generateBtn.disabled = false;
        generateBtn.style.opacity = "1";
    }
}

// === PROMPT SURPRISE ===
function handleSurprise() {
    const promptInput = document.getElementById('prompt-input');
    const randomPrompt = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];

    promptInput.value = randomPrompt;
    promptInput.dispatchEvent(new Event('input')); // Trigger auto-resize

    // Animation visuelle
    promptInput.style.transition = 'all 0.3s ease';
    promptInput.style.transform = 'scale(1.02)';
    setTimeout(() => {
        promptInput.style.transform = 'scale(1)';
    }, 300);

    showToast('Prompt aléatoire !', 'info');
}

// === PARTAGE ===
async function shareImage(url, title, text) {
    if (!navigator.share) {
        showToast(" Partage non disponible", "warning");
        return;
    }

    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], 'smartimageai.png', { type: 'image/png' });

        await navigator.share({
            files: [file],
            title: title,
            text: text
        });

        showToast(' Image partagée !', 'success');
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error("Erreur de partage :", error);
        }
    }
}

// === TÉLÉCHARGEMENT ===
async function downloadImage(url, filename) {
    try {
        showToast("⬇ Téléchargement...", "info");

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

        showToast(' Image téléchargée !', 'success');
    } catch (error) {
        console.error("Erreur téléchargement :", error);
        showToast(' Erreur de téléchargement', 'error');
    }
}

// === HISTORIQUE ===
function updateHistoryDisplay() {
    const grid = document.getElementById('history-grid');
    if (!grid) return;

    if (AppState.history.length === 0) {
        grid.innerHTML = `
            <div class="empty-gallery col-span-full">
                <div class="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600">
                    <i class="fa-solid fa-image text-3xl"></i>
                </div>
                <p class="text-slate-500 font-medium">Aucune image pour le moment</p>
                <p class="text-slate-600 text-xs mt-2">Vos créations apparaîtront ici</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = AppState.history.map(item => `
        <div class="image-card relative aspect-square rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 cursor-pointer" onclick="openImageModal(${item.id})">
            <img src="${item.imageUrl}" class="w-full h-full object-cover" loading="lazy" alt="${item.prompt}">
            <div class="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                <p class="text-white text-xs truncate font-medium">${item.prompt}</p>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    const totalImagesEl = document.getElementById('total-images');
    if (totalImagesEl) {
        totalImagesEl.textContent = AppState.history.length;
    }
}

function handleClearHistory() {
    if (!confirm(" Effacer tout l'historique ? Cette action est irréversible.")) {
        return;
    }

    AppState.history = [];
    saveHistory();
    updateHistoryDisplay();
    updateStats();
    showToast(' Historique vidé', 'success');
}

// === MODAL ===
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
    modal.classList.remove('hidden');

    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('image-modal');
    modal.classList.remove('active');
    modal.classList.add('hidden');
    currentModalImageId = null;

    document.body.style.overflow = '';
}

function handleModalDownload() {
    if (!currentModalImageId) return;

    const item = AppState.history.find(h => h.id === currentModalImageId);
    if (item) {
        downloadImage(item.imageUrl, `smartimageai-${item.id}.png`);
    }
}

function handleModalShare() {
    if (!currentModalImageId) return;

    const item = AppState.history.find(h => h.id === currentModalImageId);
    if (item) {
        shareImage(item.imageUrl, "Ma création SmartImageAI", item.prompt);
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
    showToast(' Image supprimée', 'success');
}

// === PARAMÈTRES ===
function handleResetApp() {
    if (!confirm(' Réinitialiser l\'application ? Toutes vos données seront supprimées.')) {
        return;
    }

    localStorage.clear();
    AppState.history = [];
    AppState.selectedSize = 'square';
    AppState.selectedModel = 'flux';

    updateHistoryDisplay();
    updateStats();

    showToast(' Application réinitialisée', 'success');

    setTimeout(() => {
        window.location.reload();
    }, 1500);
}

// === STORAGE ===
function loadHistory() {
    const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (savedHistory) {
        try {
            AppState.history = JSON.parse(savedHistory);
            console.log(`📚 ${AppState.history.length} images chargées`);
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
            AppState.selectedSize = settings.size || 'square';
            AppState.selectedModel = settings.model || 'flux';

            // Mettre à jour l'UI
            const modelSelect = document.getElementById('model-select');
            if (modelSelect) {
                modelSelect.value = AppState.selectedModel;
            }

            const sizeOptions = document.querySelectorAll('.size-option');
            sizeOptions.forEach(option => {
                if (option.dataset.size === AppState.selectedSize) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });

            console.log(`⚙️ Paramètres chargés : ${AppState.selectedModel}, ${AppState.selectedSize}`);
        } catch (error) {
            console.error('Erreur chargement paramètres:', error);
        }
    }
}

function saveSettings() {
    const settings = {
        size: AppState.selectedSize,
        model: AppState.selectedModel
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

// === TOAST NOTIFICATIONS ===
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    // Couleurs selon le type
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-amber-500',
        info: 'bg-indigo-500'
    };

    toast.textContent = message;
    toast.className = `fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl text-sm font-medium text-white ${colors[type] || colors.info}`;

    // Affichage
    setTimeout(() => {
        toast.classList.add('show');
        toast.style.transform = 'translate(-50%, 0)';
        toast.style.opacity = '1';
    }, 10);

    // Masquage automatique
    setTimeout(() => {
        toast.style.transform = 'translate(-50%, -100px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.classList.remove('show');
        }, 300);
    }, 3000);
}

// === NETWORK STATUS ===
window.addEventListener('online', () => {
    showToast(' Connexion rétablie', 'success');
});

window.addEventListener('offline', () => {
    showToast(' Hors ligne', 'warning');
});


// === LOGIQUE PWA (INSTALLATION) ===
function isIOS() {
    return [
        'iPad Simulator', 'iPhone Simulator', 'iPod Simulator',
        'iPad', 'iPhone', 'iPod'
    ].includes(navigator.platform)
        || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

function isInStandaloneMode() {
    return ('standalone' in window.navigator) && (window.navigator.standalone);
}

function initPWAInstallation() {
    const banner = document.getElementById('pwa-install-banner');
    if (!banner) return;

    const iosText = document.getElementById('pwa-text-ios');
    const androidText = document.getElementById('pwa-text-android');
    const installBtn = document.getElementById('pwa-install-btn');

    // Détection iOS
    if (isIOS() && !isInStandaloneMode()) {
        if (localStorage.getItem('pwa_dismissed')) return;

        setTimeout(() => {
            banner.classList.remove('hidden');
            if (installBtn) installBtn.classList.add('hidden');
            if (iosText) iosText.classList.remove('hidden');
            if (androidText) androidText.classList.add('hidden');
            setTimeout(() => banner.classList.remove('translate-y-60'), 100);
        }, 6000); // 6 secondes après le chargement
    }

    // Détection Android / Chrome Desktop
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        AppState.deferredPrompt = e;

        if (localStorage.getItem('pwa_dismissed')) return;

        setTimeout(() => {
            banner.classList.remove('hidden');
            setTimeout(() => banner.classList.remove('translate-y-60'), 100);
        }, 3000); // 3 secondes après le chargement
    });
}

function hidePWABanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.classList.add('translate-y-60');
        setTimeout(() => banner.classList.add('hidden'), 500);
    }
}