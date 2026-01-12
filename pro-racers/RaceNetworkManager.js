
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
}
