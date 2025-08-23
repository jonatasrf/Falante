import { speakText, showToast, normalizeText, generateWordDiffHtml, pickRandomSentenceFromLocal, calculateLevel, sentencesNeededForLevel, sentencesNeededForNextLevel, getRandomLevelUpMessage } from './utils.js';

// State variables
let currentSentenceObject = null;
let currentSentence = '';
let sessionCompletedCountListen = 0;
let isFirstAttempt = true;
let currentStreak = 0;
let currentLevel = 0; // Keep track of level within the module

// This function will be called from main.js to pass necessary elements
export function initializeListenTypeView(elements) {
    const {
        speakButton, checkButton, hintButton, nextSentenceButtonListenType,
        userInput, feedback, feedbackText, loadingIndicator, sessionCountListenElement,
        categorySelectElement, voiceSelectElement, starPopup,
        starPopupCountElement, progressSection, currentLevelElement, progressBarElement,
        progressCountElement, nextLevelCountElement, levelUpPopup, levelUpMessage, levelUpPopupCount
    } = elements;

    // --- UI Update Functions ---
    function updateProgressUI(currentUser) {
        if (!progressSection) return;
        progressSection.style.display = ''; // Always show
        if (currentUser) {
            const totalCorrect = currentUser.correctSentencesCount || 0;
            currentLevel = calculateLevel(totalCorrect);
            const sentencesForNext = sentencesNeededForNextLevel(currentLevel);
            const sentencesForCurrent = sentencesNeededForLevel(currentLevel);
            const sentencesInCurrentLevel = totalCorrect - sentencesForCurrent;
            const levelTotalSentences = sentencesForNext - sentencesForCurrent;

            if (currentLevelElement) currentLevelElement.textContent = currentLevel.toString();
            if (nextLevelCountElement) nextLevelCountElement.textContent = levelTotalSentences.toString();
            if (progressCountElement) progressCountElement.textContent = sentencesInCurrentLevel.toString();

            const progressPercentage = levelTotalSentences > 0 ? (sentencesInCurrentLevel / levelTotalSentences) * 100 : 0;
            if (progressBarElement) progressBarElement.style.width = `${progressPercentage}%`;
        } else {
            if (currentLevelElement) currentLevelElement.textContent = '0';
            if (progressBarElement) progressBarElement.style.width = '0%';
            if (progressCountElement) progressCountElement.textContent = '0';
            if (nextLevelCountElement) nextLevelCountElement.textContent = sentencesNeededForNextLevel(0).toString();
        }
    }

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

        feedbackText.textContent = 'Listen to the sentence first.';
        feedback.className = 'feedback-area';
        userInput.value = '';
        userInput.disabled = false; // Keep this as false
        checkButton.disabled = true;
        hintButton.disabled = true;
        isFirstAttempt = true;
        checkButton.style.display = 'inline-block';
        hintButton.style.display = 'inline-block';
        speakButton.disabled = false;
        userInput.focus();
    }

    // --- Core Functions ---
    async function speakSentence() {
        if (!currentSentence) {
            feedbackText.textContent = 'No sentence loaded. Cannot speak.';
            feedback.className = 'feedback-area incorrect';
            return;
        }
        speakButton.disabled = true;
        checkButton.disabled = true;
        hintButton.disabled = true;
        // Removed: userInput.disabled = true;
        feedbackText.textContent = 'Generating audio...';
        feedback.className = 'feedback-area';

        try {
            feedbackText.textContent = 'Playing audio...';
            await speakText(currentSentence, voiceSelectElement, { rate: 1, pitch: 1, volume: 1 });
            feedbackText.textContent = 'Now type what you heard.';
            feedback.className = 'feedback-area';
            speakButton.disabled = false;
            if (currentSentenceObject) {
                checkButton.disabled = false;
                hintButton.disabled = false;
            }
            // Removed: userInput.focus();
        } catch (error) {
            console.error('Error in speakSentence:', error);
            feedbackText.textContent = `Error: ${error.message}`;
            feedback.className = 'feedback-area incorrect';
            showToast(error.message || 'Audio error', 'error');
            speakButton.disabled = false;
            checkButton.disabled = true;
            hintButton.disabled = true;
        }
    }

    async function checkAnswer() {
        if (!currentSentenceObject || checkButton.disabled) return;

        const userAnswer = userInput.value.trim();
        const normalizedUserAnswer = normalizeText(userAnswer);
        const normalizedCurrentSentence = normalizeText(currentSentence);
        console.log('Normalized User Answer:', normalizedUserAnswer);
        console.log('Normalized Current Sentence:', normalizedCurrentSentence);
        const isCorrect = (normalizedUserAnswer === normalizedCurrentSentence);

        if (isCorrect) {
            feedbackText.innerHTML = `<span class="correct">Correct!</span><br>${currentSentence}`;
            feedback.className = 'feedback-area correct';
            sessionCompletedCountListen++;
            if (sessionCountListenElement) sessionCountListenElement.textContent = sessionCompletedCountListen;
            let levelUpOccurred = false;

            currentStreak++;
            const previousLevel = currentLevel;
            
            const newTotalCount = (window.currentUser.correctSentencesCount || 0) + 1;
            window.currentUser.correctSentencesCount = newTotalCount;
            updateProgressUI(window.currentUser);

            const starsEarned = Math.floor(newTotalCount / 100);
            const previousStars = Math.floor((newTotalCount - 1) / 100);
            if (starsEarned > previousStars && starPopup) {
                starPopupCountElement.textContent = starsEarned;
                starPopup.style.display = 'flex';
            }

            const newLevel = calculateLevel(newTotalCount);
            if (newLevel > previousLevel) {
                levelUpOccurred = true;
                levelUpMessage.textContent = getRandomLevelUpMessage();
                levelUpPopupCount.textContent = newLevel;
                levelUpPopup.style.display = 'flex';
            }

            checkButton.disabled = true;
            hintButton.disabled = true;
            userInput.disabled = true;
            speakButton.disabled = true;

            // Always display the next sentence button after a correct answer
            nextSentenceButtonListenType.style.display = 'inline-block';

            // If a level-up occurred, the user will close the popup, and then they can click next sentence
            // Otherwise, the button is already visible and clickable
        } else {
            const diffOutput = generateWordDiffHtml(currentSentence, userAnswer);
            feedbackText.innerHTML = `Incorrect: ${diffOutput}`;
            feedback.className = 'feedback-area incorrect';
            currentStreak = 0;
            isFirstAttempt = false;
            userInput.focus();
        }
    }

    function giveHint() {
        if (!currentSentenceObject || userInput.disabled) return;
        const userAnswer = userInput.value.trim();
        if (!userAnswer) {
            feedbackText.textContent = 'Type something first to get a hint.';
            feedback.className = 'feedback-area';
            return;
        }
        const correctWords = currentSentence.split(/\s+/);
        const userWords = userAnswer.split(/\s+/);
        let hintGiven = false;
        for (let i = 0; i < correctWords.length; i++) {
            if (normalizeText(userWords[i]) !== normalizeText(correctWords[i])) {
                feedbackText.innerHTML = `Hint: The word "<strong>${userWords[i] || ''}</strong>" should be "<strong>${correctWords[i]}</strong>"`;
                feedback.className = 'feedback-area';
                hintGiven = true;
                break;
            }
        }
        if (!hintGiven) {
            feedbackText.textContent = 'Hint: Your input looks correct so far!';
            feedback.className = 'feedback-area';
        }
        isFirstAttempt = false;
        userInput.focus();
    }

    async function fetchAndSetSentence() {
        const selectedCategory = categorySelectElement.value;
        feedbackText.style.display = 'none';
        loadingIndicator.style.display = 'inline';
        feedback.className = 'feedback-area';
        speakButton.disabled = true;
        checkButton.disabled = true;
        hintButton.disabled = true;
        userInput.disabled = true;

        try {
            const local = pickRandomSentenceFromLocal(selectedCategory);
            if (!local) {
                const msg = (selectedCategory && selectedCategory !== 'All') ? `No sentences found for category: ${selectedCategory}` : 'No sentences found. Add some in the Sentences tab.';
                throw new Error(msg);
            }
            currentSentenceObject = { id: local.id, text: local.text };
            displayCurrentSentenceUI();
            await speakSentence();
        } catch (error) {
            console.error('Failed to load local sentence:', error);
            feedbackText.textContent = `Error loading sentence: ${error.message}`;
            feedback.className = 'feedback-area incorrect';
            currentSentenceObject = null;
            currentSentence = '';
        } finally {
            loadingIndicator.style.display = 'none';
            feedbackText.style.display = 'inline';
        }
    }

    // --- Event Listeners ---
    speakButton.addEventListener('click', speakSentence);
    checkButton.addEventListener('click', checkAnswer);
    hintButton.addEventListener('click', giveHint);
    nextSentenceButtonListenType.addEventListener('click', () => {
        nextSentenceButtonListenType.style.display = 'none';
        fetchAndSetSentence();
    });
    
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (!checkButton.disabled) checkButton.click();
        }
    });

    // Return functions to be called from main.js
    return {
        onViewActive: () => {
            fetchAndSetSentence();
            updateProgressUI(window.currentUser);
            userInput.focus();
        },
        handleShortcut: (event) => {
            const activeEl = document.activeElement;
            const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
            if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
                if (!speakButton.disabled) { event.preventDefault(); speakButton.click(); }
            } else if (event.key === 'Tab') {
                event.preventDefault();
                if (!hintButton.disabled) hintButton.click();
            } else if (event.key === 'Enter') { // Removed && !isInputFocused
                event.preventDefault(); // Prevent default Enter behavior (e.g., new line in textarea)
                if (!checkButton.disabled) { // If check button is enabled, check answer
                    checkButton.click();
                } else if (nextSentenceButtonListenType.style.display !== 'none' && !nextSentenceButtonListenType.disabled) { // Otherwise, if next sentence button is visible, click it
                    nextSentenceButtonListenType.click();
                }
            }
        }
    };
}
