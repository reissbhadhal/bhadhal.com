
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
        this.syncInterval = 100; // ms (10 updates per second)
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
        if (!this.db) return;

        this.lobbyId = hostName;
        this.role = 'GUEST';
        this.opponentName = hostName;

        try {
            const lobbyRef = this.db.collection('lobbies').doc(this.lobbyId);
            const doc = await lobbyRef.get();

            if (doc.exists && doc.data().status === 'WAITING') {
                // Signal Ready
                await lobbyRef.update({
                    status: 'CONNECTED',
                    guestReadyAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                this.startGameAsGuest();
            } else {
                console.error("Lobby not available");
            }
        } catch (e) {
            console.error("Error joining lobby:", e);
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
