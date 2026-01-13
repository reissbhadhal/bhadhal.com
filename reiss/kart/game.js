import * as THREE from 'three';
import { NetworkManager } from './NetworkManager.js';

// --- GAME CONFIG & STATE ---
const CONFIG = {
    playMode: 1, // 1=Single, 2=Local, 3=Simulated, 4=OnlineP2P
    difficulty: 'medium',
    totalLaps: 3,
    selectedChar: 'mario'
};

const CHARACTERS = {
    // --- Originals ---
    mario: { color: 0xff0000, speed: 0.80, turn: 0.04, accel: 0.015, name: 'Mario' },
    luigi: { color: 0x00ff00, speed: 0.75, turn: 0.05, accel: 0.015, name: 'Luigi' },
    peach: { color: 0xff69b4, speed: 0.78, turn: 0.045, accel: 0.020, name: 'Peach' },
    bowser: { color: 0xffaa00, speed: 0.90, turn: 0.025, accel: 0.008, name: 'Bowser' },
    toad: { color: 0xffffff, speed: 0.70, turn: 0.055, accel: 0.025, name: 'Toad' },
    yoshi: { color: 0x00ff00, speed: 0.77, turn: 0.045, accel: 0.018, name: 'Yoshi' },
    daisy: { color: 0xffa500, speed: 0.79, turn: 0.042, accel: 0.019, name: 'Daisy' },
    dk: { color: 0x8b4513, speed: 0.88, turn: 0.030, accel: 0.010, name: 'DK' },
    wario: { color: 0xffff00, speed: 0.85, turn: 0.035, accel: 0.012, name: 'Wario' },
    waluigi: { color: 0x800080, speed: 0.82, turn: 0.038, accel: 0.014, name: 'Waluigi' },

    // --- New Expansion (24 More) ---
    koopa: { color: 0xdddd00, speed: 0.72, turn: 0.05, accel: 0.022, name: 'Koopa' },
    shyguy: { color: 0xff0000, speed: 0.74, turn: 0.048, accel: 0.021, name: 'Shy Guy' },
    rosalina: { color: 0x00ffff, speed: 0.85, turn: 0.035, accel: 0.015, name: 'Rosalina' },
    metal_mario: { color: 0xaaaaaa, speed: 0.88, turn: 0.03, accel: 0.010, name: 'Metal Mario' },
    dry_bones: { color: 0xeeeeee, speed: 0.71, turn: 0.052, accel: 0.024, name: 'Dry Bones' },
    king_boo: { color: 0xffffff, speed: 0.82, turn: 0.038, accel: 0.016, name: 'King Boo' },
    birdo: { color: 0xff69b4, speed: 0.76, turn: 0.044, accel: 0.019, name: 'Birdo' },
    diddy: { color: 0x8b4513, speed: 0.75, turn: 0.046, accel: 0.020, name: 'Diddy Kong' },
    toadette: { color: 0xffc0cb, speed: 0.71, turn: 0.053, accel: 0.024, name: 'Toadette' },
    bowser_jr: { color: 0xffaa00, speed: 0.76, turn: 0.045, accel: 0.019, name: 'Bowser Jr' },
    lakitu: { color: 0x00ff00, speed: 0.73, turn: 0.051, accel: 0.023, name: 'Lakitu' },
    baby_mario: { color: 0xff0000, speed: 0.68, turn: 0.06, accel: 0.028, name: 'Baby Mario' },
    baby_luigi: { color: 0x00ff00, speed: 0.68, turn: 0.06, accel: 0.028, name: 'Baby Luigi' },
    gold_mario: { color: 0xffd700, speed: 0.90, turn: 0.025, accel: 0.010, name: 'Gold Mario' },
    pink_gold_peach: { color: 0xff69b4, speed: 0.88, turn: 0.03, accel: 0.012, name: 'Pink Gold Peach' },
    iggy: { color: 0x00dd00, speed: 0.78, turn: 0.04, accel: 0.018, name: 'Iggy' },
    roy: { color: 0xff00ff, speed: 0.84, turn: 0.035, accel: 0.014, name: 'Roy' },
    lemmy: { color: 0xffff00, speed: 0.70, turn: 0.055, accel: 0.026, name: 'Lemmy' },
    larry: { color: 0x0000ff, speed: 0.75, turn: 0.045, accel: 0.020, name: 'Larry' },
    wendy: { color: 0xff69b4, speed: 0.75, turn: 0.045, accel: 0.020, name: 'Wendy' },
    ludwig: { color: 0x0000aa, speed: 0.80, turn: 0.04, accel: 0.016, name: 'Ludwig' },
    morton: { color: 0x333333, speed: 0.86, turn: 0.032, accel: 0.012, name: 'Morton' },
    dry_bowser: { color: 0x444444, speed: 0.91, turn: 0.024, accel: 0.008, name: 'Dry Bowser' },
    funky_kong: { color: 0x8b4513, speed: 0.89, turn: 0.030, accel: 0.011, name: 'Funky Kong' },

    // --- Missing from Index ---
    tanooki_mario: { color: 0xa0522d, speed: 0.82, turn: 0.042, accel: 0.018, name: 'Tanooki Mario' },
    baby_peach: { color: 0xffb7c5, speed: 0.68, turn: 0.06, accel: 0.028, name: 'Baby Peach' },
    baby_daisy: { color: 0xffd700, speed: 0.68, turn: 0.06, accel: 0.028, name: 'Baby Daisy' },
    baby_rosalina: { color: 0xe0ffff, speed: 0.69, turn: 0.058, accel: 0.027, name: 'Baby Rosalina' },
    inkling_girl: { color: 0xff8800, speed: 0.80, turn: 0.045, accel: 0.020, name: 'Inkling Girl' },
    inkling_boy: { color: 0x0000ff, speed: 0.80, turn: 0.045, accel: 0.020, name: 'Inkling Boy' },
    link: { color: 0x006400, speed: 0.85, turn: 0.038, accel: 0.016, name: 'Link' }
};

const DIFFICULTY_SETTINGS = {
    easy: { speed: 0.5, error: 2.0 },
    medium: { speed: 0.7, error: 1.0 },
    hard: { speed: 0.9, error: 0.4 }
};

const GLOBAL_NAMES = ["Speedy_USA", "KartMaster_JP", "Racer_UK", "DriftKing_BR", "Noob_DE", "Pro_KR"];

const ITEM_TYPES = ['🍄', '🍌', '📦']; // Mushroom (Boost), Banana (Trap), Box (Weapon?) - For now simplified icons

const gameState = {
    isPlaying: false,
    startTime: 0,
    karts: [],
    itemBoxes: [], // Active boxes on track
    droppedItems: [], // Traps on track
    animateSigns: null,
    netManager: new NetworkManager(),
    remoteKartId: null // ID of network player in karts array
};

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue (Daytime)
scene.fog = new THREE.FogExp2(0x87CEEB, 0.002);

// Ground (Grass)
const groundGeo = new THREE.PlaneGeometry(2000, 2000);
const groundMat = new THREE.MeshPhongMaterial({ color: 0x228b22 }); // Forest Green
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.1;
scene.add(ground);

// Clouds? simple spheres
for (let i = 0; i < 50; i++) {
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(Math.random() * 20 + 10, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    cloud.position.set((Math.random() - 0.5) * 1000, Math.random() * 100 + 50, (Math.random() - 0.5) * 1000);
    scene.add(cloud);
}

// Cameras
const camera1 = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const camera2 = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(100, 200, 100);
dirLight.castShadow = true;
// Shadow improvements
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 500;
dirLight.shadow.camera.left = -200;
dirLight.shadow.camera.right = 200;
dirLight.shadow.camera.top = 200;
dirLight.shadow.camera.bottom = -200;
scene.add(dirLight);

// --- TRACK DEFINITION (Circuit Layout) ---
// Figure 8 / Circuit shape
const trackPoints = [
    new THREE.Vector3(0, 0, 0),       // Start
    new THREE.Vector3(50, 0, -50),    // Turn 1
    new THREE.Vector3(150, 0, -50),   // Straight
    new THREE.Vector3(200, 0, 0),     // Turn 2
    new THREE.Vector3(200, 0, 100),   // Turn 3
    new THREE.Vector3(100, 0, 150),   // Crossover Entry
    new THREE.Vector3(0, 0, 100),     // Crossover Mid
    new THREE.Vector3(-100, 0, 150),  // Loop
    new THREE.Vector3(-200, 0, 100),
    new THREE.Vector3(-200, 0, 0),
    new THREE.Vector3(-100, 0, -50),
    new THREE.Vector3(0, 0, 0)        // Finish
];
const trackCurve = new THREE.CatmullRomCurve3(trackPoints);
trackCurve.closed = true;
const TRACK_LENGTH = trackCurve.getLength();

// --- KART CLASS ---
class Kart {
    constructor(id, isPlayer, charId, startOffset, isCPU = false, isNetworkGhost = false, vehicleType = 'car') {
        this.id = id;
        this.isPlayer = isPlayer;
        this.isNetworkGhost = isNetworkGhost;
        this.charId = charId;
        this.vehicleType = vehicleType; // 'car' or 'bike'
        this.stats = CHARACTERS[charId] || CHARACTERS['mario'];

        // If CPU, randomize vehicle or default to car
        if (isCPU && !vehicleType) this.vehicleType = Math.random() > 0.5 ? 'car' : 'bike';

        this.cpuStats = isCPU ? DIFFICULTY_SETTINGS[CONFIG.difficulty] : null;
        this.isCPU = isCPU;

        this.controlKeys = null;
        this.mesh = this.createMesh(this.stats.color);

        const startPoint = trackCurve.getPointAt(0);
        this.mesh.position.copy(startPoint);
        this.mesh.position.x += startOffset;
        this.mesh.position.y = 2;
        scene.add(this.mesh);

        this.speed = 0;
        this.maxSpeed = this.stats.speed;
        this.acceleration = this.stats.accel;
        if (this.vehicleType === 'bike') {
            this.maxSpeed *= 1.05; // Bikes slightly faster
            this.acceleration *= 1.1; // Better accel
        }

        this.friction = 0.98;
        this.turnSpeed = this.stats.turn;
        this.angle = 0;

        this.lap = 1;
        this.nextCheckpoint = 1;
        this.finished = false;

        this.aiTargetT = 0;
        this.aiError = isCPU ? this.cpuStats.error : 0;

        this.items = [];
        this.boostTimer = 0;
        this.stunTimer = 0;
        this.invincibleTimer = 0; // Star Power
    }

    createMesh(color) {
        const group = new THREE.Group();

        if (this.vehicleType === 'car') {
            // --- F1 CAR HELPER ---
            const matBody = new THREE.MeshPhongMaterial({ color: color, shininess: 100 });
            const matDark = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 50 });
            // ... (Same F1 code as before)
            const bodyGeo = new THREE.BoxGeometry(0.8, 0.5, 3.5);
            const body = new THREE.Mesh(bodyGeo, matBody);
            body.position.y = 0.5;
            group.add(body);

            // Side Pods
            const sGeo = new THREE.BoxGeometry(0.6, 0.5, 1.2);
            const lPod = new THREE.Mesh(sGeo, matBody); lPod.position.set(-0.7, 0.4, 0.2); group.add(lPod);
            const rPod = new THREE.Mesh(sGeo, matBody); rPod.position.set(0.7, 0.4, 0.2); group.add(rPod);

            // Rear Wing
            const wingGeo = new THREE.BoxGeometry(2.0, 0.1, 0.5);
            const wing = new THREE.Mesh(wingGeo, matBody);
            wing.position.set(0, 1.0, -1.5);
            group.add(wing);
            // Wing Supports
            const supGeo = new THREE.BoxGeometry(0.1, 0.6, 0.3);
            const leftSup = new THREE.Mesh(supGeo, matDark);
            leftSup.position.set(-0.5, 0.7, -1.5);
            group.add(leftSup);
            const rightSup = new THREE.Mesh(supGeo, matDark);
            rightSup.position.set(0.5, 0.7, -1.5);
            group.add(rightSup);

            // Front Wing
            const fGeo = new THREE.BoxGeometry(2.2, 0.1, 0.4);
            const fWing = new THREE.Mesh(fGeo, matBody); fWing.position.set(0, 0.25, 1.8); group.add(fWing);

            // Wheels
            const wCyl = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 16);
            const wMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
            [[0.9, 0.4, 1.2], [-0.9, 0.4, 1.2], [1.0, 0.4, -1.2], [-1.0, 0.4, -1.2]].forEach(p => {
                const w = new THREE.Mesh(wCyl, wMat); w.rotation.z = Math.PI / 2; w.position.set(...p); group.add(w);
            });

        } else {
            // --- MOTORBIKE HELPER ---
            const matBody = new THREE.MeshPhongMaterial({ color: color, shininess: 80 });
            const matDark = new THREE.MeshPhongMaterial({ color: 0x111111 });

            // Main Frame (Thin)
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 2.5), matBody);
            frame.position.y = 0.6;
            group.add(frame);

            // Wheels (2 Large Inline)
            const wGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16);
            const wMat = new THREE.MeshPhongMaterial({ color: 0x222222 });

            const fWheel = new THREE.Mesh(wGeo, wMat);
            fWheel.rotation.z = Math.PI / 2; fWheel.position.set(0, 0.5, 1.2);
            group.add(fWheel);

            const rWheel = new THREE.Mesh(wGeo, wMat);
            rWheel.rotation.z = Math.PI / 2; rWheel.position.set(0, 0.5, -1.0);
            group.add(rWheel);

            // Handlebars
            const handle = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), matDark);
            handle.position.set(0, 1.1, 0.8);
            group.add(handle);
        }

        // Rider Head (Common)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), new THREE.MeshPhongMaterial({ color: 0xffeecc }));
        head.position.set(0, 0.9 + (this.vehicleType === 'bike' ? 0.4 : 0), -0.2); // Higher on bike
        group.add(head);

        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: color }));
        helmet.position.copy(head.position);
        helmet.rotation.x = -0.2;
        group.add(helmet);

        // Shadow
        const shad = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.0), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }));
        shad.rotation.x = -Math.PI / 2; shad.position.y = 0.05;
        group.add(shad);

        return group;
    }

    update() {
        if (!gameState.isPlaying || this.finished) return;

        if (this.stunTimer > 0) {
            this.stunTimer--;
            this.speed = Math.min(this.speed, this.maxSpeed * 0.2); // Cap speed
            // Optional: Add visual stun effect like spinning
            this.mesh.rotation.y += 0.1; // Small spin
        }

        if (this.isNetworkGhost) {
            // Interpolate or just wait for update
            // We do nothing here, setPositionFromNetwork updates it directly
            // Optionally: simple smoothing
        } else if (this.isPlayer) {
            this.handleInput();
        } else if (this.isCPU) {
            this.handleAI();
        }

        if (!this.isNetworkGhost) {
            this.applyPhysics();
            this.checkCheckpoints();
        }
        this.updateMesh();

        // Invincibility Decay
        if (this.invincibleTimer > 0) {
            this.invincibleTimer--;
            // Collide with other karts to spin them
            gameState.karts.forEach(k => {
                if (k !== this && k.mesh.position.distanceTo(this.mesh.position) < 3) {
                    k.takeDamage(); // Spin them out!
                }
            });
        }

        // Boost Decay
        if (this.boostTimer > 0) {
            this.boostTimer--;
            if (this.boostTimer <= 0) this.maxSpeed = this.stats.speed;
        }

        // Stun Decay
        if (this.stunTimer > 0) {
            this.stunTimer--;
            // Keep speed capped 
            if (this.speed > this.maxSpeed * 0.3) this.speed = this.maxSpeed * 0.3;
        }
    }

    handleInput() {
        const k = this.controlKeys;
        if (!k) return;

        const up = keys[k.up] || touchState.up;
        const down = keys[k.down] || touchState.down;
        const left = keys[k.left] || touchState.left;
        const right = keys[k.right] || touchState.right;
        const use = keys[k.use] || touchState.use;

        if (this.stunTimer <= 0) { // Only allow input if not stunned
            if (up) this.speed += this.acceleration;
            else if (down) this.speed -= this.acceleration;
            else this.speed *= this.friction;

            this.handleSteering(left, right);
        } else {
            this.speed *= 0.9; // Stunned, still slow down
        }

        // Item Use
        if (use) this.useItem();
    }

    handleAI() {
        // AI Logic: Follow trackCurve
        // Find nearest point T on curve
        // Ideally we track T continuously to avoid expensive searches
        // But for simplicity, we roughly target a point slightly ahead of us on the curve.

        // Simple AI: Move towards point (T + lookahead)
        // We approximate T based on checkpoint index
        // T ~ nextCheckpoint / numCheckpoints

        const numCP = 200; // Updated numCP
        // Target is slightly ahead of current position
        // Current position approx:
        const currentT = ((this.nextCheckpoint - 1) % numCP) / numCP;
        let targetT = currentT + 0.05; // Look ahead 5% of track
        if (targetT > 1) targetT -= 1;

        const targetPos = trackCurve.getPointAt(targetT);
        // Add wiggle/error
        targetPos.x += (Math.sin(Date.now() * 0.001 + this.id) * this.aiError * 10);
        targetPos.z += (Math.cos(Date.now() * 0.0013 + this.id) * this.aiError * 10);

        // Steering to target
        const dx = targetPos.x - this.mesh.position.x;
        const dz = targetPos.z - this.mesh.position.z;
        const targetAngle = Math.atan2(dx, dz);

        // Smoothly rotate towards targetAngle
        // Find shortest delta angle
        let dAngle = targetAngle - this.angle;
        while (dAngle > Math.PI) dAngle -= Math.PI * 2;
        while (dAngle < -Math.PI) dAngle += Math.PI * 2;

        if (this.stunTimer <= 0) { // Only allow steering if not stunned
            if (dAngle > 0.1) this.angle += this.turnSpeed;
            if (dAngle < -0.1) this.angle -= this.turnSpeed;

            // AI Speed: Base off difficulty but limited by Kart Stats
            const targetSpeed = Math.min(this.cpuStats.speed, this.stats.speed);
            if (this.speed < targetSpeed) this.speed += this.acceleration;
        } else {
            this.speed *= 0.9; // Stunned, still slow down
        }

        // Simple item use
        if (this.items.length > 0 && Math.random() < 0.01) this.useItem();
    }

    handleSteering(left, right) {
        if (this.speed !== 0) {
            const dir = this.speed > 0 ? 1 : -1;
            if (left) this.angle += this.turnSpeed * dir;
            if (right) this.angle -= this.turnSpeed * dir;
        }
    }

    applyPhysics() {
        // Cap Speed (Boost overrides base max)
        const currentMax = this.boostTimer > 0 ? (this.maxSpeed * 1.5) : this.maxSpeed;
        this.speed = Math.max(-0.3, Math.min(this.speed, currentMax));
        if (Math.abs(this.speed) < 0.001) this.speed = 0;

        // Move
        this.mesh.position.x += Math.sin(this.angle) * this.speed;
        this.mesh.position.z += Math.cos(this.angle) * this.speed;

        // Safety / Respawn
        if (this.mesh.position.y < -10) this.respawn();
        this.checkBarriers();
    }

    checkBarriers() {
        // Collision with track bounds (Invisible walls)
        // Simplified: Check distance to nearest CP
        // Use existing nextCheckpoint logic
        const nextIdx = this.nextCheckpoint % 200; // Updated numCP
        const prevIdx = (this.nextCheckpoint - 1 + 200) % 200; // Updated numCP

        // Use full generated checkpoints array from track setup (needs to be global or passed)
        const p1 = trackCheckpoints[prevIdx];
        const p2 = trackCheckpoints[nextIdx];

        if (!p1 || !p2) return;

        const d1 = this.mesh.position.distanceTo(p1);
        const d2 = this.mesh.position.distanceTo(p2);
        const limit = 15; // Track width half approx

        if (d1 > limit && d2 > limit) {
            const target = d1 < d2 ? p1 : p2;
            const dir = new THREE.Vector3().subVectors(target, this.mesh.position).normalize();
            this.mesh.position.add(dir.multiplyScalar(0.8));
            this.speed *= 0.8;
        }
    }

    respawn() {
        const lastIdx = (this.nextCheckpoint - 1 + 200) % 200; // Updated numCP
        const spawnPos = trackCheckpoints[lastIdx];
        this.mesh.position.copy(spawnPos);
        this.mesh.position.y = 2;
        this.speed = 0;

        const nextPos = trackCheckpoints[(lastIdx + 1) % 200]; // Updated numCP
        this.angle = Math.atan2(nextPos.x - spawnPos.x, nextPos.z - spawnPos.z);
    }

    checkCheckpoints() {
        const nextIdx = this.nextCheckpoint % 200; // Updated numCP
        const nextCP = trackCheckpoints[nextIdx];

        // Slightly forgiving checkpoint radius
        if (this.mesh.position.distanceTo(nextCP) < 25) {
            this.nextCheckpoint++;

            // Item Box Check (Simulated for AI, precise for Player?)
            // We'll check item boxes separately

            // Lapse
            if (this.nextCheckpoint % 200 === 0 && this.nextCheckpoint > 0) { // Updated numCP
                this.lap++;
                if (this.lap > CONFIG.totalLaps) {
                    this.finished = true;
                    // Logic for finish rank
                }
            }
        }
    }

    updateMesh() {
        this.mesh.rotation.y = this.angle + Math.PI;

        // Bike Leaning Logic
        if (this.vehicleType === 'bike') {
            const turnFactor = (this.angle - this.lastAngle || 0) * 10;
            // Smoothly lean
            this.mesh.rotation.z = -turnFactor * 5;
            this.lastAngle = this.angle;
        }

        // Star Power Visual (Flashing)
        if (this.invincibleTimer > 0) {
            this.mesh.visible = Math.floor(Date.now() / 50) % 2 === 0;
            // Also spin wildly if desired
        } else {
            this.mesh.visible = true;
        }
    }

    pickupItem(isDouble) {
        const count = isDouble ? 2 : 1;
        for (let i = 0; i < count; i++) {
            if (this.items.length < 2) {
                const r = Math.random();
                // 40% Boost, 25% Shell, 25% Trap, 10% Star
                let type = 'boost';
                if (r < 0.4) type = 'boost';
                else if (r < 0.65) type = 'shell';
                else if (r < 0.90) type = 'trap';
                else type = 'star';

                this.items.push(type);
            }
        }
        this.updateUI();
    }

    useItem() {
        if (this.items.length === 0) return;
        const item = this.items.shift();

        if (item === 'boost') {
            this.speed = this.maxSpeed * 1.5;
            this.boostTimer = 600; // 10 seconds (60fps * 10)
        } else if (item === 'trap') {
            spawnDroppedItem(this.mesh.position.clone());
        } else if (item === 'shell') {
            spawnRedShell(this);
        } else if (item === 'star') {
            // ULTIMATE STAR: Boost + Shell + Trap + Invincibility
            this.speed = this.maxSpeed * 1.5;
            this.boostTimer = 1200; // 20 seconds
            this.invincibleTimer = 1200;

            // Fire Shell & Drop Trap automatically
            spawnRedShell(this);
            spawnDroppedItem(this.mesh.position.clone());
        }
        this.updateUI();
    }

    takeDamage() {
        // Slow down, don't stop
        this.speed = this.maxSpeed * 0.2;
        this.stunTimer = 120; // 2 seconds at 60fps

        // Visual spin
        const spinAnim = () => {
            if (this.stunTimer > 0) {
                this.mesh.rotation.y += 0.5;
                requestAnimationFrame(spinAnim);
            }
        };
        spinAnim();
    }

    updateUI() {
        if (!this.isPlayer) return;
        const prefix = this.id === 0 ? 'p1' : (this.id === 1 && CONFIG.playMode === 2 ? 'p2' : null);
        if (!prefix) return;

        const itemEl = document.getElementById(`${prefix}-item`);
        if (itemEl) {
            // Visualize item stack
            itemEl.innerHTML = this.items.map(i => {
                if (i === 'boost') return '🍄';
                if (i === 'trap') return '🍌';
                if (i === 'shell') return '🐢';
                if (i === 'star') return '⭐';
                return '?';
            }).join('');
        }

        const lapEl = document.getElementById(`${prefix}-lap`);
        if (lapEl) lapEl.innerText = `LAP ${Math.min(this.lap, CONFIG.totalLaps)} / ${CONFIG.totalLaps}`;
    }

    setPositionFromNetwork(x, z, angle, speed) {
        this.mesh.position.x = x;
        this.mesh.position.z = z;
        this.angle = angle;
        this.speed = speed;
    }
}

// --- GLOBAL HELPERS & SETUP ---
let trackCheckpoints = [];

function setupTrackLogic() {
    const mapId = CONFIG.mapId || 'circuit';

    // Map Settings
    let skyColor = 0x87CEEB;
    let groundColor = 0x228822;
    let trackBaseColor = '#333333';
    let trackShininess = 10;

    if (mapId === 'rainbow') {
        skyColor = 0x000022; // Deep Space Blue
        groundColor = 0x110011; // Dark Purple Void
        trackBaseColor = '#ff00ff'; // Neon base
        trackShininess = 80;
    } else if (mapId === 'bowser') {
        skyColor = 0x440000; // Dark Red
        groundColor = 0x882200; // Lava Orange/Red
        trackBaseColor = '#222222'; // Dark Stone
    }

    // Environment
    scene.background = new THREE.Color(skyColor);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshPhongMaterial({ color: groundColor, depthWrite: false });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    trackCheckpoints = []; // Reset
    const num = 200; // Smoother
    for (let i = 0; i < num; i++) {
        trackCheckpoints.push(trackCurve.getPointAt(i / num));
    }

    // TRACK MESH
    const extrudeSettings = { steps: 400, bevelEnabled: false, extrudePath: trackCurve };
    const shape = new THREE.Shape([
        new THREE.Vector2(-15, 0), new THREE.Vector2(-15, 0.2),
        new THREE.Vector2(15, 0.2), new THREE.Vector2(15, 0)
    ]);

    // Dynamic Track Texture
    const asphCanvas = document.createElement('canvas');
    asphCanvas.width = 64; asphCanvas.height = 64;
    const ctx = asphCanvas.getContext('2d');

    if (mapId === 'rainbow') {
        // Rainbow Gradient
        const grd = ctx.createLinearGradient(0, 0, 64, 0);
        grd.addColorStop(0, "red");
        grd.addColorStop(0.2, "orange");
        grd.addColorStop(0.4, "yellow");
        grd.addColorStop(0.6, "green");
        grd.addColorStop(0.8, "blue");
        grd.addColorStop(1, "violet");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 64, 64);
        // Add sparkles
        ctx.fillStyle = "white";
        for (let k = 0; k < 20; k++) ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
    } else if (mapId === 'bowser') {
        // Dark Brick/Stone
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 32, 32); ctx.fillRect(32, 32, 32, 32); // Checkers
    } else {
        // Standard Asphalt
        ctx.fillStyle = '#333333'; ctx.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 100; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#444' : '#222';
            ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
        }
    }

    const tex = new THREE.CanvasTexture(asphCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;

    const mat = new THREE.MeshPhongMaterial({ map: tex, shininess: trackShininess });
    const track = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, extrudeSettings), mat);
    track.receiveShadow = true;
    scene.add(track);

    // Curbs (Red/White stripes on edges?) - Omitted for complexity, maybe later

    // Item Boxes
    for (let i = 0; i < num; i += 4) { // Less frequent but still plenty
        if (i === 0) continue;
        spawnItemRow(trackCheckpoints[i], i / num);
    }

    // Signs (re-add simplified)
    // ... (Omitted for brevity, logic identical to before)
}

function spawnItemRow(posT, u) {
    const tangent = trackCurve.getTangentAt(u).normalize();
    // Perpendicular vector in the XZ plane
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const boxGeo = new THREE.BoxGeometry(2, 2, 2);
    const boxMat = new THREE.MeshPhongMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 });
    const doubleBoxMat = new THREE.MeshPhongMaterial({ color: 0xffa500, transparent: true, opacity: 0.8 }); // Orange for double item

    const offsets = [-5, 0, 5]; // Spread boxes out along the normal vector

    offsets.forEach((offset, index) => {
        const box = new THREE.Mesh(boxGeo, index === 1 ? doubleBoxMat : boxMat); // Middle box gets different material
        box.position.copy(posT);
        box.position.add(normal.clone().multiplyScalar(offset)); // Offset along the normal
        box.position.y = 1.5;

        // Add userData to distinguish double item boxes
        box.userData = { isDoubleItem: index === 1 }; // Middle box gives two items

        scene.add(box);
        gameState.itemBoxes.push(box);
    });
}

function spawnDroppedItem(pos) {
    const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const mat = new THREE.MeshPhongMaterial({ color: 0xff0000 }); // Red box trap
    const trap = new THREE.Mesh(geo, mat);
    trap.position.copy(pos);
    trap.position.y = 1;
    trap.userData = { type: 'trap', life: 300 }; // Trap lasts 5 seconds
    scene.add(trap);
    gameState.droppedItems.push(trap);
}

// RED SHELL LOGIC
function spawnRedShell(ownerKart) {
    const shell = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 16),
        new THREE.MeshPhongMaterial({ color: 0xff0000 })
    );
    shell.position.copy(ownerKart.mesh.position);
    shell.position.y = 2;

    // Determine Target: Kart with rank = owner.rank - 1
    // Need simpler sort: Find nearest kart IN FRONT
    // Or just sort karts by 'distanceTravelled' (needs implementing)

    // Simplified: Find closest kart dist > 0 (ahead)
    let bestTarget = null;
    let minDist = 9999;

    gameState.karts.forEach(k => {
        if (k === ownerKart) return;
        // Check if ahead (simple check: dist to next CP?)
        // Better: Project on curve T.
        // Assuming sorted array by race position could work if we had it.
        // Quick hack: Just closest kart regardless of direction, but red shell usually goes forward.

        const d = k.mesh.position.distanceTo(ownerKart.mesh.position);
        if (d < minDist && d < 100) { // Lock on range
            minDist = d;
            bestTarget = k;
        }
    });

    shell.userData = {
        type: 'shell',
        target: bestTarget,
        speed: 1.5, // Faster than karts
        life: 200, // Shell lasts for 200 frames
        owner: ownerKart
    };

    scene.add(shell);
    gameState.droppedItems.push(shell); // We re-use droppedItems array for active projectiles too
}

// --- NETWORK SETUP ---
function setupMultiplayer() {
    const modeSelect = document.getElementById('mode-select');
    const mpPanel = document.getElementById('mp-config-panel');

    if (modeSelect && mpPanel) {
        modeSelect.addEventListener('change', () => {
            if (modeSelect.value === '4') {
                mpPanel.style.display = 'block';
            } else {
                mpPanel.style.display = 'none';
            }
        });
    }

    // Host
    const btnHost = document.getElementById('btn-host');
    if (btnHost) {
        btnHost.addEventListener('click', () => {
            gameState.netManager.initialize().then(id => {
                document.getElementById('host-code-display').style.display = 'block';
                document.getElementById('my-code').innerText = id;
                document.getElementById('connection-status').innerText = "Waiting for player...";

                gameState.netManager.onConnect(() => {
                    document.getElementById('connection-status').innerText = "PLAYER CONNECTED! Starting...";
                    // P1 is host, start game soon?
                    // For now, let P1 press Start manually
                });

                gameState.netManager.onDataReceived(data => {
                    if (gameState.remoteKartId !== null) {
                        const remoteKart = gameState.karts[gameState.remoteKartId];
                        if (remoteKart) {
                            remoteKart.setPositionFromNetwork(data.x, data.z, data.a, data.s);
                        }
                    }
                });
            });
        });
    }

    // Join
    const btnJoin = document.getElementById('btn-join');
    if (btnJoin) {
        btnJoin.addEventListener('click', () => {
            document.getElementById('join-input-display').style.display = 'block';
            gameState.netManager.initialize().then(id => {
                // we are ready to connect
            });
        });
    }
    // Connect
    const btnConnect = document.getElementById('btn-connect');
    if (btnConnect) {
        btnConnect.addEventListener('click', () => {
            const remoteId = document.getElementById('remote-code-input').value;
            gameState.netManager.connectToPeer(remoteId);
            gameState.netManager.onConnect(() => {
                document.getElementById('connection-status').innerText = "CONNECTED TO HOST!";
            });
            gameState.netManager.onDataReceived(data => {
                if (gameState.remoteKartId !== null) {
                    const remoteKart = gameState.karts[gameState.remoteKartId];
                    if (remoteKart) {
                        remoteKart.setPositionFromNetwork(data.x, data.z, data.a, data.s);
                    }
                }
            });
        });
    }
}
setupMultiplayer();


// --- INPUT & UI ---
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

// Touch Logic
const touchState = { up: false, down: false, left: false, right: false, use: false };
function setupTouchControls() {
    try {
        const bind = (id, key) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('touchstart', (e) => { e.preventDefault(); touchState[key] = true; });
            el.addEventListener('touchend', (e) => { e.preventDefault(); touchState[key] = false; });
            el.addEventListener('mousedown', (e) => { e.preventDefault(); touchState[key] = true; }); // For testing on desktop
            el.addEventListener('mouseup', (e) => { e.preventDefault(); touchState[key] = false; });
        };
        bind('btn-gas', 'up');
        bind('btn-brake', 'down');
        bind('btn-left', 'left');
        bind('btn-right', 'right');
        bind('btn-item', 'use');
    } catch (e) { console.error("Touch Setup Error:", e); }
}

// EXPOSE TO WINDOW for index.html access
console.log("Defining window.initGame...");
window.initGame = function () {
    // Sync Config from HTML
    if (window.CONFIG) {
        Object.assign(CONFIG, window.CONFIG);
    }
    if (window.selectedCharacter) {
        CONFIG.selectedChar = window.selectedCharacter;
    }

    // Resume standard init
    setupTrackLogic();

    // Spawn Karts
    // 6 Karts Total
    // P1
    const p1 = new Kart(0, true, CONFIG.selectedChar, -5);
    p1.controlKeys = { up: 'w', down: 's', left: 'a', right: 'd', use: ' ' };
    gameState.karts.push(p1);

    // P2 or CPU
    if (CONFIG.playMode === 2) {
        // P2 defaults to Luigi for now or random
        const p2 = new Kart(1, true, 'luigi', 5);
        p2.controlKeys = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', use: 'Enter' };
        gameState.karts.push(p2);
    } else if (CONFIG.playMode === 4) {
        // Online P2P: P1 is local, P2 is network ghost
        const p2 = new Kart(1, false, 'luigi', 5, false, true); // Not player, not CPU, IS network ghost
        gameState.karts.push(p2);
        gameState.remoteKartId = 1; // Store the index of the remote kart
    } else {
        // CPU 1
        const char = 'luigi';
        const cpu = new Kart(1, false, char, 5, true);
        gameState.karts.push(cpu);
    }

    // Other CPUs (Fill to 24)
    const charsList = Object.keys(CHARACTERS);
    const totalRacers = 24;
    const filledSoFar = gameState.karts.length;

    for (let i = 0; i < (totalRacers - filledSoFar); i++) {
        const c = charsList[i % charsList.length]; // Cycle through roster
        // Grid Spawning Logic:
        // Rows of 2: Left (-3), Right (3)
        // Staggered back every row (-4 units)
        // Offset starting at i=0 (but we have karts already)
        const row = Math.floor(i / 2) + 2; // +2 to start behind players
        const side = (i % 2 === 0) ? -4 : 4;
        const zOffset = -row * 6; // Spaced out

        const k = new Kart(i + filledSoFar, false, c, side, true); // All additional are CPUs

        // Manual override for spawn Z (Kart class defaults to curve start)
        // We need to move them BACK along the track (negative Z locally?)
        // Currently Kart spawns at track T=0 + offset X.
        // To spawn behind, we need T < 0 (loop around) or just move mesh back?
        // Simpler: Just spawn at T=0 and move mesh.z backwards
        // But the track curves. 
        // Better: Use getPointAt with slightly negative u (wrapped)?
        // Let's keep it simple: spawn at T=0.99, 0.98 etc.

        const startU = (1.0 - (row * 0.01)) % 1.0; // Place behind start line
        const spawnPos = trackCurve.getPointAt(startU);
        k.mesh.position.copy(spawnPos);

        // Align to track tangent
        const tangent = trackCurve.getTangentAt(startU);
        const angle = Math.atan2(tangent.x, tangent.z);
        k.angle = angle;

        // Side offset relative to direction
        const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        k.mesh.position.add(right.multiplyScalar(side));
        k.mesh.position.y = 2;

        gameState.karts.push(k);
    }

    gameState.isPlaying = true;
    gameState.startTime = Date.now();
    animate();
}

try {
    setupMultiplayer();
} catch (e) { console.error("Multiplayer Setup Error:", e); }

try {
    setupTouchControls();
} catch (e) { console.error("Touch Controls Setup Error:", e); }

console.log("Game Engine Module Loaded Successfully");

// --- LOOP ---
// --- LOOP ---
function animate() {
    requestAnimationFrame(animate);

    // If not playing, still render static scene (or menu spin)
    if (!gameState.isPlaying) {
        if (gameState.karts.length > 0) {
            // Preview mode? Just render P1 view
            renderer.render(scene, camera1);
        } else {
            // Default view (Spinning or static)
            // camera1.position.set(Math.sin(Date.now()*0.001)*50, 20, Math.cos(Date.now()*0.001)*50);
            // camera1.lookAt(0,0,0);
            renderer.render(scene, camera1);
        }
        return;
    }

    // Update Logic
    gameState.karts.forEach(k => k.update());

    // Item Box Animation
    gameState.itemBoxes.forEach((box) => {
        if (!box.visible) return;
        box.rotation.y += 0.05;
    });

    // Time & Logic
    if (gameState.isPlaying) {
        // Mode Specific Logic
        if (CONFIG.gameMode === 'battle') {
            gameState.battleTimer--;
            if (gameState.battleTimer <= 0) {
                finishBattle();
                return;
            }
            // Coin Spawn Check
            if (Math.random() < 0.05 && gameState.coins.length < 50) {
                spawnCoin();
            }
            checkCoinCollisions();
        }

        // Collision Checks
        checkCollisions();

        // CAMERA & RENDERING
        if (CONFIG.playMode === 2) {
            // Split Screen Rendering
            // P1 (Left)
            const p1 = gameState.karts[0];
            updateCamera(camera1, p1);
            renderer.setScissorTest(true);

            renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);
            renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
            renderer.render(scene, camera1);

            // P2 (Right)
            const p2 = gameState.karts[1];
            if (p2) {
                updateCamera(camera2, p2);
                renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
                renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
                renderer.render(scene, camera2);
            }
            renderer.setScissorTest(false);

        } else {
            // Single Screen
            const p1 = gameState.karts[0];
            updateCamera(camera1, p1);
            renderer.setScissorTest(false);
            renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
            renderer.render(scene, camera1);
        }
    }
}

// BATTLE MODE HELPERS
gameState.battleTimer = 14400; // 4 mins
gameState.coins = [];
gameState.teamScores = { red: 0, blue: 0, yellow: 0, green: 0 };

function spawnCoin() {
    const geo = new THREE.CylinderGeometry(1, 1, 0.2, 16);
    const mat = new THREE.MeshPhongMaterial({ color: 0xffff00, shininess: 100 });
    const coin = new THREE.Mesh(geo, mat);

    // Random Pos on Map
    const x = (Math.random() - 0.5) * 400;
    const z = (Math.random() - 0.5) * 400;
    coin.position.set(x, 2, z);
    coin.rotation.z = Math.PI / 2;
    coin.rotation.y = Date.now() * 0.001; // Spin setup

    scene.add(coin);
    gameState.coins.push(coin);
}

function checkCoinCollisions() {
    gameState.coins.forEach((c, idx) => {
        c.rotation.x += 0.05; // Spin animation

        gameState.karts.forEach(k => {
            if (k.mesh.position.distanceTo(c.position) < 3) {
                // Collect
                scene.remove(c);
                gameState.coins.splice(idx, 1);

                // Add Score
                // Need to determine team. For now, just logging or whatever.
                // In battle mode, simple scoring:
                // k.team should be set? Defaults to 'red' if p1, 'blue' if p2?
                // Logic pending.
                console.log("Coin Collected!");
            }
        });
    });
}

function checkCollisions() {
    // 1. Kart vs Item Boxes
    gameState.karts.forEach(k => {
        if (!k.isPlayer && !k.isCPU) return; // Only local entities pick up items for now? Or allow CPUs

        gameState.itemBoxes.forEach((box, idx) => {
            if (!box.visible) return;
            if (k.mesh.position.distanceTo(box.position) < 2.5) {
                // Pickup
                box.visible = false;
                setTimeout(() => box.visible = true, 5000); // Respawn after 5s

                // Give item
                k.pickupItem(box.userData.isDoubleItem);

                // Sound?
            }
        });

        // 2. Kart vs Dropped Items (Traps/Shells)
        gameState.droppedItems.forEach((item, idx) => {
            if (item.userData.owner === k) return; // Don't hit own items immediately? 
            // (Shells track targets, but traps are static)

            if (k.mesh.position.distanceTo(item.position) < 2.0) {
                // Hit!
                k.takeDamage();
                scene.remove(item);
                gameState.droppedItems.splice(idx, 1);
            }
        });
    });
}

function updateCamera(cam, targetKart) {
    const off = new THREE.Vector3(0, 5, -10).applyAxisAngle(new THREE.Vector3(0, 1, 0), targetKart.angle);
    // targetKart.angle is internal, mesh rotation is y
    // Actually we compute offset based on kart position and angle

    const targetX = targetKart.mesh.position.x - Math.sin(targetKart.angle) * 10;
    const targetZ = targetKart.mesh.position.z - Math.cos(targetKart.angle) * 10;

    cam.position.x += (targetX - cam.position.x) * 0.1;
    cam.position.z += (targetZ - cam.position.z) * 0.1;
    cam.position.y = targetKart.mesh.position.y + 5;
    cam.lookAt(targetKart.mesh.position);
}

// Resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera1.aspect = window.innerWidth / window.innerHeight;
    if (CONFIG.playMode === 2) camera1.aspect = (window.innerWidth / 2) / window.innerHeight;
    camera1.updateProjectionMatrix();

    camera2.aspect = (window.innerWidth / 2) / window.innerHeight;
    camera2.updateProjectionMatrix();
});
