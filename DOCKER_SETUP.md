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

## Using the Development Environment

### Running Options

Refer to DOCKER_USAGE.md for detailed usage instructions.

#### Option 1: Isolated Environment (No Volume Mount)

Use this option when you want to work in an isolated environment with the files as they were when the image was built.

```bash
# Build image
docker build -t turing-dev .

# Run container
docker run -it --name turing-dev-container turing-dev bash
```

#### Option 2: Development Environment (With Volume Mount)

Use this option during development when you want changes inside the container to be reflected in your local files and vice versa.

```bash
# Build image
docker build -t turing-dev .

# Run with volume mount
docker run -it --name turing-dev-container -v "$(pwd):/app" turing-dev bash
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
3. Two operation modes:
   - Isolated environment with files copied at build time
   - Development mode with volume mapping for real-time code changes
4. Environment variables for API keys

When using Claude Code with this environment, you'll have a consistent development setup that can be used to implement the Gemini migration plan and other project tasks.