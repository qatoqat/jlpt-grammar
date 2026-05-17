// --- 1. Dynamic Year ---
document.getElementById('year').textContent = new Date().getFullYear();

// --- 2. Color Interpolation Helper ---
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function interpolateColor(color1Hex, color2Hex, factor) {
    const c1 = hexToRgb(color1Hex);
    const c2 = hexToRgb(color2Hex);
    if (!c1 || !c2) return color1Hex;
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    return rgbToHex(r, g, b);
}

const DECAY_COLOR = '#F1C40F'; // Yellow
const DECAY_DAYS = 30;

// --- 3. Global Data Variable ---
let grammarData = {}; 
let activeLevelId = 'n5';

// --- 4. Progress Logic ---
const STORAGE_KEY = 'jlpt_tree_progress_v3'; 

function getProgress() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
}

function saveProgress(progress) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function toggleCheck(cardElement) {
    if (event.target.closest('.ref-link')) return;

    const id = cardElement.id;
    const progress = getProgress();
    const now = Date.now();

    if (progress[id] && progress[id].checked) {
        delete progress[id];
        cardElement.classList.remove('checked');
        const defaultColor = cardElement.getAttribute('data-color');
        cardElement.style.borderTopColor = defaultColor;
        cardElement.querySelector('.card-checkbox').style.backgroundColor = '';
    } else {
        progress[id] = { checked: true, timestamp: now };
        cardElement.classList.add('checked');
        applyCardColor(cardElement, progress[id].timestamp, now);
    }
    
    saveProgress(progress);
    updateCounter(activeLevelId);
}

function applyCardColor(card, timestamp, now) {
    const defaultColor = card.getAttribute('data-color');
    const diffMs = now - timestamp;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    let factor = diffDays / DECAY_DAYS;
    if (factor > 1) factor = 1;

    const newColor = interpolateColor(defaultColor, DECAY_COLOR, factor);
    card.style.borderTopColor = newColor;
    const checkbox = card.querySelector('.card-checkbox');
    if(checkbox) checkbox.style.backgroundColor = newColor;
}

function loadProgress() {
    const progress = getProgress();
    const now = Date.now();
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const id = card.id;
        if (progress[id] && progress[id].checked) {
            card.classList.add('checked');
            applyCardColor(card, progress[id].timestamp, now);
        } else {
            const defaultColor = card.getAttribute('data-color');
            card.style.borderTopColor = defaultColor;
        }
    });
}

// --- 5. Navigation & Rendering Logic ---

// THIS FUNCTION WAS MISSING - CAUSING THE ERROR
function switchLevel(levelId, color) {
    activeLevelId = levelId;
    
    // Update Pills
    const pills = document.querySelectorAll('.pill');
    pills.forEach(pill => {
        pill.classList.remove('active');
        pill.style.backgroundColor = '';
    });
    const activePill = event.target;
    activePill.classList.add('active');
    activePill.style.backgroundColor = color;

    // Render Content
    renderLevel(levelId);
}

function updateCounter(levelId) {
    const progress = getProgress();
    const levelData = grammarData[levelId];
    if (!levelData) return; 

    let total = 0;
    let checked = 0;

    levelData.sections.forEach(section => {
        section.cards.forEach(card => {
            total++;
            if (progress[card.id] && progress[card.id].checked) {
                checked++;
            }
        });
    });

    const counterEl = document.getElementById('progress-counter');
    if (total === 0) {
        counterEl.textContent = "";
        counterEl.style.opacity = 0;
    } else {
        counterEl.textContent = `${checked}/${total} Mastered`;
        counterEl.style.opacity = 1;
    }
}

function renderLevel(levelId) {
    const data = grammarData[levelId];
    const container = document.getElementById('content-area');
    container.innerHTML = ''; // Clear current

    if (!data) {
        container.innerHTML = '<div style="text-align:center; padding:40px;">Data not found for this level.</div>';
        return;
    }

    updateCounter(levelId);

    data.sections.forEach(section => {
        const sectionEl = document.createElement('section');
        sectionEl.className = 'branch-section';
        
        const header = document.createElement('h2');
        header.className = 'branch-header';
        header.textContent = section.title;
        sectionEl.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'cards-grid';

        section.cards.forEach(cardData => {
            const article = document.createElement('article');
            article.className = 'card';
            article.id = cardData.id;
            article.setAttribute('data-color', data.color);
            article.onclick = function(e) { toggleCheck(this); };

            let refsHtml = '';
            if (cardData.refs && cardData.refs.length > 0) {
                refsHtml = '<div class="references">';
                cardData.refs.forEach(refId => {
                    refsHtml += `<a href="#${refId}" class="ref-link" onclick="scrollToCard(event, '${refId}')">See also: ${refId}</a> `;
                });
                refsHtml += '</div>';
            }

            article.innerHTML = `
                <div class="card-checkbox"></div>
                <span class="grammar-point">${cardData.point}</span>
                <span class="jp-char">${cardData.jp}</span>
                <p class="meaning">${cardData.meaning}</p>
                <div class="example">${cardData.example}</div>
                ${refsHtml}
            `;

            grid.appendChild(article);
        });

        sectionEl.appendChild(grid);
        container.appendChild(sectionEl);
    });

    requestAnimationFrame(() => {
        loadProgress();
    });
}

function scrollToCard(e, targetId) {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
        const targetLevel = target.closest('.level-content').id;
        const levelBtn = document.querySelector(`.pill[onclick*="'${targetLevel}'"]`);
        
        if (levelBtn && !target.closest('.level-content').classList.contains('active')) {
            levelBtn.click();
            setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.style.transition = 'transform 0.2s';
                target.style.transform = 'scale(1.05)';
                setTimeout(() => target.style.transform = 'scale(1)', 200);
            }, 300);
        } else {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.style.transition = 'transform 0.2s';
            target.style.transform = 'scale(1.05)';
            setTimeout(() => target.style.transform = 'scale(1)', 200);
        }
    }
}

// --- 6. Data Fetching ---
async function initData() {
    const container = document.getElementById('content-area');
    container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);">Loading Grammar Data...</div>';

    try {
        const response = await fetch('grammar-data.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        grammarData = data;
        
        // Initial Render
        renderLevel('n5');
        
    } catch (error) {
        console.error('Error loading grammar data:', error);
        container.innerHTML = `
            <div style="text-align:center; padding: 40px; color: #c0392b;">
                <h3 style="margin-bottom:10px;">Failed to load data</h3>
                <p>${error.message}</p>
                <p style="font-size:0.85rem; margin-top:10px; color:#7f8c8d;">
                    Note: You must run this on a local server (like VS Code Live Server) to load JSON files.
                </p>
            </div>
        `;
    }
}

// --- 7. Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    initData();
});
