#!/bin/bash

# GitTalk Installation Script
# This script automates the complete setup of the GitTalk project

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_deps=()
    
    # Check Node.js
    if ! command_exists node; then
        missing_deps+=("Node.js")
    else
        local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -lt 18 ]; then
            print_error "Node.js version 18+ required. Current version: $(node --version)"
            exit 1
        fi
        print_success "Node.js $(node --version) ✓"
    fi
    
    # Check pnpm
    if ! command_exists pnpm; then
        missing_deps+=("pnpm")
    else
        local pnpm_version=$(pnpm --version | cut -d'.' -f1)
        if [ "$pnpm_version" -lt 8 ]; then
            print_error "pnpm version 8+ required. Current version: $(pnpm --version)"
            exit 1
        fi
        print_success "pnpm $(pnpm --version) ✓"
    fi
    
    # Check Docker
    if ! command_exists docker; then
        missing_deps+=("Docker")
    else
        print_success "Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) ✓"
    fi
    
    # Check Docker Compose
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        missing_deps+=("Docker Compose")
    else
        print_success "Docker Compose ✓"
    fi
    
    # If any dependencies are missing, install them
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_status "Please install the missing dependencies and run this script again."
        print_status "Installation guides:"
        print_status "  - Node.js: https://nodejs.org/"
        print_status "  - pnpm: npm install -g pnpm"
        print_status "  - Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    print_success "All prerequisites satisfied!"
}

# Function to setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Copy environment example files
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Created .env file"
    else
        print_error ".env.example not found"
        exit 1
    fi
    
    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        print_success "Created server/.env file"
    elif [ -f ".env.example" ]; then
        cp .env.example server/.env
        print_success "Created server/.env file"
    fi
    
    print_warning "Please update the .env files with your GitHub OAuth credentials:"
    print_warning "1. Go to https://github.com/settings/developers"
    print_warning "2. Create a new OAuth App with:"
    print_warning "   - Homepage URL: http://localhost:4000"
    print_warning "   - Authorization callback URL: http://localhost:4000/auth/github/callback"
    print_warning "3. Update GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env files"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    pnpm install
    
    print_success "Dependencies installed successfully!"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Start database
    print_status "Starting PostgreSQL database..."
    docker-compose up -d
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    cd server
    pnpm db:generate
    
    # Run migrations
    print_status "Running database migrations..."
    pnpm db:migrate
    cd ..
    
    print_success "Database setup completed!"
}

# Function to build extension
build_extension() {
    print_status "Building Chrome extension..."
    
    cd extension
    pnpm build
    cd ..
    
    print_success "Extension built successfully!"
}

# Function to start development server
start_development() {
    print_status "Starting development server..."
    
    cd server
    pnpm dev &
    local server_pid=$!
    cd ..
    
    print_success "Development server started!"
    print_status "Server PID: $server_pid"
    print_status "You can stop the server with: kill $server_pid"
}

# Function to provide next steps
show_next_steps() {
    echo
    print_success "🎉 GitTalk installation completed successfully!"
    echo
    print_status "Next steps:"
    echo
    print_status "1. Update environment variables:"
    print_status "   - Edit .env and server/.env files"
    print_status "   - Add your GitHub OAuth credentials"
    echo
    print_status "2. Load the Chrome extension:"
    print_status "   - Open Chrome and go to chrome://extensions/"
    print_status "   - Enable 'Developer mode'"
    print_status "   - Click 'Load unpacked'"
    print_status "   - Select the 'extension/dist' folder"
    echo
    print_status "3. Start the development server:"
    print_status "   - Run: pnpm dev"
    echo
    print_status "4. Access the application:"
    print_status "   - Server: http://localhost:4000"
    print_status "   - Database: localhost:5432"
    echo
    print_status "5. Test the extension:"
    print_status "   - Visit any GitHub profile page"
    print_status "   - Look for the 'Message @username' button"
    echo
    print_warning "Remember to update your GitHub OAuth app settings!"
}

# Main installation function
main() {
    echo "🚀 GitTalk Installation Script"
    echo "================================"
    echo
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
        print_error "Please run this script from the GitTalk project root directory"
        exit 1
    fi
    
    # Run installation steps
    check_prerequisites
    setup_environment
    install_dependencies
    setup_database
    build_extension
    
    # Ask if user wants to start development server
    echo
    read -p "Do you want to start the development server now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_development
    fi
    
    show_next_steps
}

# Run main function
main "$@"
