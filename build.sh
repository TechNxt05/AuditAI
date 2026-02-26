#!/usr/bin/env bash
# Render build script
set -e

echo "📦 Installing backend dependencies..."
pip install -r backend/requirements.txt

echo "🗄️ Running database setup..."
cd backend
python -c "
from database import engine, Base
Base.metadata.create_all(bind=engine)
print('✅ Database tables created')
"

echo "🌱 Running seed data..."
python seed.py || echo "⚠️ Seed skipped (may already exist)"

echo "✅ Build complete!"
