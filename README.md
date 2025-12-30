# Housarr 🏠

A modern home inventory and maintenance management application. Track your household items, schedule maintenance, manage parts and vendors, store product manuals, and get AI-powered assistance for troubleshooting and upkeep.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PHP](https://img.shields.io/badge/PHP-8.2+-purple.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
![Laravel](https://img.shields.io/badge/Laravel-11-red.svg)
![Docker](https://img.shields.io/badge/Docker-ghcr.io-blue.svg)

**Docker Image:** `ghcr.io/jpittelkow/housarr:latest`

## ✨ Features

- **📦 Item Management** - Track all your household items with detailed information including make, model, serial numbers, warranty, and purchase details
- **🔧 Parts Tracking** - Manage replacement and consumable parts for each item with part numbers, pricing, and purchase links
- **📅 Maintenance Scheduling** - Set up reminders for regular maintenance tasks with customizable intervals
- **📋 Service History** - Log all maintenance, repairs, and inspections with costs, vendors, and notes
- **📄 Document Storage** - Upload and organize product manuals, receipts, and warranty documents
- **🤖 AI Assistant** - Get intelligent help with troubleshooting, maintenance advice, and parts identification (supports Claude, OpenAI, Gemini, and local models)
- **📸 Smart Add** - Add items by photo - AI analyzes images to identify products and auto-fill details
- **🏪 Vendor Management** - Track service providers, contractors, and stores with contact information
- **📍 Location Tracking** - Organize items by room or location in your home
- **✅ Todo Lists** - Create and manage household tasks with priorities and due dates
- **🔔 Reminders** - Get notified about upcoming maintenance and warranty expirations
- **👨‍👩‍👧‍👦 Multi-User Households** - Share your household with family members with role-based access
- **💾 Backup & Restore** - Export and import your entire household data including files
- **🌙 Dark Mode** - Beautiful dark theme support

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jpittelkow/Housarr.git
   cd Housarr
   ```

2. **Start the application**
   ```bash
   docker compose up -d
   ```

3. **Access the application**
   - Open your browser to [http://localhost:8000](http://localhost:8000)
   - Create your account and household

That's it! The Docker setup handles everything automatically.

### Production Deployment

For production environments with enhanced security:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Unraid Deployment

See the [Unraid Deployment Guide](docker/unraid/README.md) for detailed instructions on deploying Housarr on Unraid using Docker Compose Manager.

See [Docker Documentation](docs/DOCUMENTATION_DOCKER.md) for detailed configuration options.

## 🏗️ Architecture

Housarr uses a modern, decoupled architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  • React 18 + TypeScript                                │
│  • Vite build tool                                      │
│  • Zustand state management                             │
│  • React Query for data fetching                        │
│  • Tailwind CSS styling                                 │
└─────────────────────────────────────────────────────────┘
                          │
                    REST API (JSON)
                          │
┌─────────────────────────────────────────────────────────┐
│                   Backend (Laravel)                      │
│  • Laravel 11 + PHP 8.2                                 │
│  • Sanctum authentication                               │
│  • Multi-tenant (household isolation)                   │
│  • AI multi-agent orchestration                         │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                      Database                            │
│  • SQLite (default) / MySQL / PostgreSQL                │
└─────────────────────────────────────────────────────────┘
```

## 📚 Documentation

Complete documentation is available in the [docs/](docs/) folder:

| Document | Description |
|----------|-------------|
| [📖 Main Documentation](docs/DOCUMENTATION.md) | Project overview and architecture |
| [⚛️ React Frontend](docs/DOCUMENTATION_REACT.md) | Frontend components, pages, and state management |
| [🐘 Laravel Backend](docs/DOCUMENTATION_LARAVEL.md) | API endpoints, models, and services |
| [🐳 Docker Setup](docs/DOCUMENTATION_DOCKER.md) | Container configuration and deployment |
| [🧪 Testing Guide](docs/DOCUMENTATION_TESTING.md) | Testing strategy and how to write tests |
| [🤝 Contributing](docs/CONTRIBUTING.md) | Development guidelines and patterns |
| [📋 ADRs](docs/adr/) | Architecture Decision Records |

## 🧪 Testing

Housarr has comprehensive test coverage:

```bash
# Frontend tests (Vitest + React Testing Library)
cd frontend && npm run test:run

# Backend tests (Pest PHP)
cd backend && ./vendor/bin/pest

# E2E tests (Playwright)
cd frontend && npm run test:e2e
```

See [Testing Documentation](docs/DOCUMENTATION_TESTING.md) for details.

## 🔧 Development

### Local Development Setup

1. **Backend**
   ```bash
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   php artisan migrate
   php artisan serve
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Docker Development

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Environment Variables

Key environment variables (set in `.env` or Docker):

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_PORT` | Web server port | `8000` |
| `DB_CONNECTION` | Database type | `sqlite` |
| `DB_PORT` | MySQL port (if used) | `3306` |

## 🤖 AI Configuration

Housarr supports multiple AI providers for image analysis, chatbot, and smart features:

- **Claude** (Anthropic) - Best overall performance
- **OpenAI** (GPT-4) - Excellent for image analysis
- **Gemini** (Google) - Good free tier option
- **Local** (Ollama) - Self-hosted, privacy-focused

Configure in Settings → AI Configuration after logging in.

## 📁 Project Structure

```
Housarr/
├── backend/                 # Laravel API
│   ├── app/
│   │   ├── Http/Controllers/  # API controllers
│   │   ├── Models/            # Eloquent models
│   │   ├── Policies/          # Authorization
│   │   └── Services/          # Business logic
│   ├── database/migrations/   # Database schema
│   ├── routes/api.php         # API routes
│   └── tests/                 # Pest PHP tests
├── frontend/                # React SPA
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API client
│   │   ├── stores/            # Zustand stores
│   │   └── types/             # TypeScript types
│   └── e2e/                   # Playwright tests
├── docker/                  # Docker configurations
├── docs/                    # Documentation
└── data/                    # Persistent storage
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](docs/CONTRIBUTING.md) before submitting changes.

**Key requirements:**
- ✅ All new features must include tests
- ✅ Significant changes require an ADR
- ✅ Follow existing code patterns
- ✅ Run tests before submitting PRs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Laravel](https://laravel.com/) - The PHP framework
- [React](https://react.dev/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide Icons](https://lucide.dev/) - Icon set

---

<p align="center">
  Made with ❤️ for organized homes everywhere
</p>
