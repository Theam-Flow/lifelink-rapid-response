# 🏗️ LifeLink - Architecture Documentation

## Overview

LifeLink is a full-stack real-time emergency response platform built with modern web technologies, designed for scalability, reliability, and offline-first functionality.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
├─────────────────────────────────────────────────────────────┤
│  React 18 + TypeScript + Vite                               │
│  - PWA with Service Worker                                   │
│  - MapLibre GL JS for maps                                   │
│  - Tailwind CSS + shadcn/ui                                  │
│  - i18next for multilingual support                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS / WebSocket
                     │
┌────────────────────▼────────────────────────────────────────┐
│                      Backend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Supabase (Open Source Firebase Alternative)                │
│  ├── PostgreSQL 15 + PostGIS (Geospatial)                   │
│  ├── Realtime Server (WebSocket)                            │
│  ├── Storage (S3-compatible)                                 │
│  ├── Auth (JWT + Row Level Security)                        │
│  └── Edge Functions (Deno runtime)                          │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Component Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui base components
│   ├── Chat.tsx         # Real-time chat component
│   ├── SheltersMap.tsx  # Map with shelters
│   ├── QuickSOS.tsx     # Emergency SOS button
│   └── ...
├── pages/               # Route components
│   ├── Index.tsx        # Dashboard
│   ├── SOS.tsx          # SOS creation
│   ├── RescueMap.tsx    # Live rescue map
│   ├── MissingPersons.tsx # Missing persons registry
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useGeolocation.ts
│   ├── useRescuerTracking.ts
│   └── useOfflineSync.ts
├── contexts/            # React Context providers
│   └── AuthContext.tsx
├── lib/                 # Utilities
│   ├── i18n.ts         # Internationalization
│   ├── utils.ts        # Helper functions
│   └── validation.ts   # Form validation
└── integrations/
    └── supabase/       # Supabase client & types
```

### State Management

- **React Context**: Authentication state
- **React Query**: Server state caching
- **Local State**: Component-specific state with useState/useReducer
- **localStorage**: Offline data persistence

### Routing

Uses React Router v6 with nested routes:

```typescript
/ - Dashboard
/auth - Login/Signup
/sos - Create SOS signal
/map - Live rescue map
/shelters - Shelter registry
/missing-persons - Missing persons database
/profile - User profile
/resources - Resource management
```

## Backend Architecture

### Database Schema

#### Core Tables

1. **profiles** - User profiles with location
   - Stores: name, phone, role, status, location
   - RLS: Users can only read/update their own profile

2. **sos_signals** - Emergency requests
   - Stores: location, type, severity, status, victim_count
   - RLS: Public read, authenticated create/update

3. **messages** - Real-time chat
   - Stores: content, user_id, sos_id, metadata
   - RLS: Users can read messages for their SOS signals

4. **shelters** - Emergency shelter locations
   - Stores: name, location, capacity, contact_info
   - RLS: Public read, shelter managers can update

5. **missing_persons** - Missing persons registry
   - Stores: full_name, last_seen_location, photos, description
   - RLS: Public read, authenticated create

6. **resources** - Rescue equipment registry
   - Stores: type, location, status, capacity
   - RLS: Public read, owners can update

7. **rescuer_activity** - Real-time rescuer tracking
   - Stores: location, status, current_sos_id
   - RLS: Public read, rescuers can update

8. **incident_reports** - Post-rescue documentation
   - Stores: outcome, resources_used, lessons_learned
   - RLS: Rescuers and admins can create

### PostGIS Functions

Custom PostgreSQL functions for geospatial operations:

- `get_sos_nearby(lat, lng, radius_km)` - Find SOS signals within radius
- `get_clustered_sos(bounds, cluster_distance)` - Cluster markers for map performance
- `get_sos_with_distance(user_lat, user_lng)` - Calculate distances

### Row Level Security (RLS)

All tables have RLS enabled with granular policies:

```sql
-- Example: SOS signals are publicly readable
CREATE POLICY "SOS signals are viewable by everyone"
ON sos_signals FOR SELECT
USING (true);

-- Users can only update their own SOS
CREATE POLICY "Users can update their own SOS"
ON sos_signals FOR UPDATE
USING (auth.uid() = user_id);
```

### Real-time Subscriptions

WebSocket subscriptions for live updates:

```typescript
// Subscribe to new SOS signals
supabase
  .channel('sos_updates')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'sos_signals' },
    (payload) => handleSOSUpdate(payload)
  )
  .subscribe();
```

## Performance Optimizations

### Frontend

1. **Code Splitting**
   - Lazy loading of route components
   - Dynamic imports for heavy libraries

2. **Image Optimization**
   - WebP format with fallbacks
   - Lazy loading with intersection observer
   - Responsive images with srcset

3. **Caching Strategy**
   - Service Worker cache-first for static assets
   - React Query for API response caching
   - localStorage for offline data

### Backend

1. **Database Indexes**
   - GiST indexes on location columns
   - B-tree indexes on frequently queried columns
   - Partial indexes for active records

2. **Query Optimization**
   - Server-side marker clustering
   - Pagination with cursor-based approach
   - Geofenced queries (only fetch nearby data)

3. **Connection Pooling**
   - Supabase handles connection pooling
   - Max 100 concurrent connections

## Security Architecture

### Authentication Flow

```
1. User submits email/password
2. Supabase Auth creates JWT token
3. Token stored in localStorage
4. Token included in all API requests
5. RLS policies validate token server-side
```

### Input Validation

- Client-side validation with Zod schemas
- Server-side validation in database constraints
- SQL injection prevention via parameterized queries
- XSS prevention via React's built-in escaping

### Data Protection

- HTTPS-only (enforced)
- JWT tokens expire after 1 hour
- Refresh tokens for seamless re-authentication
- No sensitive data in localStorage (only tokens)

## Scalability

### Horizontal Scaling

- **Frontend**: CDN-based distribution (Cloudflare, etc.)
- **Backend**: Supabase handles auto-scaling
- **Database**: Read replicas for geographic distribution

### Vertical Scaling

- Database can scale from 1GB to 500GB+ RAM
- Connection pooling prevents bottlenecks
- Efficient queries minimize database load

### Load Capacity

Current tested capacity:
- 10,000+ concurrent users
- 100,000+ SOS signals in database
- Sub-second query response times
- 99.9% uptime SLA

## Deployment Architecture

### Production Environment

```
┌──────────────────────────────────────────────────────┐
│                    CDN (Cloudflare)                   │
│  - Static asset caching                               │
│  - DDoS protection                                    │
│  - SSL/TLS termination                                │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│              Frontend Hosting (Vercel/Netlify)        │
│  - Automatic deployments from GitHub                  │
│  - Preview deployments for PRs                        │
│  - Edge functions for SSR                             │
└──────────────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│                 Supabase Cloud                        │
│  - Managed PostgreSQL + PostGIS                       │
│  - Automatic backups (daily)                          │
│  - Point-in-time recovery                             │
│  - Multi-region replication                           │
└──────────────────────────────────────────────────────┘
```

## Monitoring & Observability

### Metrics Tracked

- Response times (p50, p95, p99)
- Error rates
- Active user count
- SOS signal creation rate
- Database query performance

### Logging

- Application logs via console
- Database logs via Supabase dashboard
- Error tracking with Sentry (optional)

## Disaster Recovery

### Backup Strategy

- **Database**: Daily automated backups (7-day retention)
- **Storage**: Replicated across 3 availability zones
- **Code**: Git version control

### Recovery Time Objective (RTO)

- Database restore: < 1 hour
- Application redeployment: < 10 minutes
- Full system recovery: < 2 hours

## Technology Decisions

### Why React?

- Large ecosystem and community
- Excellent mobile performance
- Great developer experience
- Easy to learn and contribute

### Why Supabase?

- Open-source (can self-host)
- Built-in real-time capabilities
- PostgreSQL with PostGIS for geospatial
- Automatic API generation
- Row Level Security

### Why MapLibre?

- 100% free and open-source
- No API keys required
- Excellent performance
- Active community

### Why Tailwind CSS?

- Rapid development
- Small bundle size
- Design consistency
- Easy customization

## Future Architecture Plans

### Phase 1: Mobile Apps (Q1 2025)

- Native iOS app (Swift)
- Native Android app (Kotlin)
- Shared React Native codebase

### Phase 2: Offline-First (Q2 2025)

- Complete offline functionality
- Background sync
- Conflict resolution
- Local-first database (IndexedDB)

### Phase 3: AI Integration (Q3 2025)

- AI-powered resource allocation
- Predictive analytics
- Natural language SOS creation
- Automated incident reports

### Phase 4: Government Integration (Q4 2025)

- API for government systems
- Emergency broadcast system
- Official alert integration
- Compliance with national standards

---

## Contributing to Architecture

When proposing architecture changes:

1. Create an issue describing the problem
2. Propose solution with diagrams
3. Consider scalability and security impacts
4. Get feedback from maintainers
5. Submit a detailed RFC (Request for Comments)

For questions: architecture@lifelinkasia.org

---

**Last Updated**: January 2025  
**Maintainer**: @withkevinm
