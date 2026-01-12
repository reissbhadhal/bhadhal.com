
class RaceGame {
    constructor() {
        this.container = document.body;
        this.playerName = "ANONYMOUS";

        // 3D Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.Fog(0x050505, 10, 50);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;

        // Game State
        this.running = false;
        this.lastTime = 0;

        // Physics Consts
        this.ACCELERATION = 0.5;
        this.BRAKING = 1.0;
        this.FRICTION = 0.98;
        this.TURN_SPEED = 0.04;
        this.MAX_SPEED = 20;

        // Player Car
        this.car = {
            mesh: null,
            x: 0,
            z: 0,
            angle: 0, // Radians
            speed: 0,
            color: 0x00ffff,
            type: 'SPEEDSTER'
        };

        // Opponent
        this.opponentCar = {
            mesh: null,
            x: -1000,
            z: -1000,
            angle: 0,
            color: 0xff3300
        };

        // Inputs
        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, s: false, a: false, d: false };

        // Timer Logic
        this.startTime = Date.now();
        this.currentLapTime = 0;
        this.bestLapTime = Infinity;
        this.checkpointPassed = false;

        // Network
        this.network = new RaceNetworkManager(this);
        this.isMultiplayer = false;

        this.initWorld();
        this.initCar();
        this.initOpponent();
        this.setupLights();

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInputs();
        this.setupSelectionUI();

        // Loop
        this.loop = this.loop.bind(this);
    }

    // --- INITIALIZATION ---

    initWorld() {
        // Ground
        const planeGeo = new THREE.PlaneGeometry(2000, 2000);
        const planeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        const ground = new THREE.Mesh(planeGeo, planeMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Track - Neon Oval (Default)
        this.trackGroup = new THREE.Group();
        this.createTrackOval();
        this.scene.add(this.trackGroup);
    }

    createTrackOval() {
        // Simple boundary boxes for now
        this.createWall(0, 0, 800, 500, 0xff00ff); // Outer
        this.createWall(0, 0, 600, 300, 0x00ffff); // Inner
    }

    createWall(cx, cz, w, h, color) {
        // Create 4 walls
        const th = 2; // thickness
        const height = 5;
        const mat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 });

        // Top
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, height, th), mat);
        top.position.set(cx, height / 2, cz - h / 2);
        this.trackGroup.add(top);

        // Bottom
        const bot = new THREE.Mesh(new THREE.BoxGeometry(w, height, th), mat);
        bot.position.set(cx, height / 2, cz + h / 2);
        this.trackGroup.add(bot);

        // Left
        const left = new THREE.Mesh(new THREE.BoxGeometry(th, height, h), mat);
        left.position.set(cx - w / 2, height / 2, cz);
        this.trackGroup.add(left);

        // Right
        const right = new THREE.Mesh(new THREE.BoxGeometry(th, height, h), mat);
        right.position.set(cx + w / 2, height / 2, cz);
        this.trackGroup.add(right);
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0x404040);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
    }

    initCar() {
        this.car.mesh = this.createCarMesh(this.car.color);
        this.scene.add(this.car.mesh);
        this.resetCarPosition();
    }

    initOpponent() {
        this.opponentCar.mesh = this.createCarMesh(this.opponentCar.color);
        this.scene.add(this.opponentCar.mesh);
        // Hide initially
        this.opponentCar.mesh.position.set(-1000, -1000, -1000);
    }

    createCarMesh(colorHex) {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(2, 1, 4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.5, roughness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        body.castShadow = true;
        group.add(body);

        // Cabin
        const cabinGeo = new THREE.BoxGeometry(1.8, 0.8, 2);
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.y = 1.2;
        cabin.position.z = -0.2;
        group.add(cabin);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        wheelGeo.rotateZ(Math.PI / 2);

        const w1 = new THREE.Mesh(wheelGeo, wheelMat); w1.position.set(1.1, 0.4, 1.2); group.add(w1);
        const w2 = new THREE.Mesh(wheelGeo, wheelMat); w2.position.set(-1.1, 0.4, 1.2); group.add(w2);
        const w3 = new THREE.Mesh(wheelGeo, wheelMat); w3.position.set(1.1, 0.4, -1.2); group.add(w3);
        const w4 = new THREE.Mesh(wheelGeo, wheelMat); w4.position.set(-1.1, 0.4, -1.2); group.add(w4);

        return group;
    }

    resetCarPosition() {
        this.car.x = 300; // Start line right side
        this.car.z = 0;
        this.car.angle = Math.PI; // Face Left
        this.car.speed = 0;
        this.car.mesh.position.set(this.car.x, 0, this.car.z);
        this.car.mesh.rotation.y = this.car.angle;
    }

    // --- LOGIC ---

    startMultiplayer(role) {
        this.isMultiplayer = true;
        this.network.listenForUpdates();
        if (role === 'GUEST') {
            this.updateCarType(this.car.type, 0xff3300); // Red
            this.updateOpponentCar(0x00ffff); // Cyan
            this.car.z += 5; // Offset start
        } else {
            this.updateOpponentCar(0xff3300); // Red
        }
    }

    updateCarType(type, colorOverride = null) {
        this.car.type = type;
        if (colorOverride) this.car.color = colorOverride;

        // Remove old mesh
        this.scene.remove(this.car.mesh);
        // Create new
        this.car.mesh = this.createCarMesh(this.car.color); // TODO: Add different geometries based on type later
        this.scene.add(this.car.mesh);
    }

    updateOpponentCar(color) {
        this.opponentCar.color = color;
        this.scene.remove(this.opponentCar.mesh);
        this.opponentCar.mesh = this.createCarMesh(color);
        this.scene.add(this.opponentCar.mesh);
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);
        // Mobile listeners same as before...
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

    setupSelectionUI() {
        const cars = [
            { id: 'SPEEDSTER', name: 'CYAN SPEEDSTER', color: 0x00ffff },
            { id: 'RACER_X', name: 'RED RACER X', color: 0xff0000 },
            { id: 'SHADOW', name: 'SHADOW OPS', color: 0x333333 },
            { id: 'GOLD', name: 'GOLDEN AGE', color: 0xffaa00 }
        ];
        let carIdx = 0;

        document.getElementById('btnCar').onclick = () => {
            carIdx = (carIdx + 1) % cars.length;
            const c = cars[carIdx];
            document.getElementById('carName').innerText = c.name;
            document.getElementById('carName').style.color = '#' + c.color.toString(16).padStart(6, '0');
            this.updateCarType(c.id, c.color);
        };

        // Maps (Placeholder for now)
        document.getElementById('btnMap').onclick = () => {
            alert("More tracks coming soon!");
        };
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
        window.game = this;
    }

    update(dt) {
        // Network Sync
        if (this.isMultiplayer) this.network.update(dt);

        // Physics
        if (Math.abs(this.car.speed) > 0.1) {
            if (this.keys.ArrowLeft || this.keys.a) this.car.angle += this.TURN_SPEED * Math.sign(this.car.speed);
            if (this.keys.ArrowRight || this.keys.d) this.car.angle -= this.TURN_SPEED * Math.sign(this.car.speed);
        }

        if (this.keys.ArrowUp || this.keys.w) {
            this.car.speed += this.ACCELERATION;
        } else if (this.keys.ArrowDown || this.keys.s) {
            this.car.speed -= this.BRAKING;
        } else {
            this.car.speed *= this.FRICTION;
        }

        // Cap speed
        if (this.car.speed > this.MAX_SPEED) this.car.speed = this.MAX_SPEED;
        if (this.car.speed < -this.MAX_SPEED / 2) this.car.speed = -this.MAX_SPEED / 2;

        // Apply Velocity (Z is forward/back in 3D usually, X is left/right)
        // In this scene: X is left/right, Z is forward/back. 
        // 0 angle = pointing along -Z ? let's try standard math
        this.car.x += Math.sin(this.car.angle) * this.car.speed;
        this.car.z += Math.cos(this.car.angle) * this.car.speed;

        // Update Mesh
        this.car.mesh.position.x = this.car.x;
        this.car.mesh.position.z = this.car.z;
        this.car.mesh.rotation.y = this.car.angle;

        // Camera Follow
        const camDist = 15;
        const camHeight = 8;
        const cx = this.car.x - Math.sin(this.car.angle) * camDist;
        const cz = this.car.z - Math.cos(this.car.angle) * camDist;

        this.camera.position.x += (cx - this.camera.position.x) * 0.1;
        this.camera.position.z += (cz - this.camera.position.z) * 0.1;
        this.camera.position.y = camHeight;
        this.camera.lookAt(this.car.x, 0, this.car.z);

        // Checkpoints & Lap (Simple x-axis check logic translated)
        // Previous logic relied on screen wrapping. Here we have a track.
        // Let's implement a simple "Cross The Line" check.
        // Finish line at X = 300? 
        if (this.car.x > 300 && !this.checkpointPassed) {
            // Crossed finish line from left to right?
            // Need vector logic, but simple check:
            this.completeLap();
        }
        if (this.car.x < -300) {
            this.checkpointPassed = true;
        }
    }

    completeLap() {
        if (!this.checkpointPassed) return; // Must have gone to other side

        const lapTime = (Date.now() - this.startTime) / 1000;
        this.startTime = Date.now();
        this.checkpointPassed = false;

        // Timer HUD update done in separate overlay draw/dom update?
        // Let's use DOM for HUD
        document.getElementById('lobbyStatus').innerText = `TIME: ${lapTime.toFixed(2)}`;

        if (lapTime < this.bestLapTime && lapTime > 5.0) { // Min 5s lap
            this.bestLapTime = lapTime;
            if (this.network) this.network.submitScore(this.playerName, this.bestLapTime);
        }
    }

    loop(timestamp) {
        if (!this.running) return;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(dt);
        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame(this.loop);
    }
}

// Start Game
window.onload = () => {
    const game = new RaceGame();
    game.start();
};
