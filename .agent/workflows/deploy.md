---
description: Deploy the Space Invaders game to GitHub Pages
---
// turbo-all
1. cd /Users/reissbhadhal/projects/space-invaders
2. git rm --cached deploy || true
3. git add .
4. git commit -m "Automated Deployment: $(date)" || echo "Nothing to commit"
5. git remote set-url origin https://github.com/reissbhadhal/bhadhal.com.git || true
6. git push origin main
