# RevCast AI — Technical Skills & Technologies

A breakdown of every technology, library, concept, and skill used to build RevCast AI — organized by category. Useful for final year project reports, resume bullet points, and portfolio descriptions.

---

## Programming Languages

| Language | Where Used | Proficiency Level |
|----------|-----------|-------------------|
| **Python 3.11** | Backend API, forecasting engine, data processing, tests | Advanced |
| **TypeScript** | Frontend app, type-safe API calls, component props | Advanced |
| **SQL** | SQLite database schema, user/session queries | Intermediate |
| **HTML/CSS** | Component markup, Tailwind utility classes, dark mode | Advanced |

---

## Backend Skills

### Web Framework
| Skill | Details |
|-------|---------|
| **FastAPI** | REST API with 11 endpoints, Pydantic models, multipart file upload, CORS middleware, health checks |
| **Uvicorn** | ASGI server with hot-reload for development |
| **Pydantic** | Request/response validation, type coercion, nested models |

### Data Science & Statistics
| Skill | Details |
|-------|---------|
| **pandas** | CSV parsing, weekly aggregation (ISO week groupby), time series manipulation, rolling windows |
| **NumPy** | Vectorized math, log-space operations, random number generation, percentile computation |
| **statsmodels** | OLS regression fitting, t-statistic extraction, R² computation, residual analysis |
| **SciPy** | SLSQP constrained optimization for budget allocation, efficient frontier computation |
| **Log-log elasticity model** | `log(revenue) = α + β·log(spend) + γ·t + δ·holiday` — custom implementation with 4 safeguards |
| **Residual bootstrap** | 1000-draw Monte Carlo simulation for P10/P50/P90 probabilistic intervals |
| **Heteroscedastic scaling** | Variance correction (floor=1.2) to compensate for deseasonalization-induced residual narrowing |
| **Cross-validation** | Leave-last-8-weeks-out CV for adstock lambda selection with 10% improvement threshold |
| **Anomaly detection** | Z-score flagging (|z|>2.5) with automatic holiday labeling |
| **Seasonality decomposition** | Monthly index computation, multiplicative deseasonalization/reseasonalization |

### Database & Authentication
| Skill | Details |
|-------|---------|
| **SQLite** | User table with PBKDF2 password hashes, session tracking, WAL journaling |
| **JWT Authentication** | Custom HMAC-SHA256 token signing/verification, 24-hour expiry, no external library |
| **PBKDF2** | 100,000-iteration password hashing with random salt — no plaintext storage |

### AI Integration
| Skill | Details |
|-------|---------|
| **Google Gemini API** | Structured JSON output from `gemini-2.5-flash`, prompt engineering with financial context |
| **Prompt engineering** | Multi-section prompt with historical KPIs, channel models, scenarios, and anomalies → constrained JSON output |

### Testing
| Skill | Details |
|-------|---------|
| **pytest** | 24 tests across 4 modules: unit tests (seasonality, elasticity, bootstrap) + integration tests (full API flow) |
| **Test fixtures** | Shared synthetic data fixture, deterministic RNG seeding for reproducibility |
| **Holdout backtest** | Programmatic coverage verification (≥62.5% threshold) as an automated test |
| **FastAPI TestClient** | HTTP-level integration tests for the complete ingest→forecast→simulate flow |

---

## Frontend Skills

### Framework & Language
| Skill | Details |
|-------|---------|
| **Next.js 14** | App Router, server components, client components (`"use client"`), static generation |
| **React 18** | Hooks (useState, useEffect, useCallback, useContext), context providers, controlled forms |
| **TypeScript** | Strict typing for API responses, component props, context state, discriminated unions |

### UI & Styling
| Skill | Details |
|-------|---------|
| **Tailwind CSS** | Utility-first styling, responsive breakpoints (sm/md/lg), custom CSS variables |
| **Dark mode** | CSS custom properties + `darkMode: "class"` strategy, localStorage persistence, system preference detection |
| **Mobile responsive** | Adaptive layouts for phone/tablet, horizontal scroll for tables, compact step navigator |
| **Component architecture** | 20+ reusable components organized by feature (upload, budget, forecast, simulate, optimizer, summary, export, auth) |

### Data Visualization (Recharts)
| Skill | Details |
|-------|---------|
| **ComposedChart** | Stacked Area (P10-P90 band) + Line (P50) + custom dot component (hit/miss) |
| **RadarChart** | 5-dimension spider chart with normalized scores per channel |
| **BarChart** | Waterfall chart (invisible base + visible segment), model comparison bars |
| **LineChart** | Diminishing returns curve with dual Y-axis (revenue + ROAS), efficient frontier |
| **Custom components** | `HitDot` (green/red circle based on payload), custom tooltips, reference dots |

### State Management
| Skill | Details |
|-------|---------|
| **React Context** | 3 providers: AuthContext (JWT), AppContext (wizard state), ThemeContext (dark/light) |
| **localStorage** | Token persistence, theme preference, user profile caching |

### Export & PDF Generation
| Skill | Details |
|-------|---------|
| **jsPDF** | Client-side PDF generation with custom layouts, headers, and multi-page support |
| **jspdf-autotable** | Table rendering in PDF with styled headers and alternating row colors |
| **Unicode sanitization** | Custom `sanitizeForPdf()` mapping (σ→SD, em dash→hyphen, curly quotes→straight) for WinAnsi/Latin-1 font compatibility |

---

## DevOps & Deployment Skills

### Containerization
| Skill | Details |
|-------|---------|
| **Docker** | Multi-stage Dockerfiles for backend (Python) and frontend (Node), slim base images |
| **docker-compose** | Two-service orchestration with health check dependency, environment variables |

### Cloud Deployment
| Skill | Details |
|-------|---------|
| **Render.com** | Blueprint deployment (`render.yaml`), two-service architecture, env var management, health checks |
| **Vercel** | Next.js deployment config (`vercel.json`), environment variable injection |
| **CORS configuration** | Regex-based localhost + explicit production origins via `CORS_ORIGINS` env var |

### Version Control
| Skill | Details |
|-------|---------|
| **Git** | Feature branching, meaningful commit messages, `.gitignore` for secrets/build artifacts |
| **GitHub** | Repository management, Blueprint integration with Render, `gh` CLI for repo operations |

---

## Concepts & Methodologies

### Statistical / Mathematical
- Ordinary Least Squares (OLS) regression
- Log-log (power law) models
- Residual bootstrap for uncertainty quantification
- Heteroscedastic variance correction
- Cross-validation for hyperparameter selection
- Holdout backtesting for model calibration
- Z-score anomaly detection
- Multiplicative seasonal decomposition
- Constrained optimization (SLSQP)
- Efficient frontier analysis
- Marginal vs average ROAS
- Adstock (geometric decay) modeling

### Software Engineering
- REST API design with stateful sessions
- JWT-based authentication (zero external auth libraries)
- Client-side PDF/CSV report generation
- Probabilistic forecasting (P10/P50/P90 intervals)
- Model comparison against baselines (naive, moving average, linear trend)
- End-to-end testing with Playwright
- Responsive design (mobile-first)
- Dark/light theme system
- Environment-based configuration (dev vs production)
- In-memory + SQLite hybrid persistence

### Architecture Patterns
- 4-step wizard UI pattern
- Context-based state management (3 React contexts)
- Typed API wrapper layer (TypeScript → FastAPI)
- Fast proxy + full validation pattern (optimizer)
- Conservative model selection (adstock threshold, trend gating)
- Empirical calibration over theoretical assumptions

---

## Libraries & Dependencies

### Backend (`requirements.txt`)
| Library | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `pandas` | Data manipulation |
| `numpy` | Numerical computation |
| `statsmodels` | OLS regression |
| `scipy` | Optimization (SLSQP) |
| `google-genai` | Gemini AI integration |
| `python-multipart` | File upload handling |
| `python-dotenv` | Environment variable loading |
| `email-validator` | Email format validation |
| `pytest` | Testing framework |
| `httpx` | HTTP client for tests |

### Frontend (`package.json`)
| Library | Purpose |
|---------|---------|
| `next` (14) | React framework |
| `react` (18) | UI library |
| `typescript` | Type safety |
| `tailwindcss` | Utility CSS |
| `recharts` | Charts (Bar, Line, Radar, Composed, Area) |
| `jspdf` | PDF generation |
| `jspdf-autotable` | PDF table rendering |

---

## Feature Count Summary

| Category | Count |
|----------|-------|
| API Endpoints | 11 |
| Frontend Components | 22 |
| Visualization Types | 8 (bar, line, radar, composed, area, waterfall, scatter, heatmap) |
| React Contexts | 3 (Auth, App, Theme) |
| Backend Modules | 12 (core/) + 9 (routes/) |
| Test Cases | 24 |
| CSV Input Files | 5 |
| Forecast Percentiles | 3 (P10, P50, P90) |
| Baseline Models | 3 (naive, MA, linear trend) |
| Ad Channels | 3 (Google, Meta, Microsoft) |

---

*This skills document is part of the [RevCast AI](https://github.com/keerthishree20/RevCast-AI) project by KeerthiShree TS.*
