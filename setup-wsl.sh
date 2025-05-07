#!/bin/bash

# Packstack WSL2 Setup Script
echo "Setting up Packstack in WSL2..."

# Terminal colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check for administrative privileges
if [ "$(id -u)" -ne 0 ]; then
  echo -e "${YELLOW}Note: Running without sudo. Some system packages may not install properly.${NC}"
  echo -e "${YELLOW}If installation fails, run with: sudo ./setup-wsl.sh${NC}"
  USE_SUDO=""
else
  USE_SUDO="sudo"
fi

# Install system dependencies
echo -e "${BLUE}Installing system dependencies...${NC}"
$USE_SUDO apt-get update -y
$USE_SUDO apt-get install -y lsof python3-pip python3-venv

# Create necessary directories if they don't exist
mkdir -p ./server/uploads

# Install Node.js dependencies
echo -e "${BLUE}Installing Node.js dependencies...${NC}"
npm install

# Set up Python virtual environment (recommended for isolation)
echo -e "${BLUE}Setting up Python virtual environment...${NC}"
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo -e "${BLUE}Installing Python dependencies...${NC}"
pip install flask marshmallow
cd server

# Check if requirements.txt exists
if [ -f requirements.txt ]; then
    pip install -r requirements.txt
else
    echo -e "${YELLOW}Warning: requirements.txt not found. Creating a basic version...${NC}"
    cat > requirements.txt << EOL
flask==2.2.3
marshmallow==3.19.0
requests==2.28.2
python-dotenv==0.21.1
Pillow==9.4.0
pyzbar==0.1.9
EOL
    pip install -r requirements.txt
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${GREEN}Creating .env file...${NC}"
    cat > .env << EOL
# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=1

# API Keys (replace with your actual keys)
OPENAI_API_KEY=your_openai_key_here
WALMART_CLIENT_ID=your_walmart_id_here
WALMART_CLIENT_SECRET=your_walmart_secret_here

# AWS Keys for Amazon Product API
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_KEY=your_aws_secret_key_here
AWS_ASSOCIATE_TAG=your_associate_tag_here
EOL
    echo -e "${YELLOW}Please edit .env to add your actual API keys${NC}"
fi

cd ..

# Create script to activate the environment
cat > activate-env.sh << EOL
#!/bin/bash
source venv/bin/activate
export FLASK_APP=server/app.py
export FLASK_ENV=development
export FLASK_DEBUG=1
EOL
chmod +x activate-env.sh

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${BLUE}To activate the Python environment for manual testing:${NC}"
echo -e "source ./activate-env.sh"
echo -e "${BLUE}To run the application:${NC}"
echo -e "./run-wsl.sh"
echo -e "${BLUE}To run tests:${NC}"
echo -e "./run-wsl.sh test"
