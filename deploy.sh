#!/bin/bash

# Degree Defenders Deployment Script
# This script automates the deployment process for the Academic Certificate Validation Platform

set -e

echo "🚀 Starting Degree Defenders Deployment..."

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

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_warning "Please update the .env file with your actual configuration values"
            print_warning "Deployment will continue in 10 seconds. Press Ctrl+C to cancel."
            sleep 10
        else
            print_error ".env.example file not found. Cannot create .env file."
            exit 1
        fi
    else
        print_success ".env file found"
    fi
}

# Generate SSL certificates for development
generate_ssl_certs() {
    print_status "Generating SSL certificates for development..."
    
    mkdir -p ssl
    
    if [ ! -f ssl/certificate.crt ] || [ ! -f ssl/private.key ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/private.key \
            -out ssl/certificate.crt \
            -subj "/C=IN/ST=Jharkhand/L=Ranchi/O=Government of Jharkhand/OU=Department of Higher and Technical Education/CN=localhost"
        
        print_success "SSL certificates generated"
    else
        print_success "SSL certificates already exist"
    fi
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Pull latest images
    docker-compose pull
    
    # Build services
    docker-compose build --no-cache
    
    # Start services
    docker-compose up -d
    
    print_success "Services started successfully"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for database
    print_status "Waiting for database..."
    until docker-compose exec -T postgres pg_isready -U ${DATABASE_USER:-postgres} -d ${DATABASE_NAME:-degree_defenders}; do
        sleep 2
    done
    print_success "Database is ready"
    
    # Wait for backend
    print_status "Waiting for backend API..."
    until curl -f http://localhost:${PORT:-3001}/health &> /dev/null; do
        sleep 2
    done
    print_success "Backend API is ready"
    
    # Wait for frontend
    print_status "Waiting for frontend..."
    until curl -f http://localhost:3000 &> /dev/null; do
        sleep 2
    done
    print_success "Frontend is ready"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    docker-compose exec backend npx prisma migrate deploy
    docker-compose exec backend npx prisma db seed
    
    print_success "Database migrations completed"
}

# Show deployment information
show_deployment_info() {
    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Service Information:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:${PORT:-3001}"
    echo "  Database: localhost:${DATABASE_PORT:-5432}"
    echo "  Redis: localhost:${REDIS_PORT:-6379}"
    echo ""
    echo "🔐 HTTPS (with self-signed certificates):"
    echo "  Frontend: https://localhost"
    echo ""
    echo "📊 Monitoring:"
    echo "  View logs: docker-compose logs -f"
    echo "  Check status: docker-compose ps"
    echo ""
    echo "🛠️ Management Commands:"
    echo "  Stop services: docker-compose down"
    echo "  Restart services: docker-compose restart"
    echo "  View backend logs: docker-compose logs -f backend"
    echo "  View frontend logs: docker-compose logs -f frontend"
    echo ""
    print_warning "Remember to update your .env file with production values before deploying to production!"
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    docker-compose down
}

# Main deployment process
main() {
    print_status "Degree Defenders - Academic Certificate Validation Platform"
    print_status "Government of Jharkhand - Department of Higher and Technical Education"
    echo ""
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    # Run deployment steps
    check_docker
    check_env_file
    generate_ssl_certs
    deploy_services
    wait_for_services
    run_migrations
    show_deployment_info
    
    # Remove trap since deployment was successful
    trap - EXIT
}

# Handle command line arguments
case "${1:-}" in
    "start")
        docker-compose up -d
        print_success "Services started"
        ;;
    "stop")
        docker-compose down
        print_success "Services stopped"
        ;;
    "restart")
        docker-compose restart
        print_success "Services restarted"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "status")
        docker-compose ps
        ;;
    "clean")
        docker-compose down -v --remove-orphans
        docker system prune -f
        print_success "Cleanup completed"
        ;;
    "")
        main
        ;;
    *)
        echo "Usage: $0 [start|stop|restart|logs|status|clean]"
        echo ""
        echo "Commands:"
        echo "  start   - Start services"
        echo "  stop    - Stop services"
        echo "  restart - Restart services"
        echo "  logs    - View logs"
        echo "  status  - Check service status"
        echo "  clean   - Clean up containers and volumes"
        echo ""
        echo "Run without arguments for full deployment"
        exit 1
        ;;
esac
