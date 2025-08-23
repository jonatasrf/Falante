// --- TTS Voice Selection ---
export let voices = []; // To be populated with available voices

export function initializeTts(voiceSelectElement) {
    if (!window.speechSynthesis) {
        console.warn("Speech Synthesis not supported.");
        voiceSelectElement.disabled = true;
        return;
    }
    console.log("TTS supported. Initializing voice list.");
    console.log("voiceSelectElement:", voiceSelectElement);
    // Initial population, with a slight delay to ensure voices are loaded
    setTimeout(() => {
        populateVoiceList(voiceSelectElement);
    }, 100);
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
            console.log("Voices changed event fired.");
            populateVoiceList(voiceSelectElement);
        };
    }
}

export function populateVoiceList(voiceSelectElement) {
    if (!window.speechSynthesis) return;
    voices = window.speechSynthesis.getVoices();
    console.log("Total voices found:", voices.length);
    voiceSelectElement.innerHTML = ''; // Clear existing options
    
    const savedVoiceName = localStorage.getItem('falante-voice');
    let bestFitVoice = null;

    if (!savedVoiceName) {
        const usVoices = voices.filter(v => v.lang === 'en-US');
        const femaleKeywords = ['female', 'aria', 'zira', 'sarah', 'lisa'];
        bestFitVoice = usVoices.find(v => v.name.toLowerCase().includes('natural') && femaleKeywords.some(k => v.name.toLowerCase().includes(k))) || null;
        if (!bestFitVoice) bestFitVoice = usVoices.find(v => v.name.toLowerCase().includes('natural')) || null;
        if (!bestFitVoice) bestFitVoice = usVoices.find(v => femaleKeywords.some(k => v.name.toLowerCase().includes(k))) || null;
        if (!bestFitVoice) bestFitVoice = usVoices[0] || null;
    }

    const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
    console.log("English voices found:", englishVoices.length);

    englishVoices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.setAttribute('data-lang', voice.lang);
            option.value = option.textContent;
            voiceSelectElement.appendChild(option);
            if (savedVoiceName && option.value === savedVoiceName) {
                option.selected = true;
            } else if (!savedVoiceName && bestFitVoice && voice.name === bestFitVoice.name) {
                option.selected = true;
            }
        });
    console.log("voiceSelectElement options length after population:", voiceSelectElement.options.length);
}



export function speakText(text, voiceSelectElement, opts = {}) {
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
            utter.onerror = (e) => {
                if (e.error === 'interrupted') {
                    resolve();
                } else {
                    reject(e.error || e);
                }
            };
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utter);
        } catch (e) { reject(e); }
    });
}

// --- Local storage helpers ---
const LOCAL_STORAGE_KEY = 'falante-sentences';
export function loadLocalSentences() {
    try { const raw = localStorage.getItem(LOCAL_STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export function saveLocalSentences(items) { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items)); }

export function getCategoriesFromLocal() {
    const items = loadLocalSentences();
    const set = new Set(items.map(i => i.category || 'Uncategorized'));
    return Array.from(set).sort();
}

export function pickRandomSentenceFromLocal(category) {
    const items = loadLocalSentences();
    const filtered = (!category || category === 'All') ? items : items.filter(i => i.category === category);
    if (!filtered.length) return null;
    return filtered[Math.floor(Math.random() * filtered.length)];
}

// --- Text Manipulation ---
export function normalizeText(text) {
    if (!text) return "";
    let normalized = text.toLowerCase().replace(/’/g, "'");
    const contractions = {
        "i'm": "i am", "you're": "you are", "he's": "he is", "she's": "she is", "it's": "it is", "we're": "we are", "they're": "they are", "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not", "hasn't": "has not", "haven't": "have not", "hadn't": "had not", "doesn't": "do not", "don't": "do not", "didn't": "did not", "won't": "will not", "wouldn't": "would not", "can't": "cannot", "couldn't": "could not", "shouldn't": "should not", "mightn't": "might not", "mustn't": "must not", "let's": "let us", "y'all": "you all", "gonna": "going to", "wanna": "want to", "gotta": "got to", "dunno": "do not know", "gimme": "give me", "lemme": "let me", "ain't": "is not", "innit": "is it not", "outta": "out of", "kinda": "kind of", "sorta": "sort of", "hafta": "have to", "'cause": "because", "cuz": "because", "y'know": "you know", "they've": "they have", "we've": "we have", "you've": "you have", "I've": "I have", "who's": "who is", "what's": "what is", "where's": "where is", "how's": "how is", "there's": "there is", "that'll": "that will", "who'll": "who will", "what'll": "what will", "where'll": "where will", "how'll": "how will", "y'all've": "you all have"
    };
    for (let [key, value] of Object.entries(contractions)) {
        normalized = normalized.replace(new RegExp(`\b${key}\b`, "g"), value);
    }
    return normalized.replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim();
}

export function generateWordDiffHtml(correctSentence, userAnswer) {
    const correctWords = correctSentence.split(/\s+/).filter(Boolean);
    const userWords = userAnswer.split(/\s+/).filter(Boolean);
    let diffHtml = '';

    for (let i = 0; i < Math.max(correctWords.length, userWords.length); i++) {
        const correctWord = correctWords[i];
        const userWord = userWords[i];

        const correctWordNormalized = normalizeText(correctWord || "");
        const userWordNormalized = normalizeText(userWord || "");

        if (correctWordNormalized === userWordNormalized) {
            // Word is correct
            diffHtml += `<span class="diff-correct-word">${userWord || correctWord}</span> `;
        } else {
            // Word is incorrect, missing, or extra
            if (userWord === undefined) {
                // Missing word from user's input
                diffHtml += `<span class="diff-missing-word">[...]</span> `;
            } else if (correctWord === undefined) {
                // Extra word from user's input
                diffHtml += `<span class="diff-extra-word">${userWord}</span> `;
            } else {
                // Incorrect word (mismatch)
                diffHtml += `<span class="diff-incorrect-word">${userWord}</span> `;
            }
        }
    }
    return diffHtml.trim();
}

// --- Leveling Logic ---
const levelThresholds = [0, 2, 5, 10, 15];
const sentencesPerLevelAfterThreshold = 5;

export function calculateLevel(count) {
    if (count < levelThresholds[1]) return 0;
    if (count < levelThresholds[2]) return 1;
    if (count < levelThresholds[3]) return 2;
    if (count < levelThresholds[4]) return 3;
    const baseLevel = 4;
    const baseCount = levelThresholds[baseLevel];
    const additionalLevels = Math.floor((count - baseCount) / sentencesPerLevelAfterThreshold);
    return baseLevel + additionalLevels;
}

export function sentencesNeededForLevel(level) {
    if (level <= 0) return 0;
    if (level <= 4) return levelThresholds[level];
    const baseLevel = 4;
    const baseCount = levelThresholds[baseLevel];
    const additionalLevels = level - baseLevel;
    return baseCount + (additionalLevels * sentencesPerLevelAfterThreshold);
}

export function sentencesNeededForNextLevel(level) {
    return sentencesNeededForLevel(level + 1);
}

const levelUpMessages = [
    "Great start! Keep practicing!", "Level Up! You're getting the hang of it!", "Awesome! Moving up!", "Fantastic progress! Level Up!", "You're on fire! Level Up!", "Incredible! Another level conquered!", "Wow! Keep this amazing momentum going!", "Sensational! You're mastering this!", "Unstoppable! Level Up!", "Legendary! Your listening skills are superb!"
];

export function getRandomLevelUpMessage() {
    return levelUpMessages[Math.floor(Math.random() * levelUpMessages.length)];
}

// --- Simple Toast Helper ---
export function showToast(message, type = 'info', timeout = 2200) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 200);
    }, timeout);
}

// --- Array Shuffle ---
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
