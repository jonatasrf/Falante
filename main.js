console.log("main.js loaded");
console.log("main.js execution started");
import { initializeTts, getCategoriesFromLocal, showToast } from './utils.js';
import { initializeListenTypeView } from './listenType.js';
import { initializeFlipCardView } from './flipCard.js';
import { initializeSentencesManager } from './sentencesManager.js';
import { initializeEnglishTestView } from './englishTest.js';

// --- DOM Elements ---
document.addEventListener('DOMContentLoaded', () => {
    // Global state
    window.currentUser = { correctSentencesCount: 0 }; // Simplified user object for local mode
    let activeView = 'listen';
    let viewControllers = {};

    // --- Element Cache ---
    const elements = {
        // Views
        viewListen: document.getElementById('view-listen'),
        viewFlip: document.getElementById('view-flip'),
        viewSentences: document.getElementById('view-sentences'),
        viewTest: document.getElementById('view-test'),
        // Nav
        navListen: document.querySelector('.nav-link-listen'),
        navFlip: document.querySelector('.nav-link-flipcard'),
        navSentences: document.querySelector('.nav-link-sentences'),
        navTest: document.querySelector('.nav-link-test'),
        hamburgerMenu: document.getElementById('hamburgerMenu'),
        mainNav: document.getElementById('mainNav'),
        closeNavButton: document.getElementById('closeNav'),
        
        // Listen & Type
        speakButton: document.getElementById('speakButton'),
        checkButton: document.getElementById('checkButton'),
        hintButton: document.getElementById('hintButton'),
        nextSentenceButtonListenType: document.getElementById('nextSentenceButtonListenType'),
        userInput: document.getElementById('userInput'),
        feedback: document.getElementById('feedback'),
        feedbackText: document.getElementById('feedbackText'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        sessionCountListenElement: document.getElementById('sessionCountListen'),
        progressSection: document.getElementById('progressSection'),
        currentLevelElement: document.getElementById('currentLevel'),
        progressBarElement: document.getElementById('progressBar'),
        progressCountElement: document.getElementById('progressCount'),
        nextLevelCountElement: document.getElementById('nextLevelCount'),
        // Flip Card
        flashcard: document.getElementById('flashcard'),
        flashcardTextElement: document.getElementById('flashcardText'),
        nextCardButton: document.getElementById('nextCardButton'),
        sessionCountFlipElement: document.getElementById('sessionCountFlip'),
        srsButtons: document.getElementById('srsButtons'),
        srsAgain: document.getElementById('srsAgain'),
        srsGood: document.getElementById('srsGood'),
        srsEasy: document.getElementById('srsEasy'),
        // Sentences
        bulkInput: document.getElementById('bulkInput'),
        saveBtn: document.getElementById('saveBtn'),
        clearBtn: document.getElementById('clearBtn'),
        exportBtn: document.getElementById('exportBtn'),
        importBtn: document.getElementById('importBtn'),
        importFile: document.getElementById('importFile'),
        listContainer: document.getElementById('list'),
        sentencePromptCount: document.getElementById('sentencePromptCount'),
        sentencePromptTheme: document.getElementById('sentencePromptTheme'),
        sentencePromptCategory: document.getElementById('sentencePromptCategory'),
        generateSentencePromptBtn: document.getElementById('generateSentencePromptBtn'),
        generatedSentencePromptContainer: document.getElementById('generatedSentencePromptContainer'),
        generatedSentencePromptArea: document.getElementById('generatedSentencePromptArea'),
        copySentencePromptBtn: document.getElementById('copySentencePromptBtn'),
        // Test
        testScriptInputArea: document.getElementById('testScriptInputArea'),
        loadTestFromTextBtn: document.getElementById('loadTestFromTextBtn'),
        importTestBtn: document.getElementById('importTestBtn'),
        importTestFile: document.getElementById('importTestFile'),
        testOutput: document.getElementById('testOutput'),
        finishTestBtn: document.getElementById('finishTestBtn'),
        testResults: document.getElementById('testResults'),
        scriptExplanationContent: document.getElementById('scriptExplanationContent'),
        promptQuestionCount: document.getElementById('promptQuestionCount'),
        promptGrammarTopic: document.getElementById('promptGrammarTopic'),
        generatePromptBtn: document.getElementById('generatePromptBtn'),
        generatedPromptContainer: document.getElementById('generatedPromptContainer'),
        generatedPromptArea: document.getElementById('generatedPromptArea'),
        copyPromptBtn: document.getElementById('copyPromptBtn'),
        // Popups
        noticePopup: document.getElementById('noticePopup'),
        closeNoticePopup: document.getElementById('closeNoticePopup'),
        starPopup: document.getElementById('starPopup'),
        closeStarPopup: document.getElementById('closeStarPopup'),
        starPopupCountElement: document.getElementById('starPopupCount'),
        levelUpPopup: document.getElementById('levelUpPopup'),
        closeLevelUpPopup: document.getElementById('closeLevelUpPopup'),
        levelUpMessage: document.getElementById('levelUpMessage'),
        levelUpPopupCount: document.getElementById('levelUpPopupCount'),
    };

    // --- Core Functions ---
    function loadCategories(categorySelectElement) {
        const categories = getCategoriesFromLocal();
        const selector = categorySelectElement;
        while (selector.options.length > 1) selector.remove(1);
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            selector.appendChild(option);
        });
    }

    function setActiveView(view) {
        window.speechSynthesis.cancel();
        activeView = view;

        // Hide all views
        elements.viewListen.style.display = 'none';
        elements.viewFlip.style.display = 'none';
        elements.viewSentences.style.display = 'none';
        elements.viewTest.style.display = 'none';

        // Hide all popups when switching views
        if (elements.noticePopup) elements.noticePopup.style.display = 'none';
        if (elements.starPopup) elements.starPopup.style.display = 'none';
        if (elements.levelUpPopup) elements.levelUpPopup.style.display = 'none';

        // Show the selected view
        if (view === 'listen') elements.viewListen.style.display = '';
        else if (view === 'flip') elements.viewFlip.style.display = '';
        else if (view === 'sentences') elements.viewSentences.style.display = '';
        else if (view === 'test') elements.viewTest.style.display = '';

        // Update nav links
        elements.navListen.classList.toggle('active', view === 'listen');
        elements.navFlip.classList.toggle('active', view === 'flip');
        elements.navSentences.classList.toggle('active', view === 'sentences');
        elements.navTest.classList.toggle('active', view === 'test');

        

        if (viewControllers[view] && typeof viewControllers[view].onViewActive === 'function') {
            viewControllers[view].onViewActive();
        }
        elements.mainNav.classList.remove('active');
    }

    // --- Initialization ---
    function initializeApp() {
        console.log("Initializing app..."); // Diagnostic log
        loadCategories(elements.viewListen.querySelector('#categorySelect'));
        loadCategories(elements.viewFlip.querySelector('#categorySelect'));

        // Initialize all views
        viewControllers.listen = initializeListenTypeView({
            ...elements,
            categorySelectElement: elements.viewListen.querySelector('#categorySelect'),
            voiceSelectElement: elements.viewListen.querySelector('#voiceSelect'),
        });
        viewControllers.flip = initializeFlipCardView({
            ...elements,
            categorySelectElement: elements.viewFlip.querySelector('#categorySelect'),
            voiceSelectElement: elements.viewFlip.querySelector('#voiceSelect'),
        });
        viewControllers.sentences = initializeSentencesManager(elements, loadCategories);
        viewControllers.test = initializeEnglishTestView(elements);

        // Setup Nav
        elements.navListen.addEventListener('click', (e) => { e.preventDefault(); setActiveView('listen'); });
        elements.navFlip.addEventListener('click', (e) => { e.preventDefault(); setActiveView('flip'); });
        elements.navSentences.addEventListener('click', (e) => { e.preventDefault(); setActiveView('sentences'); });
        elements.navTest.addEventListener('click', (e) => { e.preventDefault(); setActiveView('test'); });

        // Hamburger Menu
        elements.hamburgerMenu.addEventListener('click', () => elements.mainNav.classList.toggle('active'));
        elements.closeNavButton.addEventListener('click', () => elements.mainNav.classList.remove('active'));

        // Global Shortcuts
        document.addEventListener('keydown', (event) => {
            if (viewControllers[activeView] && typeof viewControllers[activeView].handleShortcut === 'function') {
                viewControllers[activeView].handleShortcut(event);
            }
        });

        // Popup Logic
        if (!localStorage.getItem('noticeShown')) {
            elements.noticePopup.style.display = 'flex';
        }
        elements.closeNoticePopup.addEventListener('click', () => {
            elements.noticePopup.style.display = 'none';
            localStorage.setItem('noticeShown', 'true');
        });
        elements.closeStarPopup.addEventListener('click', () => elements.starPopup.style.display = 'none');
        elements.closeLevelUpPopup.addEventListener('click', () => {
            elements.levelUpPopup.style.display = 'none';
            if (elements.nextSentenceButtonListenType) {
                elements.nextSentenceButtonListenType.style.display = 'inline-block';
            }
        });

        // Set initial view
        setActiveView('listen');
    }

    console.log("DOM Content Loaded, initializing app...");
    initializeApp();
});
