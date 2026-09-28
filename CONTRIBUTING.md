# Contributing to GEOAuditor

Thank you for your interest in contributing to the GEOAuditor project. This document outlines the process for reporting issues, proposing enhancements, and submitting pull requests.

## Code of Conduct

All contributors are expected to uphold the [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating in project discussions or submitting contributions.

## Development Workflow

### Prerequisites

* Python 3.10 or higher
* Node.js 18 or higher (LTS recommended)
* npm 9 or higher
* Git

### Local Environment Setup

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/GEOAuditor.git
   cd GEOAuditor
   ```
3. Set up the backend environment:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   # Add your Google Gemini API key to backend/.env
   cd ..
   ```
4. Set up the frontend environment:
   ```bash
   cd frontend
   npm install
   cd ..
   ```
5. Run the development environment:
   ```bash
   ./run.sh
   ```

### Branching Policy

* `main`: Stable production branch.
* Topic branches: Use descriptive branch names formatted as `feature/<topic>`, `fix/<issue-id>`, or `docs/<topic>`.

## Pull Request Guidelines

Before submitting a pull request, ensure all tests and build checks pass:

1. **Backend Tests**: Run the pytest suite from the backend directory:
   ```bash
   cd backend
   pytest tests/
   ```
2. **Frontend Type Checking & Build**: Run Next.js production build:
   ```bash
   cd frontend
   npm run build
   ```
3. **Commit Messages**: Follow standard Conventional Commits specification:
   * `feat: add Kannada regional query benchmarks`
   * `fix: correct regex parsing in robots.txt disallow check`
   * `docs: update academic attribution references in README`
   * `test: add unit coverage for composite score weighting`

4. **Pull Request Description**:
   * Reference the related issue number (e.g., `Closes #12`).
   * Provide a concise summary of changes and rationale.
   * Attach relevant test output or verification evidence.

## Coding Standards

### Python (Backend)

* Follow PEP 8 style guidelines.
* Include explicit type annotations for function signatures.
* Ensure all database interactions utilize parameterized queries or context managers.
* Preserve mathematical formulas and scoring weight constants defined in `app/config.py`.

### TypeScript and React (Frontend)

* Adhere to strict TypeScript typing. Avoid `any` where a concrete interface or union type can be specified.
* Maintain clean component boundaries and modular directory structure in `frontend/src/`.
* Optimize for performance and print styling for generated audit exports.

## Reporting Security Vulnerabilities

Please do not disclose security vulnerabilities publicly through issue trackers. Refer to [SECURITY.md](SECURITY.md) for disclosure instructions.
