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