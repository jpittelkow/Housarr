# Housarr Documentation

## Overview

Housarr is a home management application designed to help users track and manage household items, maintenance schedules, parts, vendors, and related documentation. The application follows a modern architecture with a Laravel backend API and a React frontend single-page application.

## Architecture

The application uses a decoupled architecture:

- **Backend**: Laravel 11 API (PHP 8.2+) providing RESTful endpoints
- **Frontend**: React 18 SPA (TypeScript) with Vite build tool
- **Infrastructure**: Docker-based deployment with multiple configuration options
- **Authentication**: Laravel Sanctum for session-based authentication
- **Database**: Supports SQLite (default), MySQL, and PostgreSQL

## Technology Stack

### Backend
- Laravel 11.0
- PHP 8.2+
- Laravel Sanctum 4.0
- SQLite/MySQL/PostgreSQL support

### Frontend
- React 18.3.1
- TypeScript 5.6.3
- Vite 6.0.1
- React Router 7.0.1
- Zustand 5.0.1 (state management)
- TanStack React Query 5.60.0 (data fetching)
- Tailwind CSS 3.4.15
- React Hook Form 7.53.2
- Zod 3.23.8 (validation)

### Infrastructure
- Docker & Docker Compose
- Nginx (web server)
- PHP-FPM (PHP processor)
- Supervisor (process management)
- Redis (caching, optional)
- MySQL (optional, for production)

## Project Structure

```
Housarr/
├── backend/                    # Laravel API application
├── frontend/                   # React SPA application
├── docker/                     # Docker configuration files
├── data/                       # Persistent data storage
├── docs/                       # Documentation and ADRs
├── docker-compose.yml          # Development stack (nginx, php, mysql, redis, etc.)
└── docker-compose.prod.yml     # Production overlay
```

## Quick Start

### Development

```bash
docker compose up -d
```

Access the application:
- Frontend: http://localhost:8000
- API: http://localhost:8000/api

### Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Production includes:
- Read-only filesystem for security
- Resource limits and scaling
- No exposed database/redis ports
- Production-optimized configurations

## Documentation Index

### [Laravel Backend Documentation](DOCUMENTATION_LARAVEL.md)
Complete documentation of the Laravel backend including:
- Models and relationships
- Controllers and API endpoints
- Services and business logic
- Database schema and migrations
- Policies and authorization
- Configuration files

### [React Frontend Documentation](DOCUMENTATION_REACT.md)
Complete documentation of the React frontend including:
- Component structure
- Pages and routing
- State management
- API integration
- TypeScript types
- Styling and theming

### [Docker Infrastructure Documentation](DOCUMENTATION_DOCKER.md)
Complete documentation of the Docker setup including:
- Container configurations
- Dockerfiles and build stages
- Nginx configurations
- PHP-FPM settings
- Volume mounts and data persistence
- Environment variables

### [Testing Documentation](DOCUMENTATION_TESTING.md)
Complete testing guide covering:
- Frontend testing (Vitest, React Testing Library, Playwright)
- Backend testing (Pest PHP)
- Writing unit, component, integration, and E2E tests
- CI/CD integration
- Best practices and examples

### [Contributing Guidelines](CONTRIBUTING.md)
Development guidelines including:
- Mandatory testing requirements
- Architecture Decision Records (ADR) requirements
- Security patterns (household multi-tenancy)
- Code patterns and checklists

## Key Features

- **Household Management**: Multi-user households with role-based access
- **Item Tracking**: Track household items with categories, vendors, locations
- **Parts Management**: Track replacement and consumable parts for items
- **Maintenance Logs**: Record service, repair, replacement, and inspection history
- **Reminders**: Automated reminders for maintenance and part replacements
- **Todos**: Task management with priorities and due dates
- **File Management**: Upload and attach files (manuals, images) to items
- **AI Integration**: Image analysis and AI suggestions for items (Claude, OpenAI, Gemini, Local)
- **Manual Search**: Automated search and download of product manuals
- **Vendors**: Track service providers and vendors
- **Locations**: Organize items by physical location
- **Settings**: Configurable storage (local/S3), email (SMTP/Mailgun/SendGrid/SES/Cloudflare), and AI providers

## Data Model Overview

The application uses a household-based multi-tenancy model where:
- Each user belongs to one household
- All data (items, parts, vendors, etc.) is scoped to a household
- Users can have admin or member roles within their household
- Categories can be household-specific or global (null household_id)

## API Structure

All API endpoints are prefixed with `/api` and require authentication via Laravel Sanctum. The API follows RESTful conventions with JSON responses.

## Frontend Structure

The frontend is a single-page application with:
- Client-side routing via React Router
- Protected routes requiring authentication
- Lazy-loaded page components for code splitting
- Centralized API service layer
- Zustand stores for global state
- React Query for server state management

## Deployment

The application supports two deployment modes:
1. **Single Container**: All-in-one container with nginx, PHP-FPM, and built frontend (development)
2. **Multi-Container**: Separate containers for nginx, PHP-FPM, MySQL, Redis, scheduler, and workers (production)

See the [Docker Documentation](DOCUMENTATION_DOCKER.md) for detailed deployment information.
