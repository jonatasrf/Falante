import { loadLocalSentences, saveLocalSentences, getCategoriesFromLocal, showToast } from './utils.js';

function parseLines(text) {
    return text.split(/\n+/).map(l => l.trim()).filter(Boolean).map(line => {
        const parts = line.split('//');
        const sentence = (parts[0] || '').trim();
        const category = (parts[1] || '').trim() || 'Uncategorized';
        return {
            id: crypto.randomUUID(),
            text: sentence,
            category,
            // SRS fields
            nextReview: new Date().toISOString(), // Review immediately
            interval: 0,
            easeFactor: 2.5,
            reviews: 0 // To track number of reviews
        };
    }).filter(s => s.text.length > 0);
}

export function initializeSentencesManager(elements, onCategoriesUpdate) {
    const {
        bulkInput, saveBtn, clearBtn, exportBtn, importBtn, importFile, listContainer,
        sentencePromptCount, sentencePromptTheme, sentencePromptCategory, generateSentencePromptBtn,
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

        if (!theme || !category) {
            showToast('Please enter a theme and a category.', 'error');
            return;
        }

        const finalPrompt = `Generate ${count} English sentences for language learning about the theme '${theme}'. All sentences must belong to the '${category}' category.\n\nFormat each sentence on a new line, followed by ' // ' and the category name, exactly like this example:\n\nI would like to book a flight to New York. // ${category}\nWhat time does the train leave? // ${category}\nWhere is the nearest subway station? // ${category}\n\nIn the end, deliver only the ready-to-copy-and-paste script, without extra explanations outside the standard format.`;

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
        const items = parseLines(bulkInput.value);
        if (!items.length) { showToast('Nothing to save', 'info'); return; }
        const existing = loadLocalSentences();
        saveLocalSentences(existing.concat(items));
        bulkInput.value = '';
        renderList();
        showToast('Sentences saved', 'success');
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
