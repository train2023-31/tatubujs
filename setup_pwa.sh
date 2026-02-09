#!/bin/bash

# PWA Setup Script
# This script automates the initial setup of the PWA

set -e  # Exit on error

echo "🚀 Starting PWA Setup..."
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.8 or higher.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Python found: $(python3 --version)${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 14 or higher.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

echo ""
echo "================================"
echo "📦 Step 1: Installing Backend Dependencies"
echo "================================"

cd back

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate || . venv/Scripts/activate

# Install requirements
echo "Installing Python packages..."
pip install -r requirements.txt

echo -e "${GREEN}✓ Backend dependencies installed${NC}"

echo ""
echo "================================"
echo "🔑 Step 2: Generating VAPID Keys"
echo "================================"

# Check if .env already exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Backend .env file already exists${NC}"
    read -p "Do you want to regenerate VAPID keys? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping VAPID key generation..."
    else
        python generate_vapid_keys.py
        echo ""
        echo -e "${YELLOW}⚠️  Please update your .env files with the new keys above${NC}"
    fi
else
    python generate_vapid_keys.py
    echo ""
    echo -e "${YELLOW}📝 Please create backend .env file with the keys above${NC}"
    echo -e "${YELLOW}   Use back/.env.example as a template${NC}"
fi

cd ..

echo ""
echo "================================"
echo "📦 Step 3: Installing Frontend Dependencies"
echo "================================"

cd frontend

# Install npm packages
echo "Installing npm packages..."
npm install

echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Frontend .env file not found${NC}"
    echo -e "${YELLOW}   Please create frontend/.env and add REACT_APP_VAPID_PUBLIC_KEY${NC}"
else
    echo -e "${GREEN}✓ Frontend .env file exists${NC}"
    
    # Check if VAPID key is set
    if ! grep -q "REACT_APP_VAPID_PUBLIC_KEY=" .env; then
        echo -e "${YELLOW}⚠️  REACT_APP_VAPID_PUBLIC_KEY not found in .env${NC}"
        echo -e "${YELLOW}   Please add the VAPID public key to frontend/.env${NC}"
    else
        echo -e "${GREEN}✓ VAPID public key configured${NC}"
    fi
fi

cd ..

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure environment variables (if not done):"
echo "   - Backend:  back/.env (use back/.env.example as template)"
echo "   - Frontend: frontend/.env"
echo ""
echo "2. Start the backend:"
echo "   cd back && python run.py"
echo ""
echo "3. Start the frontend (in a new terminal):"
echo "   cd frontend && npm start"
echo ""
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "5. Test push notifications:"
echo "   - Click the notification bell icon"
echo "   - Grant permission when prompted"
echo "   - Send a test notification"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: docs/QUICK_START_PWA.md"
echo "   - Full Guide:  docs/PWA_SETUP_GUIDE.md"
echo ""
echo "Happy coding! 🎉"
