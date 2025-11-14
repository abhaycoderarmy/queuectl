#!/bin/bash

# QueueCTL Quick Setup Script
# This script sets up the entire project structure

set -e

echo "🚀 Setting up QueueCTL..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Please install Node.js >= 14.0.0${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo -e "${YELLOW}Node.js version must be >= 14.0.0${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) found${NC}"
echo ""

# Create folder structure
echo -e "${BLUE}Creating folder structure...${NC}"
mkdir -p bin
mkdir -p src/commands
mkdir -p src/core
mkdir -p src/storage
mkdir -p src/utils
mkdir -p data
mkdir -p tests

# Create .gitkeep for data directory
touch data/.gitkeep

echo -e "${GREEN}✓ Folders created${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Make scripts executable
echo -e "${BLUE}Making scripts executable...${NC}"
chmod +x bin/queuectl.js
chmod +x tests/test-scenarios.sh

echo -e "${GREEN}✓ Scripts are now executable${NC}"
echo ""

# Link CLI globally
echo -e "${BLUE}Linking CLI globally...${NC}"
npm link

echo -e "${GREEN}✓ CLI linked successfully${NC}"
echo ""

# Verify installation
echo -e "${BLUE}Verifying installation...${NC}"
if command -v queuectl &> /dev/null; then
    echo -e "${GREEN}✓ queuectl command is available${NC}"
    queuectl --version
else
    echo -e "${YELLOW}⚠ queuectl command not found. Try running: npm link${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Setup complete! ${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "Try these commands:"
echo ""
echo -e "  ${BLUE}queuectl --help${NC}                 # Show help"
echo -e "  ${BLUE}queuectl status${NC}                 # View queue status"
echo -e "  ${BLUE}npm test${NC}                        # Run tests"
echo ""
echo "Next steps:"
echo "  1. Review README.md for detailed usage"
echo "  2. Run test suite: npm test"
echo "  3. Try example commands from INSTALLATION_GUIDE.md"
echo "  4. Record your demo video"
echo ""