// --- DOM Elements ---

// Top-level views and nav
const viewListen = document.getElementById('view-listen');
const viewFlip = document.getElementById('view-flip');
const viewSentences = document.getElementById('view-sentences');
const viewTest = document.getElementById('view-test'); // New Test View
const navListen = document.querySelector('.nav-link-listen');
const navFlip = document.querySelector('.nav-link-flipcard');
const navSentences = document.querySelector('.nav-link-sentences');
const navTest = document.querySelector('.nav-link-test'); // New Test Nav Link

// Global controls
const categorySelectElement = document.getElementById('categorySelect');
const voiceSelectElement = document.getElementById('voiceSelect');
// Removed manual voice controls

// Listen & Type Mode Elements
const listenTypeArea = document.getElementById('listenTypeArea');
const speakButton = document.getElementById('speakButton');
const checkButton = document.getElementById('checkButton');
const hintButton = document.getElementById('hintButton');
const nextSentenceButtonListenType = document.getElementById('nextSentenceButtonListenType');
const userInput = document.getElementById('userInput');
const feedback = document.getElementById('feedback');
const feedbackText = document.getElementById('feedbackText');
const loadingIndicator = document.getElementById('loadingIndicator');
const sessionCountListenElement = document.getElementById('sessionCountListen');

// Flip Card Elements
const flashcard = document.getElementById('flashcard');
const flashcardTextElement = document.getElementById('flashcardText');
const nextCardButton = document.getElementById('nextCardButton');
const sessionCountFlipElement = document.getElementById('sessionCountFlip');

// Sentences manager Elements
const bulkInput = document.getElementById('bulkInput');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const listContainer = document.getElementById('list');
// AI Sentence Prompt Generator Elements
const sentencePromptCount = document.getElementById('sentencePromptCount');
const sentencePromptTheme = document.getElementById('sentencePromptTheme');
const sentencePromptCategory = document.getElementById('sentencePromptCategory');
const generateSentencePromptBtn = document.getElementById('generateSentencePromptBtn');
const generatedSentencePromptContainer = document.getElementById('generatedSentencePromptContainer');
const generatedSentencePromptArea = document.getElementById('generatedSentencePromptArea');
const copySentencePromptBtn = document.getElementById('copySentencePromptBtn');

// English Test Elements (New)
const testScriptInputArea = document.getElementById('testScriptInputArea');
const loadTestFromTextBtn = document.getElementById('loadTestFromTextBtn');
const importTestBtn = document.getElementById('importTestBtn');
const importTestFile = document.getElementById('importTestFile');
const testOutput = document.getElementById('testOutput');
const finishTestBtn = document.getElementById('finishTestBtn'); // New Finish Test Button
const testResults = document.getElementById('testResults'); // New Test Results Div
// Script Explanation Elements
const scriptExplanationContent = document.getElementById('scriptExplanationContent');
// AI Prompt Generator Elements
const promptQuestionCount = document.getElementById('promptQuestionCount');
const promptGrammarTopic = document.getElementById('promptGrammarTopic');
const generatePromptBtn = document.getElementById('generatePromptBtn');
const generatedPromptContainer = document.getElementById('generatedPromptContainer');
const generatedPromptArea = document.getElementById('generatedPromptArea');
const copyPromptBtn = document.getElementById('copyPromptBtn');

// Local-only mode: no auth/user status

// Progress UI
const progressSection = document.getElementById('progressSection');
const currentLevelElement = document.getElementById('currentLevel');
const progressBarElement = document.getElementById('progressBar');
const progressCountElement = document.getElementById('progressCount');
const nextLevelCountElement = document.getElementById('nextLevelCount');
const levelUpNotificationElement = document.getElementById('levelUpNotification');
const nextLevelButton = document.getElementById('nextLevelButton');

// --- Popup Elements ---
const noticePopup = document.getElementById('noticePopup');
const closeNoticePopup = document.getElementById('closeNoticePopup');
const starPopup = document.getElementById('starPopup');
const closeStarPopup = document.getElementById('closeStarPopup');
const starPopupCountElement = document.getElementById('starPopupCount');


// --- State Variables ---
let activeView = 'listen'; // 'listen' | 'flip' | 'sentences' | 'test'

// Listen state
let currentSentenceObject = null;
let currentSentence = '';
let sessionCompletedCountListen = 0;


// Flip state
let flipCurrentSentenceObject = null;
let flipCurrentSentence = '';
let sessionCompletedCountFlip = 0;
let isFlipped = false;

let currentUser = null; // Will be populated by checkLoginStatus
let currentLevel = 0;
let isFirstAttempt = true;
let currentStreak = 0;

// --- TTS Voice Selection (User-Controlled) ---
let voices = []; // To be populated with available voices

function populateVoiceList() {
    if (!window.speechSynthesis) return;
    voices = window.speechSynthesis.getVoices();
    voiceSelectElement.innerHTML = ''; // Clear existing options
    
    const savedVoiceName = localStorage.getItem('falante-voice');
    let bestFitVoice = null;

    // If no voice is saved, find the best default
    if (!savedVoiceName) {
        const usVoices = voices.filter(v => v.lang === 'en-US');
        const femaleKeywords = ['female', 'aria', 'zira', 'sarah', 'lisa'];

        // Priority 1: Find a "Natural" female voice
        bestFitVoice = usVoices.find(v => v.name.toLowerCase().includes('natural') && femaleKeywords.some(k => v.name.toLowerCase().includes(k))) || null;

        // Priority 2: Find any "Natural" voice
        if (!bestFitVoice) {
            bestFitVoice = usVoices.find(v => v.name.toLowerCase().includes('natural')) || null;
        }

        // Priority 3: Find any female voice
        if (!bestFitVoice) {
            bestFitVoice = usVoices.find(v => femaleKeywords.some(k => v.name.toLowerCase().includes(k))) || null;
        }

        // Fallback: Find the first available US English voice
        if (!bestFitVoice) {
            bestFitVoice = usVoices[0] || null;
        }
    }

    voices.filter(voice => voice.lang.startsWith('en')) // Filter for English voices
        .forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.setAttribute('data-lang', voice.lang);
            // Use the full textContent as the value to ensure uniqueness
            option.value = option.textContent;
            
            voiceSelectElement.appendChild(option);

            // Set the selected option based on the hierarchy
            if (savedVoiceName && option.value === savedVoiceName) {
                option.selected = true;
            } else if (!savedVoiceName && bestFitVoice && voice.name === bestFitVoice.name) {
                option.selected = true;
            }
        });
}

function initializeTts() {
    if (!window.speechSynthesis) {
        console.warn("Speech Synthesis not supported.");
        voiceSelectElement.disabled = true;
        return;
    }
    populateVoiceList();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }
}


// --- Speech Synthesis (client-side only) ---
function speakText(text, opts = {}) {
    return new Promise((resolve, reject) => {
        try {
            const utter = new SpeechSynthesisUtterance(text);
            const selectedVoiceName = voiceSelectElement.value;
            const chosenVoice = voices.find(v => `${v.name} (${v.lang})` === selectedVoiceName);

            utter.lang = chosenVoice ? chosenVoice.lang : 'en-US';
            if (chosenVoice) utter.voice = chosenVoice;
            
            utter.rate = Number(opts.rate ?? 1);
            utter.pitch = Number(opts.pitch ?? 1);
            utter.volume = Number(opts.volume ?? 1);
            utter.onend = resolve; 
            utter.onerror = (e) => reject(e.error || e);
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utter);
        } catch (e) { reject(e); }
    });
}

// --- Core Application Logic ---

// Function to display the current sentence text for Listen & Type mode
function displayCurrentSentenceUI() {
    if (!currentSentenceObject) {
        feedbackText.textContent = 'Could not load a sentence.';
        feedback.className = 'feedback-area incorrect';
        speakButton.disabled = true;
        checkButton.disabled = true;
        hintButton.disabled = true;
        userInput.disabled = true;
        currentSentence = '';
        return;
    }

    currentSentence = currentSentenceObject.text;
    console.log("Displaying sentence (ID: " + currentSentenceObject.id + "):", currentSentenceObject.text);

    feedbackText.textContent = 'Listen to the sentence first.';
    feedback.className = 'feedback-area';
    userInput.value = '';
    userInput.disabled = false;
    checkButton.disabled = true; // Disabled until speech ends
    hintButton.disabled = true; // Disabled until speech ends
    isFirstAttempt = true;
    nextSentenceButtonListenType.style.display = 'none';
    checkButton.style.display = 'inline-block';
    hintButton.style.display = 'inline-block';
    speakButton.disabled = false; // Enable speak button

    // Hide level up notification and button when new sentence is displayed
    levelUpNotificationElement.style.display = 'none';
    levelUpNotificationElement.textContent = '';
    nextLevelButton.style.display = 'none';
}


// Local storage helpers (browser-only mode)
const LOCAL_STORAGE_KEY = 'falante-sentences';
function loadLocalSentences() {
    try { const raw = localStorage.getItem(LOCAL_STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function getCategoriesFromLocal() {
    const items = loadLocalSentences();
    const set = new Set(items.map(i => i.category || 'Uncategorized'));
    return Array.from(set).sort();
}
function pickRandomSentenceFromLocal(category) {
    const items = loadLocalSentences();
    const filtered = (!category || category === 'All') ? items : items.filter(i => i.category === category);
    if (!filtered.length) return null;
    return filtered[Math.floor(Math.random() * filtered.length)];
}

// Function to fetch a single random sentence locally
async function fetchAndSetSentence() {
    const selectedCategory = categorySelectElement.value;
    console.log(`Fetching sentence locally. Category: ${selectedCategory}`);

     try {
        // Show loading state for Listen & Type mode
        feedbackText.style.display = 'none';
        loadingIndicator.style.display = 'inline';
        feedback.className = 'feedback-area';
        speakButton.disabled = true;
        checkButton.disabled = true;
        hintButton.disabled = true;
        userInput.disabled = true;

        const local = pickRandomSentenceFromLocal(selectedCategory);
        if (!local) {
            const msg = (selectedCategory && selectedCategory !== 'All') ? `No sentences found for category: ${selectedCategory}` : 'No sentences found. Add some in the Sentences tab.';
            throw new Error(msg);
        }
        currentSentenceObject = { id: local.id, text: local.text };
        
        console.log(`Loaded local sentence ID ${currentSentenceObject.id}.`);

        // Update Listen & Type UI
        displayCurrentSentenceUI();
        
        // Automatically speak the new sentence
        await speakSentence();

     } catch (error) {
        console.error('Failed to load local sentence:', error);
        // Update Listen & Type UI with error
        feedbackText.textContent = `Error loading sentence: ${error.message}`;
        feedback.className = 'feedback-area incorrect';
        speakButton.disabled = true;
        checkButton.disabled = true;
        hintButton.disabled = true;
        userInput.disabled = true;
        currentSentenceObject = null;
        currentSentence = '';
     } finally {
         // Hide loading indicator for Listen & Type mode
         loadingIndicator.style.display = 'none';
         feedbackText.style.display = 'inline';
     }
}


// Function to play TTS using browser SpeechSynthesis
async function speakSentence() {
    if (!currentSentence) {
        feedbackText.textContent = 'No sentence loaded. Cannot speak.';
        feedback.className = 'feedback-area incorrect';
        return;
    }

    console.log(`Requesting TTS for: "${currentSentence}"`);
    speakButton.disabled = true;
    checkButton.disabled = true; // Disable check while fetching/playing
    hintButton.disabled = true; // Disable hint while fetching/playing
    feedbackText.textContent = 'Generating audio...';
    feedback.className = 'feedback-area';

    try {
        feedbackText.textContent = 'Playing audio...';
        await speakText(currentSentence, { rate: 1, pitch: 1, volume: 1 });
        console.log('Audio playback finished.');
        feedbackText.textContent = 'Now type what you heard.';
        feedback.className = 'feedback-area';
        speakButton.disabled = false;
        if (currentSentenceObject) {
            checkButton.disabled = false;
            hintButton.disabled = false;
        } else {
            checkButton.disabled = true;
            hintButton.disabled = true;
        }
        userInput.focus();

    } catch (error) {
        console.error('Error in speakSentence:', error);
        feedbackText.textContent = `Error: ${error.message}`;
        feedback.className = 'feedback-area incorrect';
        if (typeof showToast === 'function') { showToast(error.message || 'Audio error', 'error'); }
        speakButton.disabled = false; // Re-enable speak button on error
        // Keep check/hint disabled if audio failed
        checkButton.disabled = true;
        hintButton.disabled = true;
    }
}

// Helper function to normalize text for comparison
function normalizeText(text) {
    if (!text) return "";

    let normalized = text.toLowerCase();
    normalized = normalized.replace(/’/g, "'"); // Uniformizar apóstrofos

    const contractions = {
        "i'm": "i am", "you're": "you are", "he's": "he is", "she's": "she is",
        "it's": "it is", "we're": "we are", "they're": "they are", "isn't": "is not",
        "aren't": "are not", "wasn't": "was not", "weren't": "were not", "hasn't": "has not",
        "haven't": "have not", "hadn't": "had not", "doesn't": "does not", "don't": "do not",
        "didn't": "did not", "won't": "will not", "wouldn't": "would not", "can't": "cannot",
        "couldn't": "could not", "shouldn't": "should not", "mightn't": "might not",
        "mustn't": "must not", "let's": "let us", "y'all": "you all", "gonna": "going to",
        "wanna": "want to", "gotta": "got to", "dunno": "do not know", "gimme": "give me",
        "lemme": "let me", "ain't": "is not", "innit": "is it not", "outta": "out of",
        "kinda": "kind of", "sorta": "sort of", "hafta": "have to", "'cause": "because",
        "cuz": "because", "y'know": "you know", "they've": "they have", "we've": "we have",
        "you've": "you have", "I've": "I have", "who's": "who is", "what's": "what is",
        "where's": "where is", "how's": "how is", "there's": "there is", "that'll": "that will",
        "who'll": "who will", "what'll": "what will", "where'll": "where will",
        "how'll": "how will", "y'all've": "you all have"
    };

    for (let [key, value] of Object.entries(contractions)) {
        let regex = new RegExp(`\\b${key}\\b`, "g");
        normalized = normalized.replace(regex, value);
    }

    normalized = normalized.replace(/[.,!?;:]/g, ''); // Remove punctuation for comparison
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
}

// Helper function to generate word-by-word diff HTML based on USER INPUT
function generateWordDiffHtml(correctSentence, userAnswer) {
    const normalizedCorrect = normalizeText(correctSentence); // Keep punctuation for display diff
    const normalizedUser = normalizeText(userAnswer);

    const correctWords = correctSentence.split(/\s+/); // Split original correct sentence
    const userWords = userAnswer.split(/\s+/); // Split original user answer

    let diffHtml = '';
    let correctIdx = 0;
    let userIdx = 0;

    // This is a simplified diff - more advanced libraries exist (e.g., diff_match_patch)
    // This version compares word by word based on normalized versions
    while (userIdx < userWords.length || correctIdx < correctWords.length) {
        const userWordOriginal = userWords[userIdx] || "";
        const correctWordOriginal = correctWords[correctIdx] || "";
        const userWordNormalized = normalizeText(userWordOriginal).replace(/[.,!?;:]/g, '');
        const correctWordNormalized = normalizeText(correctWordOriginal).replace(/[.,!?;:]/g, '');

        if (userWordNormalized === correctWordNormalized) {
            diffHtml += `<span class="diff-correct-word">${userWordOriginal}</span> `;
            userIdx++;
            correctIdx++;
        } else {
            // Simple incorrect marking for now
            diffHtml += `<span class="diff-incorrect-word">${userWordOriginal || '[missing]'}</span> `;
            userIdx++;
            // Don't advance correctIdx here in this simple diff
            // A better diff would handle insertions/deletions more gracefully
            if (correctIdx < correctWords.length) { // <-- FIXED: Check against original correctWords array length
                 // If user word doesn't match, maybe the *next* user word matches the current correct word?
                 // Or maybe the current user word matches the *next* correct word?
                 // For simplicity, we just mark the user word as wrong and move on.
                 correctIdx++; // Tentatively advance correct index too
            }
        }
    }

    return diffHtml.trim();
}


// Function to check the user's answer (Listen & Type mode only)
async function checkAnswer() {
    console.log("checkAnswer called. Button disabled state:", checkButton.disabled); // Log entry and button state
    if (!currentSentenceObject) {
        console.log("checkAnswer aborted: no currentSentenceObject");
        return;
    }
    if (checkButton.disabled) { // Double check if button is disabled before proceeding
        console.log("checkAnswer aborted: checkButton is disabled.");
        return;
    }

    const userAnswer = userInput.value.trim();
    const normalizedUserAnswer = normalizeText(userAnswer);
    const normalizedCorrectAnswer = normalizeText(currentSentence);

    console.log("--- Checking Answer ---");
    console.log("Normalized User Input (for comparison):", normalizedUserAnswer);
    console.log("Normalized Correct Sentence (for comparison):", normalizedCorrectAnswer);
    console.log("-----------------------");

    const isCorrect = (normalizedUserAnswer === normalizedCorrectAnswer);
    console.log("isCorrect:", isCorrect); // Log comparison result

    if (isCorrect) {
        console.log("Answer is correct."); // Log correct path
        feedbackText.innerHTML = `<span class="correct">Correct!</span><br>${currentSentence}`;
        feedback.className = 'feedback-area correct';
        sessionCompletedCountListen++;
        if (sessionCountListenElement) sessionCountListenElement.textContent = sessionCompletedCountListen;
        let levelUpOccurred = false;

        // if (currentUser) { // Removed conditional, always update progress
            currentStreak++;
            const previousLevel = currentLevel;
            try {
                // In local-only mode, simulate progress update
                const newTotalCount = (currentUser?.correctSentencesCount || 0) + 1; // Increment count
                currentUser = { ...currentUser, correctSentencesCount: newTotalCount };
                console.log('Progress incremented locally. New stats:', currentUser);
                updateProgressUI();

                const starsEarned = Math.floor(newTotalCount / 100);
                const previousStars = Math.floor((newTotalCount - 1) / 100);
                if (starsEarned > previousStars && starPopup) {
                    console.log(`Star milestone reached! Total stars: ${starsEarned}`);
                    starPopupCountElement.textContent = starsEarned;
                    starPopup.style.display = 'flex';
                }

                const newLevel = calculateLevel(newTotalCount);
                if (newLevel > previousLevel) {
                    levelUpOccurred = true;
                    console.log(`Level Up! ${previousLevel} -> ${newLevel}`);
                    levelUpNotificationElement.textContent = `Level Up to ${newLevel}! ${getRandomLevelUpMessage()}`;
                    levelUpNotificationElement.style.display = 'block';
                    nextLevelButton.style.display = 'inline-block';
                    currentLevel = newLevel;
                }
            } catch (error) {
                console.error('Error incrementing progress locally:', error);
            }
        // }

        checkButton.disabled = true;
        hintButton.disabled = true;
        userInput.disabled = true;
        speakButton.disabled = true;

        if (!levelUpOccurred) {
            nextSentenceButtonListenType.style.display = 'inline-block';
        }
    } else {
        console.log("Answer is incorrect."); // Log incorrect path
        const diffOutput = generateWordDiffHtml(currentSentence, userAnswer);
        console.log("Generated Diff:", diffOutput); // Log diff generation
        feedbackText.innerHTML = `Incorrect: ${diffOutput}`;
        feedback.className = 'feedback-area incorrect';
        currentStreak = 0;
        isFirstAttempt = false;
        userInput.focus();
    }
}

// Updated Hint function (Listen & Type mode only)
function giveHint() {
    console.log("giveHint function called."); // Log function entry
    if (!currentSentenceObject || userInput.disabled) {
        console.log("giveHint aborted: no currentSentenceObject or userInput disabled.");
        return;
    }

    const userAnswer = userInput.value.trim();
    if (!userAnswer) {
        feedbackText.textContent = 'Type something first to get a hint.';
        feedback.className = 'feedback-area';
        return;
    }

    const normalizedCorrectWords = normalizeText(currentSentence).split(' ');
    const normalizedUserWords = normalizeText(userAnswer).split(' ');
    const userWordsRaw = userAnswer.split(/\s+/);

    let hintGiven = false;
    let userWordIndex = 0;

    for (let i = 0; i < normalizedCorrectWords.length; i++) {
        const normalizedCorrectWord = normalizedCorrectWords[i];
        const normalizedUserWord = normalizedUserWords[i] || "";
        const displayUserWord = userWordsRaw[userWordIndex] || "[missing word]";

        if (normalizedUserWord !== normalizedCorrectWord) {
            const originalCorrectWordForHint = currentSentence.split(/\s+/)[i] || normalizedCorrectWord;
            feedbackText.innerHTML = `Hint: The word "<strong>${displayUserWord}</strong>" should be "<strong>${originalCorrectWordForHint}</strong>"`;
            feedback.className = 'feedback-area';
            hintGiven = true;
            isFirstAttempt = false;
            userInput.focus();
            break;
        }
        userWordIndex++;
    }

    if (!hintGiven) {
        if (normalizedUserWords.length > normalizedCorrectWords.length) {
             feedbackText.textContent = 'Hint: You seem to have typed extra words.';
        } else {
             feedbackText.textContent = 'Hint: Your input looks correct so far!';
        }
        feedback.className = 'feedback-area';
    }
}

// --- Leveling Logic (kept for UI consistency if needed later, not used in local-only mode) ---

const levelThresholds = [0, 2, 5, 10, 15];
const sentencesPerLevelAfterThreshold = 5;

function calculateLevel(count) {
    if (count < levelThresholds[1]) return 0;
    if (count < levelThresholds[2]) return 1;
    if (count < levelThresholds[3]) return 2;
    if (count < levelThresholds[4]) return 3;
    const baseLevel = 4;
    const baseCount = levelThresholds[baseLevel];
    const additionalLevels = Math.floor((count - baseCount) / sentencesPerLevelAfterThreshold);
    return baseLevel + additionalLevels;
}

function sentencesNeededForLevel(level) {
    if (level <= 0) return 0;
    if (level === 1) return levelThresholds[1];
    if (level === 2) return levelThresholds[2];
    if (level === 3) return levelThresholds[3];
    if (level === 4) return levelThresholds[4];
    const baseLevel = 4;
    const baseCount = levelThresholds[baseLevel];
    const additionalLevels = level - baseLevel;
    return baseCount + (additionalLevels * sentencesPerLevelAfterThreshold);
}

function sentencesNeededForNextLevel(level) {
    return sentencesNeededForLevel(level + 1);
}


const levelUpMessages = [
    "Great start! Keep practicing!",
    "Level Up! You're getting the hang of it!",
    "Awesome! Moving up!",
    "Fantastic progress! Level Up!",
    "You're on fire! Level Up!",
    "Incredible! Another level conquered!",
    "Wow! Keep this amazing momentum going!",
    "Sensational! You're mastering this!",
    "Unstoppable! Level Up!",
    "Legendary! Your listening skills are superb!"
];

function getRandomLevelUpMessage() {
    return levelUpMessages[Math.floor(Math.random() * levelUpMessages.length)];
}

// --- Authentication Functions (removed) ---
function updateUserStatusUI() { 
    if (progressSection) progressSection.style.display = ''; // Always show
    if (currentLevelElement) currentLevelElement.textContent = currentLevel.toString();
    if (progressBarElement) progressBarElement.style.width = '0%';
    if (progressCountElement) progressCountElement.textContent = '0';
    if (nextLevelCountElement) nextLevelCountElement.textContent = sentencesNeededForNextLevel(0).toString();
}

function updateProgressUI() {
    if (progressSection) progressSection.style.display = ''; // Always show
    if (currentUser) {
        const totalCorrect = currentUser.correctSentencesCount || 0;
        currentLevel = calculateLevel(totalCorrect);
        const sentencesForNextLevel = sentencesNeededForNextLevel(currentLevel);
        const sentencesInCurrentLevel = totalCorrect - sentencesNeededForLevel(currentLevel);

        if (currentLevelElement) currentLevelElement.textContent = currentLevel.toString();
        if (nextLevelCountElement) nextLevelCountElement.textContent = sentencesForNextLevel.toString();
        if (progressCountElement) progressCountElement.textContent = sentencesInCurrentLevel.toString();

        const progressPercentage = (sentencesInCurrentLevel / sentencesForNextLevel) * 100;
        if (progressBarElement) progressBarElement.style.width = `${progressPercentage}%`;
    } else {
        // If not logged in or no user, reset to default display
        if (currentLevelElement) currentLevelElement.textContent = '0';
        if (progressBarElement) progressBarElement.style.width = '0%';
        if (progressCountElement) progressCountElement.textContent = '0';
        if (nextLevelCountElement) nextLevelCountElement.textContent = sentencesNeededForNextLevel(0).toString();
    }
}

async function checkLoginStatus() { 
    // Simulate always logged in for local-only mode
    currentUser = { correctSentencesCount: 0, firstAttemptCorrectCount: 0, longestStreak: 0 };
    updateProgressUI();
}

// Logout is handled by auth_status.js

async function loadCategories() {
    const categories = getCategoriesFromLocal();
    console.log('Loaded categories (local):', categories);
    
    // Populate main category selector
    while (categorySelectElement.options.length > 1) categorySelectElement.remove(1);
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelectElement.appendChild(option);
    });

    // Populate the datalist for the prompt generator
    populateCategoryDatalist(categories);
}

function populateCategoryDatalist(categories) {
    const datalist = document.getElementById('category-list');
    if (!datalist) return;

    datalist.innerHTML = ''; // Clear existing options
    const categoryList = categories || getCategoriesFromLocal();

    categoryList.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        datalist.appendChild(option);
    });
}

// --- Flip Card Logic ---

function flipSpeakSentence() {
    if (!flipCurrentSentence) return;
    return speakText(flipCurrentSentence, { rate: 1, pitch: 1, volume: 1 });
}

async function fetchAndDisplayCardFlip() {
    const selectedCategory = categorySelectElement?.value;
    if (!flashcard || !flashcardTextElement || !nextCardButton) return;

    flashcard.classList.remove('is-flipped');
    isFlipped = false;
    flashcardTextElement.textContent = 'Loading...';
    nextCardButton.disabled = true;

    try {
        const items = loadLocalSentences();
        const filtered = (!selectedCategory || selectedCategory === 'All') ? items : items.filter(i => i.category === selectedCategory);
        if (!filtered.length) {
            const msg = (selectedCategory && selectedCategory !== 'All') ? `No sentences found for category: ${selectedCategory}` : 'No sentences found. Add some in the Sentences tab.';
            throw new Error(msg);
        }
        const chosen = filtered[Math.floor(Math.random() * filtered.length)];
        flipCurrentSentenceObject = { id: chosen.id || crypto.randomUUID(), text: chosen.text };
        flipCurrentSentence = flipCurrentSentenceObject.text;
        // Pick a random US voice for this card and keep it until next card
        // Removed selectedVoiceFlip - now using automatic alternation
        flashcardTextElement.textContent = flipCurrentSentence;
        await flipSpeakSentence();
        nextCardButton.disabled = false;
    } catch (error) {
        console.error('Failed to load sentence for flip:', error);
        flashcardTextElement.textContent = `Error: ${error.message}`;
        flipCurrentSentenceObject = null;
        flipCurrentSentence = '';
        nextCardButton.disabled = false;
    }
}

function flipTheCard() {
    if (!flashcard || !flipCurrentSentenceObject) return;
    isFlipped = !isFlipped;
    flashcard.classList.toggle('is-flipped', isFlipped);
    if (!isFlipped) {
        flipSpeakSentence();
    } else {
        sessionCompletedCountFlip++;
        if (sessionCountFlipElement) sessionCountFlipElement.textContent = sessionCompletedCountFlip;
    }
}

function initializeFlipView() {
    if (!flashcard || !nextCardButton) return;
    flashcard.addEventListener('click', flipTheCard);
    nextCardButton.addEventListener('click', fetchAndDisplayCardFlip);
}

// --- Sentences Manager Logic ---
const STORAGE_KEY = 'falante-sentences';
function loadSentences() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveSentences(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
function parseLines(text) {
    return text.split(/\n+/).map(l => l.trim()).filter(Boolean).map(line => {
        const parts = line.split('//');
        const sentence = (parts[0] || '').trim();
        const category = (parts[1] || '').trim() || 'Uncategorized';
        return { id: crypto.randomUUID(), text: sentence, category };
    }).filter(s => s.text.length > 0);
}
function renderList() {
    if (!listContainer) return;
    const items = loadSentences();
    if (!items.length) { listContainer.innerHTML = '<p style="color:#666">Nenhuma sentença cadastrada.</p>'; return; }
    const byCat = {};
    for (const s of items) { (byCat[s.category] ||= []).push(s); }
    let html = '';
    for (const cat of Object.keys(byCat).sort()) {
        html += `<div class="stat-card" style="margin-bottom:12px"><h2 style="margin-bottom:8px">${cat}</h2>`;
        for (const s of byCat[cat]) {
            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-top:1px solid #eee"><span>${s.text}</span><button data-id="${s.id}" class="button-danger" style="padding:6px 10px">Excluir</button></div>`;
        }
        html += `</div>`;
    }
    listContainer.innerHTML = html;
    listContainer.querySelectorAll('button[data-id]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const arr = loadSentences().filter(i => i.id !== id);
            saveSentences(arr);
            renderList();
            if (typeof showToast === 'function') showToast('Sentença removida', 'success');
            loadCategories();
        });
    });
}

function initializeSentencesManager() {
    if (!saveBtn || !clearBtn || !exportBtn || !importBtn || !importFile) return;

    // AI Sentence Prompt Generator Logic
    generateSentencePromptBtn?.addEventListener('click', () => {
        const count = parseInt(sentencePromptCount.value, 10) || 20;
        const theme = sentencePromptTheme.value.trim();
        const category = sentencePromptCategory.value.trim();

        if (!theme || !category) {
            if(typeof showToast === 'function') showToast('Please enter a theme and a category.', 'error');
            return;
        }

        const finalPrompt = `Generate ${count} English sentences for language learning about the theme '${theme}'. All sentences must belong to the '${category}' category.\n\nFormat each sentence on a new line, followed by ' // ' and the category name, exactly like this example:\n\nI would like to book a flight to New York. // ${category}\nWhat time does the train leave? // ${category}\nWhere is the nearest subway station? // ${category}\n\nIn the end, deliver only the ready-to-copy-and-paste script, without extra explanations outside the standard format.`;

        generatedSentencePromptArea.value = finalPrompt;
        generatedSentencePromptContainer.style.display = 'block';
    });

    copySentencePromptBtn?.addEventListener('click', () => {
        if (generatedSentencePromptArea.value) {
            navigator.clipboard.writeText(generatedSentencePromptArea.value)
                .then(() => {
                    if(typeof showToast === 'function') showToast('Prompt copied to clipboard!', 'success');
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                    if(typeof showToast === 'function') showToast('Failed to copy prompt.', 'error');
                });
        }
    });

    saveBtn.addEventListener('click', () => {

        const bulk = (bulkInput?.value) || '';
        const items = parseLines(bulk);
        if (!items.length) { if (typeof showToast === 'function') showToast('Nothing to save', 'info'); return; }
        const existing = loadSentences();
        saveSentences(existing.concat(items));
        if (bulkInput) bulkInput.value = '';
        renderList();
        if (typeof showToast === 'function') showToast('Sentences saved', 'success');
        loadCategories(); // This will also update the datalist
    });
    clearBtn.addEventListener('click', () => {
        if (!confirm('Are you sure you want to remove all sentences?')) return;
        saveSentences([]);
        renderList();
        if (typeof showToast === 'function') showToast('All sentences cleared', 'success');
        loadCategories(); // This will also update the datalist
    });
    exportBtn.addEventListener('click', () => {
        const data = JSON.stringify(loadSentences(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'falante-sentences.json'; a.click();
        URL.revokeObjectURL(url);
    });
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const arr = JSON.parse(String(reader.result || '[]'));
                if (!Array.isArray(arr)) throw new Error('Invalid format');
                saveSentences(arr);
                renderList();
                if (typeof showToast === 'function') showToast('Sentences imported', 'success');
                loadCategories(); // This will also update the datalist
            } catch (err) {
                if (typeof showToast === 'function') showToast('Failed to import', 'error');
            }
        };
        reader.readAsText(file);
    });
}

// --- English Test Logic (New) ---

/**
 * Parses the raw test script input into a structured array of question objects.
 * @param {string} script The raw text script from the teacher.
 * @returns {Array<Object>} An array of question objects.
 */
function parseTestScript(script) {
    const questions = [];
    const lines = script.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        let question = null;

        if (line.startsWith('{M}')) {
            // Fill-in-the-blank (now converted to Multiple Choice)
            const sentence = line.substring(3).trim();
            i++;
            if (i < lines.length) {
                const optionsLine = lines[i];
                if (optionsLine.startsWith('{') && optionsLine.endsWith('}')) {
                    const options = optionsLine.substring(1, optionsLine.length - 1).split(';').map(opt => opt.trim());
                    const correctAnswer = options[0]; // Store the correct answer before shuffling
                    shuffleArray(options); // Shuffle options
                    // Check for explanation line
                    i++; // Move to the next line to check for explanation
                    let explanation = '';
                    if (i < lines.length && lines[i].startsWith('{Explanation}')) {
                        explanation = lines[i].substring('{Explanation}'.length).trim();
                    } else {
                        // If no explanation, go back one line to process the next question correctly
                        i--;
                    }
                    question = { type: 'O', prompt: sentence.replace('{M}', '______'), options: options, correctAnswer: correctAnswer, explanation: explanation };
                } else {
                    console.warn('Missing options for {M} question:', sentence);
                }
            }
        } else if (line.startsWith('{O}')) {
            // Multiple Choice - remains the same, but options will be shuffled
            const prompt = line.substring(3).trim();
            i++;
            if (i < lines.length) {
                const optionsLine = lines[i];
                if (optionsLine.startsWith('{') && optionsLine.endsWith('}')) {
                    const options = optionsLine.substring(1, optionsLine.length - 1).split(';').map(opt => opt.trim());
                    const correctAnswer = options[0]; // Store the correct answer before shuffling
                    shuffleArray(options); // Shuffle options
                    // Check for explanation line
                    i++; // Move to the next line to check for explanation
                    let explanation = '';
                    if (i < lines.length && lines[i].startsWith('{Explanation}')) {
                        explanation = lines[i].substring('{Explanation}'.length).trim();
                    } else {
                        i--;
                    }
                    question = { type: 'O', prompt: prompt, options: options, correctAnswer: correctAnswer, explanation: explanation };
                } else {
                    console.warn('Missing options for {O} question:', prompt);
                }
            }
        } else if (line.startsWith('{T}')) {
            // Translation (now converted to Multiple Choice)
            const phrase = line.substring(3).trim();
            i++;
            if (i < lines.length) {
                const optionsLine = lines[i];
                if (optionsLine.startsWith('{') && optionsLine.endsWith('}')) {
                    const options = optionsLine.substring(1, optionsLine.length - 1).split(';').map(opt => opt.trim());
                    const correctAnswer = options[0]; // Store the correct answer before shuffling
                    shuffleArray(options); // Shuffle options
                    // Check for explanation line
                    i++; // Move to the next line to check for explanation
                    let explanation = '';
                    if (i < lines.length && lines[i].startsWith('{Explanation}')) {
                        explanation = lines[i].substring('{Explanation}'.length).trim();
                    } else {
                        i--;
                    }
                    question = { type: 'O', prompt: `Translate into English: "${phrase}"`, options: options, correctAnswer: correctAnswer, explanation: explanation };
                } else {
                    console.warn('Missing options for {T} question:', phrase);
                }
            }
        } else if (line.startsWith('{C}')) {
            // Complete the Sentence (now converted to Multiple Choice)
            const prompt = line.substring(3).trim();
            i++;
            if (i < lines.length) {
                const optionsLine = lines[i];
                if (optionsLine.startsWith('{') && optionsLine.endsWith('}')) {
                    const options = optionsLine.substring(1, optionsLine.length - 1).split(';').map(opt => opt.trim());
                    const correctAnswer = options[0]; // Store the correct answer before shuffling
                    shuffleArray(options); // Shuffle options
                    // Check for explanation line
                    i++; // Move to the next line to check for explanation
                    let explanation = '';
                    if (i < lines.length && lines[i].startsWith('{Explanation}')) {
                        explanation = lines[i].substring('{Explanation}'.length).trim();
                    } else {
                        i--;
                    }
                    question = { type: 'O', prompt: `Complete the sentence: ${prompt}`, options: options, correctAnswer: correctAnswer, explanation: explanation };
                } else {
                    console.warn('Missing options for {C} question:', prompt);
                }
            }
        } else if (line.startsWith('{W}')) {
            // Free Writing (now converted to Multiple Choice)
            const prompt = line.substring(3).trim();
            i++;
            if (i < lines.length) {
                const optionsLine = lines[i];
                if (optionsLine.startsWith('{') && optionsLine.endsWith('}')) {
                    const options = optionsLine.substring(1, optionsLine.length - 1).split(';').map(opt => opt.trim());
                    const correctAnswer = options[0]; // Store the correct answer before shuffling
                    shuffleArray(options); // Shuffle options
                    // Check for explanation line
                    i++; // Move to the next line to check for explanation
                    let explanation = '';
                    if (i < lines.length && lines[i].startsWith('{Explanation}')) {
                        explanation = lines[i].substring('{Explanation}'.length).trim();
                    } else {
                        i--;
                    }
                    question = { type: 'O', prompt: `Write a sentence using: "${prompt}"`, options: options, correctAnswer: correctAnswer, explanation: explanation };
                } else {
                    console.warn('Missing options for {W} question:', prompt);
                }
            }
        } else if (line.startsWith('{A}')) {
            // NEW: Audio question (Listen and Type)
            const audioPhrase = line.substring(3).trim();
            i++;
            if (i < lines.length) {
                const answerLine = lines[i];
                if (answerLine.startsWith('{') && answerLine.endsWith('}')) {
                    const correctAnswer = answerLine.substring(1, answerLine.length - 1).trim();
                    // Check for explanation line
                    i++; // Move to the next line to check for explanation
                    let explanation = '';
                    if (i < lines.length && lines[i].startsWith('{Explanation}')) {
                        explanation = lines[i].substring('{Explanation}'.length).trim();
                    } else {
                        i--;
                    }
                    question = { type: 'A', audioPhrase: audioPhrase, correctAnswer: correctAnswer, explanation: explanation };
                } else {
                    console.warn('Missing correct answer for {A} audio question:', audioPhrase);
                }
            }
        } else {
            console.warn('Unrecognized line format or question type:', line);
        }

        if (question) {
            questions.push(question);
        }
        i++;
    }
    return questions;
}

/**
 * Shuffles an array in place (Fisher-Yates algorithm).
 * @param {Array} array The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

/**
 * Renders the parsed test questions into the testOutput div.
 * @param {Array<Object>} questions An array of question objects.
 */
function renderTest(questions) {
    if (!testOutput) return;
    testOutput.innerHTML = ''; // Clear previous test

    if (questions.length === 0) {
        testOutput.innerHTML = '<p style="color:#666">No questions generated. Check your script format.</p>';
        if (finishTestBtn) finishTestBtn.style.display = 'none';
        if (testResults) testResults.innerHTML = '';
        return;
    }

    questions.forEach((q, index) => {
        const questionId = `q-${index}`;
        // Removed (q.type) from the question title
        let questionHtml = `<div class="test-question" data-question-type="${q.type}" data-question-index="${index}"><h3>Question ${index + 1}</h3>`;

        switch (q.type) {
            case 'O': // All text-based questions now map to Multiple Choice
                questionHtml += `<p>${q.prompt}</p>`;
                questionHtml += `<div class="options-container">`;
                q.options.forEach(option => {
                    // Use the stored correctAnswer for comparison
                    const isCorrect = (normalizeText(option) === normalizeText(q.correctAnswer));
                    questionHtml += `<button class="option-button" data-value="${option}" data-question-index="${index}" data-correct="${isCorrect}">${option}</button>`;
                });
                questionHtml += `</div>`;
                break;
            case 'A': // New: Audio question (Listen and Type)
                questionHtml += `<p>Listen and type the sentence:</p>`;
                questionHtml += `<button class="button-primary speak-test-audio" data-audio-phrase="${q.audioPhrase}"><i class="fa-solid fa-volume-high"></i> Speak Sentence</button>`;
                questionHtml += `<textarea rows="2" class="test-input audio-input test-answer-input" data-question-index="${index}" data-correct-answer="${q.correctAnswer}" placeholder="Type what you hear..."></textarea>`;
                break;
        }
        questionHtml += `<div class="question-feedback" id="feedback-${questionId}" style="margin-top:10px; font-weight:bold;"></div></div>`;
        testOutput.innerHTML += questionHtml;
    });

    if (finishTestBtn) finishTestBtn.style.display = 'inline-block';
    if (testResults) testResults.innerHTML = '';

    // Add event listeners for interactive elements
    testOutput.querySelectorAll('.option-button').forEach(button => {
        button.addEventListener('click', function() {
            const parentOptions = this.closest('.options-container');
            parentOptions.querySelectorAll('.option-button').forEach(btn => btn.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    // Add event listeners for new audio buttons
    testOutput.querySelectorAll('.speak-test-audio').forEach(button => {
        button.addEventListener('click', function() {
            const audioPhrase = this.dataset.audioPhrase;
            if (audioPhrase) {
                speakText(audioPhrase);
            }
        });
    });
}

/**
 * Checks all answers in the generated test and displays results.
 */
function checkTestAnswers() {
    if (!window.parsedTestQuestions || window.parsedTestQuestions.length === 0) {
        if (testResults) testResults.innerHTML = '<p>No test to check.</p>';
        return;
    }

    let correctCount = 0;
    const totalQuestions = window.parsedTestQuestions.length;

    window.parsedTestQuestions.forEach((qData, index) => {
        const questionDiv = document.querySelector(`.test-question[data-question-index="${index}"]`);
        if (!questionDiv) return;

        const feedbackDiv = questionDiv.querySelector(`.question-feedback`);
        let isCorrect = false;
        let userAnswer = '';
        let correctAnswer = '';
        let displayCorrectAnswer = '';

        switch (qData.type) {
            case 'O': // All text-based questions are now Multiple Choice
                const selectedButton = questionDiv.querySelector('.option-button.selected');
                userAnswer = selectedButton ? selectedButton.dataset.value.trim() : '';
                correctAnswer = qData.correctAnswer; // Use the stored correct answer
                displayCorrectAnswer = correctAnswer;
                isCorrect = (normalizeText(userAnswer) === normalizeText(correctAnswer));

                // Visual feedback for multiple choice
                questionDiv.querySelectorAll('.option-button').forEach(btn => {
                    btn.classList.remove('selected'); // Deselect all
                    if (normalizeText(btn.dataset.value) === normalizeText(correctAnswer)) {
                        btn.classList.add('correct-answer-visual');
                    } else {
                        btn.classList.add('incorrect-answer-visual');
                    }
                    btn.disabled = true; // Disable buttons after checking
                });
                if (selectedButton && !isCorrect) {
                    selectedButton.classList.add('user-incorrect-selection');
                }
                break;
            case 'A': // New: Audio question (Listen and Type)
                const audioInput = questionDiv.querySelector('.audio-input');
                userAnswer = audioInput ? audioInput.value.trim() : '';
                correctAnswer = qData.correctAnswer;
                displayCorrectAnswer = correctAnswer;
                isCorrect = (normalizeText(userAnswer) === normalizeText(correctAnswer));

                // Visual feedback for text input
                if (audioInput) {
                    if (isCorrect) {
                        audioInput.classList.add('correct-answer-visual');
                    } else {
                        audioInput.classList.add('incorrect-answer-visual');
                        audioInput.value = `${userAnswer} (Correct: ${correctAnswer})`;
                    }
                    audioInput.disabled = true; // Disable input after checking
                }
                break;
        }

        // Disable speak button for audio questions after checking
        if (qData.type === 'A') {
            const speakButton = questionDiv.querySelector('.speak-test-audio');
            if (speakButton) speakButton.disabled = true;
        }

        // Display feedback for each question
        if (feedbackDiv) {
            if (isCorrect) {
                feedbackDiv.innerHTML = '<span class="correct">Correct!</span>';
                feedbackDiv.classList.add('correct');
                feedbackDiv.classList.remove('incorrect');
                correctCount++;
            } else {
                const displayUser = (userAnswer && userAnswer !== '') ? `Your answer: "${userAnswer}"` : 'You didn\'t answer.';
                const displayCorrect = (displayCorrectAnswer && displayCorrectAnswer !== '') ? `Correct answer: "${displayCorrectAnswer}"` : '';

                let feedbackTextContent = `<span class="incorrect">Incorrect.</span>`;
                if (displayCorrectAnswer) {
                    feedbackTextContent += `<br>${displayCorrect}`; // Show correct answer if available
                }
                if (userAnswer && qData.type === 'A') { // Only show diff for A type, O types have visual feedback on buttons
                     const diffHtml = generateWordDiffHtml(displayCorrectAnswer || '', userAnswer);
                     feedbackTextContent += `<br>Your input: ${diffHtml}`;
                }

                feedbackDiv.innerHTML = feedbackTextContent;
                feedbackDiv.classList.add('incorrect');
                feedbackDiv.classList.remove('correct');
            }
            // Add explanation if available
            if (qData.explanation) {
                feedbackDiv.innerHTML += `<br><span class="explanation-text">Explanation: ${qData.explanation}</span>`;
            }
        }
    });

    // Display overall results
    if (testResults) {
        testResults.innerHTML = `<h2>Test Results:</h2><p>You got ${correctCount} out of ${totalQuestions} questions correct!</p>`;
        if (correctCount === totalQuestions) {
            testResults.innerHTML += '<p class="correct">Excellent! All answers are correct!</p>';
        } else {
            testResults.innerHTML += '<p class="incorrect">Review the incorrect answers above.</p>';
        }
    }
    if (finishTestBtn) finishTestBtn.style.display = 'none'; // Hide button after finishing
}

// --- View Navigation ---
function setActiveView(view) {
    window.speechSynthesis.cancel(); // Stop any ongoing speech when changing views
    activeView = view; // 'listen' | 'flip' | 'sentences' | 'test'
    if (viewListen) viewListen.style.display = (view === 'listen') ? '' : 'none';
    if (viewFlip) viewFlip.style.display = (view === 'flip') ? '' : 'none';
    if (viewSentences) viewSentences.style.display = (view === 'sentences') ? '' : 'none';
    if (viewTest) viewTest.style.display = (view === 'test') ? '' : 'none'; // New Test View
    // Active nav styling
    navListen?.classList.toggle('active', view === 'listen');
    navFlip?.classList.toggle('active', view === 'flip');
    navSentences?.classList.toggle('active', view === 'sentences');
    navTest?.classList.toggle('active', view === 'test'); // New Test Nav Link

    // Handle category and voice selector visibility based on active view
    const showGlobalSelectors = (view === 'listen' || view === 'flip');
    if (categorySelectElement) {
        categorySelectElement.style.display = showGlobalSelectors ? '' : 'none';
        categorySelectElement.closest('.category-selector').style.display = showGlobalSelectors ? '' : 'none';
    }
    if (voiceSelectElement) {
        voiceSelectElement.style.display = showGlobalSelectors ? '' : 'none';
        voiceSelectElement.closest('.category-selector').style.display = showGlobalSelectors ? '' : 'none';
    }

    // Lazy actions per view
    if (view === 'listen') {
        fetchAndSetSentence();
    } else if (view === 'flip') {
        fetchAndDisplayCardFlip();
    } else if (view === 'sentences') {
        renderList();
    } else if (view === 'test') { // New Test View initialization
        // No specific init for test view yet, but could add parsing/rendering here if needed on view switch
    }
}

function initializeNav() {
    navListen?.addEventListener('click', (e) => { e.preventDefault(); setActiveView('listen'); });
    navFlip?.addEventListener('click', (e) => { e.preventDefault(); setActiveView('flip'); });
    navSentences?.addEventListener('click', (e) => { e.preventDefault(); setActiveView('sentences'); });
    navTest?.addEventListener('click', (e) => { e.preventDefault(); setActiveView('test'); }); // New Test Nav Listener
}

// --- Initialization ---

async function initializeApp() {
    // No voice loading needed here anymore, as it's handled by initializeTts

    await checkLoginStatus();
    await loadCategories();
    initializeTts();

    try {
        initializeNav();
        initializeFlipView();
        initializeSentencesManager();

        // New Test Loader from Text Area
        loadTestFromTextBtn?.addEventListener('click', () => {
            const scriptContent = testScriptInputArea.value.trim();
            if (!scriptContent) {
                if (typeof showToast === 'function') showToast('Please paste a script into the text area first.', 'error');
                return;
            }

            try {
                window.parsedTestQuestions = parseTestScript(scriptContent); // Store globally for correction
                renderTest(window.parsedTestQuestions);
                if (typeof showToast === 'function') showToast('Test loaded successfully!', 'success');
                testScriptInputArea.value = ''; // Clear the input area
            } catch (error) {
                console.error('Error parsing test script:', error);
                if (typeof showToast === 'function') showToast('Error processing test script. Check console for details.', 'error');
            }
        });

        importTestBtn?.addEventListener('click', () => {
            importTestFile?.click();
        });

        importTestFile?.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const scriptContent = e.target?.result;
                if (typeof scriptContent === 'string') {
                    testScriptInputArea.value = scriptContent;
                    if (typeof showToast === 'function') showToast('File loaded into text area. Click Load Test to proceed.', 'info');
                } else {
                    if (typeof showToast === 'function') showToast('Failed to read file content.', 'error');
                }
            };
            reader.onerror = () => {
                if (typeof showToast === 'function') showToast('Error reading file.', 'error');
            };
            reader.readAsText(file);
        });

        // New Finish Test Button Event Listener
        finishTestBtn?.addEventListener('click', checkTestAnswers);

        // AI Prompt Generator Logic
        generatePromptBtn?.addEventListener('click', () => {
            const count = promptQuestionCount.value || 10;
            const topic = promptGrammarTopic.value.trim();

            if (!topic) {
                if(typeof showToast === 'function') showToast('Please enter a grammar topic.', 'error');
                return;
            }

            // Get the rules text, but clean it up by removing the first line of example.
            const rulesText = scriptExplanationContent.innerText.split(/\r?\n/).slice(1).join('\n').trim();

            const finalPrompt = `Generate ${count} English language learning questions about ${topic} using the following script.\n\n${rulesText}\n\nIn the end, deliver only the ready-to-copy-and-paste script, without extra explanations outside the standard format.`;

            generatedPromptArea.value = finalPrompt;
            generatedPromptContainer.style.display = 'block';
        });

        copyPromptBtn?.addEventListener('click', () => {
            if (generatedPromptArea.value) {
                navigator.clipboard.writeText(generatedPromptArea.value)
                    .then(() => {
                        if(typeof showToast === 'function') showToast('Prompt copied to clipboard!', 'success');
                    })
                    .catch(err => {
                        console.error('Failed to copy text: ', err);
                        if(typeof showToast === 'function') showToast('Failed to copy prompt.', 'error');
                    });
            }
        });

        // Default view
        setActiveView('listen');

        // --- Add Event Listeners ---

        // Listen & Type Controls
        speakButton?.addEventListener('click', () => { if (activeView === 'listen') speakSentence(); });
        checkButton?.addEventListener('click', () => { if (activeView === 'listen') checkAnswer(); });
        hintButton?.addEventListener('click', () => { if (activeView === 'listen') { console.log("Hint button clicked. Disabled state:", hintButton.disabled); giveHint(); }});
        nextSentenceButtonListenType?.addEventListener('click', () => {
             nextSentenceButtonListenType.style.display = 'none';
             fetchAndSetSentence();
        });
        nextLevelButton?.addEventListener('click', () => {
            levelUpNotificationElement.style.display = 'none';
            nextLevelButton.style.display = 'none';
            fetchAndSetSentence();
        });

        // Common Controls
        categorySelectElement?.addEventListener('change', () => {
            if (activeView === 'listen') fetchAndSetSentence();
            else if (activeView === 'flip') fetchAndDisplayCardFlip();
        });

        voiceSelectElement?.addEventListener('change', () => {
            const selectedVoice = voiceSelectElement.value;
            localStorage.setItem('falante-voice', selectedVoice);
            if (typeof showToast === 'function') showToast(`Voice changed to ${selectedVoice.split('(')[0].trim()}`, 'info');
        });

        // Text Area Listener (Listen & Type only)
        userInput?.addEventListener('keypress', function(event) {
            if (activeView !== 'listen') return;
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (!checkButton.disabled) {
                    console.log("Enter keypress in textarea triggering checkAnswer.");
                    checkButton.click();
                } else {
                    console.log("Enter keypress ignored, checkButton disabled.");
                }
            }
        });

        // Global Keydown Listener for Shortcuts per active view
        document.addEventListener('keydown', function(event) {
            const activeEl = document.activeElement;
            const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

            if (activeView === 'listen') {
                if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
                    if (!speakButton.disabled) { event.preventDefault(); speakButton.click(); }
                } else if (event.key === 'Tab') {
                    event.preventDefault();
                    console.log("Tab key pressed. Hint button disabled state:", hintButton.disabled);
                    if (!hintButton.disabled) hintButton.click();
                } else if (event.key === 'Enter' && !isInputFocused) {
                    if (nextLevelButton.style.display !== 'none' && !nextLevelButton.disabled) {
                        event.preventDefault(); nextLevelButton.click();
                    } else if (nextSentenceButtonListenType.style.display !== 'none' && !nextSentenceButtonListenType.disabled) {
                        event.preventDefault(); nextSentenceButtonListenType.click();
                    }
                }
            } else if (activeView === 'flip') {
                if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
                    event.preventDefault();
                    flipTheCard();
                } else if (event.key === 'Enter' && !isInputFocused && nextCardButton && !nextCardButton.disabled) {
                    event.preventDefault();
                    nextCardButton.click();
                }
            }
        });

    } catch (error) {
        console.error('Error during app initialization (likely initial fetch):', error);
    }
}

// Start the application
initializeApp();

// --- Popup Logic ---
if (!localStorage.getItem('noticeShown')) {
    if (noticePopup) noticePopup.style.display = 'flex';
}
if (closeNoticePopup && noticePopup) {
    closeNoticePopup.addEventListener('click', () => {
        noticePopup.style.display = 'none';
        localStorage.setItem('noticeShown', 'true');
    });
    noticePopup.addEventListener('click', (event) => {
        if (event.target === noticePopup) {
            noticePopup.style.display = 'none';
            localStorage.setItem('noticeShown', 'true');
        }
    });
}

if (closeStarPopup && starPopup) {
     closeStarPopup.addEventListener('click', () => {
        starPopup.style.display = 'none';
    });
    starPopup.addEventListener('click', (event) => {
        if (event.target === starPopup) {
            starPopup.style.display = 'none';
        }
    });
}
