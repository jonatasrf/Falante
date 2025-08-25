import { showToast, speakText, shuffleArray, normalizeText, generateWordDiffHtml } from './utils.js';

let parsedTestQuestions = [];

function parseTestScript(script) {
    const trimmedScript = script.trim();
    if (trimmedScript.startsWith('[')) {
        try {
            const items = JSON.parse(trimmedScript);
            if (Array.isArray(items)) {
                // Basic validation
                return items.map(q => {
                    if (q.type === 'multiple_choice' && q.options) {
                        const correctAnswer = q.options[0];
                        shuffleArray(q.options);
                        q.correctAnswer = correctAnswer;
                    }
                    return q;
                });
            }
        } catch (e) {
            console.error("Failed to parse test script as JSON:", e);
            showToast('Invalid JSON format. Please check the script.', 'error');
            return [];
        }
    }
    // Fallback for old format is removed for simplicity, assuming new format going forward.
    showToast('Invalid script format. Expected a JSON array.', 'error');
    return [];
}

export function initializeEnglishTestView(elements) {
    const {
        testScriptInputArea, loadTestFromTextBtn, importTestBtn, importTestFile, testOutput,
        finishTestBtn, testResults, promptQuestionCount, promptGrammarTopic, promptDifficultyTest,
        generatePromptBtn, generatedPromptContainer, generatedPromptArea, copyPromptBtn, voiceSelectElement
    } = elements;

    function renderTest(questions) {
        testOutput.innerHTML = '';
        if (!questions || questions.length === 0) {
            testOutput.innerHTML = '<p style="color:#666">No questions generated. Check script format.</p>';
            finishTestBtn.style.display = 'none';
            testResults.innerHTML = '';
            return;
        }
        questions.forEach((q, index) => {
            const qId = `q-${index}`;
            let qHtml = `<div class="test-question" data-q-idx="${index}"><h3>Question ${index + 1}</h3>`;
            if (q.type === 'multiple_choice') {
                qHtml += `<p>${q.question}</p><div class="options-container">`;
                q.options.forEach(opt => {
                    qHtml += `<button class="option-button" data-val="${opt}">${opt}</button>`;
                });
                qHtml += `</div>`;
            } else if (q.type === 'audio_typing') {
                qHtml += `<p>Listen and type the sentence:</p>`;
                qHtml += `<button class="button-primary speak-test-audio" data-phrase="${q.question}"><i class="fa-solid fa-volume-high"></i> Speak</button>`;
                qHtml += `<textarea rows="2" class="test-input audio-input" placeholder="Type what you hear..."></textarea>`;
            }
            qHtml += `<div class="question-feedback" id="feedback-${qId}"></div></div>`;
            testOutput.innerHTML += qHtml;
        });
        finishTestBtn.style.display = 'inline-block';
        testResults.innerHTML = '';
        testOutput.querySelectorAll('.option-button').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.options-container').querySelectorAll('.option-button').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
        testOutput.querySelectorAll('.speak-test-audio').forEach(btn => {
            btn.addEventListener('click', () => speakText(btn.dataset.phrase, voiceSelectElement));
        });
    }

    function checkTestAnswers() {
        if (!parsedTestQuestions.length) return;
        let correctCount = 0;
        parsedTestQuestions.forEach((q, index) => {
            const qDiv = testOutput.querySelector(`[data-q-idx="${index}"]`);
            if (!qDiv) return;
            const feedbackDiv = qDiv.querySelector('.question-feedback');
            let isCorrect = false;
            let userAnswer = '';

            if (q.type === 'multiple_choice') {
                const selectedBtn = qDiv.querySelector('.option-button.selected');
                userAnswer = selectedBtn ? selectedBtn.dataset.val.trim() : '';
                isCorrect = normalizeText(userAnswer) === normalizeText(q.correctAnswer);
                qDiv.querySelectorAll('.option-button').forEach(btn => {
                    btn.disabled = true;
                    if (normalizeText(btn.dataset.val) === normalizeText(q.correctAnswer)) btn.classList.add('correct-answer-visual');
                    else btn.classList.add('incorrect-answer-visual');
                });
                if (selectedBtn && !isCorrect) selectedBtn.classList.add('user-incorrect-selection');
            } else if (q.type === 'audio_typing') {
                const input = qDiv.querySelector('.audio-input');
                userAnswer = input ? input.value.trim() : '';
                isCorrect = normalizeText(userAnswer) === normalizeText(q.answer);
                if (input) {
                    input.disabled = true;
                    input.classList.add(isCorrect ? 'correct-answer-visual' : 'incorrect-answer-visual');
                }
            }

            if (isCorrect) {
                correctCount++;
                feedbackDiv.innerHTML = '<span class="correct">Correct!</span>';
            } else {
                let feedbackHtml = '<span class="incorrect">Incorrect.</span>';
                const correctAnswer = q.type === 'multiple_choice' ? q.correctAnswer : q.answer;
                if (q.type === 'audio_typing') {
                    feedbackHtml += `<br>Your input: ${generateWordDiffHtml(correctAnswer, userAnswer)}`;
                } else {
                    feedbackHtml += `<br>Correct answer: "${correctAnswer}"`;
                }
                feedbackDiv.innerHTML = feedbackHtml;
            }
            if (q.explanation) feedbackDiv.innerHTML += `<br><span class="explanation-text">Explanation: ${q.explanation}</span>`;
        });

        testResults.innerHTML = `<h2>Results: ${correctCount}/${parsedTestQuestions.length} correct</h2>`;
        finishTestBtn.style.display = 'none';
    }

    // Event Listeners
    loadTestFromTextBtn.addEventListener('click', () => {
        const script = testScriptInputArea.value.trim();
        if (!script) { showToast('Paste a script first.', 'error'); return; }
        parsedTestQuestions = parseTestScript(script);
        renderTest(parsedTestQuestions);
        if (parsedTestQuestions.length > 0) {
            showToast('Test loaded!', 'success');
            testScriptInputArea.value = '';
        }
    });

    importTestBtn.addEventListener('click', () => importTestFile.click());
    importTestFile.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            testScriptInputArea.value = evt.target.result;
            showToast('File loaded. Click Load from Text to proceed.', 'info');
        };
        reader.readAsText(file);
    });

    finishTestBtn.addEventListener('click', checkTestAnswers);

    generatePromptBtn.addEventListener('click', () => {
        const count = promptQuestionCount.value || 10;
        const topic = promptGrammarTopic.value.trim();
        const difficulty = promptDifficultyTest.value;

        if (!topic) { showToast('Please enter a grammar topic.', 'error'); return; }

        const finalPrompt = `Generate an English language test with ${count} questions about "${topic}" for an ${difficulty} level student.

Provide the output as a single, minified JSON array of objects. Do not include any text or explanations outside of the JSON array itself.

There are two types of questions, 'multiple_choice' and 'audio_typing'. Please provide a mix of both types.

Each object in the array must have the following structure:

1. For multiple-choice questions:
{
  "type": "multiple_choice",
  "question": "The question text with a blank, e.g., 'She ___ to the store every day.'",
  "options": ["goes", "go", "is going", "gone"], // An array of 4 strings. The correct answer MUST be the first one.
  "explanation": "A brief explanation of why the correct answer is correct.",
  "level": "${difficulty}"
}

2. For audio/typing questions:
{
  "type": "audio_typing",
  "question": "The full sentence to be read aloud by text-to-speech.",
  "answer": "The exact full sentence that the user should type.", // This should be identical to the question.
  "explanation": "A brief explanation of the grammar point.",
  "level": "${difficulty}"
}

Example of the required JSON output format:
[{"type":"multiple_choice","question":"He has ___ his homework.","options":["finished","finish","finishing","fineshed"],"explanation":"The Present Perfect tense (has + past participle) is used for actions completed in the recent past.","level":"intermediate"},{"type":"audio_typing","question":"The train is expected to arrive on time.","answer":"The train is expected to arrive on time.","explanation":"This sentence uses the passive voice in the present tense.","level":"intermediate"}]`;

        generatedPromptArea.value = finalPrompt;
        generatedPromptContainer.style.display = 'block';
    });

    copyPromptBtn.addEventListener('click', () => {
        if (generatedPromptArea.value) {
            navigator.clipboard.writeText(generatedPromptArea.value)
                .then(() => showToast('Prompt copied!', 'success'))
                .catch(() => showToast('Failed to copy.', 'error'));
        }
    });

    return {
        onViewActive: () => {
            testOutput.innerHTML = '';
            testResults.innerHTML = '';
            finishTestBtn.style.display = 'none';
            parsedTestQuestions = [];
        }
    };
}
