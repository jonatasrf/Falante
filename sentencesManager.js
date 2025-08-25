import { loadLocalSentences, saveLocalSentences, getCategoriesFromLocal, showToast } from './utils.js';

function parseInput(text) {
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
                        reviews: 0
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
        return {
            id: crypto.randomUUID(),
            text: sentence,
            category,
            translation_pt: '',
            level: 'beginner',
            keywords: [],
            // SRS fields
            nextReview: new Date().toISOString(),
            interval: 0,
            easeFactor: 2.5,
            reviews: 0
        };
    }).filter(s => s.text.length > 0);
}


export function initializeSentencesManager(elements, onCategoriesUpdate) {
    const {
        bulkInput, saveBtn, clearBtn, exportBtn, importBtn, importFile, listContainer,
        sentencePromptCount, sentencePromptTheme, sentencePromptCategory, sentencePromptDifficulty, generateSentencePromptBtn,
        generatedSentencePromptContainer, generatedSentencePromptArea, copySentencePromptBtn
    } = elements;

    function renderList() {
        if (!listContainer) return;
        const items = loadLocalSentences();
        if (!items.length) { 
            listContainer.innerHTML = '<p style="color:#666">Nenhuma sentença cadastrada.</p>'; 
            return; 
        }
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
                const arr = loadLocalSentences().filter(i => i.id !== id);
                saveLocalSentences(arr);
                renderList();
                showToast('Sentença removida', 'success');
                onCategoriesUpdate(); // Callback to update global categories
            });
        });
    }

    function populateCategoryDatalist() {
        const datalist = document.getElementById('category-list');
        if (!datalist) return;
        datalist.innerHTML = '';
        const categories = getCategoriesFromLocal();
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            datalist.appendChild(option);
        });
    }

    // Event Listeners
    generateSentencePromptBtn?.addEventListener('click', () => {
        const count = parseInt(sentencePromptCount.value, 10) || 20;
        const theme = sentencePromptTheme.value.trim();
        const category = sentencePromptCategory.value.trim();
        const difficulty = sentencePromptDifficulty.value;

        if (!theme || !category) {
            showToast('Please enter a theme and a category.', 'error');
            return;
        }

        const finalPrompt = `Generate ${count} English sentences for language learning about the theme '${theme}'.
All sentences must belong to the '${category}' category and be targeted at an ${difficulty} level.

Provide the output as a single, minified JSON array of objects. Do not include any text or explanations outside of the JSON array itself.

Each object in the array must have the following structure:
- "text": The English sentence.
- "category": The category name, which must be "${category}".
- "translation_pt": A simple and direct Portuguese translation.
- "level": The difficulty level, which must be "${difficulty}".
- "keywords": An array of 1 to 3 relevant keywords from the sentence.

Example of the required JSON output format:
[
  {"text":"I would like to book a flight to New York.","category":"Travel","translation_pt":"Eu gostaria de reservar um voo para Nova York.","level":"beginner","keywords":["book","flight","New York"]},
  {"text":"What time does the train leave?","category":"Travel","translation_pt":"A que horas o trem parte?","level":"beginner","keywords":["time","train","leave"]}
]`;

        generatedSentencePromptArea.value = finalPrompt;
        generatedSentencePromptContainer.style.display = 'block';
    });

    copySentencePromptBtn?.addEventListener('click', () => {
        if (generatedSentencePromptArea.value) {
            navigator.clipboard.writeText(generatedSentencePromptArea.value)
                .then(() => showToast('Prompt copied to clipboard!', 'success'))
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                    showToast('Failed to copy prompt.', 'error');
                });
        }
    });

    saveBtn.addEventListener('click', () => {
        const items = parseInput(bulkInput.value);
        if (!items.length) { showToast('Nothing to save', 'info'); return; }
        const existing = loadLocalSentences();
        saveLocalSentences(existing.concat(items));
        bulkInput.value = '';
        renderList();
        showToast(`${items.length} sentences saved!`, 'success');
        onCategoriesUpdate();
    });

    clearBtn.addEventListener('click', () => {
        if (!confirm('Are you sure you want to remove all sentences?')) return;
        saveLocalSentences([]);
        renderList();
        showToast('All sentences cleared', 'success');
        onCategoriesUpdate();
    });

    exportBtn.addEventListener('click', () => {
        const data = JSON.stringify(loadLocalSentences(), null, 2);
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
                saveLocalSentences(arr);
                renderList();
                showToast('Sentences imported', 'success');
                onCategoriesUpdate();
            } catch (err) {
                showToast('Failed to import', 'error');
            }
        };
        reader.readAsText(file);
    });

    return {
        onViewActive: () => {
            renderList();
            populateCategoryDatalist();
        }
    };
}
