/**
 * Automated Tests for Zenith Academy AI
 * Run using: node app.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Zenith Academy AI Test Suite...');

// Mock Browser Environment
const eventListeners = {};

global.window = {
    addEventListener: (event, cb) => {
        if (!eventListeners[event]) eventListeners[event] = [];
        eventListeners[event].push(cb);
    }
};

const createMockElement = (id = '') => ({
    value: '',
    textContent: '',
    innerHTML: '',
    className: '',
    style: { width: '0%', left: '0px', top: '0px', transform: '', zIndex: '0', pointerEvents: '', padding: '', fontSize: '', borderRadius: '', minWidth: '', background: '', border: '', boxShadow: '', transition: '' },
    classList: {
        add: () => { },
        remove: () => { },
        toggle: () => { },
        contains: () => false
    },
    addEventListener: () => { },
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    appendChild: () => { },
    scrollIntoView: () => { }
});

global.document = {
    addEventListener: (event, cb) => {
        if (!eventListeners[event]) eventListeners[event] = [];
        eventListeners[event].push(cb);
    },
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    getElementById: (id) => createMockElement(id)
};

global.localStorage = {
    _store: {},
    getItem(key) {
        return this._store[key] || null;
    },
    setItem(key, value) {
        this._store[key] = String(value);
    },
    removeItem(key) {
        delete this._store[key];
    },
    clear() {
        this._store = {};
    }
};

global.Event = class {
    constructor(name) {
        this.name = name;
    }
};

// Import app.js code by evaluating it
const appJsPath = path.join(__dirname, 'src', 'app.js');
let appJsCode = fs.readFileSync(appJsPath, 'utf8');

// Replace const state with global.state so it is accessible outside eval
appJsCode = appJsCode.replace('const state =', 'global.state =');

// Run evaluation at module scope
eval(appJsCode);
console.log('✅ Successfully loaded and parsed src/app.js');

// Manually trigger DOMContentLoaded to initialize app.js variables
if (eventListeners['DOMContentLoaded']) {
    eventListeners['DOMContentLoaded'].forEach(cb => cb());
    console.log('✅ Triggered DOMContentLoaded to initialize DOMElements');
}

// -------------------------------------------------------------
// TEST CASE 1: API Key & LocalStorage Security Checks
// -------------------------------------------------------------
try {
    console.log('\nTesting API Key local storage safety...');

    // Clear storage first
    localStorage.clear();
    assert.strictEqual(localStorage.getItem('zenith_api_key'), null);

    // Save key
    const testKey = 'AIzaSyTestKey123456';
    saveAPIKey(testKey);

    // Retrieve directly from storage
    assert.strictEqual(localStorage.getItem('zenith_api_key'), testKey);
    assert.strictEqual(state.apiKey, testKey);

    console.log('✅ Test passed: API key securely stored locally in localStorage');
} catch (e) {
    console.error('❌ API Key storage test failed:', e);
    process.exit(1);
}

// -------------------------------------------------------------
// TEST CASE 2: Markdown Parser Verification
// -------------------------------------------------------------
try {
    console.log('\nTesting Markdown rendering engine...');

    // Test Bold
    const boldMD = 'I am **extremely anxious** today.';
    const boldHTML = markdownToHTML(boldMD);
    assert.ok(boldHTML.includes('<strong>extremely anxious</strong>'), `Bold failed: ${boldHTML}`);

    // Test Italic
    const italicMD = 'Studying *physics* backlog.';
    const italicHTML = markdownToHTML(italicMD);
    assert.ok(italicHTML.includes('<em>physics</em>'), `Italic failed: ${italicHTML}`);

    // Test Heading
    const headingMD = '### Syllabus Overwhelm';
    const headingHTML = markdownToHTML(headingMD);
    assert.ok(headingHTML.includes('<h3>Syllabus Overwhelm</h3>'), `Heading failed: ${headingHTML}`);

    // Test Blockquote
    const quoteMD = '> Take 3 deep breaths before paper analysis.';
    const quoteHTML = markdownToHTML(quoteMD);
    assert.ok(quoteHTML.includes('<blockquote>Take 3 deep breaths before paper analysis.</blockquote>'), `Blockquote failed: ${quoteHTML}`);

    // Test Lists
    const listMD = '- Chapter 1 Backlog\n- Chapter 2 Backlog';
    const listHTML = markdownToHTML(listMD);
    assert.ok(listHTML.includes('<ul><li>Chapter 1 Backlog</li>'), `List Start failed: ${listHTML}`);
    assert.ok(listHTML.includes('<li>Chapter 2 Backlog</li></ul>'), `List End failed: ${listHTML}`);

    // Test Code Block
    const codeMD = '```\nconst mockScore = 5;\n```';
    const codeHTML = markdownToHTML(codeMD);
    assert.ok(codeHTML.includes('<pre><code>const mockScore = 5;</code></pre>'), `Code block failed: ${codeHTML}`);

    console.log('✅ Test passed: Markdown rendering engine supports rich styles');
} catch (e) {
    console.error('❌ Markdown parsing test failed:', e);
    process.exit(1);
}

// -------------------------------------------------------------
// TEST CASE 3: Local Fallback AI Evaluation (Anxiety Parsing)
// -------------------------------------------------------------
try {
    console.log('\nTesting local fallback AI analysis engine...');

    // Journal Entry 1: Backlog Anxiety
    const entry1 = 'I have an organic chemistry backlog of 5 chapters left to do. I feel so behind on the syllabus.';
    const analysis1 = mockAnalyzeJournalLocal(entry1);
    assert.ok(analysis1.backlogPanic > 5, `Should detect high backlog panic: ${analysis1.backlogPanic}`);
    assert.ok(analysis1.mockTestDrop === 0, `Should detect no mock test anxiety: ${analysis1.mockTestDrop}`);

    // Journal Entry 2: Test Drops & Peer Pressure
    const entry2 = 'My mock test score dropped yesterday in physics. Everyone else in my Telegram study group did much better.';
    const analysis2 = mockAnalyzeJournalLocal(entry2);
    assert.ok(analysis2.mockTestDrop > 5, `Should detect high mock drop: ${analysis2.mockTestDrop}`);
    assert.ok(analysis2.peerComparison > 5, `Should detect high peer comparison: ${analysis2.peerComparison}`);
    assert.ok(analysis2.backlogPanic === 0, `Should detect no backlog panic: ${analysis2.backlogPanic}`);

    // Verify structure
    assert.strictEqual(typeof analysis1.mood, 'string');
    assert.strictEqual(typeof analysis1.moodScore, 'number');
    assert.ok(Array.isArray(analysis1.keyTriggers));
    assert.strictEqual(typeof analysis1.empatheticResponse, 'string');

    console.log('✅ Test passed: Fallback analyzer identifies competitive exam anxieties accurately');
} catch (e) {
    console.error('❌ Fallback AI analysis test failed:', e);
    process.exit(1);
}

// -------------------------------------------------------------
// TEST CASE 4: Average calculations
// -------------------------------------------------------------
try {
    console.log('\nTesting statistics calculator...');

    // Clean logs first
    state.logs = [
        { analysis: { moodScore: 3, backlogPanic: 8 } },
        { analysis: { moodScore: 7, backlogPanic: 4 } }
    ];

    const avgCalmness = calculateAverageMetric('moodScore');
    const avgBacklog = calculateAverageMetric('backlogPanic');

    assert.strictEqual(avgCalmness, 5);
    assert.strictEqual(avgBacklog, 6);

    console.log('✅ Test passed: Average calculations are mathematically correct');
} catch (e) {
    console.error('❌ Stats calculation test failed:', e);
    process.exit(1);
}

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
process.exit(0);
