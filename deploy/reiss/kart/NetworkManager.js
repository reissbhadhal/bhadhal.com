export class NetworkManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.playerId = null;
        this.onConnectCallback = null;
        this.onDataCallback = null;
    }

    initialize(id = null) {
        // Create Peer. If ID provided, try to use it (for fixed room codes if we had a server, but here random is safer)
        // We'll let PeerJS generate a random ID for the Host
        return new Promise((resolve, reject) => {
            if (id) {
                this.peer = new Peer(id);
            } else {
                this.peer = new Peer();
            }

            this.peer.on('open', (id) => {
                console.log('My peer ID is: ' + id);
                this.playerId = id;
                resolve(id);
            });

            this.peer.on('error', (err) => {
                console.error(err);
                reject(err);
            });

            // Listen for incoming connections (Host logic)
            this.peer.on('connection', (conn) => {
                this.handleConnection(conn);
            });
        });
    }

    connectToPeer(remoteId) {
        if (!this.peer) return;
        this.isHost = false;
        const conn = this.peer.connect(remoteId);
        this.handleConnection(conn);
    }

    handleConnection(conn) {
        this.conn = conn;

        this.conn.on('open', () => {
            console.log("Connected to: " + this.conn.peer);
            if (this.onConnectCallback) this.onConnectCallback(this.conn.peer);
        });

        this.conn.on('data', (data) => {
            if (this.onDataCallback) this.onDataCallback(data);
        });
    }

    sendData(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }

    onData(callback) {
        this.onDataCallback = callback;
    }

    onConnect(callback) {
        this.onConnectCallback = callback;
    }
}
