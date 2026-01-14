
// Constants
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;
const PLAYER_SPEED = 600; // px per second (was 10 per frame)
const BULLET_SPEED = 900; // px per second (was 15 per frame)
const ENEMY_SPEED = 60;   // px per second (was 1 per frame)
const ENEMY_DROP_DISTANCE = 20;

const BG_GRADIENTS = [
    'radial-gradient(circle at center, #0f0c29, #302b63, #24243e)', // Lvl 1: Deep Space (Purple/Blue)
    'linear-gradient(to bottom, #000428, #004e92)', // Lvl 2: Stratosphere (Blue)
    'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)', // Lvl 3: The Void (Dark)
    'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)', // Lvl 4: Nebula (Blue/Grey)
    'radial-gradient(circle at 50% 50%, #203a43, #2c5364)', // Lvl 5: Teal Horizon
    'linear-gradient(to top, #c02425, #f0cb35)', // Lvl 6: Solar Flare (Red/Gold) - Intense!
    'radial-gradient(circle at top, #232526, #414345)', // Lvl 7: Asteroid Belt (Grey/Black)
    'linear-gradient(45deg, #8e2de2, #4a00e0)', // Lvl 8: Plasma Storm (Neon Purple)
    'radial-gradient(circle at bottom, #0f2027, #203a43, #2c5364)', // Lvl 9: Cyber City (Green/Blue)
    'linear-gradient(to right, #243949 0%, #517fa4 100%)', // Lvl 10: Steel Sky
    'radial-gradient(circle, #5f2c82, #49a09d)', // Lvl 11: Aurora (Green/Pink)
    'linear-gradient(to bottom, #000000, #434343)', // Lvl 12: Event Horizon (Pitch Black)
];

// ----------------------
// HELPER CLASSES
// ----------------------

class HighScoreManager {
    constructor() {
        this.scores = [];
        this.useCloud = !!window.db;
        this.render();
        this.loadScores();
    }

    async loadScores() {
        const statusEl = document.getElementById('connectionStatus');

        if (this.useCloud) {
            try {
                if (statusEl) {
                    statusEl.innerText = "📡 SECTOR DATALINK: ESTABLISHED";
                    statusEl.style.color = "#39ff14";
                }

                const snapshot = await window.db.collection('scores')
                    .orderBy('score', 'desc')
                    .limit(50)
                    .get();

                const allScores = snapshot.docs.map(doc => doc.data());

                // Deduplicate: Keep only the first (highest) entry for each unique name
                const uniqueScores = [];
                const seen = new Set();

                for (const s of allScores) {
                    if (!seen.has(s.name)) {
                        seen.add(s.name);
                        uniqueScores.push(s);
                    }
                }

                this.scores = uniqueScores.slice(0, 5);
                this.render();
            } catch (e) {
                console.error("Error loading cloud scores:", e);
                if (statusEl) {
                    statusEl.innerText = "⚠️ DATALINK ERROR: OFFLINE MODE";
                    statusEl.style.color = "var(--neon-red)";
                }
                this.loadLocal(); // Fallback
            }
        } else {
            console.warn("Cloud DB not found in window.db");
            if (statusEl) statusEl.innerText = "⚠️ NO LINK: LOCAL MODE ONLY";
            this.loadLocal();
        }
    }

    loadLocal() {
        this.scores = JSON.parse(localStorage.getItem('spaceInvadersScores')) || [
            { name: "CPU COMMANDER", score: 5000 },
            { name: "ACE PILOT", score: 3000 },
            { name: "ROOKIE", score: 1000 }
        ];
        this.render();
    }

    async saveScore(name, score) {
        if (this.useCloud) {
            try {
                const scoresRef = window.db.collection('scores');
                const query = await scoresRef.where('name', '==', name).get();

                if (!query.empty) {
                    // User exists, check if new score is higher
                    const doc = query.docs[0];
                    const data = doc.data();
                    if (score > data.score) {
                        await scoresRef.doc(doc.id).update({ score: score, date: Date.now() });
                    }
                } else {
                    // New user
                    await scoresRef.add({ name, score, date: Date.now() });
                }

                await this.loadScores(); // Refresh
            } catch (e) {
                console.error("Error saving to cloud:", e);
            }
        } else {
            // Local fallback logic (simple)
            const existingIndex = this.scores.findIndex(s => s.name === name);
            if (existingIndex !== -1) {
                if (score > this.scores[existingIndex].score) {
                    this.scores[existingIndex].score = score;
                }
            } else {
                this.scores.push({ name, score, date: Date.now() });
            }

            this.scores.sort((a, b) => b.score - a.score);
            this.scores = this.scores.slice(0, 5);
            localStorage.setItem('spaceInvadersScores', JSON.stringify(this.scores));
            this.render();
        }
    }

    render() {
        const list = document.getElementById('scoreList');
        if (!list) return;

        list.innerHTML = this.scores
            .map((s, i) => `
                <li>
                    <span class="rank">#${i + 1}</span>
                    <span class="name">${s.name}</span>
                    <span class="score">${s.score ? s.score.toLocaleString() : 0}</span>
                </li>
            `)
            .join('');
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 60; // 1 second
        this.velocity = -1; // float up
    }

    update(dt) {
        this.y += this.velocity * 60 * dt; // Scale velocity to time
        this.life -= 60 * dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.font = 'bold 16px "Orbitron"';
        // ctx.shadowColor = this.color; // Optimized out
        // ctx.shadowBlur = 5;
        ctx.globalAlpha = this.life / 60;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 4 - 2;
        this.color = color;
        this.life = 100;
    }

    update(dt) {
        this.x += this.speedX * 60 * dt;
        this.y += this.speedY * 60 * dt;
        this.life -= 120 * dt; // 2 per frame -> 120 per sec
        this.size *= (1 - 1.0 * dt); // Approx decay
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 100;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class Bullet {
    constructor(x, y, direction, isEnemy, owner) {
        this.x = x - 2;
        this.y = y;
        this.width = 4;
        this.height = 10;
        this.direction = direction;
        this.isEnemy = isEnemy;
        this.owner = owner;
        this.color = isEnemy ? '#ff00ff' : '#00ffff';
    }

    update(dt) {
        this.y += this.direction * BULLET_SPEED * dt;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // ctx.shadowBlur = 5; // Optimized out
        // ctx.shadowColor = this.color;
        // ctx.fill();
        // ctx.shadowBlur = 0;
    }
}

// ----------------------
// GAME ENTITIES
// ----------------------

class Enemy {
    constructor(game, x, y) {
        this.game = game;
        this.width = 30;
        this.height = 20;
        this.x = x;
        this.y = y;
        this.color = '#39ff14';
    }

    update(direction, dt) {
        this.x += direction * ENEMY_SPEED * dt;
    }

    shoot() {
        this.game.bullets.push(new Bullet(this.x + this.width / 2, this.y + this.height, 1, true, null));
    }

    draw(ctx) {
        ctx.fillStyle = this.color;

        // Pixel art "invader" using 5x5 grid approx
        const pSize = this.width / 11; // 11 pixels wide

        const shape = [
            [2, 8],
            [3, 7],
            [2, 3, 4, 5, 6, 7, 8],
            [1, 2, 4, 5, 6, 8, 9],
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            [0, 2, 3, 4, 5, 6, 7, 8, 10],
            [0, 2, 8, 10],
            [3, 4, 6, 7]
        ];

        shape.forEach((row, rowIndex) => {
            row.forEach(colIndex => {
                ctx.fillRect(this.x + colIndex * pSize, this.y + rowIndex * pSize, pSize, pSize);
            });
        });

        // ctx.shadowBlur = 5; // Optimized out
        // ctx.shadowColor = this.color;
        // ctx.fill(); // Context fill doesn't help rects but shadow works
        // ctx.shadowBlur = 0;
    }
}

class Boss extends Enemy {
    constructor(game, x, y, level) {
        super(game, x, y);
        this.width = 100; // Much bigger
        this.height = 60;
        this.level = level;
        this.name = "BOSS";

        // Stats based on level
        if (level === 15) {
            this.hp = 50;
            this.color = '#ffaa00'; // Orange
            this.name = "HIVE GUARDIAN";
        } else if (level === 30) {
            this.hp = 100;
            this.color = '#ff0000'; // Red
            this.name = "DREADNOUGHT";
        } else if (level === 45) {
            this.hp = 150;
            this.color = '#ff00ff'; // Purple
            this.name = "VOID CRUISER";
        } else if (level === 50) {
            this.hp = 500;
            this.width = 150;
            this.height = 80;
            this.color = '#00ffff'; // Cyan
            this.name = "THE MOTHERSHIP";
        }
        this.maxHp = this.hp;
        this.moveSpeed = 120; // 2 px/frame -> 120 px/sec
        this.direction = 1;
    }

    update(dt) {
        // Boss sweeps back and forth
        this.x += this.direction * this.moveSpeed * dt;
        if (this.x <= 0 || this.x + this.width >= CANVAS_WIDTH) {
            this.direction *= -1;
        }

        // Boss Shooting Pattern
        if (Math.random() < 0.05) { // 5% chance per frame (aggressive)
            this.shoot();
        }
    }

    shoot() {
        // Triple Shot
        const centerX = this.x + this.width / 2;
        const bottomY = this.y + this.height;

        this.game.bullets.push(new Bullet(centerX, bottomY, 1, true, null));
        this.game.bullets.push(new Bullet(centerX - 20, bottomY, 1, true, null)); // Angled left? (Simplified to straight for now)
        this.game.bullets.push(new Bullet(centerX + 20, bottomY, 1, true, null));
    }

    draw(ctx) {
        // Draw Boss Body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw Health Bar
        const barWidth = this.width;
        const barHeight = 5;
        const healthPercent = this.hp / this.maxHp;

        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 10, barWidth, barHeight);

        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y - 10, barWidth * healthPercent, barHeight);

        // Draw Name
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.width / 2, this.y - 15);
        ctx.textAlign = 'left'; // Reset
    }
}

class Player {
    constructor(game, id, isCpu = false) {
        this.game = game;
        this.id = id;
        this.isCpu = isCpu;
        this.id = id;
        this.isCpu = isCpu;
        this.width = 40;
        this.height = 20;

        this.lives = 5;
        this.score = 0;
        this.hits = 0;
        this.hits = 0;
        this.misses = 0;
        this.invulnerable = 0;
        this.isDead = false;

        if (this.game.numPlayers === 1) {
            this.x = CANVAS_WIDTH / 2 - this.width / 2;
            this.color = '#00ffff';
        } else if (this.game.numPlayers === 2) {
            // P1 Left, P2 Right
            if (id === 1) {
                this.x = CANVAS_WIDTH / 3 - this.width / 2;
                this.color = '#00ffff'; // Cyan
            } else {
                this.x = (CANVAS_WIDTH / 3) * 2 - this.width / 2;
                this.color = isCpu ? '#ff00ff' : '#ffaa00'; // Magenta for CPU, Orange for P2
            }
        } else {
            // 3 players: Left, Center, Right
            if (id === 1) {
                this.x = CANVAS_WIDTH / 4 - this.width / 2;
                this.color = '#00ffff'; // Cyan
            } else if (id === 2) {
                this.x = CANVAS_WIDTH / 2 - this.width / 2;
                this.color = '#ffaa00'; // Orange
            } else {
                this.x = (CANVAS_WIDTH / 4) * 3 - this.width / 2;
                this.color = '#39ff14'; // Neon Green
            }
        }

        this.y = CANVAS_HEIGHT - 50;
    }

    resetPosition() {
        if (this.game.numPlayers === 1) {
            this.x = CANVAS_WIDTH / 2 - this.width / 2;
        } else if (this.game.numPlayers === 2) {
            if (this.id === 1) {
                this.x = CANVAS_WIDTH / 3 - this.width / 2;
            } else {
                this.x = (CANVAS_WIDTH / 3) * 2 - this.width / 2;
            }
        } else {
            if (this.id === 1) {
                this.x = CANVAS_WIDTH / 4 - this.width / 2;
            } else if (this.id === 2) {
                this.x = CANVAS_WIDTH / 2 - this.width / 2;
            } else {
                this.x = (CANVAS_WIDTH / 4) * 3 - this.width / 2;
            }
        }
        this.y = CANVAS_HEIGHT - 50;
    }

    updateInput(keys, dt) {
        if (this.id === 1) {
            if (keys['ArrowLeft']) this.move(-1, dt);
            if (keys['ArrowRight']) this.move(1, dt);
            if (keys['ArrowUp']) this.moveY(-1, dt);
            if (keys['ArrowDown']) this.moveY(1, dt);
        } else if (this.id === 2) {
            if (keys['KeyA']) this.move(-1, dt);
            if (keys['KeyD']) this.move(1, dt);
            if (keys['KeyW']) this.moveY(-1, dt);
            if (keys['KeyS']) this.moveY(1, dt);
        } else if (this.id === 3) {
            if (keys['KeyV']) this.move(-1, dt);
            if (keys['KeyN']) this.move(1, dt);
            if (keys['KeyG']) this.moveY(-1, dt);
            if (keys['KeyH']) this.moveY(1, dt);
        }
    }

    handleShoot(code) {
        if (this.id === 1 && code === 'Space') {
            this.shoot();
        }
        if (this.id === 2 && code === 'KeyF') {
            this.shoot();
        }
        if (this.id === 3 && code === 'KeyB') {
            this.shoot();
        }
    }

    move(dir, dt) {
        this.x += dir * PLAYER_SPEED * dt;
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CANVAS_WIDTH) this.x = CANVAS_WIDTH - this.width;
    }

    moveY(dir, dt) {
        this.y += dir * PLAYER_SPEED * dt;
        // Limit vertical movement to bottom half of screen
        const minY = CANVAS_HEIGHT / 2;
        // Ensure player stays fully on screen with a buffer
        const maxY = CANVAS_HEIGHT - this.height - 50;
        if (this.y < minY) this.y = minY;
        if (this.y > maxY) this.y = maxY;
    }

    shoot() {
        this.game.bullets.push(new Bullet(this.x + this.width / 2, this.y, -1, false, this));
    }

    update(dt) {
        if (this.invulnerable > 0) this.invulnerable -= 60 * dt; // 1 per frame -> 60 per sec

        if (this.isCpu) {
            this.aiLogic(dt);
        }
    }

    aiLogic(dt) {
        // Advanced AI: Find lowest enemy (most threatening) first
        let targetEnemy = null;
        let maxY = -Infinity;
        let minDist = Infinity;

        // Find bottom-most row first
        this.game.enemies.forEach(e => {
            if (e.y > maxY) {
                maxY = e.y;
                targetEnemy = e;
                minDist = Math.abs((e.x + e.width / 2) - (this.x + this.width / 2));
            } else if (e.y === maxY) {
                // If same row, pick closest
                const dist = Math.abs((e.x + e.width / 2) - (this.x + this.width / 2));
                if (dist < minDist) {
                    minDist = dist;
                    targetEnemy = e;
                }
            }
        });

        if (targetEnemy) {
            const center = this.x + this.width / 2;
            const target = targetEnemy.x + targetEnemy.width / 2;

            // Tighter movement threshold
            if (Math.abs(center - target) > 5) { // Relax threshold slightly
                if (center < target) this.move(1, dt);
                else this.move(-1, dt);
            }

            // MAX AGGRESSION
            if (Math.abs(center - target) < 60 && Math.random() < (0.9 * 60 * dt)) { // Scale prob by dt
                this.shoot();
            }
        }
    }

    draw(ctx) {
        if (this.isDead) return;
        if (this.invulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0) return; // Blink effect

        ctx.fillStyle = this.color;
        // Simple ship shape
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height - 5);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        // Shadow/Glow
        // Shadow/Glow
        // ctx.shadowBlur = 10; // Optimized out
        // ctx.shadowColor = this.color;
        ctx.fill();
        // ctx.shadowBlur = 0;
    }
}

// ----------------------
// GAME ENGINE
// ----------------------

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.timerElement = document.getElementById('timer');
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.finalScoreElement = document.getElementById('finalScore');
        this.statsElement = document.getElementById('gameStats');
        this.loginScreen = document.getElementById('loginScreen');
        this.loginUser = document.getElementById('loginUser');
        this.btnLogin = document.getElementById('btnLogin');
        this.loginMsg = document.getElementById('loginMsg');

        this.state = 'LOGIN'; // LOGIN, START, PLAYING, GAMEOVER
        this.keys = {};
        this.numPlayers = 1;
        this.currentPlayerName = "COMMANDER";

        this.players = [];
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.enemyDirection = 1; // 1 = right, -1 = left
        this.enemyMoveTimer = 0;
        this.enemyMoveInterval = 50; // frames
        this.lastTime = Date.now(); // FIX: Initialize lastTime to prevent NaN dt


        this.highScoreManager = new HighScoreManager();
        this.socialManager = new SocialManager(this);
        this.networkManager = new NetworkManager(this);

        // Bind loop to preserve 'this' context
        this.loop = this.loop.bind(this);

        this.init();
    }

    init() {
        this.setupLogin();
        this.setupInput();
        this.socialManager.initUser(this.currentPlayerName);

        // Start the game loop
        this.loop();
    }

    // MULTIPLAYER METHODS
    startMultiplayer(role) {
        this.mode = 'MULTIPLAYER'; // 'LOCAL' or 'MULTIPLAYER'
        this.networkManager.role = role;
        this.networkManager.listenForUpdates();

        // UI Prep
        this.startScreen.classList.add('hidden');
        this.socialManager.toggle(false); // Close social

        // Reset Game
        this.level = 1;
        this.resetPlayersMultplayer();

        if (role === 'HOST') {
            this.spawnEntities(true);
        } else {
            // Guest waits for entities from Host
            this.enemies = [];
            this.bullets = [];
        }

        this.loop();
    }

    resetPlayersMultplayer() {
        this.players = [];
        // P1 (Host)
        this.players.push(new Player(this, 1));
        // P2 (Guest)
        this.players.push(new Player(this, 2));
    }

    syncFromHost(data) {
        // Update Game State from Host Data
        if (data.enemies) {
            this.enemies = data.enemies.map(e => {
                const enemy = new Enemy(this, e.x, e.y);
                return enemy;
            });
        }
        if (data.bullets) {
            this.bullets = data.bullets.map(b => new Bullet(b.x, b.y, b.isEnemy ? 1 : -1, b.isEnemy, null));
        }
        if (data.p1) {
            const p1 = this.players[0];
            p1.x = data.p1.x;
            p1.score = data.p1.score;
            p1.lives = data.p1.lives;
        }
    }

    syncFromGuest(data) {
        // Update P2 from Guest Data
        const p2 = this.players[1];
        if (p2 && data) {
            p2.x = data.x;
            if (data.shooting) p2.shoot();
        }
    }

    update() {
        if (this.state !== 'PLAYING') return;

        // MULTIPLAYER SYNC
        if (this.mode === 'MULTIPLAYER') {
            this.networkManager.update();

            // If Guest, I ONLY update my own input (P2) locally for prediction
            // And render what Host sends.
            if (this.networkManager.role === 'GUEST') {
                this.updateHUD();
                this.draw();
                // Guest Input Logic
                const p2 = this.players[1];
                p2.updateInput(this.keys);
                return; // SKIP normal game logic (physics/ai)
            }
        }

        if (this.state === 'GAME_OVER' || this.state === 'PAUSED') return;

        const now = Date.now();
        // CLAMP: Max dt = 0.05s (approx 20fps). Prevents huge jumps during lag.
        let dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        if (isNaN(dt)) dt = 0.016; // Safety fallback
        dt = Math.min(dt, 0.05);

        // Clear canvas (Transparent to show CSS background)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update logic
        this.networkManager.update(dt); // Keep network sync
        this.updateGameLogic(dt);

        this.draw();

        requestAnimationFrame(this.loop);
    }

    updateGameLogic(dt) {
        // Timer Logic
        this.gameTime -= dt;
        if (this.gameTime <= 0) {
            this.gameTime = 0;
            this.updateHUD();
            this.gameOver();
            return;
        }
        // Update HUD
        this.updateHUD();

        // Player Movement
        this.players.forEach(p => {
            if (!p.isDead) p.updateInput(this.keys, dt);
        });
        this.players.forEach(p => p.update(dt));

        // Bullets (Filter out-of-bounds)
        this.bullets = this.bullets.filter(b => {
            b.update(dt);
            // Check bounds
            if (b.y < 0 || b.y > CANVAS_HEIGHT) {
                if (!b.isEnemy && b.owner) {
                    b.owner.misses++;
                    if (b.y < 0) this.floatingTexts.push(new FloatingText(b.x, 30, "MISS", "#ff0000"));
                }
                return false; // Remove
            }
            return true; // Keep
        });

        // Enemies
        let hitEdge = false;
        this.enemies.forEach(e => {
            if (e instanceof Boss) {
                e.update(dt);
                // Boss handles its own bounds
            } else {
                e.update(this.enemyDirection, dt);

                // Only regular enemies trigger swarm edge logic
                if (e.x <= 0 && this.enemyDirection < 0) {
                    hitEdge = true;
                    e.x = 0;
                } else if (e.x + e.width >= CANVAS_WIDTH && this.enemyDirection > 0) {
                    hitEdge = true;
                    e.x = CANVAS_WIDTH - e.width;
                }
            }
        });

        if (hitEdge) {
            this.enemyDirection *= -1;
            this.enemies.forEach(e => e.y += ENEMY_DROP_DISTANCE);
        }

        // Enemy Shooting - Scale chance by dt
        const shootChance = (0.002 + (this.level * 0.001)) * 60 * dt;

        if (Math.random() < shootChance && this.enemies.length > 0) {
            const shooter = this.enemies[Math.floor(Math.random() * this.enemies.length)];
            shooter.shoot();
        }

        // Particles
        this.particles = this.particles.filter(p => {
            p.update(dt);
            return p.life > 0;
        });

        // Floating Texts
        this.floatingTexts = this.floatingTexts.filter(t => {
            t.update(dt);
            return t.life > 0;
        });

        this.checkCollisions();

        if (this.enemies.length === 0) {
            // Next Level
            this.level++;
            this.gameTime = 60; // Reset timer for new level
            this.spawnEntities(false); // Keep player stats
            this.updateLevelBackground();
            this.updateHUD();
        }
    }

    setupLogin() {
        if (!this.btnLogin) return;

        // Check for existing session (24 hour validity)
        const session = JSON.parse(localStorage.getItem('si_session'));
        if (session) {
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;

            if (now - session.timestamp < oneDay) {
                // Restore session
                this.currentPlayerName = session.name;
                this.state = 'START';
                this.loginScreen.classList.add('hidden');
                this.startScreen.classList.remove('hidden');
                return; // Skip login setup
            }
        }

        const handleLogin = () => {
            const username = this.loginUser.value.trim();

            if (username) {
                this.currentPlayerName = username.toUpperCase();

                // Save Session
                localStorage.setItem('si_session', JSON.stringify({
                    timestamp: Date.now(),
                    name: this.currentPlayerName
                }));

                // Success Animation / Transition
                this.loginMsg.style.color = '#39ff14';
                this.loginMsg.innerText = "ACCESS GRANTED. WELCOME, " + this.currentPlayerName;

                setTimeout(() => {
                    this.state = 'START';
                    this.loginScreen.classList.add('hidden');
                    this.startScreen.classList.remove('hidden');
                }, 1000);
            } else {
                this.loginMsg.style.color = 'var(--neon-red)';
                this.loginMsg.innerText = "ACCESS DENIED. ID REQUIRED.";

                // Shake effect
                this.loginScreen.classList.add('shake');
                setTimeout(() => this.loginScreen.classList.remove('shake'), 500);
            }
        };

        this.btnLogin.addEventListener('click', handleLogin);
        // Allow Enter key to login
        this.loginUser.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    setupInput() {
        // Mobile Controls
        const bindTouch = (id, key) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent scroll/zoom
                this.keys[key] = true;
                if (key === 'Space' && this.state === 'PLAYING') {
                    // Handle shoot trigger immediately like keydown
                    this.players.forEach(p => p.handleShoot('Space'));
                }
                // Handle Start Screen taps
                if (this.state === 'GAMEOVER') {
                    this.resetGame();
                }
            });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys[key] = false;
            });
        };

        bindTouch('btnUp', 'ArrowUp');
        bindTouch('btnDown', 'ArrowDown');
        bindTouch('btnLeft', 'ArrowLeft');
        bindTouch('btnRight', 'ArrowRight');
        bindTouch('btnShoot', 'Space');

        this.startScreen.addEventListener('touchstart', (e) => {
            if (this.state === 'START') {
                if (this.keys['Space']) this.startGame(1);
            }
        });

        // Add specific listener for Shoot button to start game
        const btnShoot = document.getElementById('btnShoot');
        if (btnShoot) {
            btnShoot.addEventListener('touchstart', (e) => {
                if (this.state === 'START') this.startGame(1);
            });
        }


        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.keys[e.key] = true;

            if (this.state === 'START') {
                if (e.key === '1') this.startGame(1);
                if (e.key === '2') this.startGame(2);
                if (e.key === '3') this.startGame(2, true);
                if (e.key === '4') this.startGame(3);
            } else if (this.state === 'GAMEOVER') {
                if (e.code === 'Space') this.resetGame();
            } else if (this.state === 'PLAYING') {
                this.players.forEach(p => p.handleShoot(e.code));
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keys[e.key] = false;
        });
    }

    startGame(numPlayers, cpuEnabled = false) {
        if (numPlayers) this.numPlayers = numPlayers;
        this.cpuEnabled = cpuEnabled;
        this.state = 'PLAYING';
        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.level = 1;
        this.gameTime = 60; // 60 seconds (180 - 120)
        this.lastTime = Date.now();
        this.spawnEntities(true);
        this.updateLevelBackground();
        this.updateHUD();
    }



    resetGame() {
        this.state = 'START';
        this.gameOverScreen.classList.add('hidden');
        this.startScreen.classList.remove('hidden');
    }

    spawnEntities(resetPlayers = true) {
        if (resetPlayers) {
            this.players = [];
            for (let i = 1; i <= this.numPlayers; i++) {
                const isCpu = (this.cpuEnabled && i === 2);
                this.players.push(new Player(this, i, isCpu));
            }
        } else {
            this.players.forEach(p => p.resetPosition());
        }
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.floatingTexts = [];

        // Check for Boss Spawn
        if (this.level === 15 || this.level === 30 || this.level === 45 || this.level === 50) {
            // Boss Fight!
            this.floatingTexts.push(new FloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, "BOSS DETECTED", "#ff0000"));
            const boss = new Boss(this, CANVAS_WIDTH / 2 - 50, 50, this.level); // Center Boss
            this.enemies.push(boss);
        } else {
            // Normal Spawn
            const rows = 5;
            const cols = 10;
            const startX = 50;
            const startY = 50;
            const padding = 50;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    this.enemies.push(new Enemy(this, startX + c * padding, startY + r * padding));
                }
            }
        }
    }

    updateLevelBackground() {
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            const bgIndex = (this.level - 1) % BG_GRADIENTS.length;
            gameContainer.style.background = BG_GRADIENTS[bgIndex];
        }
    }

    checkCollisions() {
        // 1. Bullets hitting Enemies or Players
        // Iterate BACKWARDS to safely remove bullets/enemies
        for (let bIndex = this.bullets.length - 1; bIndex >= 0; bIndex--) {
            const b = this.bullets[bIndex];

            if (b.isEnemy) {
                // Enemy Bullet hitting Player
                this.players.forEach(p => {
                    if (p.isDead) return;
                    if (this.checkRectCollision(b, p)) {
                        this.createExplosion(p.x + p.width / 2, p.y + p.height / 2, p.color);
                        this.bullets.splice(bIndex, 1);
                        this.playerHit(p);
                    }
                });
            } else {
                // Player Bullet hitting Enemy
                for (let eIndex = this.enemies.length - 1; eIndex >= 0; eIndex--) {
                    const e = this.enemies[eIndex];
                    if (this.checkRectCollision(b, e)) {
                        this.createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color || '#39ff14');
                        this.bullets.splice(bIndex, 1); // Bullet gone

                        // Boss Handling
                        if (e instanceof Boss) {
                            e.hp -= 10;
                            this.floatingTexts.push(new FloatingText(e.x + e.width / 2, e.y, "-10", "#fff"));
                            if (e.hp <= 0) {
                                this.enemies.splice(eIndex, 1); // Enemy gone
                                this.createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color, 100);
                                if (b.owner) b.owner.score += 5000;
                            }
                        } else {
                            // Regular Enemy
                            this.enemies.splice(eIndex, 1);
                            if (b.owner) b.owner.score += 100;
                        }

                        if (b.owner) b.owner.hits++;

                        // Revive Mechanic (10% Chance)
                        if (Math.random() < 0.1) {
                            const deadPlayers = this.players.filter(p => p.isDead);
                            if (deadPlayers.length > 0) {
                                const revived = deadPlayers[Math.floor(Math.random() * deadPlayers.length)];
                                revived.isDead = false;
                                revived.lives = 1;
                                revived.invulnerable = 120;
                                this.createExplosion(revived.x + revived.width / 2, revived.y + revived.height / 2, revived.color, 30);
                            }
                        }

                        break; // Bullet hit something, stop checking enemies for this bullet
                    }
                }
            }
        }

        // 2. Enemies touching Players (Kamikaze)
        this.enemies.forEach(e => {
            if (e.y + e.height >= CANVAS_HEIGHT) {
                this.gameOver();
            }

            this.players.forEach(p => {
                if (p.isDead) return;
                if (this.checkRectCollision(e, p)) {
                    this.playerHit(p);
                }
            });
        });
    }

    checkRectCollision(r1, r2) {
        return r1.x < r2.x + r2.width &&
            r1.x + r1.width > r2.x &&
            r1.y < r2.y + r2.height &&
            r1.y + r1.height > r2.y;
    }

    playerHit(player) {
        // Prevent instant multiple hits from same frame?
        if (player.invulnerable > 0) return;

        player.lives--;
        player.invulnerable = 60; // 60 frames (1 sec) invulnerability

        this.updateHUD();
        this.createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ff00ff', 20);

        if (player.lives <= 0) {
            player.isDead = true;
            // Do NOT splice, keep for stats
        }

        // Check if all dead
        if (this.players.every(p => p.isDead)) {
            this.gameOver();
        }
    }

    statsScore(points) {
        this.score += points;
        this.updateHUD();
    }

    updateHUD() {
        let scoreText = `LVL ${this.level}`;

        if (this.players.length > 0) {
            let livesText = "";
            let pScores = "  |  ";

            this.players.forEach(p => {
                const livesDisplay = p.isDead ? "DEAD" : p.lives;
                livesText += `P${p.id}: ${livesDisplay}  `;
                pScores += `P${p.id}: ${p.score}  `;
            });
            this.livesElement.innerText = livesText;
            this.scoreElement.innerText = scoreText + pScores;
        } else {
            this.livesElement.innerText = "DEAD";
            this.scoreElement.innerText = scoreText + "  |  GAME OVER";
        }

        if (this.timerElement) {
            this.timerElement.innerText = Math.ceil(this.gameTime);
        }
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.gameOverScreen.classList.remove('hidden');

        // Find Winner
        let winnerHtml = "";
        if (this.numPlayers > 1) {
            let maxScore = -1;
            let winner = null;
            let tie = false;

            this.players.forEach(p => {
                if (p.score > maxScore) {
                    maxScore = p.score;
                    winner = p;
                    tie = false;
                } else if (p.score === maxScore) {
                    tie = true;
                }
            });

            if (tie) {
                winnerHtml = `<h2 style="color: #ffffff; text-align:center; margin-bottom:10px;">IT'S A DRAW!</h2>`;
            } else if (winner) {
                const color = winner.id === 1 ? '#00ffff' : (winner.isCpu ? '#ff00ff' : '#ffaa00');
                const name = winner.isCpu ? "CPU" : `PLAYER ${winner.id}`;
                winnerHtml = `<h2 style="color: ${color}; text-align:center; margin-bottom:10px;">${name} WINS! 🏆</h2>`;
            }
        }

        // Total score (sum of all player scores)
        const totalScore = this.players.reduce((sum, p) => sum + p.score, 0);
        this.finalScoreElement.innerText = totalScore;

        // Generate stats HTML
        let statsHtml = winnerHtml;
        this.players.forEach(p => {
            const totalShots = p.hits + p.misses;
            const acc = totalShots > 0 ? Math.round((p.hits / totalShots) * 100) : 0;
            const color = p.id === 1 ? '#00ffff' : (p.isCpu ? '#ff00ff' : '#ffaa00');

            statsHtml += `<div style="color: ${color}; margin-bottom: 5px;">
                 P${p.id}${p.isCpu ? ' (CPU)' : ''}: ${p.score} pts<br>
                 HITS: ${p.hits} | MISSES: ${p.misses} | ACC: ${acc}%
             </div>`;
        });
        this.statsElement.innerHTML = statsHtml;

        // Save High Scores
        this.players.forEach(p => {
            if (p.score > 0) {
                const name = p.isCpu ? "CPU COMMANDER" : (p.id === 1 ? this.currentPlayerName : `PLAYER ${p.id}`);
                this.highScoreManager.saveScore(name, p.score);
            }
        });
    }

    createExplosion(x, y, color, count = 4) { // Reduced from 10
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    draw() {
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (this.state === 'PLAYING') {
            this.players.forEach(p => p.draw(this.ctx));
            this.enemies.forEach(e => e.draw(this.ctx));
            this.bullets.forEach(b => b.draw(this.ctx));
            this.particles.forEach(p => p.draw(this.ctx));
            this.floatingTexts.forEach(t => t.draw(this.ctx));
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }
}

// Start Game
// Start Game
window.onload = () => {
    try {
        console.log("Initializing Space Invaders...");
        if (typeof Game === 'undefined') throw new Error("Game Class not defined");
        if (typeof SocialManager === 'undefined') throw new Error("SocialManager Class not defined");
        if (typeof NetworkManager === 'undefined') throw new Error("NetworkManager Class not defined");

        window.game = new Game();
        console.log("Game Initialized!");
    } catch (e) {
        console.error("CRITICAL INIT ERROR:", e);
        alert("Space Invaders Init Error: " + e.message + "\n" + e.stack);
    }
};
