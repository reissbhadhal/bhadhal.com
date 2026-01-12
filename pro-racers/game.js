
class RaceGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Game State
        this.running = false;
        this.lastTime = 0;

        // Physics Consts
        this.ACCELERATION = 0.2;
        this.BRAKING = 0.4;
        this.FRICTION = 0.96;
        this.TURN_SPEED = 0.05;
        this.MAX_SPEED = 12;

        // Player Car
        this.car = {
            x: 0,
            y: 0,
            angle: 0, // Radians
            speed: 0,
            color: '#00ffff'
        };

        // Inputs
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            w: false,
            s: false,
            a: false,
            d: false
        };

        // Network
        this.network = new RaceNetworkManager(this);
        this.opponentCar = { x: -100, y: -100, angle: 0, color: '#ff00ff' }; // Opponent is Purple/Pink
        this.isMultiplayer = false;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInputs();

        // Init
        this.resetCar();
        this.loop = this.loop.bind(this);
    }

    startMultiplayer(role) {
        this.isMultiplayer = true;
        this.network.listenForUpdates();
        // If Host (P1), stay Cyan. If Guest (P2), change self to Red
        if (role === 'GUEST') {
            this.car.color = '#ff3300';
            this.opponentCar.color = '#00ffff'; // Host is Cyan
            // Offset start position
            this.car.x += 50;
        } else {
            this.opponentCar.color = '#ff3300'; // Guest is Red
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);

        // Mobile Controls
        const setupTouch = (id, key) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[key] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[key] = false; });
        };

        setupTouch('btnGas', 'ArrowUp');
        setupTouch('btnBrake', 'ArrowDown');
        setupTouch('btnLeft', 'ArrowLeft');
        setupTouch('btnRight', 'ArrowRight');
    }

    resetCar() {
        this.car.x = this.canvas.width / 2;
        this.car.y = this.canvas.height / 2;
        this.car.speed = 0;
        this.car.angle = -Math.PI / 2; // Pointing up
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);

        // Auto-join/host for MVP testing?
        // Let's modify index.html to add UI buttons, but for now we can just expose methods
        window.game = this;
    }

    update(dt) {
        // Network Sync
        if (this.isMultiplayer) this.network.update(dt);

        // Steering
        if (Math.abs(this.car.speed) > 0.1) {
            if (this.keys.ArrowLeft || this.keys.a) this.car.angle -= this.TURN_SPEED * Math.sign(this.car.speed);
            if (this.keys.ArrowRight || this.keys.d) this.car.angle += this.TURN_SPEED * Math.sign(this.car.speed);
        }

        // Gas / Brake
        if (this.keys.ArrowUp || this.keys.w) {
            this.car.speed += this.ACCELERATION;
        } else if (this.keys.ArrowDown || this.keys.s) {
            this.car.speed -= this.BRAKING;
        } else {
            this.car.speed *= this.FRICTION; // Coasting friction
        }

        // Cap speed
        if (this.car.speed > this.MAX_SPEED) this.car.speed = this.MAX_SPEED;
        if (this.car.speed < -this.MAX_SPEED / 2) this.car.speed = -this.MAX_SPEED / 2;

        // Apply Velocity
        this.car.x += Math.cos(this.car.angle) * this.car.speed;
        this.car.y += Math.sin(this.car.angle) * this.car.speed;

        // Screen Wrap (Simple track for now)
        if (this.car.x > this.canvas.width) this.car.x = 0;
        if (this.car.x < 0) this.car.x = this.canvas.width;
        if (this.car.y > this.canvas.height) this.car.y = 0;
        if (this.car.y < 0) this.car.y = this.canvas.height;
    }

    draw() {
        // Clear background
        this.ctx.fillStyle = '#111'; // Tarmac color
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Player Car
        this.drawCar(this.car);

        // Draw Opponent Car
        if (this.isMultiplayer) {
            this.drawCar(this.opponentCar);
        }

        // Draw HUD
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px "Share Tech Mono"';
        this.ctx.shadowBlur = 0;
        this.ctx.fillText(`SPEED: ${Math.abs(Math.round(this.car.speed * 10))} KPH`, 20, 40);
        if (this.isMultiplayer) {
            this.ctx.fillText(`${this.network.role === 'HOST' ? 'HOST' : 'GUEST'}`, 20, 70);
            this.ctx.fillText(`LOBBY: ${this.network.lobbyId || '...'}`, 20, 100);
        }
    }

    drawCar(carObj) {
        this.ctx.save();
        this.ctx.translate(carObj.x, carObj.y);
        this.ctx.rotate(carObj.angle);

        // Car Body
        this.ctx.fillStyle = carObj.color;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = carObj.color;
        this.ctx.fillRect(-20, -10, 40, 20);

        // Headlights
        this.ctx.fillStyle = '#ffff00';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#ffff00';
        this.ctx.fillRect(15, -8, 5, 4);
        this.ctx.fillRect(15, 4, 5, 4);

        this.ctx.restore();
    }

    loop(timestamp) {
        if (!this.running) return;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame(this.loop);
    }
}

// Start Game
window.onload = () => {
    const game = new RaceGame();
    game.start();
};
