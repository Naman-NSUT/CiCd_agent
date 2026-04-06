#!/bin/bash

# start.sh - Starts the CI/CD Pipeline Failure Classifier on GCP VM

echo "🚀 Starting PipelineIQ on GCP VM..."

# Ensure we have the latest code if working with git
# git pull origin main 

# Stop any dangling containers just in case
docker-compose down

# Rebuild and start everything in detached mode
# Note: Add -f docker-compose.prod.yml if you specifically want to run the production backend without the frontend,
# otherwise this uses the default docker-compose.yml which has the full stack.
docker-compose up --build -d

echo "✅ Containers started successfully! You can verify with 'docker ps'."
