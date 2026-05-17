```markdown
# firecrawl Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and workflows found in the `firecrawl` TypeScript codebase. It covers file and code conventions, commit practices, and the unique "full-feature-revert-workflow" for safely managing large or breaking changes. Whether contributing new features or maintaining stability, these patterns ensure consistency and reliability across the project.

## Coding Conventions

### File Naming
- **PascalCase** is used for file names.
  - Example: `MyController.ts`, `UserService.ts`

### Import Style
- **Relative imports** are preferred.
  - Example:
    ```typescript
    import { UserController } from '../controllers/UserController';
    ```

### Export Style
- **Named exports** are used throughout the codebase.
  - Example:
    ```typescript
    export function fetchData() { ... }
    export const API_VERSION = 'v1';
    ```

### Commit Patterns
- **Type:** Mixed, with a preference for feature commits.
- **Prefix:** Commits often start with `feat`.
  - Example: `feat: add user authentication middleware`
- **Length:** Average commit message is about 74 characters.

## Workflows

### Full Feature Revert Workflow
**Trigger:** When a major feature is merged and then needs to be rolled back (e.g., after an issue is found in production or CI).
**Command:** `/revert-feature`

1. **Implement the Feature**
   - Develop a large feature or breaking change, potentially affecting:
     - Controllers (`apps/api/src/controllers/**/*.ts`)
     - Tests (`apps/api/src/__tests__/**/*.ts`)
     - Routes (`apps/api/src/routes/**/*.ts`)
     - Documentation (`README.md`, `.kilo/plans/*.md`, `MIGRATION.md`)
     - Generated files (`graphify-out/**/*`)
2. **Commit the Feature**
   - Use a descriptive commit message, e.g., `feat: add advanced search capability`.
3. **Revert the Feature**
   - If an issue is detected (in CI, production, etc.), immediately create a revert commit.
   - The revert should touch the exact same set of files, restoring them to their previous state.
   - Example revert commit message: `revert: rollback advanced search capability due to production issue`

**Frequency:** Approximately once per month.

**Example Command Usage:**
```bash
/revert-feature
```

## Testing Patterns

- **Test Framework:** Unknown (not detected).
- **Test File Pattern:** Test files are named with the pattern `*.test.*`.
  - Example: `UserController.test.ts`
- **Test Location:** Tests are typically placed in `apps/api/src/__tests__/`.
- **Style:** Follow the same import/export conventions as the main codebase.

## Commands

| Command         | Purpose                                                      |
|-----------------|--------------------------------------------------------------|
| /revert-feature | Revert a recently merged large feature or breaking change.   |
```
