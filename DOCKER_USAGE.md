# Docker Development Environment Usage

This document documents how to use the Docker environment.

## Using the Docker Image

### Building the Docker Image

```bash
# From the project root directory
docker build -t turing-dev .
```

### Running the Container

```bash
# Run and enter the container interactively
docker run -it --name turing-dev-container turing-dev bash

# If you want to mount the current directory to keep working on files
docker run -it --name turing-dev-container -v "$(pwd):/app" turing-dev bash

# If you need to map ports
docker run -it --name turing-dev-container -v "$(pwd):/app" -p 3000:3000 turing-dev bash
```

### Working with an Existing Container

```bash
# Start an existing stopped container
docker start turing-dev-container

# Attach to a running container
docker exec -it turing-dev-container bash
```

### Cleaning Up

```bash
# Stop the container
docker stop turing-dev-container

# Remove the container
docker rm turing-dev-container

# Remove the image
docker rmi turing-dev
```