#!/bin/bash

# Install dependencies
echo "Installing Python dependencies..."
pip install -r backend/requirements.txt

# Set environment variables
export GROQ_API_KEY=${GROQ_API_KEY:-"your_groq_api_key_here"}

# Start the FastAPI server
echo "Starting OCR service on port 8000..."
cd backend
python ocr.py
