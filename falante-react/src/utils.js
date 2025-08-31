// --- Local storage helpers ---
const LOCAL_STORAGE_KEY = 'falante-sentences';

export function loadLocalSentences() {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        const sentences = raw ? JSON.parse(raw) : [];
        return sentences;
    } catch {
        console.error("Error loading sentences from local storage.");
        return [];
    }
}

export function saveLocalSentences(items) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
}

export function getCategoriesFromLocal() {
    const items = loadLocalSentences();
    const set = new Set(items.map(i => i.category || 'Uncategorized'));
    return Array.from(set).sort();
}

export function pickRandomSentenceFromLocal(category) {
    const items = loadLocalSentences();
    let filtered = (!category || category === 'All') ? items : items.filter(i => i.category === category);

    if (!filtered.length) return null;

    const now = new Date();

    // Prioritize due cards
    let dueCards = filtered.filter(s => !s.nextReview || new Date(s.nextReview) <= now);
    if (dueCards.length > 0) {
        return shuffleArray(dueCards)[0];
    }

    // Then prioritize new cards (never reviewed)
    let newCards = filtered.filter(s => s.reviews === 0);
    if (newCards.length > 0) {
        return shuffleArray(newCards)[0];
    }

    // If no due or new cards, pick any random card from the filtered set
    return shuffleArray(filtered)[0];
}

export function parseInput(text) {
    const trimmedText = text.trim();
    // Try parsing as JSON first
    if (trimmedText.startsWith('[')) {
        try {
            const items = JSON.parse(trimmedText);
            if (Array.isArray(items)) {
                // Basic validation to ensure items have at least a 'text' property
                return items.filter(item => item && typeof item.text === 'string' && item.text.length > 0)
                    .map(item => ({
                        id: crypto.randomUUID(),
                        text: item.text,
                        category: item.category || 'Uncategorized',
                        translation_pt: item.translation_pt || '',
                        level: item.level || 'beginner',
                        keywords: item.keywords || [],
                        // SRS fields
                        nextReview: new Date().toISOString(),
                        interval: 0,
                        easeFactor: 2.5,
                        reviews: 0,
                        audioPath: item.audioPath || `audio/${crypto.randomUUID()}.mp3` // Use provided audioPath or generate placeholder
                    }));
            }
        } catch (e) {
            // It looked like JSON but wasn't valid, fall through to text parsing
            console.error("JSON parsing failed:", e);
        }
    }

    // Fallback to line-by-line parsing for "sentence // category" format
    return text.split(/\n+/).map(l => l.trim()).filter(Boolean).map(line => {
        const parts = line.split('//');
        const sentence = (parts[0] || '').trim();
        const category = (parts[1] || '').trim() || 'Uncategorized';
        const id = crypto.randomUUID();
        return {
            id: id,
            text: sentence,
            category,
            translation_pt: '',
            level: 'beginner',
            keywords: [],
            // SRS fields
            nextReview: new Date().toISOString(),
            interval: 0,
            easeFactor: 2.5,
            reviews: 0,
            audioPath: `audio/${id}.mp3` // Placeholder audio path for line-by-line
        };
    }).filter(s => s.text.length > 0);
}

// --- Text Manipulation ---
export function normalizeText(text) {
    if (!text) return "";
    let normalized = text.toLowerCase();

    // Expand common contractions
    normalized = normalized.replace(/it's/g, 'it is');
    normalized = normalized.replace(/i'm/g, 'i am');
    normalized = normalized.replace(/you're/g, 'you are');
    normalized = normalized.replace(/he's/g, 'he is');
    normalized = normalized.replace(/she's/g, 'she is');
    normalized = normalized.replace(/we're/g, 'we are');
    normalized = normalized.replace(/they're/g, 'they are');
    normalized = normalized.replace(/won't/g, 'will not');
    normalized = normalized.replace(/don't/g, 'do not');
    normalized = normalized.replace(/can't/g, 'cannot');
    normalized = normalized.replace(/isn't/g, 'is not');
    normalized = normalized.replace(/aren't/g, 'are not');
    normalized = normalized.replace(/wasn't/g, 'was not');
    normalized = normalized.replace(/weren't/g, 'were not');
    normalized = normalized.replace(/hasn't/g, 'has not');
    normalized = normalized.replace(/haven't/g, 'have not');
    normalized = normalized.replace(/hadn't/g, 'had not');
    normalized = normalized.replace(/wouldn't/g, 'would not');
    normalized = normalized.replace(/couldn't/g, 'could not');
    normalized = normalized.replace(/shouldn't/g, 'should not');
    normalized = normalized.replace(/mightn't/g, 'might not');
    normalized = normalized.replace(/mustn't/g, 'must not');
    normalized = normalized.replace(/'ll/g, ' will');
    normalized = normalized.replace(/'ve/g, ' have');
    normalized = normalized.replace(/'d/g, ' would');
    normalized = normalized.replace(/n't/g, ' not');

    normalized = normalized.replace(/’/g, "'"); // Handle apostrophes specifically
    normalized = normalized.replace(/[^a-z0-9\s]/g, ''); // Remove all non-alphanumeric characters except spaces
    normalized = normalized.replace(/\s+/g, ' '); // Replace multiple spaces with a single space
    return normalized.trim();
}

export function generateWordDiff(correctSentence, userAnswer) {
    const correctWords = correctSentence.split(/\s+/).filter(Boolean);
    const userWords = userAnswer.split(/\s+/).filter(Boolean);
    const normalizedCorrectWords = correctWords.map(normalizeText);

    const correctWordFreq = normalizedCorrectWords.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
    }, {});

    // Adjust frequencies for correctly placed words
    for (let i = 0; i < Math.min(correctWords.length, userWords.length); i++) {
        if (normalizeText(userWords[i]) === normalizedCorrectWords[i]) {
            correctWordFreq[normalizedCorrectWords[i]]--;
        }
    }

    let diff = [];
    for (let i = 0; i < userWords.length; i++) {
        const userWord = userWords[i];
        const normalizedUserWord = normalizeText(userWord);
        const correctWord = correctWords[i];
        const normalizedCorrectWord = correctWord ? normalizeText(correctWord) : null;

        if (normalizedUserWord === normalizedCorrectWord) {
            diff.push({ word: userWord, status: 'correct' });
        } else if (correctWordFreq[normalizedUserWord] > 0) {
            diff.push({ word: userWord, status: 'misplaced' });
            correctWordFreq[normalizedUserWord]--;
        } else {
            if (i >= correctWords.length) {
                diff.push({ word: userWord, status: 'extra' });
            } else {
                diff.push({ word: userWord, status: 'incorrect' });
            }
        }
    }

    if (userWords.length < correctWords.length) {
        diff.push({ word: '[...]', status: 'missing' });
    }

    return diff;
}

export function generateWordDiffHtml(correctSentence, userAnswer) {
    const diff = generateWordDiff(correctSentence, userAnswer);
    let diffHtml = '';
    diff.forEach(item => {
        let className = '';
        switch (item.status) {
            case 'correct':
                className = 'diff-correct-word';
                break;
            case 'misplaced':
                className = 'diff-misplaced-word';
                break;
            case 'extra':
                className = 'diff-extra-word';
                break;
            case 'incorrect':
                className = 'diff-incorrect-word';
                break;
            case 'missing':
                className = 'diff-missing-word';
                break;
            default:
                break;
        }
        diffHtml += `<span class="${className}">${item.word}</span> `;
    });
    return diffHtml.trim();
}



// --- Array Shuffle ---
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array; // Return the mutated array
}

// --- SRS Algorithm (simplified SM-2) ---
export function updateSRSData(card, rating) {
    let sentences = loadLocalSentences();
    const cardIndex = sentences.findIndex(s => s.id === card.id);

    if (cardIndex === -1) {
        console.error("Card not found in local sentences");
        return;
    }

    if (typeof card.reviews === 'undefined') {
        card.reviews = 0;
        card.easeFactor = 2.5;
        card.interval = 0;
    }

    const now = new Date();
    if (rating === 'again') {
        card.interval = 0;
        now.setMinutes(now.getMinutes() + 1); 
    } else {
        if (card.reviews === 0) {
            card.interval = 1;
        } else if (card.reviews === 1) {
            card.interval = 6;
        } else {
            card.interval = Math.round(card.interval * card.easeFactor);
        }

        if (rating === 'easy') {
            card.easeFactor += 0.15;
        }
        now.setDate(now.getDate() + card.interval);
    }
    
    card.reviews += 1;
    card.nextReview = now.toISOString();

    sentences[cardIndex] = card;
    saveLocalSentences(sentences);
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

export const calculateStarRating = (score, maxScore) => {
    if (score === null || score === undefined || maxScore === null || maxScore === undefined || maxScore === 0) {
        return 0;
    }
    const percentage = (score / maxScore) * 100;
    if (percentage === 100) return 3;
    if (percentage > 66) return 2;
    if (percentage > 33) return 1;
    return 0;
};
