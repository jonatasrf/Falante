import { showToast, speakText, shuffleArray, normalizeText, generateWordDiffHtml } from './utils.js';

let parsedTestQuestions = [];

function parseTestScript(script) {
    const questions = [];
    const lines = script.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        let question = null;
        if (line.startsWith('{O}')) {
            const prompt = line.substring(3).trim();
            i++;
            if (i < lines.length && lines[i].startsWith('{') && lines[i].endsWith('}')) {
                const options = lines[i].substring(1, lines[i].length - 1).split(';').map(opt => opt.trim());
                const correctAnswer = options[0];
                shuffleArray(options);
                i++;
                let explanation = '';
                if (i < lines.length && lines[i].startsWith('{Explanation}')) {
                    explanation = lines[i].substring('{Explanation}'.length).trim();
                } else { i--; }
                question = { type: 'O', prompt, options, correctAnswer, explanation };
            }
        } else if (line.startsWith('{A}')) {
            const audioPhrase = line.substring(3).trim();
            i++;
            if (i < lines.length && lines[i].startsWith('{') && lines[i].endsWith('}')) {
                const correctAnswer = lines[i].substring(1, lines[i].length - 1).trim();
                i++;
                let explanation = '';
                if (i < lines.length && lines[i].startsWith('{Explanation}')) {
                    explanation = lines[i].substring('{Explanation}'.length).trim();
                } else { i--; }
                question = { type: 'A', audioPhrase, correctAnswer, explanation };
            }
        } else {
            console.warn('Unrecognized line format:', line);
        }
        if (question) questions.push(question);
        i++;
    }
    return questions;
}

export function initializeEnglishTestView(elements) {
    const {
        testScriptInputArea, loadTestFromTextBtn, importTestBtn, importTestFile, testOutput,
        finishTestBtn, testResults, scriptExplanationContent, promptQuestionCount, promptGrammarTopic,
        generatePromptBtn, generatedPromptContainer, generatedPromptArea, copyPromptBtn, voiceSelectElement
    } = elements;

    function renderTest(questions) {
        testOutput.innerHTML = '';
        if (questions.length === 0) {
            testOutput.innerHTML = '<p style="color:#666">No questions generated. Check script format.</p>';
            finishTestBtn.style.display = 'none';
            testResults.innerHTML = '';
            return;
        }
        questions.forEach((q, index) => {
            const qId = `q-${index}`;
            let qHtml = `<div class="test-question" data-q-idx="${index}"><h3>Question ${index + 1}</h3>`;
            if (q.type === 'O') {
                qHtml += `<p>${q.prompt}</p><div class="options-container">`;
                q.options.forEach(opt => {
                    qHtml += `<button class="option-button" data-val="${opt}">${opt}</button>`;
                });
                qHtml += `</div>`;
            } else if (q.type === 'A') {
                qHtml += `<p>Listen and type the sentence:</p>`;
                qHtml += `<button class="button-primary speak-test-audio" data-phrase="${q.audioPhrase}"><i class="fa-solid fa-volume-high"></i> Speak</button>`;
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

            if (q.type === 'O') {
                const selectedBtn = qDiv.querySelector('.option-button.selected');
                userAnswer = selectedBtn ? selectedBtn.dataset.val.trim() : '';
                isCorrect = normalizeText(userAnswer) === normalizeText(q.correctAnswer);
                qDiv.querySelectorAll('.option-button').forEach(btn => {
                    btn.disabled = true;
                    if (normalizeText(btn.dataset.val) === normalizeText(q.correctAnswer)) btn.classList.add('correct-answer-visual');
                    else btn.classList.add('incorrect-answer-visual');
                });
                if (selectedBtn && !isCorrect) selectedBtn.classList.add('user-incorrect-selection');
            } else if (q.type === 'A') {
                const input = qDiv.querySelector('.audio-input');
                userAnswer = input ? input.value.trim() : '';
                isCorrect = normalizeText(userAnswer) === normalizeText(q.correctAnswer);
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
                if (q.type === 'A') {
                    feedbackHtml += `<br>Your input: ${generateWordDiffHtml(q.correctAnswer, userAnswer)}`;
                } else {
                    feedbackHtml += `<br>Correct answer: "${q.correctAnswer}"`;
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
        showToast('Test loaded!', 'success');
        testScriptInputArea.value = '';
    });

    importTestBtn.addEventListener('click', () => importTestFile.click());
    importTestFile.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            testScriptInputArea.value = evt.target.result;
            showToast('File loaded. Click Load Test to proceed.', 'info');
        };
        reader.readAsText(file);
    });

    finishTestBtn.addEventListener('click', checkTestAnswers);

    generatePromptBtn.addEventListener('click', () => {
        const count = promptQuestionCount.value || 10;
        const topic = promptGrammarTopic.value.trim();
        if (!topic) { showToast('Please enter a grammar topic.', 'error'); return; }
        const rulesText = scriptExplanationContent.innerText.split(/\r?\n/).slice(1).join('\n').trim();
        const finalPrompt = `Generate ${count} English language learning questions about ${topic} using the following script.\n\n${rulesText}\n\nIn the end, deliver only the ready-to-copy-and-paste script, without extra explanations outside the standard format.`;
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
