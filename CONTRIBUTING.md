# Contributing to TenderShield

Thank you for your interest in contributing to TenderShield — India's first AI-secured, blockchain-based government procurement system.

## 🏗️ Project Setup

### Prerequisites
- **Node.js** 20+ and **npm**
- **Python** 3.11+ with `pip`
- **Docker** 20.10+ and **Docker Compose** 2.0+
- **Go** 1.21+ (for chaincode development)

### Quick Start
```bash
# Clone and install
git clone https://github.com/tendershield/tendershield.git
cd tendershield
cp .env.example .env

# Frontend
npm install
npm run dev

# Backend (separate terminal)
pip install -r requirements.txt
cd backend && uvicorn main:app --reload --port 8000

# AI Engine (separate terminal)
cd ai_engine && uvicorn main:app --reload --port 8001
```

## 📋 Development Workflow

### 1. Branch naming
```
feature/  — new features (feature/add-pdf-export)
fix/      — bug fixes (fix/cors-headers)
refactor/ — code changes without behavior change
docs/     — documentation updates
test/     — test additions
```

### 2. Commit messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat(ai): add sentiment analysis detector
fix(api): correct pagination offset calculation
test(bid-rigging): add Benford's law edge cases
docs(readme): update deployment instructions
```

### 3. Pull Request process
1. Create a branch from `develop`
2. Make changes, add tests
3. Ensure all tests pass (`pytest tests/ && npm test`)
4. Ensure lint passes (`flake8 backend/ ai_engine/` && `npm run lint`)
5. Open PR against `develop` with description
6. CI must pass before merge

## 🧪 Testing

### Backend (Python)
```bash
# Run all tests
pytest tests/ -v

# Run specific detector tests
pytest tests/test_bid_rigging.py -v

# With coverage
pytest tests/ --cov=ai_engine --cov=backend --cov-report=term-missing
```

### Frontend (React)
```bash
npm test
npm run lint
npx tsc --noEmit  # Type check
```

## 📁 Code Style

### Python
- **Line length**: 120 characters max
- **Formatter**: Use `black` with default settings
- **Linter**: `flake8` with `--max-line-length=120`
- **Type hints**: Required for all public functions
- **Docstrings**: Required for all classes and public methods

### TypeScript/React
- **Formatter**: ESLint with Next.js config
- **Components**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions

## 🔐 Security

- **Never commit** `.env` files, secrets, or API keys
- **Always validate** user input on the backend
- **Report vulnerabilities** via email, not public issues

## 📜 License

By contributing, you agree your contributions will be licensed under the MIT License.
