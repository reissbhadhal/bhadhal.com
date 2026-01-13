---
description: Deploy the Space Invaders game to GitHub Pages
---
// turbo-all
1. cd /Users/reissbhadhal/projects/space-invaders
2. cp index.html deploy/reiss/index.html || true
3. cp game.js deploy/reiss/game.js || true
4. cp style.css deploy/reiss/style.css || true
5. cp SocialManager.js deploy/reiss/SocialManager.js || true
6. cp NetworkManager.js deploy/reiss/NetworkManager.js || true
7. git add .
8. git commit -m "Automated Deployment: $(date)" || echo "Nothing to commit"
9. git remote set-url origin https://github.com/reissbhadhal/bhadhal.com.git || true
10. git push origin main
