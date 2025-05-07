#!/bin/bash

# Packstack Deployment Script for Ubuntu Server
# Target: ubuntu-01.thelab.lan

# Terminal colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SERVER="ubuntu-01.thelab.lan"
SERVER_USER="ubuntu"
DEPLOY_DIR="/home/ubuntu/packstack"
LOCAL_DIR="$(pwd)"
ARCHIVE_NAME="packstack.tar.gz"

# Display banner
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}    Packstack Deployment Script    ${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "Deploying to: ${YELLOW}${SERVER}${NC}"
echo -e "Deploy directory: ${YELLOW}${DEPLOY_DIR}${NC}"
echo

# Check if SSH key exists or prompt for password auth
if [ ! -f ~/.ssh/id_rsa ]; then
  echo -e "${YELLOW}No SSH key found. Will use password authentication.${NC}"
  SSH_OPTS=""
else
  echo -e "${GREEN}SSH key found. Using key-based authentication.${NC}"
  SSH_OPTS="-i ~/.ssh/id_rsa"
fi

# Function to run a command on the remote server
remote_cmd() {
  echo -e "${BLUE}▶ Running on server:${NC} $1"
  ssh $SSH_OPTS $SERVER_USER@$SERVER "$1"
  return $?
}

# Function to check if a command exists on the remote server
remote_command_exists() {
  remote_cmd "command -v $1 > /dev/null 2>&1" >/dev/null 2>&1
  return $?
}

# Check if we can connect to the server
echo -e "${BLUE}Testing connection to ${SERVER}...${NC}"
if ! ping -c 1 $SERVER >/dev/null 2>&1; then
  echo -e "${RED}Error: Cannot reach $SERVER. Please check network connectivity.${NC}"
  exit 1
fi

# Create deployment archive
echo -e "${BLUE}Creating deployment archive...${NC}"
git archive --format=tar.gz --output=$ARCHIVE_NAME HEAD 2>/dev/null || tar -czf $ARCHIVE_NAME --exclude=node_modules --exclude=.git --exclude=venv .

# Check if server has required dependencies
echo -e "${BLUE}Checking for required dependencies on the server...${NC}"
dependencies=("nodejs" "npm" "python3" "pip3")
missing_deps=()

for dep in "${dependencies[@]}"; do
  if ! remote_command_exists $dep; then
    missing_deps+=($dep)
  fi
done

# Install missing dependencies if any
if [ ${#missing_deps[@]} -gt 0 ]; then
  echo -e "${YELLOW}Installing missing dependencies: ${missing_deps[*]}${NC}"
  remote_cmd "sudo apt-get update && sudo apt-get install -y ${missing_deps[*]} python3-venv python3-pip"
fi

# Create deploy directory on server if it doesn't exist
echo -e "${BLUE}Creating deployment directory on server...${NC}"
remote_cmd "mkdir -p $DEPLOY_DIR"

# Copy deployment archive to server
echo -e "${BLUE}Copying application to server...${NC}"
scp $SSH_OPTS $ARCHIVE_NAME $SERVER_USER@$SERVER:$DEPLOY_DIR/

# Extract and set up application on server
echo -e "${BLUE}Extracting and setting up application on server...${NC}"
remote_cmd "cd $DEPLOY_DIR && tar -xzf $ARCHIVE_NAME && rm $ARCHIVE_NAME"

# Set up Python environment
echo -e "${BLUE}Setting up Python virtual environment...${NC}"
remote_cmd "cd $DEPLOY_DIR && python3 -m venv venv && source venv/bin/activate && pip install --upgrade pip && pip install flask marshmallow requests python-dotenv Pillow pyzbar"

# Install Node.js dependencies
echo -e "${BLUE}Installing Node.js dependencies...${NC}"
remote_cmd "cd $DEPLOY_DIR && npm install"

# Create startup script on the server
echo -e "${BLUE}Creating startup script...${NC}"
remote_cmd "cat > $DEPLOY_DIR/start.sh << 'EOL'
#!/bin/bash
cd \$(dirname \$0)
source venv/bin/activate

# Start backend server
cd server
nohup python app.py > ../backend.log 2>&1 &
BACKEND_PID=\$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=\$!

echo \"Packstack started: Backend PID \$BACKEND_PID, Frontend PID \$FRONTEND_PID\"
echo \"\$BACKEND_PID \$FRONTEND_PID\" > .pids
EOL"

# Create stop script on the server
echo -e "${BLUE}Creating stop script...${NC}"
remote_cmd "cat > $DEPLOY_DIR/stop.sh << 'EOL'
#!/bin/bash
cd \$(dirname \$0)
if [ -f .pids ]; then
  read BACKEND_PID FRONTEND_PID < .pids
  echo \"Stopping Packstack: Backend PID \$BACKEND_PID, Frontend PID \$FRONTEND_PID\"
  kill \$BACKEND_PID \$FRONTEND_PID 2>/dev/null || true
  rm .pids
else
  echo \"No PID file found. Stopping all related processes...\"
  pkill -f \"python app.py\" 2>/dev/null || true
  pkill -f \"npm run dev\" 2>/dev/null || true
fi
echo \"Packstack stopped\"
EOL"

# Make scripts executable
echo -e "${BLUE}Making scripts executable...${NC}"
remote_cmd "chmod +x $DEPLOY_DIR/start.sh $DEPLOY_DIR/stop.sh"

# Ensure uploads directory exists
remote_cmd "mkdir -p $DEPLOY_DIR/server/uploads"

# Create .env file if it doesn't exist
echo -e "${BLUE}Setting up environment variables...${NC}"
remote_cmd "if [ ! -f $DEPLOY_DIR/server/.env ]; then
  cat > $DEPLOY_DIR/server/.env << EOL
# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=0

# API Keys (replace with your actual keys)
OPENAI_API_KEY=your_openai_key_here
WALMART_CLIENT_ID=your_walmart_id_here
WALMART_CLIENT_SECRET=your_walmart_secret_here

# AWS Keys for Amazon Product API
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_KEY=your_aws_secret_key_here
AWS_ASSOCIATE_TAG=your_associate_tag_here
EOL
  echo '${YELLOW}Note: Please update API keys in $DEPLOY_DIR/server/.env${NC}'
fi"

# Start the application
echo -e "${BLUE}Starting Packstack...${NC}"
remote_cmd "cd $DEPLOY_DIR && ./stop.sh >/dev/null 2>&1 || true && ./start.sh"

# Set up systemd service if not already configured
echo -e "${BLUE}Setting up systemd service...${NC}"
remote_cmd "if [ ! -f /etc/systemd/system/packstack.service ]; then
  cat > /tmp/packstack.service << 'EOL'
[Unit]
Description=Packstack Application
After=network.target

[Service]
Type=forking
User=$SERVER_USER
WorkingDirectory=$DEPLOY_DIR
ExecStart=$DEPLOY_DIR/start.sh
ExecStop=$DEPLOY_DIR/stop.sh
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOL
  sudo mv /tmp/packstack.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable packstack.service
  echo 'Systemd service installed and enabled'
fi"

# Ensure all configuration files are up to date
echo -e "${BLUE}Ensuring project configuration files...${NC}"
remote_cmd "cd $DEPLOY_DIR && \
  [ ! -f .gitignore ] && cat > .gitignore << 'EOL'
node_modules
.env
__pycache__
*.pyc
*.pyo
*.pyd
venv
dist
build
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local
.pids
*.log
.idea
.vscode
server/uploads/*
!server/uploads/.gitkeep
EOL

# Create/update .prettierrc.json if it doesn't exist
[ ! -f .prettierrc.json ] && cat > .prettierrc.json << 'EOL'
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
EOL

# Create/update .eslintrc.json if it doesn't exist
[ ! -f .eslintrc.json ] && cat > .eslintrc.json << 'EOL'
{
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "plugins": ["react", "@typescript-eslint"],
  "rules": {
    "react/react-in-jsx-scope": "off"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
EOL

# Create/update .windsurfrules file
[ ! -f .windsurfrules ] && cat > .windsurfrules << 'EOL'
# Packstack Application Rules

## Coding Standards
- Use TypeScript for frontend development
- Follow ESLint and Prettier configurations
- Keep API calls in separate files from UI components
- Use getApiUrl() instead of hard-coded URLs

## Git Workflow
- Create feature branches from main
- Use descriptive commit messages
- Update futurefeatures.md with all changes

## Environment
- Never commit API keys to the repository
- Always use .env for environment-specific configurations
EOL

# Ensure futurefeatures.md exists and is up-to-date
[ -f futurefeatures.md ] || touch futurefeatures.md
"

# Clean up local archive
echo -e "${BLUE}Cleaning up...${NC}"
rm -f $ARCHIVE_NAME

# Display success message and access information
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}Packstack deployed successfully to ${SERVER}!${NC}"
echo -e "${GREEN}==================================================${NC}"
remote_cmd "hostname -I | awk '{print \$1}'" > /tmp/server_ip
SERVER_IP=$(cat /tmp/server_ip | tr -d '\n')
echo -e "Frontend URL: ${YELLOW}http://${SERVER_IP}:5173${NC}"
echo -e "Backend API URL: ${YELLOW}http://${SERVER_IP}:5001${NC}"
echo -e "\nTo manage the application:"
echo -e "  - Start: ${BLUE}ssh $SERVER_USER@$SERVER \"cd $DEPLOY_DIR && ./start.sh\"${NC}"
echo -e "  - Stop:  ${BLUE}ssh $SERVER_USER@$SERVER \"cd $DEPLOY_DIR && ./stop.sh\"${NC}"
echo -e "  - Logs:  ${BLUE}ssh $SERVER_USER@$SERVER \"cd $DEPLOY_DIR && tail -f backend.log frontend.log\"${NC}"
