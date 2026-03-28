import fs from 'fs';
import path from 'path';

// Generate HTML file
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Master - Settings & Polish</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="app-container" class="app-container">
        <!-- Menu Screen -->
        <div id="menu-screen" class="screen active">
            <div class="menu-content">
                <h1 class="game-title">Game Master</h1>
                <p class="game-subtitle">Strategic Board Game</p>
                <button id="btn-start-game" class="btn btn-primary">Start Game</button>
                <button id="btn-settings" class="btn btn-secondary">Settings</button>
                <button id="btn-about" class="btn btn-tertiary">About</button>
            </div>
        </div>

        <!-- Settings Screen -->
        <div id="settings-screen" class="screen">
            <div class="settings-content">
                <h2 class="settings-title">Settings</h2>
                
                <div class="settings-section">
                    <label class="setting-label">
                        <span class="label-text">Difficulty Level</span>
                        <select id="difficulty-select" class="select-input">
                            <option value="easy">Easy</option>
                            <option value="medium" selected>Medium</option>
                            <option value="hard">Hard</option>
                            <option value="expert">Expert</option>
                        </select>
                    </label>
                </div>

                <div class="settings-section">
                    <label class="setting-label checkbox-label">
                        <input type="checkbox" id="sound-toggle" class="checkbox-input" checked>
                        <span class="label-text">Enable Sound Effects</span>
                    </label>
                </div>

                <div class="settings-section">
                    <label class="setting-label">
                        <span class="label-text">Master Volume</span>
                        <input type="range" id="volume-slider" class="slider-input" min="0" max="100" value="70">
                        <span id="volume-display" class="volume-display">70%</span>
                    </label>
                </div>

                <div class="settings-section">
                    <label class="setting-label checkbox-label">
                        <input type="checkbox" id="graphics-toggle" class="checkbox-input" checked>
                        <span class="label-text">High Graphics Quality</span>
                    </label>
                </div>

                <div class="settings-section">
                    <label class="setting-label">
                        <span class="label-text">Animation Speed</span>
                        <select id="animation-select" class="select-input">
                            <option value="slow">Slow</option>
                            <option value="normal" selected>Normal</option>
                            <option value="fast">Fast</option>
                        </select>
                    </label>
                </div>

                <div class="settings-section">
                    <label class="setting-label checkbox-label">
                        <input type="checkbox" id="music-toggle" class="checkbox-input" checked>
                        <span class="label-text">Background Music</span>
                    </label>
                </div>

                <div class="settings-actions">
                    <button id="btn-reset-settings" class="btn btn-secondary">Reset to Default</button>
                    <button id="btn-back-from-settings" class="btn btn-primary">Back</button>
                </div>
            </div>
        </div>

        <!-- Game Screen -->
        <div id="game-screen" class="screen">
            <div class="game-header">
                <div class="header-left">
                    <h2 id="game-status" class="game-status">Your Turn</h2>
                    <span id="difficulty-badge" class="difficulty-badge">Medium</span>
                </div>
                <div class="header-right">
                    <button id="btn-game-settings" class="btn-icon" title="Settings">⚙️</button>
                    <button id="btn-menu" class="btn-icon" title="Menu">🏠</button>
                </div>
            </div>

            <div class="game-board">
                <div id="game-canvas" class="canvas">
                    <div class="board-grid" id="board-grid">
                        <div class="cell"></div>
                        <div class="cell"></div>
                        <div class="cell"></div>
                        <div class="cell"></div>
                        <div class="cell"></div>
                        <div class="cell"></div>
                        <div class="cell"></div>
                        <div class="cell"></div>
                        <div class="cell"></div>
                    </div>
                </div>
            </div>

            <div class="game-controls">
                <button id="btn-undo" class="btn btn-secondary">↶ Undo</button>
                <button id="btn-hint" class="btn btn-secondary">Hint</button>
                <button id="btn-new-game" class="btn btn-primary">New Game</button>
            </div>

            <div id="toast-container" class="toast-container"></div>
        </div>

        <!-- About Screen -->
        <div id="about-screen" class="screen">
            <div class="about-content">
                <h2 class="about-title">About Game Master</h2>
                <div class="about-body">
                    <p>Game Master is a strategic board game with AI opponents of varying difficulty levels.</p>
                    <p><strong>Features:</strong></p>
                    <ul class="about-list">
                        <li>Adjustable difficulty levels</li>
                        <li>Sound effects and music</li>
                        <li>Persistent settings</li>
                        <li>Responsive design</li>
                        <li>Smooth animations</li>
                    </ul>
                    <p><strong>Version:</strong> 1.0.0</p>
                </div>
                <button id="btn-back-from-about" class="btn btn-primary">Back</button>
            </div>
        </div>

        <!-- Pause Menu -->
        <div id="pause-menu" class="modal hidden">
            <div class="modal-content">
                <h3 class="modal-title">Game Paused</h3>
                <button id="btn-resume" class="btn btn-primary">Resume Game</button>
                <button id="btn-pause-settings" class="btn btn-secondary">Settings</button>
                <button id="btn-quit-game" class="btn btn-tertiary">Quit to Menu</button>
            </div>
        </div>

        <!-- Confirmation Dialog -->
        <div id="confirmation-dialog" class="modal hidden">
            <div class="modal-content">
                <h3 id="confirm-title" class="modal-title">Confirm Action</h3>
                <p id="confirm-message" class="modal-message">Are you sure?</p>
                <div class="modal-actions">
                    <button id="btn-confirm-yes" class="btn btn-primary">Yes</button>
                    <button id="btn-confirm-no" class="btn btn-secondary">No</button>
                </div>
            </div>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>`;

// Generate CSS file
const cssContent = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --primary-color: #6366f1;
    --secondary-color: #ec4899;
    --tertiary-color: #8b5cf6;
    --success-color: #10b981;
    --danger-color: #ef4444;
    --warning-color: #f59e0b;
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-tertiary: #334155;
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
    --text-tertiary: #94a3b8;
    --border-color: #475569;
    --shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 20px 50px rgba(0, 0, 0, 0.5);
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --ease-out: cubic-bezier(0.34, 1.56, 0.64, 1);
}

html, body {
    height: 100%;
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
    color: var(--text-primary);
    overflow: hidden;
}

.app-container {
    height: 100vh;
    width: 100%;
    position: relative;
}

/* Screen Management */
.screen {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.5s var(--ease-out), visibility 0.5s;
    z-index: 10;
}

.screen.active {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    z-index: 100;
}

/* Menu Screen */
.menu-content {
    text-align: center;
    animation: slideUp 0.6s var(--ease-out);
}

.game-title {
    font-size: 4rem;
    font-weight: 900;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.5rem;
    text-shadow: 0 0 30px rgba(99, 102, 241, 0.3);
}

.game-subtitle {
    font-size: 1.25rem;
    color: var(--text-secondary);
    margin-bottom: 3rem;
    font-weight: 500;
}

/* Buttons */
.btn {
    padding: 0.875rem 2rem;
    border: 2px solid transparent;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: relative;
    overflow: hidden;
    margin: 0.5rem;
}

.btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.1);
    transition: left 0.3s;
    z-index: -1;
}

.btn:hover::before {
    left: 100%;
}

.btn-primary {
    background: linear-gradient(135deg, var(--primary-color), var(--tertiary-color));
    color: white;
    box-shadow: 0 5px 15px rgba(99, 102, 241, 0.4);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.6);
}

.btn-primary:active {
    transform: translateY(0);
}

.btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--border-color);
}

.btn-secondary:hover {
    background: var(--secondary-color);
    border-color: var(--secondary-color);
    box-shadow: 0 5px 15px rgba(236, 72, 153, 0.4);
}

.btn-tertiary {
    background: transparent;
    color: var(--text-secondary);
    border-color: var(--border-color);
}

.btn-tertiary:hover {
    color: var(--text-primary);
    border-color: var(--text-secondary);
    background: rgba(148, 163, 184, 0.1);
}

.btn-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--bg-tertiary);
    border: 2px solid var(--border-color);
    font-size: 1.25rem;
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-icon:hover {
    background: var(--primary-color);
    border-color: var(--primary-color);
    transform: scale(1.1);
}

/* Settings Screen */
.settings-content {
    width: 100%;
    max-width: 500px;
    padding: 2rem;
    animation: slideUp 0.6s var(--ease-out);
}

.settings-title {
    font-size: 2rem;
    margin-bottom: 2rem;
    text-align: center;
    color: var(--text-primary);
}

.settings-section {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    transition: var(--transition);
}

.settings-section:hover {
    border-color: var(--primary-color);
    background: rgba(99, 102, 241, 0.05);
}

.setting-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    gap: 1rem;
}

.label-text {
    font-weight: 500;
    color: var(--text-primary);
    flex: 1;
}

.select-input,
.slider-input {
    padding: 0.5rem 1rem;
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    border-radius: 0.375rem;
    color: var(--text-primary);
    font-size: 1rem;
    cursor: pointer;
    transition: var(--transition);
}

.select-input:hover,
.select-input:focus,
.slider-input:hover,
.slider-input:focus {
    border-color: var(--primary-color);
    outline: none;
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
}

.checkbox-input {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: var(--primary-color);
}

.checkbox-label {
    flex-direction: row;
}

.volume-display {
    min-width: 45px;
    text-align: right;
    color: var(--text-secondary);
    font-weight: 500;
}

.slider-input {
    flex: 1;
    padding: 0;
    height: 6px;
}

.settings-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    justify-content: center;
    flex-wrap: wrap;
}

/* Game Screen */
.game-header {
    position: absolute;
    top: 20px;
    left: 20px;
    right: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 50;
    animation: slideDown 0.6s var(--ease-out);
}

.header-left {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.game-status {
    font-size: 1.5rem;
    color: var(--text-primary);
    font-weight: 600;
}

.difficulty-badge {
    padding: 0.25rem 0.75rem;
    background: var(--secondary-color);
    border-radius: 2rem;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
}

.header-right {
    display: flex;
    gap: 0.5rem;
}

.game-board {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 100px 20px 150px;
}

.canvas {
    width: 100%;
    max-width: 400px;
    aspect-ratio: 1;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
    border: 2px solid var(--border-color);
    border-radius: 1rem;
    padding: 1rem;
    animation: slideUp 0.6s var(--ease-out);
    box-shadow: var(--shadow);
}

.board-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    width: 100%;
    height: 100%;
}

.cell {
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: bold;
}

.cell:hover {
    background: var(--bg-tertiary);
    border-color: var(--primary-color);
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
}

.cell.played {
    background: linear-gradient(135deg, var(--primary-color), var(--tertiary-color));
    border-color: var(--primary-color);
    cursor: not-allowed;
}

.game-controls {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    width: 90%;
    max-width: 500px;
    animation: slideUp 0.6s var(--ease-out);
}

/* Toast Notifications */
.toast-container {
    position: fixed;
    bottom: 100px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    z-index: 1000;
    pointer-events: none;
}

.toast {
    padding: 1rem 1.5rem;
    background: var(--bg-secondary);
    border-left: 4px solid var(--primary-color);
    border-radius: 0.5rem;
    color: var(--text-primary);
    font-weight: 500;
    box-shadow: var(--shadow);
    animation: slideIn 0.3s var(--ease-out);
    pointer-events: auto;
    cursor: pointer;
}

.toast.success {
    border-left-color: var(--success-color);
}

.toast.error {
    border-left-color: var(--danger-color);
}

.toast.warning {
    border-left-color: var(--warning-color);
}

/* Modal */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s, visibility 0.3s;
}

.modal:not(.hidden) {
    opacity: 1;
    visibility: visible;
}

.modal-content {
    background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
    border: 2px solid var(--border-color);
    border-radius: 1rem;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    box-shadow: var(--shadow-lg);
    animation: popIn 0.3s var(--ease-out);
}

.modal-title {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: var(--text-primary);
}

.modal-message {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    line-height: 1.6;
}

.modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
}

/* About Screen */
.about-content {
    width: 100%;
    max-width: 600px;
    padding: 2rem;
    text-align: center;
    animation: slideUp 0.6s var(--ease-out);
}

.about-title {
    font-size: 2rem;
    margin-bottom: 1.5rem;
    color: var(--text-primary);
}

.about-body {
    text-align: left;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    color: var(--text-secondary);
    line-height: 1.8;
}

.about-body p {
    margin-bottom: 1rem;
}

.about-list {
    margin: 1rem 0 1rem 1.5rem;
}

.about-list li {
    margin-bottom: 0.5rem;
}

/* Animations */
@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(100px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes popIn {
    from {
        opacity: 0;
        transform: scale(0.9);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

/* Responsive Design */
@media (max-width: 768px) {
    .game-title {
        font-size: 2.5rem;
    }

    .game-subtitle {
        font-size: 1rem;
    }

    .btn {
        padding: 0.75rem 1.5rem;
        font-size: 0.875rem;
        margin: 0.375rem;
    }

    .settings-content {
        max-width: 90%;
        padding: 1.5rem;
    }

    .settings-title {
        font-size: 1.5rem;
    }

    .canvas {
        max-width: 300px;
    }

    .board-grid {
        gap: 0.5rem;
    }

    .cell {
        font-size: 1.5rem;
    }

    .game-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
    }

    .header-left {
        width: 100%;
        justify-content: center;
    }

    .header-right {
        width: 100%;
        justify-content: center;
    }

    .game-controls {
        width: 95%;
        gap: 0.5rem;
    }

    .btn-icon {
        width: 40px;
        height: 40px;
        font-size: 1rem;
    }

    .modal-content {
        width: 90%;
        padding: 1.5rem;
    }

    .modal-title {
        font-size: 1.25rem;
    }
}

@media (max-width: 480px) {
    html, body {
        font-size: 14px;
    }

    .game-title {
        font-size: 1.75rem;
    }

    .game-subtitle {
        font-size: 0.875rem;
        margin-bottom: 1.5rem;
    }

    .btn {
        padding: 0.625rem 1rem;
        font-size: 0.75rem;
        margin: 0.25rem;
    }

    .canvas {
        max-width: 250px;
        padding: 0.75rem;
    }

    .game-board {
        padding: 80px 10px 130px;
    }

    .settings-section {
        margin-bottom: 1rem;
        padding: 0.75rem;
    }

    .game-controls {
        bottom: 10px;
    }

    .toast-container {
        right: 10px;
        bottom: 90px;
    }

    .toast {
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
    }
}

.hidden {
    display: none !important;
}`;

// Generate JavaScript file
const jsContent = `// Settings Manager
class SettingsManager {
    constructor() {
        this.storageKey = 'gameSettings';
        this.defaultSettings = {
            difficulty: 'medium',
            soundEnabled: true,
            volume: 70,
            graphicsQuality: true,
            animationSpeed: 'normal',
            musicEnabled: true
        };
        this.settings = this.loadSettings();
    }

    loadSettings() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return { ...this.defaultSettings, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
        return { ...this.defaultSettings };
    }

    saveSettings() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
            return true;
        } catch (e) {
            console.error('Failed to save settings:', e);
            return false;
        }
    }

    getSetting(key) {
        return this.settings[key];
    }

    setSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }

    resetToDefault() {
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
    }

    getDifficultyMultiplier() {
        const multipliers = {
            easy: 0.5,
            medium: 1.0,
            hard: 1.5,
            expert: 2.0
        };
        return multipliers[this.settings.difficulty] || 1.0;
    }
}

// Sound Manager
class SoundManager {
    constructor(settingsManager) {
        this.settings = settingsManager;
        this.audioContext = null;
        this.isMuted = false;
    }

    playSound(type) {
        if (!this.settings.getSetting('soundEnabled')) return;

        const audioCtx = this.getAudioContext();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;
        const volume = this.settings.getSetting('volume') / 100;

        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            gain.connect(audioCtx.destination);
            osc.connect(gain);

            gain.gain.setValueAtTime(volume * 0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            const sounds = {
                move: { freq: 440, duration: 0.1 },
                success: { freq: 523, duration: 0.2 },
                error: { freq: 220, duration: 0.2 },
                click: { freq: 880, duration: 0.05 }
            };

            const sound = sounds[type] || sounds.click;
            osc.frequency.setValueAtTime(sound.freq, now);
            osc.type = 'sine';

            osc.start(now);
            osc.stop(now + sound.duration);
        } catch (e) {
            console.error('Sound playback error:', e);
        }
    }

    getAudioContext() {
        if (!this.audioContext) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();
            } catch (e) {
                console.error('Web Audio API not supported:', e);
            }
        }
        return this.audioContext;
    }
}

// Navigation Manager
class NavigationManager {
    constructor() {
        this.currentScreen = 'menu';
        this.previousScreen = null;
    }

    showScreen(screenId) {
        const current = document.getElementById(\`\${this.currentScreen}-screen\`);
        const next = document.getElementById(\`\${screenId}-screen\`);

        if (current) {
            current.classList.remove('active');
        }
        if (next) {
            next.classList.add('active');
        }

        this.previousScreen = this.currentScreen;
        this.currentScreen = screenId;
    }

    goBack() {
        if (this.previousScreen) {
            this.showScreen(this.previousScreen);
        }
    }
}

// Toast Notification System
class ToastManager {
    constructor() {
        this.container = document.getElementById('toast-container');
        this.toastStack = [];
    }

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = \`toast \${type}\`;
        toast.textContent = message;
        
        this.container.appendChild(toast);
        this.toastStack.push(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                this.toastStack = this.toastStack.filter(t => t !== toast);
            }, 300);
        }, duration);