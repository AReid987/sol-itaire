```markdown
# sol-itaire Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the development conventions and workflows used in the `sol-itaire` JavaScript codebase. The repository implements solitaire logic with a focus on maintainable code, clear commit messages, and consistent file organization. No framework is used, and testing patterns are present but framework-agnostic.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `cardDeck.js`, `gameLogic.js`

### Import Style
- Use **relative imports** for all modules.
  - Example:
    ```javascript
    import { shuffleDeck } from './utils.js';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```javascript
    // utils.js
    export function shuffleDeck(deck) { ... }
    ```

    ```javascript
    import { shuffleDeck } from './utils.js';
    ```

### Commit Messages
- Follow **Conventional Commits** with the following prefixes:
  - `feat`: For new features
  - `fix`: For bug fixes
- Keep commit messages concise (average ~63 characters).
  - Example:
    ```
    feat: add undo functionality to game state
    fix: correct card movement logic for tableau piles
    ```

## Workflows

### Feature Development
**Trigger:** When adding a new feature  
**Command:** `/feature`

1. Create a new branch for the feature.
2. Implement the feature using camelCase file naming and named exports.
3. Write or update tests in files matching `*.test.*`.
4. Commit changes using the `feat:` prefix.
5. Open a pull request for review.

### Bug Fixing
**Trigger:** When fixing a bug  
**Command:** `/fix`

1. Create a new branch for the bug fix.
2. Make the necessary code changes.
3. Update or add tests to cover the bug.
4. Commit changes using the `fix:` prefix.
5. Open a pull request for review.

### Testing
**Trigger:** Before merging any changes  
**Command:** `/test`

1. Run all test files matching the `*.test.*` pattern.
2. Ensure all tests pass.
3. Address any failing tests before merging.

## Testing Patterns

- Test files are named using the pattern `*.test.*` (e.g., `gameLogic.test.js`).
- The testing framework is not specified; use your preferred runner to execute these files.
- Tests should cover new features and bug fixes.

  Example test file:
  ```javascript
  // gameLogic.test.js
  import { shuffleDeck } from './utils.js';

  test('shuffleDeck returns a deck with the same cards', () => {
    // ...test implementation
  });
  ```

## Commands
| Command    | Purpose                                   |
|------------|-------------------------------------------|
| /feature   | Start a new feature development workflow  |
| /fix       | Start a bug fixing workflow               |
| /test      | Run all test files                        |
```
