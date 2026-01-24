
class NetworkManager {
    constructor(game) {
        this.game = game;
        this.db = window.db;
        this.lobbyId = null;
        this.role = null; // 'HOST' or 'GUEST'
        this.opponentName = null;
        this.unsubscribe = null;

        // Sync variables
        this.lastSyncTime = 0;
        this.syncInterval = 200; // ms (5 updates per second) - Optimized from 100ms
        this.isSyncing = false; // Prevent overlapping requests
    }

    // --- LOBBY SYSTEM ---

    async createLobby(guestName) {
        if (!this.db || !this.game.currentPlayerName) return;

        this.lobbyId = this.game.currentPlayerName; // Hostname is Lobby ID
        this.role = 'HOST';
        this.opponentName = guestName;

        try {
            // Create Lobby State
            await this.db.collection('lobbies').doc(this.lobbyId).set({
                host: this.game.currentPlayerName,
                guest: guestName,
                status: 'WAITING',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                seed: Math.random() // Ensure same random seed
            });

            // Listen for Guest Ready
            this.unsubscribe = this.db.collection('lobbies').doc(this.lobbyId)
                .onSnapshot(doc => {
                    const data = doc.data();
                    if (data && data.status === 'CONNECTED') {
                        this.startGameAsHost();
                    }
                });

            console.log("Lobby Created:", this.lobbyId);
        } catch (e) {
            console.error("Error creating lobby:", e);
        }
    }

    async joinLobby(hostName) {
        if (!this.db) {
            console.error("Database not available");
            alert("Cannot connect to game server. Please try again.");
            return;
        }

        this.lobbyId = hostName;
        this.role = 'GUEST';
        this.opponentName = hostName;

        // Show joining message
        this.game.startScreen.classList.add('hidden');
        this.game.loginScreen.classList.add('hidden');
        this.showJoiningScreen(hostName);

        // Retry logic - wait for lobby to be created (up to 10 seconds)
        let attempts = 0;
        const maxAttempts = 20;
        const retryInterval = 500; // ms

        const tryJoin = async () => {
            try {
                const lobbyRef = this.db.collection('lobbies').doc(this.lobbyId);
                const doc = await lobbyRef.get();

                if (doc.exists && doc.data().status === 'WAITING') {
                    // Signal Ready
                    await lobbyRef.update({
                        status: 'CONNECTED',
                        guestName: this.game.currentPlayerName,
                        guestReadyAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    this.hideJoiningScreen();
                    this.startGameAsGuest();
                    return true;
                } else if (doc.exists && doc.data().status === 'CONNECTED') {
                    // Game already started or another player joined
                    this.hideJoiningScreen();
                    alert("This game session is already in progress.");
                    this.game.startScreen.classList.remove('hidden');
                    return true;
                } else {
                    // Lobby doesn't exist yet, retry
                    attempts++;
                    if (attempts < maxAttempts) {
                        console.log(`Waiting for lobby... attempt ${attempts}/${maxAttempts}`);
                        setTimeout(tryJoin, retryInterval);
                        return false;
                    } else {
                        // Give up
                        this.hideJoiningScreen();
                        alert("Could not find the game lobby. The host may have cancelled or the link expired.");
                        this.game.startScreen.classList.remove('hidden');
                        return true;
                    }
                }
            } catch (e) {
                console.error("Error joining lobby:", e);
                this.hideJoiningScreen();
                alert("Error joining game: " + e.message);
                this.game.startScreen.classList.remove('hidden');
                return true;
            }
        };

        tryJoin();
    }

    showJoiningScreen(hostName) {
        let joiningOverlay = document.getElementById('joiningOverlay');
        if (!joiningOverlay) {
            joiningOverlay = document.createElement('div');
            joiningOverlay.id = 'joiningOverlay';
            joiningOverlay.className = 'overlay';
            joiningOverlay.innerHTML = `
                <h1 style="font-size: 2rem; margin-bottom: 20px;">🎮 JOINING GAME</h1>
                <p style="color: #39ff14; font-size: 1.5rem;" id="joiningHost"></p>
                <p style="margin-top: 20px; animation: blinker 1s linear infinite;">Connecting...</p>
            `;
            document.querySelector('.game-container').appendChild(joiningOverlay);
        }
        document.getElementById('joiningHost').innerText = `Host: ${hostName}`;
        joiningOverlay.classList.remove('hidden');
    }

    hideJoiningScreen() {
        const joiningOverlay = document.getElementById('joiningOverlay');
        if (joiningOverlay) {
            joiningOverlay.classList.add('hidden');
        }
    }

    startGameAsHost() {
        console.log("STARTING GAME AS HOST");
        this.game.state = 'PLAYING';
        this.game.numPlayers = 2; // Force 2 player mode
        this.game.startMultiplayer('HOST');
    }

    startGameAsGuest() {
        console.log("STARTING GAME AS GUEST");
        this.game.state = 'PLAYING';
        this.game.numPlayers = 2;
        this.game.startMultiplayer('GUEST');
    }

    // --- GAME SYNC ---

    async update(dt) {
        if (this.game.state !== 'PLAYING') return;

        const now = Date.now();
        if (now - this.lastSyncTime < this.syncInterval) return;
        if (this.isSyncing) return; // Wait for previous request to finish

        this.lastSyncTime = now;
        this.isSyncing = true;

        try {
            if (this.role === 'HOST') {
                await this.sendHostState();
            } else if (this.role === 'GUEST') {
                await this.sendGuestInput();
            }
        } catch (e) {
            console.error("Network Sync Error:", e);
        } finally {
            this.isSyncing = false;
        }
    }

    async sendHostState() {
        // HOST Sends: Enemy positions, Bullets, Host Player Stats
        // Heavy payload, so we optimize to minimal data

        const enemies = this.game.enemies.map(e => ({ x: Math.round(e.x), y: Math.round(e.y) }));
        const bullets = this.game.bullets.map(b => ({
            x: Math.round(b.x),
            y: Math.round(b.y),
            isEnemy: b.isEnemy
        }));

        // Host is Player 1
        const p1 = this.game.players[0];
        const p1State = { x: Math.round(p1.x), score: p1.score, lives: p1.lives };

        // Also read P2 Input (Guest) from a subcollection or field?
        // To avoid race conditions, Guest writes to a separate doc usually.
        // For simplicity in this 'light' version, Guest writes to 'guest_input' subcollection.

        await this.db.collection('lobbies').doc(this.lobbyId).set({
            enemies: enemies,
            bullets: bullets,
            p1: p1State,
            updatedAt: now
        }, { merge: true });
    }

    async sendGuestInput() {
        // Guest is Player 2
        const p2 = this.game.players[1];
        if (!p2) return;

        await this.db.collection('lobbies').doc(this.lobbyId).collection('inputs').doc('guest').set({
            x: Math.round(p2.x),
            shooting: this.game.keys['Space'] || this.game.keys['KeyF'], // Guest shoot key
            updatedAt: Date.now()
        });
    }

    // Listeners called by Game.init()
    listenForUpdates() {
        if (!this.lobbyId) return;

        if (this.role === 'GUEST') {
            // Guest listens to Host State
            this.db.collection('lobbies').doc(this.lobbyId)
                .onSnapshot(doc => {
                    const data = doc.data();
                    if (data) {
                        this.game.syncFromHost(data);
                    }
                });
        } else if (this.role === 'HOST') {
            // Host listens to Guest Input
            this.db.collection('lobbies').doc(this.lobbyId).collection('inputs').doc('guest')
                .onSnapshot(doc => {
                    const data = doc.data();
                    if (data) {
                        this.game.syncFromGuest(data);
                    }
                });
        }
    }
}
