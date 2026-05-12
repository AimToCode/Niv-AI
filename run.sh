#!/bin/bash
echo "Installing dependencies..."
pip install flask flask-cors flask-limiter boto3 python-dotenv requests
echo ""
echo "Starting NivAI..."
echo "Open http://localhost:5000 in your browser"
python app.py
