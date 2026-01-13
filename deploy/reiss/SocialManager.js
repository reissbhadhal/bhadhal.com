
class SocialManager {
    constructor(game) {
        this.game = game;
        this.db = window.db;
        this.currentUserDoc = null;
        this.isOpen = false;

        this.overlay = document.getElementById('socialOverlay');
        this.friendList = document.getElementById('friendList');
        this.msg = document.getElementById('socialMsg');
        this.input = document.getElementById('friendInput');

        this.bindEvents();
    }

    async initUser(username) {
        if (!this.db || !username) return;

        try {
            const userRef = this.db.collection('users').doc(username);
            const doc = await userRef.get();

            if (!doc.exists) {
                // Create new user profile
                await userRef.set({
                    username: username,
                    friends: [],
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                    isOnline: true
                });
            } else {
                // Update online status
                await userRef.update({
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                    isOnline: true
                });
            }
            this.currentUserDoc = userRef;
            this.loadFriends();

            // Set offline on disconnect (cleanup)
            // Note: plain Firestore doesn't support onDisconnect easily without Realtime DB presence
            // We'll just update timestamp on actions.
        } catch (e) {
            console.error("Social Init Error:", e);
        }
    }

    bindEvents() {
        const btnOpen = document.getElementById('btnSocial');
        const btnClose = document.getElementById('btnCloseSocial');
        const btnAdd = document.getElementById('btnAddFriend');

        if (btnOpen) btnOpen.addEventListener('click', () => this.toggle(true));
        if (btnClose) btnClose.addEventListener('click', () => this.toggle(false));
        if (btnAdd) btnAdd.addEventListener('click', () => this.addFriend());
    }

    toggle(show) {
        this.isOpen = show;
        if (show) {
            this.overlay.classList.remove('hidden');
            this.loadFriends();
        } else {
            this.overlay.classList.add('hidden');
        }
    }

    async addFriend() {
        const targetName = this.input.value.trim().toUpperCase();
        if (!targetName) return;
        if (targetName === this.game.currentPlayerName) {
            this.showMsg("CANNOT ADD YOURSELF", "red");
            return;
        }

        try {
            // 1. Check if user has a Social Profile
            const targetDoc = await this.db.collection('users').doc(targetName).get();

            if (targetDoc.exists) {
                // User exists and is ready
                await this.currentUserDoc.update({
                    friends: firebase.firestore.FieldValue.arrayUnion(targetName)
                });
                this.showMsg(`ALLY ADDED: ${targetName}`, "green");
                this.input.value = "";
                this.loadFriends();
                return;
            }

            // 2. Fallback: Check High Scores (Legacy Player?)
            this.showMsg("SEARCHING ARCHIVES...", "yellow");
            const scoreCheck = await this.db.collection('scores').where('name', '==', targetName).limit(1).get();

            if (!scoreCheck.empty) {
                // Found in high scores, but no social profile yet
                this.showMsg("PILOT MUST LOG IN UPDATE SYSTEM", "red");
            } else {
                this.showMsg("USER NOT FOUND", "red");
            }

        } catch (e) {
            console.error(e);
            this.showMsg("ERROR ADDING ALLY", "red");
        }
    }

    async loadFriends() {
        if (!this.currentUserDoc) return;

        const doc = await this.currentUserDoc.get();
        const data = doc.data();
        const friends = data.friends || [];

        if (friends.length === 0) {
            this.friendList.innerHTML = '<li style="color: #666; font-style: italic;">NO ALLIES FOUND</li>';
            return;
        }

        this.friendList.innerHTML = '<li style="color: #666;">SCANNING...</li>';

        // Load details for each friend
        let html = '';
        for (const friendName of friends) {
            const fDoc = await this.db.collection('users').doc(friendName).get();
            const fData = fDoc.exists ? fDoc.data() : { isOnline: false };

            // Allow roughly 5 min timeout for "Online" if we don't have Realtime DB
            const isOnline = fData.isOnline; // simplified for now
            const statusClass = isOnline ? 'status-online' : 'status-offline';

            html += `
                <li>
                    <span><span class="friend-status ${statusClass}"></span>${friendName}</span>
                    <button style="font-size: 0.7rem; padding: 2px 5px; background: #333;" onclick="window.game.invite('${friendName}')">INVITE</button>
                </li>
            `;
        }
        this.friendList.innerHTML = html;
    }

    showMsg(text, color) {
        this.msg.style.color = color === "green" ? "#39ff14" : "var(--neon-red)";
        this.msg.innerText = text;
        setTimeout(() => this.msg.innerText = "", 3000);
    }
}
