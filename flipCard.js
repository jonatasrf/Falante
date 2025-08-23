import { speakText, loadLocalSentences, saveLocalSentences, showToast, shuffleArray, initializeTts } from './utils.js';

// State
let currentCard = null;
let sessionCompletedCountFlip = 0;
let isFlipped = false;
let reviewQueue = [];
let currentCardIndex = 0;

// --- SRS Algorithm (simplified SM-2) ---
function updateSRSData(card, rating) {
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


export function initializeFlipCardView(elements) {
    const {
        flashcard, flashcardTextElement, nextCardButton, 
        sessionCountFlipElement, categorySelectElement, voiceSelectElement,
        srsButtons, srsAgain, srsGood, srsEasy
    } = elements;

    initializeTts(voiceSelectElement);

    voiceSelectElement.addEventListener('change', () => {
        localStorage.setItem('falante-voice', voiceSelectElement.value);
        showToast(`Voice changed`, 'info');
    });

    function speakSentence() {
        if (!currentCard || !currentCard.text) return;

        // Disable flashcard interaction during speech
        flashcard.style.pointerEvents = 'none'; // Disable clicks
        flashcard.style.cursor = 'not-allowed'; // Change cursor

        return speakText(currentCard.text, voiceSelectElement, { rate: 1, pitch: 1, volume: 1 })
            .finally(() => {
                // Re-enable flashcard interaction after speech
                flashcard.style.pointerEvents = 'auto'; // Re-enable clicks
                flashcard.style.cursor = 'pointer'; // Restore cursor
            });
    }

    function startReviewSession() {
        const allSentences = loadLocalSentences();
        const selectedCategory = categorySelectElement?.value;

        let filteredSentences = allSentences;
        if (selectedCategory && selectedCategory !== 'All') {
            filteredSentences = allSentences.filter(s => s.category === selectedCategory);
        }

        const now = new Date().toISOString();
        const dueCards = filteredSentences.filter(s => s.nextReview && s.nextReview <= now);
        const newCards = filteredSentences.filter(s => !s.reviews || s.reviews === 0).slice(0, 10); // Limit new cards per session

        reviewQueue = [...dueCards, ...newCards];
        shuffleArray(reviewQueue);
        currentCardIndex = 0;

        displayNextCardInQueue();
    }

    function displayNextCardInQueue() {
        if (currentCardIndex < reviewQueue.length) {
            currentCard = reviewQueue[currentCardIndex];
            displayCard();
        } else {
            currentCard = null;
            flashcardTextElement.textContent = 'Session complete! Great job!';
            flashcard.style.cursor = 'default';
            srsButtons.style.display = 'none';
            nextCardButton.style.display = 'block';
        }
    }

    function displayCard() {
        if (!flashcard || !flashcardTextElement) return;

        flashcard.classList.remove('is-flipped');
        isFlipped = false;
        srsButtons.style.display = 'none';
        nextCardButton.style.display = 'none';

        if (currentCard) {
            flashcardTextElement.textContent = currentCard.text;
            speakSentence();
            flashcard.style.cursor = 'pointer';
        }
    }

    function flipTheCard() {
        if (!flashcard || !currentCard) return;
        isFlipped = !isFlipped;
        flashcard.classList.toggle('is-flipped', isFlipped);
        if (isFlipped) {
            srsButtons.style.display = 'flex';
            sessionCompletedCountFlip++;
            if (sessionCountFlipElement) sessionCountFlipElement.textContent = sessionCompletedCountFlip;
        } else {
            speakSentence();
        }
    }

    function handleSrsClick(rating) {
        if (!currentCard) return;
        updateSRSData(currentCard, rating);

        if (rating === 'again') {
            reviewQueue.push(currentCard); // Add to the end of the queue
        }

        currentCardIndex++;
        displayNextCardInQueue();
    }

    // Event Listeners
    flashcard.addEventListener('click', flipTheCard);
    nextCardButton.addEventListener('click', startReviewSession); // Restart session
    srsAgain.addEventListener('click', () => handleSrsClick('again'));
    srsGood.addEventListener('click', () => handleSrsClick('good'));
    srsEasy.addEventListener('click', () => handleSrsClick('easy'));

    // Return functions to be called from main.js
    return {
        onViewActive: startReviewSession,
        handleShortcut: (event) => {
            const activeEl = document.activeElement;
            const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
            if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
                event.preventDefault();
                flipTheCard();
            } else if (event.key === 'Enter' && !isInputFocused && nextCardButton && !nextCardButton.disabled) {
                event.preventDefault();
                nextCardButton.click();
            }
        }
    };
}