# Script to deploy Space Invaders to GitHub

echo "🚀 Preparing Deployment..."
cd /Users/reissbhadhal/projects/space-invaders

# Git Operations
echo "📦 Committing changes..."
git add .
git commit -m "Update Game: $(date)"

echo "⬆️ Pushing to GitHub..."
echo "NOTE: You may be asked for your GitHub Username and Password."
echo "If you have 2FA enabled, you must use a Personal Access Token as the password."

# Push to the correct repo
git remote set-url origin https://github.com/reissbhadhal/bhadhal.com.git
git push origin main

echo "✅ Done! Check https://bhadhal.com/"
