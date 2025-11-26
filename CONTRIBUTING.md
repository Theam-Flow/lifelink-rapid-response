# Contributing to LifeLink Asia

Thank you for your interest in contributing to LifeLink Asia! This project saves lives during emergencies, and every contribution matters.

## 🌟 Ways to Contribute

### Code Contributions
- Fix bugs
- Implement new features
- Improve performance
- Add translations
- Write tests
- Improve documentation

### Non-Code Contributions
- Report bugs
- Suggest features
- Improve documentation
- Translate the app
- Share the project
- Provide feedback

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Basic knowledge of React, TypeScript, and Tailwind CSS
- (Optional) Supabase account for testing backend features

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/yourusername/lifelink-asia.git
cd lifelink-asia

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 📝 Development Workflow

### 1. Find an Issue

- Check the [Issues](https://github.com/yourusername/lifelink-asia/issues) page
- Look for issues tagged `good first issue` or `help wanted`
- Comment on the issue to let others know you're working on it

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Make Your Changes

- Follow the coding standards (see below)
- Write clear, concise commit messages
- Test your changes thoroughly
- Update documentation if needed

### 4. Test Your Changes

```bash
# Run type checking
npm run build

# Test in different browsers
# Test on mobile devices
```

### 5. Submit a Pull Request

- Push your branch to GitHub
- Create a pull request with a clear description
- Link related issues
- Wait for review

## 🎨 Coding Standards

### TypeScript

```typescript
// ✅ Good
interface SOSSignal {
  id: string;
  severity_level: number;
  type: EmergencyType;
}

// ❌ Avoid
const data: any = {};
```

### React Components

```typescript
// ✅ Good - Functional components with TypeScript
export const MapView: React.FC<MapViewProps> = ({ signals }) => {
  // ...
};

// ❌ Avoid - Class components (unless necessary)
```

### Design System

```typescript
// ✅ Good - Use design tokens
<Button variant="destructive" size="lg">
  SOS
</Button>

// ❌ Avoid - Custom styles
<button className="bg-red-500 text-white px-4 py-2">
  SOS
</button>
```

### Naming Conventions

- **Components**: PascalCase (`MapView.tsx`)
- **Hooks**: camelCase with "use" prefix (`useGeolocation.ts`)
- **Utilities**: camelCase (`sanitizeInput.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)

## 🌍 Translations

We welcome translations! The app currently supports:

- English (en)
- Thai (th)
- Vietnamese (vi)
- Malay (ms)
- Indonesian (id)

To add a new language:

1. Copy `src/lib/i18n/en.json` to `src/lib/i18n/your-language.json`
2. Translate all strings
3. Update `src/lib/i18n.ts` to include your language
4. Test the translation in the app

## 🐛 Reporting Bugs

### Before Reporting

- Check if the bug has already been reported
- Verify it's actually a bug and not a feature
- Test in multiple browsers if possible

### Bug Report Template

```markdown
**Description**
A clear description of what the bug is.

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment**
- Device: [e.g. iPhone 12]
- OS: [e.g. iOS 14.4]
- Browser: [e.g. Safari 14]
- Version: [e.g. 1.0.0]
```

## 💡 Suggesting Features

We love new ideas! Please:

1. Check if the feature has already been suggested
2. Explain the problem it solves
3. Describe your proposed solution
4. Consider alternative solutions
5. Provide mockups if possible

## 🔒 Security Issues

**DO NOT** report security vulnerabilities as public issues!

Email security@lifelinkasia.org instead. See [SECURITY.md](./SECURITY.md) for details.

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for everyone.

### Our Standards

✅ **Do**:
- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy towards others

❌ **Don't**:
- Use sexualized language or imagery
- Make personal attacks
- Harass or troll others
- Publish private information

### Enforcement

Violations may result in temporary or permanent ban from the project.

## 🎖️ Recognition

Contributors will be:

- Listed in README.md
- Mentioned in release notes
- Invited to special contributor events
- Given priority support

## 📞 Questions?

- **General Questions**: Open a [Discussion](https://github.com/yourusername/lifelink-asia/discussions)
- **Technical Help**: Ask in [Issues](https://github.com/yourusername/lifelink-asia/issues)
- **Email**: contribute@lifelinkasia.org

## 📚 Resources

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js-docs/)

---

**Thank you for contributing to LifeLink Asia and helping save lives!**

Created with ❤️ by @withkevinm
