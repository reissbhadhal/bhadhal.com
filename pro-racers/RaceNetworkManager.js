
class RaceNetworkManager {
    constructor(game) {
        this.game = game;
        this.db = window.db;
        this.lobbyId = null;
        this.role = null; // 'HOST' or 'GUEST'
        this.opponentName = null;
        this.unsubscribe = null;

        // Sync
        this.lastSyncTime = 0;
        this.syncInterval = 50; // 20 updates per second for smoother racing
    }

    async createLobby(guestName) {
        if (!this.db) return;

        // Simple Lobby ID generation (for MVP, use 'race1', 'race2' or timestamp)
        // Ideally user inputs this, but we'll auto-gen or use fixed for now
        this.lobbyId = "race_" + Math.floor(Math.random() * 1000);
        this.role = 'HOST';

        console.log("Creating Lobby:", this.lobbyId);

        try {
            await this.db.collection('race_lobbies').doc(this.lobbyId).set({
                host: 'Player1',
                status: 'WAITING',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Listen for guest
            this.unsubscribe = this.db.collection('race_lobbies').doc(this.lobbyId)
                .onSnapshot(doc => {
                    const data = doc.data();
                    if (data && data.status === 'CONNECTED') {
                        this.startGame('HOST');
                    }
                });

            return this.lobbyId;
        } catch (e) { console.error(e); }
    }

    async joinLobby(lobbyId) {
        if (!this.db) return;
        this.lobbyId = lobbyId;
        this.role = 'GUEST';

        try {
            const ref = this.db.collection('race_lobbies').doc(this.lobbyId);
            const doc = await ref.get();
            if (doc.exists && doc.data().status === 'WAITING') {
                await ref.update({ status: 'CONNECTED' });
                this.startGame('GUEST');
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    }

    startGame(role) {
        console.log("Starting Race as", role);
        this.game.startMultiplayer(role);
    }

    update(dt) {
        if (!this.game.running || !this.lobbyId) return;

        const now = Date.now();
        if (now - this.lastSyncTime < this.syncInterval) return;
        this.lastSyncTime = now;

        if (this.role === 'HOST') {
            // Host sends their car (P1) state
            this.db.collection('race_lobbies').doc(this.lobbyId).update({
                p1: {
                    x: Math.round(this.game.car.x),
                    y: Math.round(this.game.car.y),
                    angle: this.game.car.angle,
                    speed: this.game.car.speed
                },
                updatedAt: now
            });
        } else {
            // Guest sends their car (P2) state (we need to double check if P2 exists in game yet)
            // For simplest MVP, Host is Blue, Guest is Red.
            this.db.collection('race_lobbies').doc(this.lobbyId).update({
                p2: {
                    x: Math.round(this.game.car.x),
                    y: Math.round(this.game.car.y),
                    angle: this.game.car.angle,
                    speed: this.game.car.speed
                },
                guestUpdated: now
            });
        }
    }

    listenForUpdates() {
        if (!this.lobbyId) return;

        this.db.collection('race_lobbies').doc(this.lobbyId).onSnapshot(doc => {
            const data = doc.data();
            if (!data) return;

            if (this.role === 'HOST' && data.p2) {
                // Update P2 (Guest Car)
                if (this.game.opponentCar) {
                    this.game.opponentCar.x = data.p2.x;
                    this.game.opponentCar.y = data.p2.y;
                    this.game.opponentCar.angle = data.p2.angle;
                }
            } else if (this.role === 'GUEST' && data.p1) {
                // Update P1 (Host Car)
                if (this.game.opponentCar) {
                    this.game.opponentCar.x = data.p1.x;
                    this.game.opponentCar.y = data.p1.y;
                    this.game.opponentCar.angle = data.p1.angle;
                }
            }
        });
    }

    // --- LEADERBOARD ---

    async submitScore(name, time) {
        if (!this.db || !name) return;
        console.log(`Submitting Score: ${name} - ${time}`);
        try {
            // Check if user has better score first? 
            // For MVP, just push every good lap. Ideally query for existing best.
            await this.db.collection('race_leaderboard').add({
                name: name,
                time: time,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.fetchLeaderboard(); // Refresh display
        } catch (e) {
            console.error("Error submitting score:", e);
        }
    }

    async fetchLeaderboard() {
        if (!this.db) return;
        try {
            const snapshot = await this.db.collection('race_leaderboard')
                .orderBy('time', 'asc')
                .limit(10)
                .get();

            const list = document.getElementById('leaderboardList');
            if (list) {
                let html = '<ol style="padding-left: 20px;">';
                snapshot.forEach(doc => {
                    const d = doc.data();
                    html += `<li style="margin-bottom: 5px;"><span style="color:#fff">${d.name}</span> <span style="float:right; color:#00ffff">${d.time.toFixed(2)}s</span></li>`;
                });
                html += '</ol>';
                list.innerHTML = html;
                document.getElementById('leaderboardPanel').style.display = 'block';
            }
        } catch (e) {
            console.error("Error fetching leaderboard:", e);
        }
    }
}
