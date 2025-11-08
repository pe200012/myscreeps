# Screeps TypeScript Starter

This is a starter project for building a Screeps AI using TypeScript and Bun.

## Prerequisites

- Bun (v1.0 or higher recommended)
  - Install from: https://bun.sh

## Getting Started

1. Install dependencies:
   ```bash
   bun install
   ```

2. Configure your Screeps credentials:
   - Edit `screeps.json` and add your authentication token
   - You can get your token from: https://screeps.com/a/#!/account/auth-tokens

3. Build your code:
   ```bash
   bun run build
   ```

4. Deploy to Screeps:
   ```bash
   bun run push        # Deploy to main branch
   bun run push-sim    # Deploy to simulation
   ```

## Development

- **Watch mode**: `bun run watch` - automatically rebuild on file changes
- **Lint**: `bun run lint` - check code quality
- **Format**: `bun run prettier` - format code
- **Test**: `bun test` - run unit tests

## Project Structure

```
src/
├── main.ts           # Main game loop
├── types.d.ts        # TypeScript type definitions
└── utils/
    └── ErrorMapper.ts # Source map support for debugging
```

## Adding New Roles

1. Create a new file in `src/roles/` (e.g., `builder.ts`)
2. Define your role logic
3. Import and use in `main.ts`

## Resources

- [Screeps Documentation](https://docs.screeps.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [@types/screeps on npm](https://www.npmjs.com/package/@types/screeps)
- [Bun Documentation](https://bun.sh/docs)

## Why Bun?

This project uses Bun instead of Node.js/npm for:
- ⚡ **Fast installs** - 10-100x faster than npm
- 🧪 **Built-in testing** - No need for Jest or other test frameworks
- 📦 **All-in-one** - Package manager, test runner, and bundler
- 🔥 **Fast execution** - Quick builds and test runs

## License

MIT
