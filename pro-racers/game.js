
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

    // --- INITIALIZATION ---

    initWorld() {
        // Lights
        const ambient = new THREE.AmbientLight(0x404040);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Track Group
        this.trackGroup = new THREE.Group();
        this.scene.add(this.trackGroup);

        // Default Map
        this.currentMap = 'NEON';
        this.loadMap('NEON');
    }

    loadMap(type) {
        this.currentMap = type;

        // Clear old track
        while (this.trackGroup.children.length > 0) {
            this.trackGroup.remove(this.trackGroup.children[0]);
        }

        if (type === 'DESERT') {
            this.createTrackDesert();
        } else if (type === 'CITY') {
            this.createTrackCity();
        } else {
            this.createTrackNeon();
        }
    }

    createTrackNeon() {
        // Ground
        this.createGround(0x111111);
        // Walls
        this.createWall(0, 0, 800, 500, 0xff00ff); // Outer
        this.createWall(0, 0, 600, 300, 0x00ffff); // Inner
    }

    createTrackDesert() {
        // Ground - Sand
        this.createGround(0xE6C229); // Gold/Sand

        // Track boundaries (Rocks/Canyons)
        this.createWall(0, 0, 800, 500, 0xA0522D);
        this.createWall(0, 0, 600, 300, 0xA0522D);

        // Cacti
        for (let i = 0; i < 20; i++) {
            const h = 5 + Math.random() * 10;
            const cactus = new THREE.Mesh(
                new THREE.CylinderGeometry(1, 1, h, 8),
                new THREE.MeshStandardMaterial({ color: 0x228b22 }) // Forest Green
            );
            // Random position outside inner loop
            const angle = Math.random() * Math.PI * 2;
            const rad = 350 + Math.random() * 50;
            cactus.position.set(Math.cos(angle) * rad, h / 2, Math.sin(angle) * rad);
            this.trackGroup.add(cactus);
        }
    }

    createTrackCity() {
        // Ground - Asphalt
        this.createGround(0x222222);

        // Buildings instad of walls
        this.createWall(0, 0, 800, 500, 0x555555, 30); // Tall outer walls
        this.createWall(0, 0, 600, 300, 0x333333, 20); // Inner block

        // Street Lights or Deco
        // Simple glowing posts
        for (let i = 0; i < 10; i++) {
            const h = 15;
            const pole = new THREE.Mesh(
                new THREE.BoxGeometry(1, h, 1),
                new THREE.MeshStandardMaterial({ color: 0x888888 })
            );
            const light = new THREE.Mesh(
                new THREE.BoxGeometry(2, 2, 2),
                new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffffaa })
            );
            pole.position.set(-300 + i * 60, h / 2, -260);
            light.position.set(0, h / 2, 0);
            pole.add(light);
            this.trackGroup.add(pole);
        }
    }

    createGround(color) {
        const planeGeo = new THREE.PlaneGeometry(2000, 2000);
        const planeMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
        const ground = new THREE.Mesh(planeGeo, planeMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.trackGroup.add(ground);
    }

    createTrackOval() { /* Deprecated by loadMap */ }

    createWall(cx, cz, w, h, color, height = 5) {
        // Create 4 walls
        const th = 5; // thickness
        const mat = new THREE.MeshStandardMaterial({ color: color });

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

    setupLights() { /* Moved to initWorld */ }

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

    createCarMesh(colorHex, type = 'RACING') {
        const group = new THREE.Group();
        const matBody = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.6, roughness: 0.2 });
        const matDark = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const matWheel = new THREE.MeshStandardMaterial({ color: 0x111111 });

        if (type === 'F1') {
            // Nose
            const nose = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 3), matBody);
            nose.position.z = 1.5; nose.position.y = 0.5; group.add(nose);
            // Cockpit
            const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 2), matBody);
            body.position.z = -0.5; body.position.y = 0.6; group.add(body);
            // Spoiler
            const spoiler = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 0.8), matBody);
            spoiler.position.set(0, 1.2, -1.8); group.add(spoiler);
            // Wings
            const fWing = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 0.5), matBody);
            fWing.position.set(0, 0.4, 2.5); group.add(fWing);

            // Wheels (Wide)
            const wGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.6, 16); wGeo.rotateZ(Math.PI / 2);
            const w1 = new THREE.Mesh(wGeo, matWheel); w1.position.set(1.5, 0.6, 1.5); group.add(w1);
            const w2 = new THREE.Mesh(wGeo, matWheel); w2.position.set(-1.5, 0.6, 1.5); group.add(w2);
            const w3 = new THREE.Mesh(wGeo, matWheel); w3.position.set(1.5, 0.6, -1.5); group.add(w3);
            const w4 = new THREE.Mesh(wGeo, matWheel); w4.position.set(-1.5, 0.6, -1.5); group.add(w4);

        } else if (type === 'TRUCK') {
            // Big Body
            const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2, 5), matBody);
            body.position.y = 1.5; group.add(body);
            // Cab
            const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 2), matDark);
            cab.position.set(0, 3, 0); group.add(cab);

            // Big Wheels
            const wGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.0, 16); wGeo.rotateZ(Math.PI / 2);
            const w1 = new THREE.Mesh(wGeo, matWheel); w1.position.set(2, 1, 1.5); group.add(w1);
            const w2 = new THREE.Mesh(wGeo, matWheel); w2.position.set(-2, 1, 1.5); group.add(w2);
            const w3 = new THREE.Mesh(wGeo, matWheel); w3.position.set(2, 1, -1.5); group.add(w3);
            const w4 = new THREE.Mesh(wGeo, matWheel); w4.position.set(-2, 1, -1.5); group.add(w4);

        } else {
            // Standard Car (Existing logic approx)
            const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), matBody);
            body.position.y = 0.5; group.add(body);
            const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 2), matDark);
            cabin.position.set(0, 1.2, -0.2); group.add(cabin);
            // Wheels
            const wGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16); wGeo.rotateZ(Math.PI / 2);
            const w1 = new THREE.Mesh(wGeo, matWheel); w1.position.set(1.1, 0.4, 1.2); group.add(w1);
            const w2 = new THREE.Mesh(wGeo, matWheel); w2.position.set(-1.1, 0.4, 1.2); group.add(w2);
            const w3 = new THREE.Mesh(wGeo, matWheel); w3.position.set(1.1, 0.4, -1.2); group.add(w3);
            const w4 = new THREE.Mesh(wGeo, matWheel); w4.position.set(-1.1, 0.4, -1.2); group.add(w4);
        }

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

    startGameLoop() {
        this.running = true;
        this.startTime = Date.now(); // Reset timer on start
        this.lastTime = performance.now();
        console.log("RACE STARTED!");
    }

    toggleCamera() {
        if (this.cameraMode === 'CHASE') {
            this.cameraMode = 'COCKPIT';
            return 'INSIDE';
        } else {
            this.cameraMode = 'CHASE';
            return 'OUTSIDE';
        }
    }

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
        this.car.type = type; // F1, TRUCK, RACING
        if (colorOverride) this.car.color = colorOverride;

        this.scene.remove(this.car.mesh);
        this.car.mesh = this.createCarMesh(this.car.color, this.car.type);
        this.scene.add(this.car.mesh);
    }

    updateOpponentCar(color) {
        this.opponentCar.color = color;
        this.scene.remove(this.opponentCar.mesh);
        // Default opponent to Racing for now, or sync type later
        this.opponentCar.mesh = this.createCarMesh(color, 'RACING');
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

    setupAdvancedSelectionUI() {
        const classes = ['RACING', 'HEAVY', 'STREET'];
        const vehicles = {
            'RACING': [{ id: 'F1', name: 'F1 RACER' }, { id: 'SPEEDSTER', name: 'SPEEDSTER' }],
            'HEAVY': [{ id: 'TRUCK', name: 'MONSTER TRUCK' }, { id: 'TANK', name: 'ARMORED VAN' }],
            'STREET': [{ id: 'SEDAN', name: 'NEON CRUISER' }, { id: 'MUSCLE', name: 'MUSCLE CAR' }]
        };
        const characters = ['THE PILOT', 'ROBOT', 'CYBERPUNK', 'ALIEN'];
        const maps = [
            { id: 'NEON', name: 'NEON OVAL', color: 0xff00ff },
            { id: 'DESERT', name: 'SANDY CANYON', color: 0xffaa00 },
            { id: 'CITY', name: 'CYBER CITY', color: 0x999999 }
        ];

        let classIdx = 0;
        let vehIdx = 0;
        let charIdx = 0;
        let mapIdx = 0;

        const updateUI = () => {
            const cls = classes[classIdx];
            const vehList = vehicles[cls];
            if (vehIdx >= vehList.length) vehIdx = 0; // reset if out of bounds
            const veh = vehList[vehIdx];

            document.getElementById('className').innerText = cls;
            document.getElementById('vehicleName').innerText = veh.name;

            // Update Car Preview
            this.updateCarType(veh.id, 0x00ffff); // Default Cyan for preview
        };

        // 1. Class
        document.getElementById('btnClass').onclick = () => {
            classIdx = (classIdx + 1) % classes.length;
            vehIdx = 0; // Reset vehicle to first of new class
            updateUI();
        };

        // 2. Vehicle
        document.getElementById('btnVehicle').onclick = () => {
            const cls = classes[classIdx];
            vehIdx = (vehIdx + 1) % vehicles[cls].length;
            updateUI();
        };

        // 3. Character
        document.getElementById('btnChar').onclick = () => {
            charIdx = (charIdx + 1) % characters.length;
            document.getElementById('charName').innerText = characters[charIdx];
        };

        // 4. Map
        document.getElementById('btnMap').onclick = () => {
            mapIdx = (mapIdx + 1) % maps.length;
            const m = maps[mapIdx];
            document.getElementById('mapName').innerText = m.name;
            document.getElementById('mapName').style.color = '#' + m.color.toString(16).padStart(6, '0');
            if (window.game && window.game.loadMap) {
                window.game.loadMap(m.id);
            }
        };

        // Initial
        updateUI();
    }

    start() {
        // Just start the render loop, but logic is paused until startGameLoop()
        this.running = false;
        this.cameraMode = 'CHASE';
        this.lastTime = performance.now();

        this.setupAdvancedSelectionUI(); // Initialize new UI logic

        requestAnimationFrame(this.loop);
        window.game = this;
    }

    update(dt) {
        if (!this.running) {
            // Garage Spin
            this.camera.position.x = this.car.x + Math.sin(Date.now() * 0.001) * 20;
            this.camera.position.z = this.car.z + Math.cos(Date.now() * 0.001) * 20;
            this.camera.position.y = 10;
            this.camera.lookAt(this.car.x, 0.5, this.car.z);
            return;
        }

        if (this.raceFinished) return; // Stop updates if done

        // Network Sync
        if (this.isMultiplayer) this.network.update(dt);

        // Race Timer HUD
        const totalTime = (Date.now() - this.startTime) / 1000;
        const mins = Math.floor(totalTime / 60).toString().padStart(2, '0');
        const secs = (totalTime % 60).toFixed(2).padStart(5, '0');
        document.getElementById('lobbyStatus').innerText = `LAP ${this.currentLap}/${this.totalLaps} - TIME: ${mins}:${secs}`;

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

        // Apply Velocity
        this.car.x += Math.sin(this.car.angle) * this.car.speed;
        this.car.z += Math.cos(this.car.angle) * this.car.speed;

        // Update Mesh
        this.car.mesh.position.x = this.car.x;
        this.car.mesh.position.z = this.car.z;
        this.car.mesh.rotation.y = this.car.angle;

        // Camera Logic
        if (this.cameraMode === 'COCKPIT') {
            const offset = 0.5; const height = 1.3;
            this.camera.position.x = this.car.x + Math.sin(this.car.angle) * offset;
            this.camera.position.z = this.car.z + Math.cos(this.car.angle) * offset;
            this.camera.position.y = height;
            const lx = this.car.x + Math.sin(this.car.angle) * 20;
            const lz = this.car.z + Math.cos(this.car.angle) * 20;
            this.camera.lookAt(lx, height, lz);
        } else {
            const camDist = 15; const camHeight = 8;
            const cx = this.car.x - Math.sin(this.car.angle) * camDist;
            const cz = this.car.z - Math.cos(this.car.angle) * camDist;
            this.camera.position.x += (cx - this.camera.position.x) * 0.1;
            this.camera.position.z += (cz - this.camera.position.z) * 0.1;
            this.camera.position.y = camHeight;
            this.camera.lookAt(this.car.x, 0, this.car.z);
        }

        // Checkpoints & Lap
        if (this.car.x > 300 && !this.checkpointPassed) {
            this.completeLap();
        }
        if (this.car.x < -300) {
            this.checkpointPassed = true;
        }
    }

    completeLap() {
        if (!this.checkpointPassed) return;

        this.checkpointPassed = false;

        // Lap complete
        if (this.currentLap < this.totalLaps) {
            this.currentLap++;
        } else {
            this.finishRace();
        }
    }

    finishRace() {
        this.raceFinished = true;
        const totalTime = (Date.now() - this.startTime) / 1000;

        // Use alert for MVP results, then reload
        const name = this.playerName;
        alert(`RACE FINISHED!\nTotal Time: ${totalTime.toFixed(2)}s\nWinner: ${name}`);
        location.reload(); // Go back to start
    }

    loop(timestamp) {
        // ALWAYS loop so we can render title screen rotation
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
