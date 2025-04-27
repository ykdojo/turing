# Docker Development Environment

This document outlines how to set up a Docker-based development environment for the Turing project that will be compatible with Claude Code.

## Docker Setup

### Dockerfile

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:20.4.0-slim

# Set working directory
WORKDIR /app

# Install essential tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Set environment for development
ENV NODE_ENV=development

# Keep container running for development
CMD ["tail", "-f", "/dev/null"]
```

### Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  turing-dev:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - .:/app
      - node_modules:/app/node_modules
    environment:
      - NODE_ENV=development
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
    ports:
      - "3000:3000"

volumes:
  node_modules:
```

## Using the Development Environment

### Starting the Container

```bash
# Build and start container
docker-compose up -d

# Access the container shell
docker-compose exec turing-dev bash
```

### Running the Project

Inside the container:

```bash
# Build the project
npm run build

# Run tests
npm test

# Start the application
npm start
```

## For Claude Code Integration

This container provides:

1. Node.js 20.4.0 for compatibility
2. All necessary dependencies installed
3. Volume mapping for real-time code changes
4. Environment variables for API keys

When using Claude Code with this environment, you'll have a consistent development setup that can be used to implement the Gemini migration plan and other project tasks.