# Packstack

Packstack is a gear management system and packing list builder for backpackers and outdoor enthusiasts. The application features image analysis powered by OpenAI's GPT-4 Vision API, product search via Walmart and Amazon APIs, and a robust user interface for managing gear and planning trips.

## Technology Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Python, Flask
- **CSS Framework**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: Extended from [Shadcn/ui](https://ui.shadcn.com/docs)
- **API Integration**: OpenAI GPT-4 Vision, Walmart API, Amazon Product API
- **Authentication**: JWT-based authentication system

## Features

- Image analysis for gear identification
- Product search and price comparison
- Trip planning and gear organization
- User authentication and profiles
- Responsive design for mobile and desktop
- Barcode scanning support

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Python 3.8+
- pip

### Environment Setup

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/packstack.git
   cd packstack
   ```

2. **Frontend Setup**
   ```
   npm install
   ```

3. **Backend Setup**
   ```
   cd server
   pip install -r requirements.txt
   cd ..
   ```

4. **Environment Variables**
   Create `.env.local` in the project root for frontend variables:

```
VITE_API_URL=http://localhost:5001 # Backend server port
VITE_SENTRY_DSN=
```

Create `.env` in the server directory for backend variables:

```python
# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=1

# API Keys
OPENAI_API_KEY=your_openai_key_here
WALMART_CLIENT_ID=your_walmart_id_here
WALMART_CLIENT_SECRET=your_walmart_secret_here
```
$ npm i
$ npm run dev
```

### (Option 1) Run the API & database locally

If you want to set up the API and database locally, follow the instructions on the [API server repo](https://github.com/Packstack-Tech/packstack-api).

### (Option 2) Use the production server

If you do NOT want to run the API and database locally, you can sign in using your credential from [Packstack.io](https://app.packstack.io).

In `.env.local`, change the value of `VITE_API_URL` to `https://api.packstack.io`

If you do not have a Packstack account, sign up at [Packstack.io](https://app.packstack.io "Packstack's production app"). Feel free to create a test account for local development.

## Running in WSL2

Packstack can be run in Windows Subsystem for Linux 2 (WSL2) for improved performance and compatibility. Follow these steps to set up and run the application in WSL2:

### Prerequisites

1. WSL2 installed on your Windows machine
2. A Linux distribution (e.g., Ubuntu) installed via WSL2
3. Node.js and npm installed in your WSL2 environment
4. Python 3 and pip installed in your WSL2 environment

### Setup in WSL2

1. Open your WSL2 terminal
2. Navigate to your Packstack project directory
3. Make the setup and run scripts executable:
   ```bash
   chmod +x setup-wsl.sh run-wsl.sh
   ```
4. Run the setup script to install dependencies:
   ```bash
   ./setup-wsl.sh
   ```
5. Configure your environment variables:
   ```bash
   cd server
   cp .env.wsl .env
   # Edit .env to add your API keys if needed
   cd ..
   ```

### Running the Application in WSL2

To start both the frontend and backend servers in WSL2:

```bash
./run-wsl.sh
```

This will:
- Start the Flask backend server on port 5001
- Start the React/Vite frontend on port 5173
- Make both services accessible from your Windows host

Access the application in your browser at http://localhost:5173

### Troubleshooting WSL2 Setup

- **CORS Issues**: If you encounter CORS errors, ensure that the frontend and backend URLs are correctly configured in the CORS_ORIGINS setting in server/.env
- **Port Conflicts**: If ports 5001 or 5173 are already in use, modify the port numbers in your configuration files
- **Network Access**: If you can't access the application from Windows, ensure that WSL2 networking is properly configured
