@echo off
echo Starting Packstack Flask Server...

REM Check if .env file exists, if not create it with default values
if not exist server\.env (
    echo Creating default .env file...
    echo OPENAI_API_KEY=your_openai_api_key_here > server\.env
    echo FLASK_ENV=development >> server\.env
    echo Please edit the server\.env file to add your OpenAI API key
)

cd /d %~dp0
cd server

REM Setup Python virtual environment if it doesn't exist
if not exist venv\ (
    echo Setting up Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Error: Failed to create virtual environment.
        echo Please make sure Python 3.8+ is installed and in your PATH.
        pause
        exit /b 1
    )
)

REM Activate virtual environment and install dependencies
call venv\Scripts\activate
echo Installing required packages...
pip install -q flask flask-cors python-dotenv openai
if errorlevel 1 (
    echo Error: Failed to install required packages.
    pause
    exit /b 1
)

REM Check for OpenAI API key in environment
python -c "import os; from dotenv import load_dotenv; load_dotenv(); api_key = os.getenv('OPENAI_API_KEY'); print('API Key:', 'configured' if api_key and api_key != 'your_openai_api_key_here' else 'NOT CONFIGURED')"

echo Server starting on http://localhost:5001
echo Press Ctrl+C to stop the server
python app.py
