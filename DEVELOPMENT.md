# 💻 Development Guide

Complete guide for setting up local development environment for LifeLink.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Workflow](#development-workflow)
4. [Running Locally](#running-locally)
5. [Testing](#testing)
6. [Code Style](#code-style)
7. [Git Workflow](#git-workflow)
8. [Common Issues](#common-issues)

## Prerequisites

### Required Software

```bash
# Node.js 18+ (use nvm for version management)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher

# Git
git --version   # Should be 2.x or higher
```

### Optional Tools

```bash
# Supabase CLI (for local database)
npm install -g supabase

# VS Code extensions (recommended)
code --install-extension dbaeumer.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension dsznajder.es7-react-js-snippets
code --install-extension esbenp.prettier-vscode
```

## Initial Setup

### 1. Clone Repository

```bash
# Clone via HTTPS
git clone https://github.com/Theam-Flow/lifelink-rapid-response.git
cd lifelink-rapid-response

# Or clone via SSH (if you have SSH key configured)
git clone git@github.com:Theam-Flow/lifelink-rapid-response.git
cd lifelink-rapid-response
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# This will install:
# - React 18
# - TypeScript
# - Vite
# - Tailwind CSS
# - Supabase client
# - MapLibre GL JS
# - And many more...
```

### 3. Environment Configuration

```bash
# Copy example env file
cp .env.example .env

# Edit .env file
nano .env
```

Add your configuration:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_SUPABASE_PROJECT_ID=your_project_id

# Optional: Development Settings
VITE_ENABLE_DEV_TOOLS=true
VITE_LOG_LEVEL=debug
```

### 4. Supabase Setup

#### Option A: Use Existing Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project or use existing
3. Go to Settings → API
4. Copy URL and anon key to `.env`

#### Option B: Run Supabase Locally

```bash
# Initialize Supabase
supabase init

# Start local Supabase
supabase start

# This will start:
# - PostgreSQL on localhost:54322
# - API server on localhost:54321
# - Studio on localhost:54323

# Update .env with local URLs
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=your_local_anon_key
```

### 5. Run Migrations

```bash
# If using existing project
supabase link --project-ref your-project-ref
supabase db push

# If using local Supabase
supabase db reset
```

## Development Workflow

### Starting Development Server

```bash
# Start dev server
npm run dev

# App will be available at:
# http://localhost:5173

# Hot reload is enabled - changes will reflect instantly
```

### File Structure

```
lifelink-rapid-response/
├── src/
│   ├── components/      # React components
│   │   ├── ui/         # shadcn/ui components
│   │   ├── Chat.tsx
│   │   └── ...
│   ├── pages/          # Route components
│   │   ├── Index.tsx
│   │   ├── SOS.tsx
│   │   └── ...
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities
│   ├── contexts/       # React contexts
│   └── integrations/   # External integrations
├── public/             # Static assets
├── supabase/          # Database migrations
│   ├── migrations/
│   └── functions/
├── .env               # Environment variables (DO NOT COMMIT)
└── package.json       # Dependencies
```

### Creating New Components

```bash
# Create component file
touch src/components/MyNewComponent.tsx

# Use this template:
```

```typescript
// src/components/MyNewComponent.tsx
import React from 'react';

interface MyNewComponentProps {
  title: string;
  onAction?: () => void;
}

export const MyNewComponent: React.FC<MyNewComponentProps> = ({
  title,
  onAction
}) => {
  return (
    <div className="p-4 bg-card rounded-lg">
      <h2 className="text-xl font-bold">{title}</h2>
      {onAction && (
        <button onClick={onAction} className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded">
          Action
        </button>
      )}
    </div>
  );
};
```

### Creating Custom Hooks

```typescript
// src/hooks/useMyHook.ts
import { useState, useEffect } from 'react';

export const useMyHook = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Your logic here
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, refetch: fetchData };
};
```

### Adding New Routes

```typescript
// src/App.tsx
import { Route } from 'react-router-dom';
import MyNewPage from './pages/MyNewPage';

// Add route
<Route path="/my-new-page" element={<MyNewPage />} />
```

## Running Locally

### Development Mode

```bash
# Start with hot reload
npm run dev

# Start with specific port
npm run dev -- --port 3000

# Start with network access (for mobile testing)
npm run dev -- --host
```

### Building for Production

```bash
# Build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

### Type Checking

```bash
# Check TypeScript types
npm run build

# Or use TypeScript directly
npx tsc --noEmit
```

## Testing

### Manual Testing

```bash
# Start dev server
npm run dev

# Open in browser
# Test on different screen sizes using DevTools
# Test authentication flow
# Test SOS signal creation
# Test map functionality
# Test offline mode (disable network in DevTools)
```

### Browser Testing

Test on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

### Mobile Testing

#### Using Real Device

```bash
# Get your local IP
# On Mac/Linux:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Start dev server with host flag
npm run dev -- --host

# Access from mobile:
# http://YOUR_IP:5173
```

#### Using Browser DevTools

1. Open Chrome DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select device (iPhone, Pixel, etc.)
4. Test responsive behavior

## Code Style

### ESLint

```bash
# Check for linting errors
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Prettier (if configured)

```bash
# Format all files
npx prettier --write .
```

### Naming Conventions

```typescript
// Components: PascalCase
MyComponent.tsx

// Hooks: camelCase with 'use' prefix
useCustomHook.ts

// Utilities: camelCase
formatDate.ts

// Constants: UPPER_SNAKE_CASE
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Types/Interfaces: PascalCase
interface UserProfile {}
type SOSStatus = 'active' | 'rescued';
```

### File Organization

```typescript
// Group imports
import React, { useState, useEffect } from 'react'; // React
import { useNavigate } from 'react-router-dom'; // Libraries
import { Button } from '@/components/ui/button'; // UI components
import { useAuth } from '@/contexts/AuthContext'; // Local imports
import { supabase } from '@/integrations/supabase/client'; // Integrations
import './styles.css'; // Styles
```

## Git Workflow

### Branch Naming

```bash
# Feature branches
git checkout -b feature/add-user-profile

# Bug fixes
git checkout -b fix/map-rendering-issue

# Hot fixes
git checkout -b hotfix/critical-security-patch
```

### Commit Messages

Follow conventional commits:

```bash
# Format: <type>(<scope>): <subject>

# Examples:
git commit -m "feat(sos): add photo upload to SOS signals"
git commit -m "fix(map): resolve marker clustering issue"
git commit -m "docs: update API documentation"
git commit -m "refactor(auth): simplify login flow"
git commit -m "test(shelters): add unit tests for shelter queries"
git commit -m "chore(deps): update dependencies"
```

### Pull Request Process

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push to GitHub**
   ```bash
   git push origin feature/my-feature
   ```

4. **Create Pull Request on GitHub**
   - Add clear description
   - Link related issues
   - Add screenshots if UI changes
   - Request review from maintainers

5. **Address review comments**
   ```bash
   # Make changes
   git add .
   git commit -m "fix: address review comments"
   git push origin feature/my-feature
   ```

6. **Merge after approval**

## Common Issues

### Port Already in Use

```bash
# Kill process on port 5173
# On Mac/Linux:
lsof -ti:5173 | xargs kill -9

# On Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Node Modules Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Supabase Connection Issues

```bash
# Check if Supabase is running (local)
supabase status

# Restart Supabase
supabase stop
supabase start

# Check .env file for correct URLs and keys
cat .env
```

### TypeScript Errors

```bash
# Regenerate types from Supabase
supabase gen types typescript --project-id your-project-id > src/integrations/supabase/types.ts

# Check for type errors
npx tsc --noEmit
```

### Build Fails

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Rebuild
npm run build
```

### Map Not Rendering

- Check MapLibre GL JS is loaded
- Verify map container has height/width
- Check browser console for errors
- Test with default map style first

## Development Tools

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### Browser Extensions

- React Developer Tools
- Redux DevTools (if using Redux)
- Supabase Storage Inspector

### Debugging

#### React DevTools

1. Install React DevTools extension
2. Open DevTools
3. Select "Components" or "Profiler" tab
4. Inspect component props/state

#### Network Debugging

1. Open DevTools → Network tab
2. Filter by XHR/Fetch
3. Inspect Supabase API calls
4. Check request/response payloads

#### Console Logging

```typescript
// Use different log levels
console.log('Info:', data);
console.warn('Warning:', issue);
console.error('Error:', error);
console.table(arrayData); // For arrays/objects

// Remove in production
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}
```

## Performance Tips

### Code Splitting

```typescript
// Lazy load components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Use in component
<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### Memoization

```typescript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

### Image Optimization

```typescript
// Use WebP with fallback
<picture>
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="Description" />
</picture>

// Lazy load images
<img src="image.jpg" loading="lazy" alt="Description" />
```

## Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

## Getting Help

- 📧 Email: dev@lifelinkasia.org
- 💬 Discord: [Join community]
- 🐛 Issues: [GitHub Issues]
- 📖 Docs: [Full documentation]

---

**Last Updated**: January 2025  
**Maintainer**: @withkevinm
