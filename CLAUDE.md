# Claude Code Rules - Nexent Project

## Project Overview

**Nexent** is a zero-code intelligent agent auto-generation platform that enables users to create AI agents using pure natural language, without complex orchestration or drag-and-drop operations. Built on the MCP (Model Context Protocol) ecosystem, it offers rich tool integration, multi-agent collaboration, knowledge traceability, multi-modal dialogue, and batch processing capabilities.

### Key Features
- 🤖 **Zero-Code Agent Creation**: Generate agents from natural language prompts
- 🔄 **Multi-Agent Collaboration**: Orchestrate complex workflows across multiple agents
- 📚 **Knowledge Management**: Personal and global knowledge bases with automatic summarization
- 🌐 **Internet Search Integration**: 5+ web search providers for real-time information
- 🎯 **Knowledge Traceability**: Precise citations from web and knowledge base sources
- 🎨 **Multi-Modal Support**: Text, voice, images with generation capabilities
- 🔧 **MCP Tool Ecosystem**: Plugin-based architecture following MCP specifications
- 🏥 **Multi-Portal Architecture**: Separate interfaces for doctors, students, patients, and administrators

---

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL (Supabase)
- **ORM**: SQLAlchemy
- **Async Support**: asyncio, async/await patterns
- **Data Processing**: Ray (for scalable batch processing)
- **Vector Database**: Elasticsearch
- **Monitoring**: OpenTelemetry, Prometheus
- **Search**: Elasticsearch with custom scoring

### Frontend
- **Framework**: Next.js 15.4+ (App Router)
- **UI Library**: React 18.2
- **Styling**: Tailwind CSS, Ant Design 5.24+, shadcn/ui
- **State Management**: React Hooks, React Context
- **Internationalization**: react-i18next, next-i18next
- **Animation**: Framer Motion
- **Diagrams**: React Flow, React D3 Tree
- **Markdown**: react-markdown with KaTeX, syntax highlighting

### DevOps
- **Containerization**: Docker, Docker Compose
- **Development**: Hot reload for frontend and backend
- **Monitoring**: Grafana, Prometheus, OpenTelemetry Collector

---

## Code Quality Standards

### English-Only Comments and Documentation
- All comments and docstrings MUST be written in clear, concise English
- Do not use non-English characters in comments (string literals may contain any language)
- Use proper grammar and spelling; avoid ambiguous abbreviations
- Apply to: docstrings, inline comments, TODO/FIXME/NOTE, header comments, configuration comments

**Good:**
```python
# Initialize cache for 60 seconds
self.cache_ttl = 60
```

**Bad:**
```python
# 初始化缓存 60 秒 - FORBIDDEN
# データキャッシュ60秒 - FORBIDDEN
```

### Environment Variable Management
- All environment variable access MUST go through `backend/consts/const.py`
- No direct `os.getenv()` or `os.environ.get()` calls outside of `const.py`
- SDK modules (`sdk/`) should NEVER read environment variables directly - accept configuration via parameters
- Services (`backend/services/`) read from `consts.const` and pass config to SDK
- Apps (`backend/apps/`) read from `consts.const` and pass through to services/SDK

**Good:**
```python
# backend/consts/const.py
APPID = os.getenv("APPID", "")
TOKEN = os.getenv("TOKEN", "")

# other modules
from consts.const import APPID, TOKEN
```

**Bad:**
```python
# direct calls in other modules - FORBIDDEN
import os
appid = os.getenv("APPID")
token = os.environ.get("TOKEN")
```

---

## Backend Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP Layer (Apps)                       │
│  Parse requests, validate input, call services, return HTTP  │
│           apps/agent_app.py, apps/memory_config_app.py       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic (Services)                  │
│    Orchestrate workflows, coordinate repos/SDKs, raise       │
│         domain exceptions, return plain Python objects       │
│      services/agent_service.py, services/memory_config_      │
│                         service.py                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               Data/SDK Layer (Database & SDK)                │
│     Database operations, external API calls, pure logic      │
│      database/agent_db.py, sdk/nexent/core/*, sdk/nexent/    │
│                          memory/*                            │
└─────────────────────────────────────────────────────────────┘
```

### App Layer Rules (`backend/apps/**/*.py`)

**Purpose**: HTTP boundary for the backend - parse/validate input, call services, map domain errors to HTTP

**Responsibilities:**
- Parse and validate HTTP inputs using Pydantic models
- Call underlying services; do NOT implement core business logic
- Translate domain/service exceptions into `HTTPException` with proper status codes
- Return `JSONResponse(status_code=HTTPStatus.OK, content=payload)` on success

**Routing and URL Design:**
- Keep existing top-level prefixes for compatibility (e.g., `"/agent"`, `"/memory"`)
- Use plural nouns for collection-style resources (e.g., `"/agents"`, `"/memories"`)
- Use snake_case for all path segments
- Path parameters must be singular, semantic nouns: `"/agents/{agent_id}"`

**HTTP Methods:**
- GET: Read and list operations only
- POST: Create resources, perform searches, or trigger actions with side effects
- DELETE: Delete resources or clear collections (ensure idempotency)
- PUT/PATCH: Update resources

**Authorization:**
- Retrieve bearer token via header injection: `authorization: Optional[str] = Header(None)`
- Use utility helpers from `utils.auth_utils` (e.g., `get_current_user_id`)

**Exception Mapping:**
- `UnauthorizedError` → 401 UNAUTHORIZED
- `LimitExceededError` → 429 TOO_MANY_REQUESTS
- Parameter/validation errors → 400 BAD_REQUEST or 406 NOT_ACCEPTABLE
- Unexpected errors → 500 INTERNAL_SERVER_ERROR

**Correct Example:**
```python
from http import HTTPStatus
import logging
from fastapi import APIRouter, HTTPException
from starlette.responses import JSONResponse

from consts.exceptions import LimitExceededError, AgentRunException
from services.agent_service import run_agent

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/agent/run")
def run_agent_endpoint(payload: dict):
    try:
        result = run_agent(payload)
        return JSONResponse(status_code=HTTPStatus.OK, content=result)
    except LimitExceededError as exc:
        raise HTTPException(status_code=HTTPStatus.TOO_MANY_REQUESTS, detail=str(exc))
    except AgentRunException as exc:
        raise HTTPException(status_code=HTTPStatus.INTERNAL_SERVER_ERROR, detail=str(exc))
```

### Service Layer Rules (`backend/services/**/*.py`)

**Purpose**: Implement core business logic orchestration; coordinate repositories/SDKs

**Requirements:**
- Implement core business logic and orchestrate complex workflows
- Raise domain/service exceptions from `backend/consts/exceptions.py`
- NO HTTP concerns (no HTTPException, JSONResponse, etc.)
- NO direct environment variable access (use `consts.const`)
- Return plain Python objects, not HTTP responses
- Use async/await for I/O operations

**Available Exceptions:**
- `AgentRunException`: When agent run fails
- `LimitExceededError`: When outer platform calls too frequently
- `UnauthorizedError`: When user from outer platform is unauthorized
- `SignatureValidationError`: When X-Signature header validation fails
- `MemoryPreparationException`: When memory preprocessing/retrieval fails

**Correct Example:**
```python
from typing import Any, Dict
from consts.exceptions import LimitExceededError, AgentRunException, MemoryPreparationException

async def run_agent(task_payload: Dict[str, Any]) -> Dict[str, Any]:
    """Run agent core workflow and return domain result dict."""
    if _is_rate_limited(task_payload):
        raise LimitExceededError("Too many requests for this tenant.")

    try:
        memory = await _prepare_memory(task_payload)
    except Exception as exc:
        raise MemoryPreparationException("Failed to prepare memory.") from exc

    try:
        result = await _execute_core_logic(task_payload, memory)
    except Exception as exc:
        raise AgentRunException("Agent execution failed.") from exc

    return {"status": "ok", "data": result}
```

### Database Layer Rules (`backend/database/**/*.py`)

**Purpose**: Data persistence and retrieval using SQLAlchemy ORM

**Requirements:**
- All tables use the `nexent` schema
- Inherit from `TableBase` for standard fields (create_time, update_time, created_by, updated_by, delete_flag)
- Soft delete: Set `delete_flag='Y'` instead of actual deletion
- All database functions should be async where possible
- Use proper indexing for frequently queried fields
- Include tenant_id for multi-tenancy support

**Standard Fields on All Tables:**
- `create_time`: Timestamp of record creation
- `update_time`: Timestamp of last update
- `created_by`: User ID who created the record
- `updated_by`: User ID who last updated the record
- `delete_flag`: 'Y' for deleted, 'N' for active

---

## Directory Structure

```
nexent/
├── backend/                    # Python FastAPI backend
│   ├── agents/                # Agent creation and management logic
│   ├── apps/                  # HTTP API layer (22 routers)
│   │   ├── base_app.py       # Main FastAPI app with CORS and routing
│   │   ├── agent_app.py      # Agent management endpoints
│   │   ├── conversation_management_app.py
│   │   ├── memory_config_app.py
│   │   ├── model_managment_app.py
│   │   ├── portal_agent_assignment_app.py
│   │   └── ... (18 more apps)
│   ├── consts/               # Constants and configuration
│   │   ├── const.py         # Single source of truth for env vars
│   │   ├── exceptions.py    # Domain exceptions
│   │   ├── model.py         # Pydantic models
│   │   └── provider.py      # Model provider definitions
│   ├── database/            # SQLAlchemy models and database operations
│   │   ├── db_models.py     # ORM table definitions
│   │   ├── client.py        # Database connection management
│   │   ├── agent_db.py      # Agent CRUD operations
│   │   ├── conversation_db.py
│   │   ├── memory_config_db.py
│   │   └── ... (10+ database modules)
│   ├── data_process/        # Ray-based data processing
│   ├── prompts/             # YAML prompt templates
│   ├── services/            # Business logic layer (22 services)
│   │   ├── agent_service.py
│   │   ├── conversation_management_service.py
│   │   ├── memory_config_service.py
│   │   └── ... (19 more services)
│   ├── tool_collection/     # Built-in MCP tools
│   ├── utils/               # Utility modules
│   │   ├── auth_utils.py    # Authentication helpers
│   │   ├── logging_utils.py
│   │   └── monitoring.py
│   └── main_service.py      # Entry point (uvicorn server)
│
├── frontend/                 # Next.js 15 frontend
│   ├── app/[locale]/        # App router with i18n
│   │   ├── page.tsx        # Landing page (portal selector)
│   │   ├── admin/          # Admin portal routes
│   │   │   ├── page.tsx
│   │   │   └── components/ # Admin-specific components
│   │   ├── doctor/         # Doctor portal routes
│   │   │   ├── page.tsx
│   │   │   ├── patients/   # Patient management
│   │   │   ├── cases/      # Case library
│   │   │   └── knowledge/  # Knowledge base
│   │   ├── patient/        # Patient portal routes
│   │   ├── chat/           # Chat interface (shared)
│   │   │   ├── internal/
│   │   │   ├── streaming/
│   │   │   └── components/
│   │   └── setup/          # Setup/config pages
│   │       ├── agents/
│   │       ├── models/
│   │       └── knowledges/
│   ├── components/          # React components
│   │   ├── common/         # Shared across portals
│   │   ├── admin/          # Admin-specific
│   │   ├── doctor/         # Doctor-specific (9 components)
│   │   │   ├── patients/   # Patient list, detail, timeline, todos
│   │   │   ├── cases/      # Case library and detail views
│   │   │   └── knowledge/  # Knowledge base and detail views
│   │   ├── patient/        # Patient-specific
│   │   └── ui/             # shadcn/ui components
│   ├── const/              # Frontend constants
│   │   ├── portalChatConfig.ts  # Portal-specific chat configs
│   │   └── constants.ts
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts      # Global authentication
│   │   ├── usePortalAuth.ts # Portal-specific auth
│   │   └── ... (8 more hooks)
│   ├── lib/                # Utility functions
│   ├── services/           # API service layer
│   │   ├── api.ts          # API client configuration
│   │   ├── agentConfigService.ts
│   │   ├── conversationService.ts
│   │   ├── portalAgentAssignmentService.ts
│   │   └── ... (10+ services)
│   ├── types/              # TypeScript type definitions
│   │   ├── portal.ts       # Portal types
│   │   ├── agentConfig.ts
│   │   ├── chat.ts
│   │   └── ... (7 more type files)
│   ├── middleware.ts       # Next.js middleware
│   └── package.json
│
├── sdk/nexent/             # Python SDK (configuration-based, no env vars)
│   ├── core/              # Core agent logic
│   ├── memory/            # Memory management
│   ├── data_process/      # Data processing utilities
│   ├── monitor/           # Monitoring and metrics
│   └── vector_database/   # Vector database integrations
│
├── docker/                # Docker configurations
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── docker-compose.dev.yml
│   └── monitoring/        # Prometheus, Grafana configs
│
├── test/                  # Unit and integration tests
│   ├── backend/
│   └── sdk/
│
└── doc/                   # Documentation (VitePress)
```

---

## Multi-Portal Architecture

### Overview

The application implements a four-portal architecture with dedicated interfaces for different user roles:

1. **Doctor Portal** (`/doctor`) - For pathology doctors
2. **Patient Portal** (`/patient`) - For patients
3. **Admin Portal** (`/admin`) - For system administrators
4. **General Portal** (landing page) - Portal selector and general chat

### Portal Types

```typescript
export type PortalType = "doctor" | "patient" | "admin";

export const PORTAL_ROUTES: Record<PortalType, string> = {
  doctor: "/doctor",
  patient: "/patient",
  admin: "/admin",
};
```

### Portal-Specific Features

#### Doctor Portal Features
- **Patient Management** (`/doctor/patients`)
  - Patient list with search and filtering
  - Patient detail with overview, timeline, todos tabs
  - AI-powered patient summaries and recommendations
  - Timeline visualization of medical history
  - Smart todo management with priority levels

- **Case Library** (`/doctor/cases`)
  - Natural language case search
  - Disease type filtering
  - AI-powered case recommendations
  - Detailed case views with similar case suggestions

- **Knowledge Base** (`/doctor/knowledge`)
  - Knowledge tree navigation
  - Learning progress tracking with heatmaps
  - AI learning recommendations
  - Interactive knowledge graph (planned)

- **Chat Interface** (`/doctor`)
  - Portal-specific main agent auto-loaded
  - Quick action buttons for common queries
  - Custom color scheme (orange-red primary)
  - Hide agent selector (uses portal main agent)

#### Admin Portal Features
- **Agent Configuration** - Create and manage agents
- **Agent Assignment** - Assign agents to portals
- **Model Management** - Configure models per portal
- **Knowledge Management** - Manage knowledge bases
- **Tool Configuration** - Configure MCP tools
- **System Settings** - Global system configuration

### Portal Authentication & Authorization

**Authentication Flow:**
1. User accesses portal route (e.g., `/doctor`)
2. `usePortalAuth` hook checks authentication status
3. If not authenticated, redirect to landing page
4. If authenticated, load portal-specific resources

**Portal Guard Hook:**
```typescript
export function usePortalAuth(portalType: PortalType) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/'); // Redirect to landing page
    }
  }, [isAuthenticated]);

  return { isLoading, user, hasPortalAccess };
}
```

### Portal Data Isolation

**Conversation Isolation:**
- Each portal's conversations are isolated by `portal_type` field
- Doctor portal conversations: `portal_type='doctor'`
- Patient portal conversations: `portal_type='patient'`
- Admin portal conversations: `portal_type='admin'`
- General conversations: `portal_type='general'`

**Agent Assignment:**
- Each portal has a dedicated main agent (`agent_role_category='portal_main'`)
- Main agents can call tool agents (`agent_role_category='tool'`)
- Tool agents are assigned to portals via `ag_portal_agent_assignment_t` table
- One portal = one main agent + multiple tool agents

**Database Schema for Portal Isolation:**
```sql
-- Conversation portal isolation
ALTER TABLE nexent.conversation_record_t
ADD COLUMN portal_type VARCHAR(50) DEFAULT 'general';

-- Agent portal assignment
CREATE TABLE nexent.ag_portal_agent_assignment_t (
  assignment_id SERIAL PRIMARY KEY,
  portal_type VARCHAR(20) NOT NULL, -- 'doctor', 'patient', 'admin'
  agent_id INTEGER NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  -- Standard fields: create_time, update_time, created_by, updated_by, delete_flag
);

-- Agent role and portal type
ALTER TABLE nexent.ag_tenant_agent_t
ADD COLUMN agent_role_category VARCHAR(20) DEFAULT 'tool', -- 'portal_main' or 'tool'
ADD COLUMN portal_type VARCHAR(20); -- 'doctor', 'patient', 'admin' (for portal_main only)
```

### Portal Component Organization

**Best Practices:**
- **Shared components**: Place in `components/common/` for cross-portal use
- **Portal-specific components**: Place in `components/{portal}/` for isolated functionality
- **Portal layouts**: Each portal can have its own layout.tsx
- **Type safety**: Use TypeScript types from `types/portal.ts`

**Example Component Structure:**
```
components/
├── common/
│   ├── Avatar.tsx          # Shared across all portals
│   └── Navbar.tsx          # Shared navigation
├── doctor/
│   ├── patients/
│   │   ├── PatientListView.tsx       # Doctor-specific
│   │   ├── PatientDetailView.tsx
│   │   ├── PatientOverview.tsx
│   │   ├── PatientTimeline.tsx
│   │   └── PatientTodos.tsx
│   ├── cases/
│   │   ├── CaseLibraryView.tsx
│   │   └── CaseDetailView.tsx
│   └── knowledge/
│       ├── KnowledgeBaseView.tsx
│       └── KnowledgeDetailView.tsx
└── admin/
    └── AgentAssignment.tsx
```

---

## Database Models

### Core Tables

#### ConversationRecord (conversation_record_t)
```python
class ConversationRecord(TableBase):
    __tablename__ = "conversation_record_t"
    __table_args__ = {"schema": "nexent"}

    conversation_id = Column(Integer, primary_key=True)
    conversation_title = Column(String(100))
    portal_type = Column(String(50), default='general')
    # Standard fields: create_time, update_time, created_by, updated_by, delete_flag
```

#### AgentInfo (ag_tenant_agent_t)
```python
class AgentInfo(TableBase):
    __tablename__ = "ag_tenant_agent_t"
    __table_args__ = {"schema": "nexent"}

    agent_id = Column(Integer, primary_key=True)
    agent_name = Column(String(100))
    agent_description = Column(Text)
    agent_role_category = Column(String(20), default='tool')  # 'portal_main' or 'tool'
    portal_type = Column(String(20))  # 'doctor', 'patient', 'admin' (for portal_main only)
    category = Column(String(50))  # Agent category for classification
    # Standard fields...
```

#### PortalAgentAssignment (ag_portal_agent_assignment_t)
```python
class PortalAgentAssignment(TableBase):
    __tablename__ = "ag_portal_agent_assignment_t"
    __table_args__ = {"schema": "nexent"}

    assignment_id = Column(Integer, primary_key=True)
    portal_type = Column(String(20))  # 'doctor', 'patient', 'admin'
    agent_id = Column(Integer)
    tenant_id = Column(String(100))
    # Standard fields...
```

### Indexing Strategy
- Index frequently queried fields (portal_type, agent_id, conversation_id)
- Composite indexes for multi-column queries
- Unique constraints on portal main agents per tenant

---

## API Design Patterns

### RESTful Endpoints

**Agent Management:**
- `POST /agent/create` - Create new agent
- `GET /agent/list` - List all agents
- `PUT /agent/update/{agent_id}` - Update agent
- `DELETE /agent/delete/{agent_id}` - Delete agent (soft delete)
- `POST /agent/run` - Execute agent

**Portal Agent Assignment:**
- `GET /portal_agent_assignment/get_agents/{portal_type}` - Get assigned agents for portal
- `GET /portal_agent_assignment/get_main_agent/{portal_type}` - Get main agent for portal
- `POST /portal_agent_assignment/assign` - Assign agent to portal
- `POST /portal_agent_assignment/remove` - Remove agent from portal
- `POST /portal_agent_assignment/set_agents` - Batch set portal agents

**Conversation Management:**
- `PUT /conversation/create` - Create conversation (with portal_type)
- `GET /conversation/list?portal_type={type}` - List conversations filtered by portal
- `PUT /conversation/update/{conversation_id}` - Update conversation
- `DELETE /conversation/delete/{conversation_id}` - Delete conversation

**Model Configuration:**
- `GET /config_sync/get_config?portal={type}` - Get portal-specific model config
- `POST /config_sync/save_config?portal={type}` - Save portal-specific model config

### Request/Response Patterns

**Successful Response:**
```python
return JSONResponse(
    status_code=HTTPStatus.OK,
    content={"data": result, "message": "Success"}
)
```

**Error Response:**
```python
raise HTTPException(
    status_code=HTTPStatus.BAD_REQUEST,
    detail="Invalid input parameters"
)
```

---

## Frontend Development Guidelines

### Portal-Specific Chat Configuration

```typescript
// const/portalChatConfig.ts
export const portalChatConfig = {
  doctor: {
    brandColor: "#FF4D4F",
    navItems: [
      { id: "chat", label: "对话", icon: MessageSquare },
      { id: "patients", label: "患者档案", icon: Users },
      { id: "cases", label: "病例库", icon: FileText },
      { id: "knowledge", label: "知识库", icon: BookOpen },
    ],
    quickButtons: [
      { label: "病理诊断", value: "帮我分析这个病理切片" },
      { label: "病例检索", value: "查找类似病例" },
    ],
    inputPlaceholder: "输入您的问题，或选择快捷操作...",
  },
  // ... other portal configs
};
```

### Component Development Standards

**Naming Conventions:**
- Components: PascalCase (e.g., `PatientListView.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `usePortalAuth.ts`)
- Services: camelCase with 'Service' suffix (e.g., `conversationService.ts`)
- Types: PascalCase for interfaces, camelCase for type aliases

**Component Structure:**
```typescript
"use client"; // For client components

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PatientListViewProps {
  onSelectPatient: (id: string) => void;
}

export function PatientListView({ onSelectPatient }: PatientListViewProps) {
  const [patients, setPatients] = useState([]);

  // Component logic...

  return (
    <div className="h-full flex flex-col">
      {/* Component JSX */}
    </div>
  );
}
```

### Styling Guidelines

**Layout Patterns:**
- Use `h-screen overflow-hidden` for full-screen pages
- Use `flex-1 overflow-y-auto` for scrollable content areas
- Avoid nested scroll containers (causes multiple scrollbars)
- Use Tailwind utility classes consistently

**Color Scheme:**
- Doctor portal: Orange-red (#FF4D4F)
- Patient portal: Blue (#1890FF)
- Admin portal: Purple (#722ED1)
- Neutral: Grays (#FAFAFA background, #6B6B6B text)

**Responsive Design:**
- Use responsive Tailwind classes (sm:, md:, lg:, xl:)
- Test on desktop and mobile viewports
- Ensure touch-friendly targets (min 44x44px)

---

## Development Workflows

### Local Development Setup

1. **Clone Repository:**
```bash
git clone https://github.com/ModelEngine-Group/nexent.git
cd nexent
```

2. **Backend Setup:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Configure environment variables
python main_service.py  # Runs on http://localhost:5010
```

3. **Frontend Setup:**
```bash
cd frontend
npm install
cp .env.example .env.local  # Configure environment variables
npm run dev  # Runs on http://localhost:3000
```

4. **Docker Setup (Recommended):**
```bash
cd docker
cp .env.example .env
bash deploy.sh
# Access at http://localhost:3000
```

### Git Workflow

**Branch Naming:**
- Feature: `feature/description-YYYYMMDD`
- Bugfix: `bugfix/description-YYYYMMDD`
- Hotfix: `hotfix/description-YYYYMMDD`

**Commit Messages:**
- Use conventional commits: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore
- Examples:
  - `feat(doctor): add patient timeline view`
  - `fix(chat): resolve scrollbar issue in doctor portal`
  - `docs(readme): update installation instructions`

**Pull Request Process:**
1. Create feature branch from `main` or `develop`
2. Make changes with clear commits
3. Test locally (run tests, lint, type-check)
4. Push to remote and create PR
5. Request review from team members
6. Address feedback and merge

### Testing Strategy

**Backend Testing:**
```bash
cd backend
pytest test/backend/
pytest test/backend/test_agent_service.py -v  # Specific test
```

**Frontend Testing:**
```bash
cd frontend
npm run type-check  # TypeScript type checking
npm run lint        # ESLint
npm run build       # Build check
```

**Integration Testing:**
- Test API endpoints with Postman or curl
- Test frontend flows manually
- Verify database migrations

---

## Configuration Management

### Backend Configuration (`backend/consts/const.py`)

**Environment Variables Pattern:**
```python
# Database
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Model Engine
MODEL_ENGINE_HOST = os.getenv('MODEL_ENGINE_HOST')
MODEL_ENGINE_APIKEY = os.getenv('MODEL_ENGINE_APIKEY')

# Elasticsearch
ES_HOST = os.getenv("ELASTICSEARCH_HOST")
ES_API_KEY = os.getenv("ELASTICSEARCH_API_KEY")

# Feature Flags
IS_SPEED_MODE = os.getenv('IS_SPEED_MODE', 'false').lower() == 'true'
```

### Frontend Configuration

**API Base URL:**
```typescript
// services/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010/api';
```

**Portal Routes:**
```typescript
// types/portal.ts
export const PORTAL_ROUTES: Record<PortalType, string> = {
  doctor: "/doctor",
  patient: "/patient",
  admin: "/admin",
};
```

---

## Migration Checklist

### Environment Variables
1. Add new vars to `backend/consts/const.py`
2. Update `.env.example` in both backend and frontend
3. Remove all direct `os.getenv()`/`os.environ.get()` outside `const.py`
4. Import from `consts.const` in backend modules
5. Pass configuration as parameters to SDK
6. Remove `from_env()` methods from config classes

### Code Quality
1. Convert all non-English comments to English
2. Ensure docstrings use proper English grammar
3. Add module-level loggers: `logger = logging.getLogger(__name__)`
4. Follow existing async/sync conventions in each module
5. Use type hints for all function parameters and return values
6. Add proper error handling and logging

### Database Migrations
1. Create migration SQL file in `backend/database/migrations/`
2. Create Python migration runner if needed
3. Test migration on local database
4. Document migration in Update.md
5. Include rollback instructions if applicable

---

## Common Patterns & Best Practices

### Error Handling

**Backend:**
```python
import logging
from consts.exceptions import AgentRunException

logger = logging.getLogger(__name__)

async def process_agent_task(task_id: str):
    try:
        result = await _execute_task(task_id)
        logger.info(f"Task {task_id} completed successfully")
        return result
    except Exception as exc:
        logger.error(f"Task {task_id} failed: {str(exc)}")
        raise AgentRunException(f"Failed to process task {task_id}") from exc
```

**Frontend:**
```typescript
import { message } from 'antd';

async function fetchPatients() {
  try {
    const response = await api.get('/patients');
    setPatients(response.data);
  } catch (error) {
    message.error('Failed to load patients');
    console.error('Error fetching patients:', error);
  }
}
```

### Async/Await Patterns

**Backend Async Service:**
```python
async def create_conversation(title: str, user_id: str, portal_type: str) -> dict:
    """Create a new conversation asynchronously."""
    conversation = await conversation_db.create_conversation(
        title=title,
        user_id=user_id,
        portal_type=portal_type
    )
    return {"conversation_id": conversation.conversation_id}
```

**Frontend Async Hook:**
```typescript
function usePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadPatients() {
      setLoading(true);
      try {
        const data = await patientService.getList();
        setPatients(data);
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, []);

  return { patients, loading };
}
```

### Logging Standards

**Python Logging:**
```python
import logging

logger = logging.getLogger(__name__)

# Use appropriate log levels
logger.debug("Detailed debugging information")
logger.info("General informational messages")
logger.warning("Warning messages for potentially harmful situations")
logger.error("Error messages for serious problems")
logger.critical("Critical messages for very serious errors")
```

**Log Format:**
- Include timestamp, level, module name, and message
- Don't log sensitive information (passwords, tokens)
- Use structured logging for better searchability

---

## Security Guidelines

### Authentication & Authorization

**Backend:**
- Use JWT tokens for authentication
- Validate tokens in `utils.auth_utils`
- Implement proper RBAC (Role-Based Access Control)
- Never expose internal IDs or sensitive data

**Frontend:**
- Store tokens securely (httpOnly cookies preferred)
- Implement token refresh logic
- Clear tokens on logout
- Validate user permissions before rendering UI

### Input Validation

**Backend Pydantic Validation:**
```python
from pydantic import BaseModel, Field, validator

class CreateAgentRequest(BaseModel):
    agent_name: str = Field(..., min_length=1, max_length=100)
    agent_description: str = Field(..., max_length=500)

    @validator('agent_name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Agent name cannot be empty')
        return v.strip()
```

**Frontend Validation:**
```typescript
import { z } from 'zod';

const patientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.number().min(0).max(150),
  email: z.string().email('Invalid email'),
});
```

### SQL Injection Prevention
- Use SQLAlchemy ORM (parameterized queries)
- Never concatenate user input into SQL strings
- Validate and sanitize all inputs

### XSS Prevention
- React escapes output by default
- Be careful with `dangerouslySetInnerHTML`
- Sanitize markdown/HTML user input

---

## Performance Optimization

### Backend Performance

**Database Query Optimization:**
```python
# Good: Use join loading
from sqlalchemy.orm import joinedload

agents = session.query(AgentInfo).options(
    joinedload(AgentInfo.relations)
).filter(AgentInfo.delete_flag == 'N').all()

# Bad: N+1 queries
agents = session.query(AgentInfo).all()
for agent in agents:
    relations = agent.relations  # Separate query each time
```

**Caching:**
- Use Redis for frequently accessed data
- Implement cache invalidation strategies
- Cache expensive computations

**Async Operations:**
- Use async/await for I/O operations
- Parallelize independent operations
- Use background tasks for heavy processing (Ray)

### Frontend Performance

**Code Splitting:**
```typescript
// Lazy load heavy components
const PatientTimeline = lazy(() => import('./PatientTimeline'));

<Suspense fallback={<LoadingSpinner />}>
  <PatientTimeline />
</Suspense>
```

**Memoization:**
```typescript
import { useMemo, useCallback } from 'react';

const filteredPatients = useMemo(() => {
  return patients.filter(p => p.name.includes(searchQuery));
}, [patients, searchQuery]);

const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

**Image Optimization:**
- Use Next.js Image component
- Implement lazy loading for images
- Use appropriate image formats (WebP)

---

## Troubleshooting Guide

### Common Issues

**Backend Issues:**

1. **Database Connection Errors:**
   - Check `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
   - Verify network connectivity to database
   - Check database schema exists (`nexent`)

2. **Import Errors:**
   - Ensure virtual environment is activated
   - Run `pip install -r requirements.txt`
   - Check Python version (3.11+)

3. **Agent Execution Failures:**
   - Check agent configuration is complete
   - Verify model engine credentials
   - Review logs in `logs/` directory

**Frontend Issues:**

1. **Build Errors:**
   - Run `npm install` to update dependencies
   - Check TypeScript errors with `npm run type-check`
   - Clear `.next` cache and rebuild

2. **API Connection Issues:**
   - Verify `NEXT_PUBLIC_API_URL` in `.env.local`
   - Check backend server is running
   - Review CORS configuration

3. **Authentication Problems:**
   - Clear browser cookies and local storage
   - Check Supabase auth configuration
   - Verify JWT token format

### Debugging Tips

**Backend Debugging:**
```python
# Add detailed logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Use debugger
import pdb; pdb.set_trace()

# Check async issues
import asyncio
asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())  # Windows
```

**Frontend Debugging:**
```typescript
// Use React DevTools
// Check console for errors
console.log('Debug data:', data);

// Use network tab to inspect API calls
// Check component re-renders with React Profiler
```

---

## Recent Updates (November 2025)

### November 15, 2025: Doctor Portal UI System
- ✅ Implemented complete doctor portal UI with three subsystems
- ✅ Patient management (list, detail, overview, timeline, todos)
- ✅ Case library with AI recommendations
- ✅ Knowledge base with learning analytics
- ✅ Fixed scrollbar issues across all pages
- ✅ Optimized layout with consistent styling

### November 12, 2025: Portal Agent Architecture
- ✅ Implemented portal main agent concept
- ✅ Agent role categories: `portal_main` and `tool`
- ✅ Portal-specific agent assignment system
- ✅ Conversation isolation by portal type
- ✅ Database migrations for portal support

### November 11, 2025: Agent Configuration Enhancement
- ✅ Agent category/type classification
- ✅ Portal agent assignment interface with drag-and-drop
- ✅ Model configuration per portal
- ✅ Agent relationship management

### November 9, 2025: Admin Sidebar Optimization
- ✅ Added tool configuration navigation
- ✅ Improved navigation interactivity
- ✅ Enhanced model management layout

### November 8, 2025: Doctor Chat Interface
- ✅ Redesigned chat sidebar for doctor portal
- ✅ Portal-specific chat configuration system
- ✅ Quick action buttons for common queries
- ✅ Smooth animations and transitions

### November 7, 2025: Multi-Portal Foundation
- ✅ Implemented four-portal landing page
- ✅ Created portal routing architecture
- ✅ Integrated authentication for each portal
- ✅ Built portal-specific chat interfaces

---

## Resources & Links

### Documentation
- [Nexent Documentation](https://modelengine-group.github.io/nexent)
- [MCP Ecosystem](https://modelengine-group.github.io/nexent/zh/mcp-ecosystem/overview.html)
- [Model Providers](https://modelengine-group.github.io/nexent/zh/getting-started/model-providers.html)
- [Contributing Guide](https://modelengine-group.github.io/nexent/zh/contributing)

### Community
- [GitHub Repository](https://github.com/ModelEngine-Group/nexent)
- [Discord Community](https://discord.gg/tb5H3S3wyv)
- [Official Website](https://nexent.tech)

### Development
- [Issue Tracker](https://github.com/ModelEngine-Group/nexent/issues)
- [Feature Roadmap](https://github.com/orgs/ModelEngine-Group/projects/6)
- [Known Issues](https://github.com/orgs/ModelEngine-Group/projects/9)

---

## Validation Checklist

### Before Committing Code

**Backend:**
- [ ] No direct `os.getenv()` outside `const.py`
- [ ] All comments in English
- [ ] Domain exceptions used (not HTTPException in services)
- [ ] Async/await used for I/O operations
- [ ] Proper logging with module-level logger
- [ ] Type hints on all functions
- [ ] Tests pass (`pytest`)

**Frontend:**
- [ ] TypeScript type checking passes (`npm run type-check`)
- [ ] ESLint passes (`npm run lint`)
- [ ] No console.log in production code
- [ ] Proper error handling with user feedback
- [ ] Responsive design tested
- [ ] Portal isolation maintained
- [ ] Build succeeds (`npm run build`)

**Database:**
- [ ] All tables use `nexent` schema
- [ ] Soft delete implemented (`delete_flag`)
- [ ] Standard fields included (create_time, update_time, etc.)
- [ ] Indexes on frequently queried fields
- [ ] Migration documented in Update.md

**General:**
- [ ] No sensitive data in code (use environment variables)
- [ ] Code follows project structure
- [ ] Documentation updated if needed
- [ ] Commit message follows conventions
- [ ] Branch name follows pattern

---

## License

Nexent is licensed under the [MIT License](LICENSE) with additional conditions.

---

**Last Updated**: November 15, 2025
**Project Version**: v1.x (v2.0 upcoming)
**Maintained by**: ModelEngine Group
