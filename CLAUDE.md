# CLAUDE.md - Trailblaize Internal CRM

This document provides guidance for AI assistants working with the Trailblaize Internal CRM codebase.

## Project Overview

Trailblaize is an internal CRM platform for managing employees, operations, sales pipeline, onboarding processes, and business connections. Built for speed, reliability, and internal team use.

### Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **Frontend**: React 18 with TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4 (PostCSS)
- **Database**: Supabase (PostgreSQL) with RLS policies
- **Icons**: Lucide React
- **Auth**: Supabase Auth with JWT metadata for roles
- **Integrations**: Google OAuth 2.0 (Gmail, Calendar), Linear GraphQL API

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linting
npm run lint

# Production build
npm run build
```

**Required Environment Variables**:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyxxx...
SUPABASE_SERVICE_ROLE_KEY=eyxxx...

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# Linear
LINEAR_CLIENT_ID=xxx
LINEAR_CLIENT_SECRET=xxx
LINEAR_REDIRECT_URI=https://trailblaize.space/api/linear/callback
LINEAR_WEBHOOK_SECRET=xxx
```

## Directory Structure

```
/home/user/intern-repo/
├── app/                           # Next.js App Router
│   ├── api/                       # REST API routes (29 endpoints)
│   │   ├── employees/             # Employee CRUD
│   │   ├── engineering/           # Linear issues integration
│   │   ├── google/                # Google OAuth & Gmail/Calendar APIs
│   │   ├── linear/                # Linear OAuth & webhooks
│   │   ├── messages/              # Messaging system
│   │   ├── parse-*/               # Image parsing utilities
│   │   └── workspace/             # Tasks and leads management
│   ├── workspace/                 # Main workspace dashboard
│   │   ├── components/            # 15+ dashboard components
│   │   │   ├── Dashboard.tsx      # Role-based dashboard router
│   │   │   ├── dashboards/        # FounderDashboard, EngineerDashboard, InternDashboard
│   │   │   ├── Google*/           # Gmail & Calendar widgets
│   │   │   ├── Linear*/           # Issue tracker components
│   │   │   └── Sidebar.tsx        # Navigation
│   │   ├── hooks/                 # Custom hooks
│   │   │   ├── useWorkspaceData.ts   # Data fetching & mutations
│   │   │   ├── useGoogleIntegration.ts # Google OAuth & API
│   │   │   └── useUserRole.ts      # Role-based UI adaptation
│   │   ├── utils/                 # Role permissions logic
│   │   └── [feature]/page.tsx     # inbox, tasks, leads, team, projects, messages
│   ├── portal/                    # Portal module (alternative view)
│   ├── nucleus/                   # Founder-only admin module
│   │   └── [module]/page.tsx      # employees, pipeline, fundraising, operations, etc.
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page
│   └── globals.css                # Tailwind styles
├── components/                    # Shared components
│   ├── ProtectedRoute.tsx         # Auth guard & role-based routing
│   ├── ConfirmModal.tsx           # Reusable confirmation dialog
│   └── NucleusLogin.tsx           # Login UI
├── lib/                           # Core business logic
│   ├── supabase.ts                # Database types & constants
│   ├── auth-context.tsx           # Auth provider (uses JWT metadata)
│   ├── google.ts                  # Google OAuth & API helpers
│   ├── linear.ts                  # Linear OAuth & GraphQL helpers
│   └── *.sql                      # 20 SQL schema files
├── package.json
├── tsconfig.json                  # Path alias: @/* -> ./*
└── .cursorrules                   # Development guidelines
```

## Core Principles

1. **Lean & Fast**: Prioritize performance and minimal dependencies
2. **No Hallucination**: Only implement features explicitly requested
3. **Production-Ready**: Write code as if shipping immediately
4. **Internal Tool**: Optimize for team efficiency
5. **Strict TypeScript**: No `any` types without explicit justification

## Architecture Patterns

### Authentication & Authorization

Uses Supabase Auth with JWT metadata for role-based access:

```typescript
// Roles hierarchy (from lib/supabase.ts)
ROLE_HIERARCHY = {
  growth_intern: 1, sales_intern: 1, marketing_intern: 1,
  engineer: 2, operations: 3, cofounder: 5, founder: 6
}

// Auth flow:
// 1. User signs in with email/password
// 2. Supabase returns JWT with user_metadata (role, name, seniority)
// 3. AuthProvider extracts profile from JWT
// 4. Components check profile.role for feature access
```

**Key hook**: `useAuth()` from `lib/auth-context.tsx`

### API Response Format

All API endpoints follow this contract:

```typescript
// Success
{ data: T, error: null }

// Error
{ data: null, error: { message: string, code: string } }
```

### API Route Pattern

```typescript
// Standard pattern for all API routes
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('table').select('*');

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}

// Lazy-initialize Supabase client
let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabase;
}
```

### State Management

Hooks-based approach (no Redux):

- `useAuth()` - Authentication context
- `useWorkspaceData()` - Workspace CRUD operations with optimistic updates
- `useGoogleIntegration(employeeId)` - Google OAuth & API calls
- `useUserRole()` - Role-based feature flags

### Database Patterns

**Core tables**:
- `employees` - User accounts with roles
- `google_oauth_tokens` / `linear_oauth_tokens` - OAuth tokens per employee
- `workspace_tasks` - Personal employee tasks
- `personal_leads` - Personal lead tracking
- `messages` / `conversations` / `conversation_participants` - Messaging system
- `deals` - Sales opportunities
- `network_contacts` - Fundraising CRM

**Security**: Row Level Security (RLS) policies on all tables
- Users see only their own data by default
- Founders see all data for team oversight
- Service role key used server-side to bypass RLS

## Main Modules

### Workspace (`/app/workspace/`)
Main productivity hub for all roles. Features role-adaptive dashboards, Google/Linear integrations, task management, lead tracking, and team messaging.

### Portal (`/app/portal/`)
Alternative view for non-admin users (similar structure to workspace).

### Nucleus (`/app/nucleus/`)
Founder-only admin dashboard. Protected by `ProtectedRoute` with `requireAdmin={true}`. Includes employee management, pipeline, fundraising, operations, customer success, and enterprise modules.

## Integration Patterns

### Google Integration

**OAuth Flow**:
1. `useGoogleIntegration(employeeId)` hook initiates flow
2. `GET /api/google/auth?employee_id=X` redirects to Google
3. `GET /api/google/callback` exchanges code for tokens
4. Tokens stored in `google_oauth_tokens` table with expiration

**Token refresh is automatic** - API routes check expiration and refresh as needed.

**Scopes**: calendar.readonly, gmail.readonly, gmail.send, gmail.compose, gmail.labels

**Key files**:
- `lib/google.ts` - OAuth & API helpers
- `app/api/google/*` - 7 API endpoints
- `app/workspace/hooks/useGoogleIntegration.ts` - React hook

### Linear Integration

**OAuth Flow**: Similar to Google
1. `POST /api/linear/auth` with employee_id
2. Redirects to Linear OAuth
3. `GET /api/linear/callback` stores token

**Webhook Integration**:
- `POST /api/linear/webhooks` receives Linear events
- Syncs issues to `linear_issues` table

**Key files**:
- `lib/linear.ts` - OAuth & GraphQL helpers
- `app/api/linear/*` - 7 API endpoints

## Code Conventions

### TypeScript
- Strict mode enabled, no `any` types
- Use meaningful variable names reflecting business domain
- Prefer explicit over implicit
- Functions max 50 lines

### Components
- Functional components with TypeScript interfaces
- Lucide React icons throughout
- Loading/error states per component
- Role-based conditional rendering via `getRoleFeatures()`

### File Organization
- API routes: `/app/api/[domain]/route.ts`
- Pages: `/app/[module]/[feature]/page.tsx`
- Shared components: `/components/`
- Core logic: `/lib/`
- Module-specific components: `/app/[module]/components/`

## Common Tasks

### Adding a New API Endpoint

1. Create route file at `/app/api/[domain]/route.ts`
2. Use lazy-initialized Supabase client pattern
3. Follow standard response format `{ data, error }`
4. Add error handling with appropriate status codes
5. Use service role key for server-side operations

### Adding a New Workspace Feature

1. Create page at `/app/workspace/[feature]/page.tsx`
2. Add component in `/app/workspace/components/`
3. Update `useWorkspaceData` hook if needed
4. Add to sidebar navigation in `Sidebar.tsx`
5. Update role permissions in `utils/rolePermissions.ts`

### Adding OAuth Integration

1. Create OAuth helpers in `/lib/[provider].ts`
2. Add API routes: auth, callback, status, disconnect
3. Create token storage table with `employee_id` FK
4. Create React hook for integration state
5. Handle token refresh in API routes

## Important Files

| File | Purpose |
|------|---------|
| `lib/auth-context.tsx` | Auth provider with JWT profile extraction |
| `lib/supabase.ts` | Database types, role hierarchy, permissions |
| `lib/google.ts` | Google OAuth & API functions (414 LOC) |
| `lib/linear.ts` | Linear OAuth & GraphQL functions (400+ LOC) |
| `app/workspace/hooks/useWorkspaceData.ts` | Central data management hook (19 KB) |
| `app/workspace/components/LinearIssueTracker.tsx` | Largest component (27 KB) |
| `components/ProtectedRoute.tsx` | Auth guard with role checking |

## What NOT to Do

- Don't add features not explicitly requested
- Don't install packages without justification
- Don't create abstraction layers unless there's clear repeated code
- Don't use ORMs that hide SQL complexity
- Don't implement auth beyond basic needs initially
- Don't add animations unless specifically requested
- Don't create generic utility functions for single-use cases
- Never commit sensitive data (API keys, passwords)
- Never use `eval()` or `dangerouslySetInnerHTML` without explicit approval

## Testing

Focus testing on:
- Data integrity
- Core workflows
- API boundary validation
- Role-based access control

## References

- See `.cursorrules` for detailed development guidelines
- See `lib/GOOGLE_SETUP.md` for Google integration setup
- See `lib/LINEAR_SETUP.md` for Linear integration setup
- SQL schemas in `lib/*.sql` files
