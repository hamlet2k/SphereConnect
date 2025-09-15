# SphereConnect

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Documentation](https://img.shields.io/badge/docs-MkDocs-blue)](https://docs.sphereconnect.com)

**AI-driven coordination platform for Star Citizen guilds**

SphereConnect is a multitenant application that enhances guild coordination in Star Citizen through AI-powered voice commands, real-time objective tracking, and seamless web interfaces. It integrates with Wingman-AI for natural language processing and provides enterprise-grade security with rank-based access control.

## ✨ Features

- **🎤 Voice-Driven Coordination**: Natural language commands via Wingman-AI integration
- **🎯 Objective Management**: Create, assign, and track mission objectives with progress metrics
- **📋 Task Coordination**: Break down objectives into actionable tasks with scheduling
- **👥 Squad Formation**: Dynamic team creation and management
- **🔐 Enterprise Security**: JWT authentication, MFA, and rank-based permissions
- **📊 Real-Time Tracking**: Live progress updates and notifications
- **🌐 Web Interface**: Responsive dashboard for comprehensive management
- **🏗️ Multitenant Architecture**: Secure guild isolation with shared infrastructure

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- PostgreSQL 12+
- Wingman-AI (for voice features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/sphereconnect.git
   cd sphereconnect
   ```

2. **Set up virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database credentials
   ```

4. **Initialize database**
   ```bash
   python scripts/db_init.py
   python scripts/test_data.py  # Optional: load sample data
   ```

5. **Start the server**
   ```bash
   python scripts/start_server.py
   ```

The API will be available at `http://localhost:8000` with documentation at `http://localhost:8000/docs`.

### Voice Integration

1. **Install Wingman-AI** from the official repository
2. **Configure skill**: Copy `wingman-ai/skills/sphereconnect/` to your Wingman-AI skills directory
3. **Test commands**: Try "UEE Commander, create objective: Test Mission"

## 📖 Documentation

Comprehensive documentation is available at [docs.sphereconnect.com](https://docs.sphereconnect.com):

- **[Setup Guides](https://docs.sphereconnect.com/setup/)**: Installation and configuration
- **[User Manual](https://docs.sphereconnect.com/user-manual/)**: Getting started and usage guides
- **[API Reference](https://docs.sphereconnect.com/api-reference/)**: Complete API documentation
- **[Developer Guide](https://docs.sphereconnect.com/developer/)**: Architecture and contribution guidelines

### Local Documentation

Build and serve documentation locally:

```bash
pip install mkdocs mkdocs-material
mkdocs serve
```

Visit `http://localhost:8000` for the documentation site.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Wingman-AI    │────│   SphereConnect │────│   PostgreSQL    │
│   Voice Input   │    │     API         │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Web Interface │
                    │   React + TS    │
                    └─────────────────┘
```

### Key Components

- **API Layer**: FastAPI-based REST API with automatic OpenAPI documentation
- **Database**: PostgreSQL with SQLAlchemy ORM and comprehensive schema
- **Authentication**: JWT tokens with MFA support and rate limiting
- **Voice Integration**: Wingman-AI skill for natural language processing
- **Web Interface**: React TypeScript application with responsive design
- **Security**: bcrypt hashing, CORS, input validation, and audit logging

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Unit tests
pytest tests/ -v

# With coverage
pytest --cov=app --cov-report=html

# Integration tests
pytest tests/integration/ -v

# Performance tests
pytest tests/test_performance.py -v
```

## 🤝 Contributing

We welcome contributions! Please see our [contribution guidelines](https://docs.sphereconnect.com/developer/contribution/) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with tests
4. Run the test suite: `pytest`
5. Submit a pull request

### Code Standards

- **Python**: PEP 8 with type hints
- **Commits**: Conventional commits format
- **Tests**: 80%+ coverage required
- **Documentation**: Update docs for all changes

## 📋 Roadmap

### Current Release (v1.0.0)
- ✅ MVP with core coordination features
- ✅ Wingman-AI voice integration
- ✅ Web interface and API
- ✅ Multitenant security

### Upcoming Features
- **v1.1.0**: Enhanced voice accuracy, mobile app
- **v1.2.0**: Multi-language support, advanced analytics
- **v2.0.0**: Cross-game compatibility, enterprise features

See the [changelog](https://docs.sphereconnect.com/project/changelog/) for detailed release notes.

## 📄 License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- **Star Citizen Community**: For inspiration and feedback
- **Wingman-AI Team**: For the excellent voice integration platform
- **Open Source Community**: For the tools and libraries that make this possible

## 📞 Support

- **Documentation**: [docs.sphereconnect.com](https://docs.sphereconnect.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/sphereconnect/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/sphereconnect/discussions)
- **Discord**: [SphereConnect Community](https://discord.gg/sphereconnect)

---

**Ready to coordinate your next Star Citizen operation?** 🚀
