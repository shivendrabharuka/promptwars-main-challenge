/**
 * Zenith Academy AI - Application State & Logic Engine
 */

// Application State
const state = {
    activeView: 'dashboard',
    apiKey: '',
    logs: [],
    chatHistory: [],
    selectedTriggerNode: null
};

// SVG Settings for Rendering
const CHART_PADDING = { top: 40, right: 30, bottom: 40, left: 40 };
const NODE_POSITIONS = {
    backlog: { x: 150, y: 150, name: 'Backlog Panic', key: 'backlogPanic', color: 'var(--color-backlog)' },
    mock: { x: 300, y: 80, name: 'Mock Test Drops', key: 'mockTestDrop', color: 'var(--color-mock)' },
    peer: { x: 450, y: 150, name: 'Peer Comparison', key: 'peerComparison', color: 'var(--color-peer)' },
    other: { x: 300, y: 250, name: 'Other Stressors', key: 'otherAnxiety', color: 'var(--color-primary)' }
};

// DOM Elements
const views = {};
const navBtns = {};
let apiStatusIndicator;
let apiKeyInput;
let settingsDrawer;
let settingsOverlay;
let timelineSvg;
let matrixSvg;

// Initialize App
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        initDOMElements();
        loadSettings();
        initializeSeedData();
        initRouting();
        initMarkdownEditor();
        initSettingsDrawer();
        initWelcomeModal();
        initDataActions();
        initChatWidget();

        // Render initial dashboards
        updateUI();
    });
}

// Cache DOM Elements
function initDOMElements() {
    // Navigation & Views
    ['dashboard', 'journal', 'triggers', 'chat'].forEach(view => {
        views[view] = document.getElementById(`view-${view}`);
        navBtns[view] = document.querySelector(`[data-view="${view}"]`);
    });

    apiStatusIndicator = document.getElementById('api-status-indicator');
    apiKeyInput = document.getElementById('api-key-input');
    settingsDrawer = document.getElementById('settings-drawer');
    settingsOverlay = document.getElementById('settings-overlay');
    timelineSvg = document.getElementById('timeline-svg');
    matrixSvg = document.getElementById('matrix-svg');
}

// Load configurations from local storage
function loadSettings() {
    if (typeof localStorage !== 'undefined') {
        state.apiKey = localStorage.getItem('zenith_api_key') || '';
    }
    if (typeof document !== 'undefined' && apiKeyInput) {
        apiKeyInput.value = state.apiKey;
    }
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        updateAPIStatusUI();
    }

    if (typeof localStorage !== 'undefined') {
        const savedLogs = localStorage.getItem('zenith_journal_logs');
        if (savedLogs) {
            try {
                state.logs = JSON.parse(savedLogs);
            } catch (e) {
                console.error('Failed to parse saved logs:', e);
                state.logs = [];
            }
        }
    }
}

// Save Key and update UI status
function saveAPIKey(key) {
    state.apiKey = key.trim();
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('zenith_api_key', state.apiKey);
    }
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        updateAPIStatusUI();
        // Flash Success message in drawer
        const indicator = document.getElementById('key-success-indicator');
        if (indicator) {
            indicator.classList.remove('hidden');
            setTimeout(() => indicator.classList.add('hidden'), 3000);
        }
    }
}

// Updates indicator dots
function updateAPIStatusUI() {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !apiStatusIndicator) return;
    const dot = apiStatusIndicator.querySelector('.status-dot');
    const txt = apiStatusIndicator.querySelector('.status-text');
    const warningLabel = document.getElementById('journal-api-note');

    if (state.apiKey) {
        if (dot) dot.className = 'status-dot success pulse-green';
        if (txt) txt.textContent = 'Gemini 2.5 Flash: Active';
        if (warningLabel) warningLabel.textContent = 'Connected to Gemini 2.5 Flash API.';
    } else {
        if (dot) dot.className = 'status-dot success-demo';
        if (txt) txt.textContent = 'Live AI: Disconnected - Running Local Inference';
        if (warningLabel) warningLabel.textContent = 'Running in Smart Demo Mode. Configure a custom Gemini Key in settings if desired.';
    }
}

// Dynamic Routing / Navigation
function initRouting() {
    // Desktop navigation clicks
    Object.keys(navBtns).forEach(viewName => {
        navBtns[viewName].addEventListener('click', () => {
            switchView(viewName);
            // Close mobile navigation drawer if open
            document.getElementById('sidebar').classList.remove('mobile-open');
        });
    });

    // Mobile navigation toggling
    const menuToggle = document.getElementById('menu-toggle-btn');
    const sidebar = document.getElementById('sidebar');
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });

    // Outer click settings drawer dismiss
    settingsOverlay.addEventListener('click', closeDrawer);
}

function switchView(viewName) {
    if (!views[viewName]) return;

    // Update State
    state.activeView = viewName;

    // Update HTML elements active states
    Object.keys(views).forEach(key => {
        views[key].classList.toggle('active', key === viewName);
        navBtns[key].classList.toggle('active', key === viewName);
    });

    // Update header text based on view
    const title = document.getElementById('view-title');
    const subtitle = document.getElementById('view-subtitle');

    if (viewName === 'dashboard') {
        title.textContent = 'Academic Dashboard';
        subtitle.textContent = 'A glance at your academic well-being, analytics, and patterns.';
        renderTimelineChart();
    } else if (viewName === 'journal') {
        title.textContent = 'Cognitive Journaling';
        subtitle.textContent = 'Reflect on anxiety triggers and receive therapeutic reframing insights.';
    } else if (viewName === 'triggers') {
        title.textContent = 'Anxiety Trigger Matrix';
        subtitle.textContent = 'Visualizing correlations and intensity between academic stressors.';
        renderTriggerMatrix();
    } else if (viewName === 'chat') {
        title.textContent = 'Zenith Coping Playground';
        subtitle.textContent = 'Receive immediate support from our empathetic mental companion.';
    }
}

// Markdown Rendering Engine
function markdownToHTML(md) {
    if (!md) return '';

    let html = md;

    // Escape HTML entities to avoid XSS
    html = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code blocks: ```code```
    html = html.replace(/```([\s\S]*?)```/g, (match, p1) => {
        return `<pre><code>${p1.trim()}</code></pre>`;
    });

    // Inline Code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headings: ### heading
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // Blockquotes: > quote
    html = html.replace(/^&gt;[ \t]+(.*?)$/gm, '<blockquote>$1</blockquote>');

    // Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Bullet Lists: - item
    // Wrap sequential <li> tags with <ul>
    let lines = html.split('\n');
    let insideList = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('- ') || line.startsWith('* ')) {
            const content = line.substring(2);
            lines[i] = (insideList ? '' : '<ul>') + `<li>${content}</li>`;
            insideList = true;
        } else {
            if (insideList) {
                lines[i - 1] += '</ul>';
                insideList = false;
            }
        }
    }
    if (insideList) {
        lines[lines.length - 1] += '</ul>';
    }
    html = lines.join('\n');

    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Paragraphs and Line Breaks
    html = html.split(/\n{2,}/).map(p => {
        if (p.trim().startsWith('<h') || p.trim().startsWith('<ul') || p.trim().startsWith('<pre') || p.trim().startsWith('<block')) {
            return p;
        }
        return `<p>${p.trim().replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
}

// Markdown Editor Setup
function initMarkdownEditor() {
    const textarea = document.getElementById('journal-input');
    const preview = document.getElementById('journal-preview');
    const counter = document.getElementById('editor-counter');

    // Live typing preview
    textarea.addEventListener('input', () => {
        const text = textarea.value;
        preview.innerHTML = markdownToHTML(text);

        // Word counter
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        counter.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
    });

    // Toolbar Buttons
    document.querySelectorAll('.toolbar-btn[data-syntax]').forEach(btn => {
        btn.addEventListener('click', () => {
            const syntax = btn.getAttribute('data-syntax');
            const suffix = btn.getAttribute('data-suffix') || '';

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const originalText = textarea.value;

            const selection = originalText.substring(start, end);
            const replacement = syntax + selection + suffix;

            textarea.value = originalText.substring(0, start) + replacement + originalText.substring(end);
            textarea.focus();
            textarea.selectionStart = start + syntax.length;
            textarea.selectionEnd = start + syntax.length + selection.length;

            // Trigger input event to refresh preview
            textarea.dispatchEvent(new Event('input'));
        });
    });

    // Clear Editor
    document.getElementById('btn-clear-editor').addEventListener('click', () => {
        textarea.value = '';
        textarea.dispatchEvent(new Event('input'));
    });

    // Load templates
    document.querySelectorAll('.prompt-chip[data-template]').forEach(chip => {
        chip.addEventListener('click', () => {
            const template = chip.getAttribute('data-template');
            let templateText = '';

            if (template === 'mock-test') {
                templateText = `### Mock Test Reflection\n\n**Test Name:** Physics Mock Test 4\n**Current Score:** 120/300\n**Expected Score:** 180/300\n\n*What happened today?*\nI felt completely blank during the paper. Mock test scores dropped dramatically, and my marks felt extremely disappointing. My friends are scoring much higher, leading to comparison. I have backlog pages pending, which made me feel rushed.`;
            } else if (template === 'backlog-panic') {
                templateText = `### Syllabus Backlog Recovery Dump\n\n*Anxiety Triggers:*\n- Organic Chemistry backlog (5 chapters pending)\n- Integration math formulas unrevised\n\n*Emotions:*\nI feel so overwhelmed by my syllabus backlog. Every time I start studying chapter 1, I worry about chapter 5. I cannot sleep because backlog panic keeps pacing through my mind. I need a clear recovery roadmap.`;
            } else if (template === 'peer-pressure') {
                templateText = `### Peer Rank Comparison Reflections\n\n*Thoughts and Comparison:*\nEveryone else seems to be scoring higher than me in the academy. In our Telegram group, friends are posting their high marks. I feel impostor syndrome creeping in. I worry if my preparation will ever be enough compared to peer performance.`;
            }

            textarea.value = templateText;
            textarea.dispatchEvent(new Event('input'));
        });
    });

    // Analysis Button Event
    document.getElementById('btn-analyze-journal').addEventListener('click', handleJournalAnalysis);
}

// Settings Drawer Functionality
function initSettingsDrawer() {
    const openBtn = document.getElementById('open-settings-btn');
    const closeBtn = document.getElementById('close-settings-btn');
    const saveKeyBtn = document.getElementById('btn-save-key');
    const toggleVisibilityBtn = document.getElementById('toggle-key-visibility');

    openBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);

    saveKeyBtn.addEventListener('click', () => {
        saveAPIKey(apiKeyInput.value);
    });

    toggleVisibilityBtn.addEventListener('click', () => {
        const isPassword = apiKeyInput.type === 'password';
        apiKeyInput.type = isPassword ? 'text' : 'password';
    });
}

function openDrawer() {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !settingsDrawer || !settingsOverlay) return;
    settingsDrawer.classList.add('open');
    settingsOverlay.classList.add('open');
}

function closeDrawer() {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !settingsDrawer || !settingsOverlay) return;
    settingsDrawer.classList.remove('open');
    settingsOverlay.classList.remove('open');
}

// Data Export/Import Actions
function initDataActions() {
    // Load sample logs (5 Days)
    document.getElementById('btn-load-mock-history').addEventListener('click', () => {
        loadMockHistory();
        closeDrawer();
        switchView('dashboard');
        updateUI();
    });

    // Clear Logs & Keys
    document.getElementById('btn-clear-history').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all historical logs and API key configurations? This action is permanent.')) {
            localStorage.removeItem('zenith_journal_logs');
            localStorage.removeItem('zenith_api_key');
            state.logs = [];
            state.apiKey = '';
            apiKeyInput.value = '';
            updateAPIStatusUI();
            closeDrawer();
            switchView('dashboard');
            updateUI();
        }
    });

    // Export Data
    document.getElementById('btn-export-data').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.logs, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `zenith_academic_wellbeing_export_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // Import Data
    const fileInput = document.getElementById('file-import-data');
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedLogs = JSON.parse(event.target.result);
                if (Array.isArray(importedLogs)) {
                    state.logs = importedLogs;
                    localStorage.setItem('zenith_journal_logs', JSON.stringify(state.logs));
                    alert(`Successfully imported ${state.logs.length} well-being logs!`);
                    updateUI();
                    closeDrawer();
                    switchView('dashboard');
                } else {
                    alert('Invalid file format. Logs must be a JSON array.');
                }
            } catch (err) {
                alert('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
    });
}

// Render overall stats
function updateUI() {
    const avgCalmness = calculateAverageMetric('moodScore');
    const avgBacklog = calculateAverageMetric('backlogPanic');
    const avgMock = calculateAverageMetric('mockTestDrop');
    const avgPeer = calculateAverageMetric('peerComparison');

    // Header cards
    const hdrCalm = document.getElementById('hdr-wellbeing-score');
    const hdrAnxiety = document.getElementById('hdr-anxiety-level');

    if (state.logs.length > 0) {
        hdrCalm.textContent = `${avgCalmness.toFixed(1)}/10`;

        const maxAnxiety = Math.max(avgBacklog, avgMock, avgPeer);
        if (maxAnxiety > 7) {
            hdrAnxiety.textContent = 'Critical';
            hdrAnxiety.className = 'pill-value alert-text';
        } else if (maxAnxiety > 4) {
            hdrAnxiety.textContent = 'Moderate';
            hdrAnxiety.className = 'pill-value warning-text';
        } else {
            hdrAnxiety.textContent = 'Low';
            hdrAnxiety.className = 'pill-value success-text';
        }
    } else {
        hdrCalm.textContent = '--';
        hdrAnxiety.textContent = '--';
    }

    // Dashboard card fields
    updateDashboardCard('wellbeing', avgCalmness, 'bg-calm');
    updateDashboardCard('backlog', avgBacklog, 'bg-backlog');
    updateDashboardCard('mock', avgMock, 'bg-mock');
    updateDashboardCard('peer', avgPeer, 'bg-peer');

    // Dynamic Insights
    generateDashboardInsights(avgCalmness, avgBacklog, avgMock, avgPeer);

    // Render timeline SVG
    renderTimelineChart();
}

function calculateAverageMetric(key) {
    if (state.logs.length === 0) return 0;
    const sum = state.logs.reduce((acc, log) => {
        return acc + (log.analysis && log.analysis[key] !== undefined ? log.analysis[key] : 0);
    }, 0);
    return sum / state.logs.length;
}

function updateDashboardCard(id, score, barClass) {
    const scoreVal = document.getElementById(`stat-${id}`);
    const scoreBar = document.getElementById(`bar-${id}`);

    if (state.logs.length > 0) {
        scoreVal.textContent = score.toFixed(1);
        scoreBar.style.width = `${score * 10}%`;
    } else {
        scoreVal.textContent = '--';
        scoreBar.style.width = '0%';
    }
}

// Generate cognitive insight cards for Dashboard
function generateDashboardInsights(calmness, backlog, mock, peer) {
    const insightsContainer = document.getElementById('dashboard-insights');
    insightsContainer.innerHTML = '';

    if (state.logs.length === 0) {
        insightsContainer.innerHTML = `
      <div class="insight-placeholder text-center text-muted">
        <p>Write your first journal entry or load sample data to receive AI cognitive tracking insights.</p>
      </div>
    `;
        return;
    }

    const insights = [];

    // Evaluates severe anxieties
    if (backlog > 6) {
        insights.push({
            type: 'danger',
            title: 'High Backlog Panic Detected',
            desc: 'Your backlog anxiety average is elevated. Try breaking study blocks down into tiny, single-topic sessions of 25 minutes. Do not revise entire chapters at once.'
        });
    } else if (backlog > 4) {
        insights.push({
            type: 'warning',
            title: 'Backlog Anxiety Moderate',
            desc: 'Keep syllabus anxiety in check. Dedicate a fixed 1 hour daily exclusively to past revision so it does not interfere with daily current study hours.'
        });
    }

    if (mock > 6) {
        insights.push({
            type: 'danger',
            title: 'High Mock Test Panic',
            desc: 'Mock test drops are causing severe anxiety. Treat mock tests strictly as diagnostic logs, not indicators of final scores. Map mock mistakes immediately to a "Mistake Diary".'
        });
    }

    if (peer > 6) {
        insights.push({
            type: 'danger',
            title: 'Elevated Peer Comparison Stress',
            desc: 'Comparison stress is high. Try logging out of public rank lists, student discussions, or study channels. Focus exclusively on your past week score gains.'
        });
    }

    if (calmness > 7 && insights.length === 0) {
        insights.push({
            type: 'success',
            title: 'Emotional Well-being Stable',
            desc: 'Excellent! Your mental well-being is balanced. Keep writing daily logs to sustain healthy academic emotional habits.'
        });
    }

    if (insights.length === 0) {
        insights.push({
            type: 'success',
            title: 'Academic Flow Progressing',
            desc: 'Your metrics are within healthy limits. Continue using the planner widgets and tracking anxieties weekly.'
        });
    }

    insights.forEach(ins => {
        const card = document.createElement('div');
        card.className = `insight-card ${ins.type} animate-fade-in`;
        card.innerHTML = `
      <div class="insight-card-header">
        <span class="insight-card-title">${ins.title}</span>
        <span class="insight-time">Active</span>
      </div>
      <p class="insight-body">${ins.desc}</p>
    `;
        insightsContainer.appendChild(card);
    });
}

// -------------------------------------------------------------
// VISUALIZATION ENGINE (SVG RENDERERS)
// -------------------------------------------------------------

// Timeline Chart SVG Drawing
function renderTimelineChart() {
    if (state.logs.length === 0) {
        timelineSvg.innerHTML = `<text x="400" y="160" fill="rgba(255,255,255,0.4)" text-anchor="middle" font-size="14">No journal logs recorded yet. Start writing to view charts.</text>`;
        return;
    }

    // Sort logs by timestamp ascending
    const sortedLogs = [...state.logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Parameters
    const width = 800;
    const height = 320;
    const padding = CHART_PADDING;

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const numPoints = sortedLogs.length;

    // X-scale positions
    const getX = (index) => {
        if (numPoints <= 1) return padding.left + plotWidth / 2;
        return padding.left + (index / (numPoints - 1)) * plotWidth;
    };

    // Y-scale positions (Score 0-10 -> Height)
    const getY = (val) => {
        const clampedVal = Math.max(0, Math.min(10, val));
        return padding.top + plotHeight - (clampedVal / 10) * plotHeight;
    };

    // Formats Dates
    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    let svgContent = '';

    // 1. Grid lines and Y axis numbers
    for (let i = 0; i <= 5; i++) {
        const val = i * 2;
        const y = getY(val);
        svgContent += `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid-line" />
      <text x="${padding.left - 10}" y="${y + 4}" fill="var(--color-text-dim)" font-size="11" text-anchor="end">${val}</text>
    `;
    }

    // 2. Plot X axis labels
    sortedLogs.forEach((log, index) => {
        const x = getX(index);
        svgContent += `
      <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" class="chart-grid-line" />
      <text x="${x}" y="${height - padding.bottom + 20}" fill="var(--color-text-dim)" font-size="10" text-anchor="middle">${formatDate(log.timestamp)}</text>
    `;
    });

    // 3. Construct line paths
    const keys = [
        { name: 'moodScore', color: 'var(--color-calm)', cls: 'line-wellbeing' },
        { name: 'backlogPanic', color: 'var(--color-backlog)', cls: 'line-backlog' },
        { name: 'mockTestDrop', color: 'var(--color-mock)', cls: 'line-mock' },
        { name: 'peerComparison', color: 'var(--color-peer)', cls: 'line-peer' }
    ];

    keys.forEach(k => {
        let path = '';
        sortedLogs.forEach((log, idx) => {
            const val = log.analysis && log.analysis[k.name] !== undefined ? log.analysis[k.name] : 0;
            const x = getX(idx);
            const y = getY(val);
            path += (idx === 0) ? `M ${x} ${y}` : ` L ${x} ${y}`;
        });

        if (numPoints > 1) {
            svgContent += `<path d="${path}" class="chart-line ${k.cls}" />`;
        }
    });

    // 4. Render Interactive circles
    sortedLogs.forEach((log, idx) => {
        const x = getX(idx);

        keys.forEach(k => {
            const val = log.analysis && log.analysis[k.name] !== undefined ? log.analysis[k.name] : 0;
            const y = getY(val);

            const keyClass = k.name === 'moodScore' ? 'wellbeing' : (k.name === 'backlogPanic' ? 'backlog' : (k.name === 'mockTestDrop' ? 'mock' : 'peer'));

            svgContent += `
        <circle cx="${x}" cy="${y}" r="4" class="chart-dot dot-${keyClass}" 
                data-index="${idx}" data-metric="${k.name}" data-val="${val}" />
      `;
        });
    });

    // Set SVG
    timelineSvg.innerHTML = svgContent;

    // Bind Tooltip listeners
    document.querySelectorAll('#timeline-svg .chart-dot').forEach(dot => {
        dot.addEventListener('mouseenter', showChartTooltip);
        dot.addEventListener('mouseleave', hideChartTooltip);
    });
}

// Tooltip Injections
let activeTooltipEl = null;

function showChartTooltip(e) {
    const dot = e.target;
    const idx = parseInt(dot.getAttribute('data-index'));
    const log = [...state.logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[idx];
    const metric = dot.getAttribute('data-metric');
    const val = dot.getAttribute('data-val');

    const metricLabel = metric === 'moodScore' ? 'Calmness' : (metric === 'backlogPanic' ? 'Backlog Panic' : (metric === 'mockTestDrop' ? 'Mock Test Drop' : 'Peer Comparison'));

    // Retrieve absolute coordinates
    const clientRect = dot.getBoundingClientRect();
    const svgRect = timelineSvg.getBoundingClientRect();

    const x = clientRect.left - svgRect.left + 4;
    const y = clientRect.top - svgRect.top - 80;

    const dateStr = new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const journalSnippet = log.rawText.length > 50 ? log.rawText.substring(0, 50) + '...' : log.rawText;

    // Create tooltip HTML element dynamically over SVG container
    const container = document.getElementById('timeline-chart-container');

    const tooltip = document.createElement('div');
    tooltip.className = 'chart-html-tooltip glass-panel';
    tooltip.style.position = 'absolute';
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.transform = 'translate(-50%, -100%)';
    tooltip.style.zIndex = '50';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.padding = '8px 12px';
    tooltip.style.fontSize = '11px';
    tooltip.style.borderRadius = 'var(--radius-sm)';
    tooltip.style.minWidth = '180px';
    tooltip.style.background = 'rgba(10, 15, 30, 0.95)';
    tooltip.style.border = '1px solid var(--color-border)';
    tooltip.style.boxShadow = 'var(--shadow-glass)';
    tooltip.style.transition = 'all 0.15s ease';

    tooltip.innerHTML = `
    <div style="font-weight:700; color:var(--color-secondary); margin-bottom: 2px;">${metricLabel}: ${val}/10</div>
    <div style="color:var(--color-text-dim); font-size:9px; margin-bottom: 4px;">${dateStr}</div>
    <div style="color:var(--color-text-muted); font-style:italic;">"${journalSnippet}"</div>
  `;

    container.appendChild(tooltip);
    activeTooltipEl = tooltip;
}

function hideChartTooltip() {
    if (activeTooltipEl) {
        activeTooltipEl.remove();
        activeTooltipEl = null;
    }
}

// Trigger Matrix SVG Network Drawing
function renderTriggerMatrix() {
    if (state.logs.length === 0) {
        matrixSvg.innerHTML = `<text x="300" y="200" fill="rgba(255,255,255,0.4)" text-anchor="middle" font-size="14">No journal logs recorded yet. Create journals to see relational triggers.</text>`;
        return;
    }

    // Calculate average scores for nodes sizing
    const avgs = {
        backlog: calculateAverageMetric('backlogPanic'),
        mock: calculateAverageMetric('mockTestDrop'),
        peer: calculateAverageMetric('peerComparison'),
        other: calculateAverageMetric('otherAnxiety')
    };

    // Calculate co-occurrence matrix (correlation lines)
    // Define links: { source, target, count }
    const links = [
        { s: 'backlog', t: 'mock', count: 0 },
        { s: 'backlog', t: 'peer', count: 0 },
        { s: 'backlog', t: 'other', count: 0 },
        { s: 'mock', t: 'peer', count: 0 },
        { s: 'mock', t: 'other', count: 0 },
        { s: 'peer', t: 'other', count: 0 }
    ];

    state.logs.forEach(log => {
        const a = log.analysis;
        if (!a) return;

        // Co-occurrence counts if both categories score > 3 in the same entry
        const threshold = 3;
        if (a.backlogPanic > threshold && a.mockTestDrop > threshold) incrementLink(links, 'backlog', 'mock');
        if (a.backlogPanic > threshold && a.peerComparison > threshold) incrementLink(links, 'backlog', 'peer');
        if (a.backlogPanic > threshold && a.otherAnxiety > threshold) incrementLink(links, 'backlog', 'other');
        if (a.mockTestDrop > threshold && a.peerComparison > threshold) incrementLink(links, 'mock', 'peer');
        if (a.mockTestDrop > threshold && a.otherAnxiety > threshold) incrementLink(links, 'mock', 'other');
        if (a.peerComparison > threshold && a.otherAnxiety > threshold) incrementLink(links, 'peer', 'other');
    });

    let svgContent = '';

    // 1. Draw relational edges (links)
    links.forEach(l => {
        if (l.count === 0) return;

        const posS = NODE_POSITIONS[l.s];
        const posT = NODE_POSITIONS[l.t];
        const strokeWidth = Math.min(8, 1 + l.count * 1.5);

        svgContent += `
      <line x1="${posS.x}" y1="${posS.y}" x2="${posT.x}" y2="${posT.y}" 
            stroke="rgba(255,255,255,0.15)" stroke-width="${strokeWidth}" 
            class="matrix-edge-line" id="edge-${l.s}-${l.t}" />
    `;
    });

    // 2. Draw nodes (bubbles)
    Object.keys(NODE_POSITIONS).forEach(k => {
        const node = NODE_POSITIONS[k];
        const avgScore = avgs[k];

        // Sizing formula
        const radius = 25 + (avgScore * 3.5); // Range: 25px - 60px

        svgContent += `
      <g class="matrix-node-group" data-node="${k}" style="cursor:pointer">
        <circle cx="${node.x}" cy="${node.y}" r="${radius}" 
                fill="${node.color}" fill-opacity="0.25" stroke="${node.color}" stroke-width="2.5" 
                class="matrix-node-circle" id="node-${k}" />
        <circle cx="${node.x}" cy="${node.y}" r="${radius - 5}" 
                fill="${node.color}" fill-opacity="0.05" stroke="${node.color}" stroke-width="0.5" stroke-dasharray="2,2" />
        <text x="${node.x}" y="${node.y + 4}" class="matrix-node-text" text-anchor="middle">${node.name.split(' ')[0]}</text>
      </g>
    `;
    });

    matrixSvg.innerHTML = svgContent;

    // Attach interactive node clicks
    document.querySelectorAll('#matrix-svg .matrix-node-group').forEach(group => {
        group.addEventListener('mouseenter', handleNodeHover);
        group.addEventListener('click', handleNodeClick);
    });
}

function incrementLink(links, source, target) {
    const link = links.find(l => (l.s === source && l.t === target) || (l.s === target && l.t === source));
    if (link) link.count++;
}

// Display Coping strategy recommendations based on Node hover
function handleNodeHover(e) {
    const nodeKey = e.currentTarget.getAttribute('data-node');
    const node = NODE_POSITIONS[nodeKey];
    const avg = calculateAverageMetric(node.key);

    // Show details panel
    const detailsPanel = document.getElementById('matrix-details-panel');
    detailsPanel.classList.remove('hidden');

    // Node metrics
    document.getElementById('matrix-details-badge').textContent = node.name;
    document.getElementById('matrix-details-badge').style.borderColor = node.color;
    document.getElementById('matrix-details-badge').style.background = node.color.replace(')', ', 0.15)');
    document.getElementById('matrix-details-avg').textContent = `Academy average: ${avg.toFixed(1)}/10`;
    document.getElementById('matrix-details-title').textContent = `${node.name} Reframing Guide`;

    // Recommendations mapping
    let desc = '';
    let reco = '';

    if (nodeKey === 'backlog') {
        desc = 'Anxiety originating from unfinished lectures, skipped revision assignments, and mock backlogs piling up.';
        reco = '💡 Backlog Coping Rules:\n1. Prioritize a single 45-minute chunk daily for old syllabus blocks.\n2. Do NOT try to complete 100% of past backlogs; target the high-yield chapters first.\n3. Keep present lectures running in parallel—never halt current schedule to cover the past.';
    } else if (nodeKey === 'mock') {
        desc = 'Distress triggered by scores dropping in test papers, negative marking penalties, and perceived low percentiles.';
        reco = '📉 Test Anxiety Coping Rules:\n1. Maintain a dedicated "Mistake Diary". List why each question was missed (e.g. concept gap vs silly calc error).\n2. Treat test results as debugging logs, not a judgment of intelligence.\n3. Do not check leaderboard rankings immediately after paper completion.';
    } else if (nodeKey === 'peer') {
        desc = 'Social performance panic caused by comparing rank list percentiles, toppers marks, or discussion channels.';
        reco = '👥 Comparison Alleviating Rules:\n1. Delete or mute telegram groups and forum chat threads for 2 weeks.\n2. Compete strictly with your yesterday\'s self. Keep a daily tracker of formulas/problems solved.\n3. Remember that peer progress is heavily curated—you see their peaks, not their private struggles.';
    } else if (nodeKey === 'other') {
        desc = 'General exam stress, parental expectation load, physical fatigue, sleeping pattern drops, or exam day fear.';
        reco = '🧘 General Well-being Rules:\n1. Enforce a hard stop at 11:30 PM. 7 hours of sleep is non-negotiable for academic cognitive functioning.\n2. Practice Box Breathing (4s inhale, 4s hold, 4s exhale, 4s hold) during test panic episodes.\n3. Have weekly offline discussions with parents about study fatigue.';
    }

    document.getElementById('matrix-details-desc').textContent = desc;
    document.getElementById('matrix-details-reco').innerHTML = reco.replace(/\n/g, '<br>');

    // Visual glow styling (highlight connections)
    document.querySelectorAll('.matrix-edge-line').forEach(line => {
        const isConnected = line.id.includes(nodeKey);
        line.classList.toggle('active', isConnected);
    });
}

function handleNodeClick(e) {
    const nodeKey = e.currentTarget.getAttribute('data-node');
    // Scroll to detail widget
    document.getElementById('matrix-details-panel').scrollIntoView({ behavior: 'smooth' });
}

// -------------------------------------------------------------
// CORE BUSINESS LOGIC (JOURNAL ANALYSIS & GEMINI CONNECTOR)
// -------------------------------------------------------------

async function handleJournalAnalysis() {
    const textarea = document.getElementById('journal-input');
    const text = textarea.value.trim();

    if (!text) {
        alert('Please draft some text in the daily journal before requesting cognitive well-being evaluations.');
        return;
    }

    // Show spinner
    const spinner = document.getElementById('analyze-spinner');
    const btn = document.getElementById('btn-analyze-journal');
    spinner.classList.remove('hidden');
    btn.disabled = true;

    let analysisResult;

    try {
        if (state.apiKey) {
            // Connect to live Google Gemini Endpoint
            analysisResult = await fetchGeminiAnalysis(text);
        } else {
            // Fallback Mock Logic
            await sleep(1500); // Simulate network latency
            analysisResult = mockAnalyzeJournalLocal(text);
        }

        // Save to history list
        const newLog = {
            id: generateUUID(),
            timestamp: new Date().toISOString(),
            rawText: text,
            analysis: analysisResult
        };

        state.logs.push(newLog);
        localStorage.setItem('zenith_journal_logs', JSON.stringify(state.logs));

        // Update Layouts & Charts
        updateUI();
        displayAssessmentResults(newLog);

    } catch (err) {
        console.error('Analysis failed:', err);
        alert(`An error occurred during evaluation: ${err.message}`);
    } finally {
        spinner.classList.add('hidden');
        btn.disabled = false;
    }
}

// REST call to Google AI Studio Gemini API
async function fetchGeminiAnalysis(journalText) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`;

    const systemPrompt = `You are the core cognitive analyzer for Zenith Academy AI, a student mental well-being companion.
Your role is to analyze a student's competitive examination journal entries and extract mental well-being scores.
Look for anxieties: Backlog Panic (fear of syllabus left behind), Mock Test Drops (frustration over marks dropping), and Peer Comparison (comparing with ranks of other students).
Format your entire output strictly as a JSON object matching this schema:
{
  "mood": "Overall emotional mood category (e.g. Overwhelmed, Exhausted, Calm, Anxious, Hopeful, Motivated)",
  "moodScore": "Overall wellbeing/calmness score from 1 (severe distress/panic) to 10 (perfectly calm/focused)",
  "backlogPanic": "Score from 0 (no backlog anxiety) to 10 (extreme panic about pending chapters)",
  "mockTestDrop": "Score from 0 (no test drop panic) to 10 (severe distress about marks/rank drops)",
  "peerComparison": "Score from 0 (no comparison anxiety) to 10 (intense peer comparison or impostor syndrome)",
  "otherAnxiety": "Score from 0 (no general stress) to 10 (high parental pressure, fatigue, exam day panic)",
  "empatheticResponse": "Empathetic, therapeutic reframe & coping guidance. Address their concerns directly with constructive advice.",
  "keyTriggers": ["extracted phrases, keywords, or triggers from journal text"]
}`;

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: `${systemPrompt}\n\nStudent Journal Entry:\n"""\n${journalText}\n"""` }
                ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    mood: { type: "STRING" },
                    moodScore: { type: "INTEGER" },
                    backlogPanic: { type: "INTEGER" },
                    mockTestDrop: { type: "INTEGER" },
                    peerComparison: { type: "INTEGER" },
                    otherAnxiety: { type: "INTEGER" },
                    empatheticResponse: { type: "STRING" },
                    keyTriggers: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                required: ["mood", "moodScore", "backlogPanic", "mockTestDrop", "peerComparison", "otherAnxiety", "empatheticResponse", "keyTriggers"]
            }
        }
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();
    const textResult = responseData.candidates[0].content.parts[0].text;

    // Parse and return JSON
    return JSON.parse(textResult);
}

// Local Fallback Analyzer
function mockAnalyzeJournalLocal(text) {
    const lowercase = text.toLowerCase();

    // Simple keyword matching scores
    let backlog = 0;
    let mock = 0;
    let peer = 0;
    let other = 2; // base stress

    // Backlog keywords
    const backlogKeywords = ['backlog', 'behind', 'pending', 'chapters', 'revision', 'syllabi', 'syllabus', 'left to do'];
    backlogKeywords.forEach(kw => {
        if (lowercase.includes(kw)) backlog += 2.5;
    });

    // Mock Test keywords
    const mockKeywords = ['mock', 'test', 'score', 'rank', 'marks', 'exam', 'paper', 'performance', 'dropped', 'decrease'];
    mockKeywords.forEach(kw => {
        if (lowercase.includes(kw)) mock += 2.5;
    });

    // Peer comparison keywords
    const peerKeywords = ['friend', 'peer', 'others', 'everyone else', 'telegram', 'whatsapp', 'topper', 'compare', 'group'];
    peerKeywords.forEach(kw => {
        if (lowercase.includes(kw)) peer += 2.5;
    });

    // Clamp values
    backlog = Math.min(10, Math.round(backlog));
    mock = Math.min(10, Math.round(mock));
    peer = Math.min(10, Math.round(peer));

    if (lowercase.includes('parent') || lowercase.includes('family') || lowercase.includes('sleep') || lowercase.includes('tired')) {
        other += 4;
    }
    other = Math.min(10, Math.round(other));

    // Calculate Wellbeing
    const maxAnxiety = Math.max(backlog, mock, peer, other);
    const moodScore = Math.max(1, 10 - Math.round(maxAnxiety * 0.8));

    // Mood description mapping
    let mood = 'Calm';
    if (moodScore <= 3) mood = 'Overwhelmed';
    else if (moodScore <= 5) mood = 'Anxious';
    else if (moodScore <= 7) mood = 'Fatigued';
    else if (moodScore <= 9) mood = 'Stable';

    // Identify key triggers
    const keyTriggers = [];
    if (backlog > 3) keyTriggers.push('Syllabus backlog');
    if (mock > 3) keyTriggers.push('Mock paper drops');
    if (peer > 3) keyTriggers.push('Peer percentile comparison');
    if (lowercase.includes('physics')) keyTriggers.push('Physics prep');
    if (lowercase.includes('chemistry')) keyTriggers.push('Chemistry backlog');
    if (lowercase.includes('math')) keyTriggers.push('Math marks');

    if (keyTriggers.length === 0) keyTriggers.push('General studies load');

    // Construct localized therapeutic advice
    let empatheticResponse = 'Your journal reveals some academic anxiety. Here is an action plan:\n\n';

    if (backlog > 4) {
        empatheticResponse += '• **Backlog Action:** Avoid trying to cover everything in a single weekend. Block just 30-45 minutes daily for one past pending topic. Keep current classroom schedules running.\n';
    }
    if (mock > 4) {
        empatheticResponse += '• **Mock Test Action:** A drop in scores is standard during the preparation phase. Shift focus from scores to identifying core conceptual error loops. Maintain a dedicated Error Log.\n';
    }
    if (peer > 4) {
        empatheticResponse += '• **Comparison Action:** Limit peer interactions on rank platforms and telegram chat loops. Compete strictly against your yesterday\'s metrics.\n';
    }

    if (moodScore > 6) {
        empatheticResponse = 'Your emotional state seems stable and resilient. Keep writing down your journals to catalog stress factors, maintain study routines, and regulate sleep cycles. Great job!';
    } else {
        empatheticResponse += '\nRemember: Competitive preparation is a marathon, not a sprint. Prioritize sleeping 7 hours to allow proper cognitive processing.';
    }

    return {
        mood,
        moodScore,
        backlogPanic: backlog,
        mockTestDrop: mock,
        peerComparison: peer,
        otherAnxiety: other,
        empatheticResponse,
        keyTriggers
    };
}

// UI Assess panels
function displayAssessmentResults(log) {
    const section = document.getElementById('analysis-result-section');
    section.classList.remove('hidden');

    const dateObj = new Date(log.timestamp);
    const formattedDate = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    document.getElementById('assessment-timestamp').textContent = `Analyzed on ${formattedDate}`;

    // Badges
    const moodBadge = document.getElementById('assessment-mood-badge');
    const scoreBadge = document.getElementById('assessment-score-badge');
    moodBadge.textContent = `Mood: ${log.analysis.mood}`;
    scoreBadge.textContent = `Calmness: ${log.analysis.moodScore}/10`;

    // Narrative response
    document.getElementById('assessment-narrative').innerHTML = markdownToHTML(log.analysis.empatheticResponse);

    // Trigger chips
    const triggerContainer = document.getElementById('assessment-triggers');
    triggerContainer.innerHTML = '';
    log.analysis.keyTriggers.forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'trigger-chip';
        chip.textContent = t;
        triggerContainer.appendChild(chip);
    });

    // Set progress bars
    setAssessmentMetric('backlog', log.analysis.backlogPanic);
    setAssessmentMetric('mock', log.analysis.mockTestDrop);
    setAssessmentMetric('peer', log.analysis.peerComparison);
    setAssessmentMetric('other', log.analysis.otherAnxiety);

    // Scroll to assessments
    section.scrollIntoView({ behavior: 'smooth' });
}

function setAssessmentMetric(id, score) {
    document.getElementById(`val-assessment-${id}`).textContent = `${score}/10`;
    document.getElementById(`bar-assessment-${id}`).style.width = `${score * 10}%`;
}

// -------------------------------------------------------------
// CHAT PLAYGROUND CONTROLLERS
// -------------------------------------------------------------

function initChatWidget() {
    const textbox = document.getElementById('chat-textbox');
    const sendBtn = document.getElementById('btn-chat-send');
    const clearBtn = document.getElementById('btn-clear-chat');

    const sendMessage = () => {
        const text = textbox.value.trim();
        if (!text) return;

        // Add user message to UI
        appendChatMessage('user', text);
        textbox.value = '';

        // Trigger AI response flow
        triggerChatCoachResponse(text);
    };

    sendBtn.addEventListener('click', sendMessage);
    textbox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    clearBtn.addEventListener('click', () => {
        if (confirm('Clear entire conversation history?')) {
            const messagesContainer = document.getElementById('chat-messages');
            messagesContainer.innerHTML = `
        <div class="chat-message bot-msg animate-fade-in">
          <div class="message-content">
            Hello! I am your Zenith Academy Well-being Coach. Let's restart our conversation. What is on your mind today?
          </div>
          <span class="msg-time">Just now</span>
        </div>
      `;
            state.chatHistory = [];
        }
    });

    // Chat Suggestion Chips
    document.querySelectorAll('.chat-suggest-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.textContent;
            appendChatMessage('user', text);
            triggerChatCoachResponse(text);
        });
    });
}

function appendChatMessage(sender, text) {
    const container = document.getElementById('chat-messages');
    const msgClass = sender === 'user' ? 'user-msg' : 'bot-msg';

    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${msgClass}`;

    // Clean markdown parsing for bot message bubbles
    const formattedContent = sender === 'bot' ? markdownToHTML(text) : text;

    msgEl.innerHTML = `
    <div class="message-content">${formattedContent}</div>
    <span class="msg-time">Just now</span>
  `;

    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
}

// Mock/Live chat response flow
async function triggerChatCoachResponse(userMessage) {
    const container = document.getElementById('chat-messages');

    // Show Typing Indicator
    const indicator = document.createElement('div');
    indicator.className = 'chat-message bot-msg typing-indicator-wrapper';
    indicator.innerHTML = `
    <div class="typing-indicator">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;

    let botReply = '';

    try {
        if (state.apiKey) {
            botReply = await fetchGeminiChatReply(userMessage);
        } else {
            await sleep(1200); // Simulate AI thinking
            botReply = generateMockChatReply(userMessage);
        }
    } catch (err) {
        console.error('Chat AI failed:', err);
        botReply = `⚠️ Failed to fetch response. Error: ${err.message}. Please verify your API Key.`;
    } finally {
        // Remove indicator
        indicator.remove();
    }

    appendChatMessage('bot', botReply);
}

// Conversation connector to Gemini endpoint
async function fetchGeminiChatReply(newMessage) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`;

    // Add message to tracking history
    state.chatHistory.push({ role: 'user', content: newMessage });

    // Format history messages
    const systemContext = `You are the empathetic, supportive Zenith Academy Well-being Coach.
You help competitive exam students cope with study burnout, backlog panic, mock test drops, and peer rank comparison stress.
Respond in a friendly, conversational manner. Provide short, constructive academic counseling advices. Use bullet points where appropriate. Keep your message under 150 words.`;

    const messagesPayload = [
        { role: 'user', parts: [{ text: systemContext }] }
    ];

    // Add latest messages for history depth (last 6 messages)
    const historyDepth = state.chatHistory.slice(-6);
    historyDepth.forEach(msg => {
        messagesPayload.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        });
    });

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contents: messagesPayload })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();
    const botReply = responseData.candidates[0].content.parts[0].text;

    // Append model response to state history
    state.chatHistory.push({ role: 'bot', content: botReply });

    return botReply;
}

// Mock Chat responses
function generateMockChatReply(msg) {
    const text = msg.toLowerCase();
    const responses = [];

    if (text.includes('backlog') || text.includes('behind') || text.includes('pending') || text.includes('syllabus')) {
        responses.push(`📚 **Dealing with syllabus backlog:** Focus on allocating just 1 hour every morning dedicated *only* to covering backlog topics. Keep your current daily classwork running in parallel so you do not generate new backlogs. Which specific chapter is causing the most panic?`);
    }
    if (text.includes('parent') || text.includes('family') || text.includes('father') || text.includes('mother') || text.includes('expect') || text.includes('pressure')) {
        responses.push(`👥 **Handling family pressure:** Parental expectations usually stem from care, but they can feel overwhelming. Try explaining your mock logs and revision schedules to them calmly. Separating your self-worth from test marks is crucial.`);
    }
    if (text.includes('sleep') || text.includes('insomnia') || text.includes('tired') || text.includes('fatigue') || text.includes('night') || text.includes('exhausted') || text.includes('rest')) {
        responses.push(`🧘 **Managing sleep and exhaustion:** Academic performance is heavily tied to sleep. Restricting sleep to study more is self-defeating, as it impairs recall. Enforce a hard stop at 11:30 PM. Sleeping 7 hours is non-negotiable.`);
    }
    if (text.includes('marks') || text.includes('score') || text.includes('drop') || text.includes('rank') || text.includes('mock') || text.includes('test') || text.includes('exam')) {
        responses.push(`📉 **Analyzing mock test drops:** Treat score drops as diagnostics rather than final rankings. Do a structured error analysis (concept gaps vs calculation slips) and log errors in a dedicated "Mistake Diary" to reclaim easy marks.`);
    }
    if (text.includes('compare') || text.includes('peer') || text.includes('others') || text.includes('everyone')) {
        responses.push(`✨ **Countering peer comparison:** Public leaderboard rankings are curated and highly deceptive. Focus exclusively on your own personal growth metrics week-over-week. Mute study discussion threads for 7 days.`);
    }

    if (responses.length > 0) {
        if (responses.length === 1) {
            return responses[0];
        }
        return `I hear that you are dealing with multiple challenges simultaneously. Let's address them step-by-step:\n\n` + responses.join('\n\n');
    }

    return `I understand competitive exam preparation is tough. Break your day into study blocks of 50 minutes followed by a 10-minute walk.\n\nWhat specific subject or stress factor is bothering you most right now? Let's break it down together.`;
}

// -------------------------------------------------------------
// UTILITIES & STATIC DATA SEEDING
// -------------------------------------------------------------

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateUUID() {
    return 'uuid-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
}

// Seeds 5 Days of realistic academic data
function loadMockHistory() {
    const sampleLogs = [
        {
            id: generateUUID(),
            timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
            rawText: "Physics mock test marks dropped to 110. I feel extremely down. Everyone in my study circle scored above 150. Feel like I am not cut out for competitive exams.",
            analysis: {
                mood: "Disappointed",
                moodScore: 3,
                backlogPanic: 4,
                mockTestDrop: 8,
                peerComparison: 8,
                otherAnxiety: 5,
                empatheticResponse: "A mock drop is a natural phase of syllabus cycles. Do not let peer scores dictate your self-worth. Shift focus strictly to error correction.",
                keyTriggers: ["physics mock drops", "study circle rankings", "marks dropping"]
            }
        },
        {
            id: generateUUID(),
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            rawText: "Organic Chemistry backlog is 6 chapters now. I couldn't study today because I was panicking about how much lectures are pending. Need a revision plan.",
            analysis: {
                mood: "Overwhelmed",
                moodScore: 2,
                backlogPanic: 9,
                mockTestDrop: 4,
                peerComparison: 5,
                otherAnxiety: 6,
                empatheticResponse: "Syllabus backlog panic is causing analysis paralysis. Break down the chapters. Study 45 minutes of backlog first thing in the morning, then focus on fresh concepts.",
                keyTriggers: ["chemistry backlog", "lecture backlog", "backlog panic"]
            }
        },
        {
            id: generateUUID(),
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
            rawText: "Took a deep breath and drafted a backlog micro-schedule today. Covered 1 chapter of Chemistry. Still feel behind but a bit better.",
            analysis: {
                mood: "Relieved",
                moodScore: 5,
                backlogPanic: 6,
                mockTestDrop: 3,
                peerComparison: 4,
                otherAnxiety: 3,
                empatheticResponse: "Excellent step in taking control! One chapter completed is a concrete win. Sustain this pattern and backlog anxiety will shrink.",
                keyTriggers: ["micro-schedule", "chemistry study", "backlog reduction"]
            }
        },
        {
            id: generateUUID(),
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            rawText: "My roommate got selected in the mock top-10. I feel happy for him but secretly feel so incompetent. Struggling to concentrate on math integration problems.",
            analysis: {
                mood: "Envious",
                moodScore: 4,
                backlogPanic: 5,
                mockTestDrop: 3,
                peerComparison: 9,
                otherAnxiety: 4,
                empatheticResponse: "Comparison is normal, but your roommate's success does not take away from your potential. Mute leaderboard chats and work on 10 integration sums today.",
                keyTriggers: ["roommate ranking", "top-10 comparisons", "math integration"]
            }
        },
        {
            id: generateUUID(),
            timestamp: new Date().toISOString(), // Today
            rawText: "Had a productive study day. Blocked out all telegram channels. Slept 7 hours last night. Solved 30 physics numericals and feel much calmer.",
            analysis: {
                mood: "Calm & Motivated",
                moodScore: 8,
                backlogPanic: 3,
                mockTestDrop: 2,
                peerComparison: 2,
                otherAnxiety: 2,
                empatheticResponse: "Fantastic! Sleep hygiene and disconnecting from public channels immediately improved your wellbeing index. Solve another 20 sums tomorrow.",
                keyTriggers: ["telegram blockout", "physics numericals", "calm study flow"]
            }
        }
    ];

    state.logs = sampleLogs;
    localStorage.setItem('zenith_journal_logs', JSON.stringify(state.logs));
}

// Seeds 4 detailed logs on first load if localStorage is empty
function initializeSeedData() {
    if (typeof localStorage === 'undefined') return;
    const savedLogs = localStorage.getItem('zenith_journal_logs');
    if (!savedLogs || JSON.parse(savedLogs).length === 0) {
        const sampleLogs = [
            {
                id: 'seed-log-1',
                timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
                rawText: "I feel completely overwhelmed by my syllabus backlog. Organic Chemistry is piling up with 5 chapters pending. Every time I think of mock tests, backlog panic keeps pacing through my mind. I feel so far behind my classmates.",
                analysis: {
                    mood: "Overwhelmed",
                    moodScore: 3,
                    backlogPanic: 8,
                    mockTestDrop: 4,
                    peerComparison: 7,
                    otherAnxiety: 5,
                    empatheticResponse: "Syllabus backlog panic is causing analysis paralysis. Break down the chapters. Study 45 minutes of backlog first thing in the morning, then focus on fresh concepts. Mute rank chats for a few days to ease the peer comparison stress.",
                    keyTriggers: ["Organic Chemistry backlog", "mock tests", "far behind"]
                }
            },
            {
                id: 'seed-log-2',
                timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                rawText: "Disappointed with my physics mock test marks today. Scores dropped by 40 marks. Roommate scored top-10 and I secretly feel so incompetent. Integration maths is also pending.",
                analysis: {
                    mood: "Disappointed",
                    moodScore: 4,
                    backlogPanic: 6,
                    mockTestDrop: 9,
                    peerComparison: 8,
                    otherAnxiety: 4,
                    empatheticResponse: "A mock drop is a natural diagnostic phase. Shift focus from leaderboard ranks to identifying core concept mistakes. Solve 10 math integration problems step-by-step today.",
                    keyTriggers: ["physics mock test drop", "roommate selection", "incompetent feelings"]
                }
            },
            {
                id: 'seed-log-3',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                rawText: "Couldn't sleep last night because I was thinking about mock test drops. I am so tired and exhausted. Parents called and asked about my score, which added to the pressure.",
                analysis: {
                    mood: "Fatigued",
                    moodScore: 3,
                    backlogPanic: 5,
                    mockTestDrop: 8,
                    peerComparison: 6,
                    otherAnxiety: 8,
                    empatheticResponse: "Sleep deprivation directly harms cognitive performance. Enforce a hard stop at 11:30 PM. Speak with your parents calmly about academic exhaustion—they care about your well-being first.",
                    keyTriggers: ["insomnia/no sleep", "parent expectations", "exhausted"]
                }
            },
            {
                id: 'seed-log-4',
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                rawText: "Had a productive study day! Muted all student discussion groups. Slept 7 hours last night. Physics backlog is starting to clear and I feel much calmer.",
                analysis: {
                    mood: "Calm & Focused",
                    moodScore: 8,
                    backlogPanic: 3,
                    mockTestDrop: 2,
                    peerComparison: 2,
                    otherAnxiety: 2,
                    empatheticResponse: "Outstanding boundary setting. Disconnecting from public leaderboards directly restores focus. Maintain this structured daily pattern.",
                    keyTriggers: ["muted discussion groups", "7 hours sleep", "physics study"]
                }
            }
        ];
        state.logs = sampleLogs;
        localStorage.setItem('zenith_journal_logs', JSON.stringify(sampleLogs));
    }
}

// Welcome Modal Controller
function initWelcomeModal() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const overlay = document.getElementById('welcome-modal-overlay');
    const btnExplore = document.getElementById('btn-explore-demo');
    const btnEnterKey = document.getElementById('btn-enter-api-key');

    if (!overlay) return;

    const dismissed = typeof localStorage !== 'undefined' ? localStorage.getItem('zenith_welcome_dismissed') : null;
    if (!dismissed) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }

    if (btnExplore) {
        btnExplore.addEventListener('click', () => {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('zenith_welcome_dismissed', 'true');
            }
            overlay.classList.add('hidden');
        });
    }

    if (btnEnterKey) {
        btnEnterKey.addEventListener('click', () => {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('zenith_welcome_dismissed', 'true');
            }
            overlay.classList.add('hidden');
            openDrawer();
        });
    }
}
