#!/bin/bash
echo "🔄 Quick Deploy Starting..."

# Kill existing server
pkill -f "python.*http.server.*3000" 2>/dev/null

# Export new build
cd /app/frontend
echo "📦 Building..."
yarn expo export --platform web --output-dir dist > /dev/null 2>&1

# Start fresh server
cd /app/frontend/dist
python3 -m http.server 3000 --bind 0.0.0.0 > /dev/null 2>&1 &

echo "✅ Deploy complete!"
echo "🌐 Preview: https://adhd-connect-3.preview.emergentagent.com"
echo "⏰ Build time: $(date)"