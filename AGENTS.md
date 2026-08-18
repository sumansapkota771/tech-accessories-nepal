# Tech Accessories Nepal — OpenCode Project Instructions

## 1. Project Identity

This is the Tech Accessories Nepal web application.

The project is a production-oriented e-commerce frontend for technology products and accessories.

The goal is to provide a fast, modern, trustworthy and visually polished shopping experience.

Every change should improve the project without unnecessarily rewriting existing functionality.

---

# 2. Core Engineering Principles

Follow these principles for every task:

1. Inspect existing code before modifying it.
2. Understand the current architecture before introducing new patterns.
3. Reuse existing components whenever possible.
4. Do not duplicate functionality.
5. Do not rewrite working code without a clear reason.
6. Keep changes focused on the requested task.
7. Avoid unnecessary dependencies.
8. Preserve existing functionality unless explicitly asked to change it.
9. Prefer simple maintainable solutions over clever abstractions.
10. Never make unrelated changes.

---

# 3. Project Discovery

Before making significant changes:

- Inspect package.json.
- Inspect the project structure.
- Identify the framework and routing system.
- Identify the styling system.
- Identify the component library.
- Identify the state-management solution.
- Identify API/data-fetching patterns.
- Identify authentication patterns if present.
- Identify existing design tokens.
- Identify existing reusable UI components.

Do not assume a library is installed.

Check package.json before using a dependency.

---

# 4. Package Manager

Use the package manager already established by the project.

Priority:

1. pnpm if pnpm-lock.yaml exists.
2. npm if package-lock.json exists.
3. yarn if yarn.lock exists.
4. Otherwise inspect package.json and choose the least disruptive option.

Do not switch package managers.

Do not generate a new lockfile unnecessarily.

---

# 5. Next.js Rules

Treat the project as a production Next.js application.

Follow the existing Next.js architecture.

Before creating a new route:

- inspect existing routing structure
- check whether a similar route already exists
- reuse existing layouts when possible

Prefer Server Components by default when the existing architecture supports them.

Only use "use client" when client-side functionality is actually required.

Do not convert large sections of the application to Client Components unnecessarily.

Avoid unnecessary client-side JavaScript.

Use appropriate Next.js image handling for product images.

Preserve SEO metadata and structured metadata when present.

---

# 6. TypeScript

Use TypeScript strictly.

Rules:

- Do not introduce `any` unless absolutely unavoidable.
- Prefer explicit types for public interfaces.
- Reuse existing types.
- Avoid duplicate type definitions.
- Keep API response types consistent.
- Do not silence TypeScript errors with unnecessary casts.
- Do not use `@ts-ignore` unless there is a documented reason.

Before finishing significant work:

- run the project's typecheck command
- fix TypeScript errors introduced by the change

---

# 7. Component Architecture

Before creating a component:

1. Search for an existing component that already solves the problem.
2. Extend an existing component if appropriate.
3. Create a new component only when it represents a meaningful reusable unit.

Prefer components with a single clear responsibility.

Avoid giant components.

If a component becomes difficult to understand, extract logical subcomponents.

Do not create abstraction purely for abstraction's sake.

---

# 8. UI / UX Design Direction

The website should NOT look like a generic AI-generated website.

Design should feel like a professionally designed technology/e-commerce brand.

Prioritize:

- strong visual hierarchy
- excellent typography
- intentional spacing
- clear product hierarchy
- high-quality product imagery
- strong contrast
- consistent border radius
- subtle depth
- meaningful hover states
- polished micro-interactions
- responsive layouts
- accessibility

Avoid:

- excessive gradients
- excessive glassmorphism
- random floating shapes
- unnecessary glowing effects
- excessive rounded cards
- animations on every element
- meaningless decorative elements
- generic AI dashboard aesthetics
- excessive shadows
- visual clutter

Every visual effect should have a purpose.

---

# 9. E-Commerce UX

Product discovery and purchasing should always be the priority.

Optimize for:

- product visibility
- clear pricing
- discounts
- product availability
- product comparison
- search
- filtering
- sorting
- category navigation
- cart interactions
- checkout flow
- trust signals
- mobile usability

Product cards should clearly communicate:

- product image
- product name
- price
- previous price when applicable
- discount when applicable
- availability
- important product attributes
- primary action

Do not hide important purchasing information behind unnecessary interactions.

---

# 10. Responsive Design

Every UI change must work across:

- mobile
- tablet
- laptop
- desktop
- large desktop

Do not design desktop first and simply hope mobile works.

Pay particular attention to:

- navigation
- product grids
- product detail pages
- filters
- modals
- forms
- checkout
- buttons
- tables
- horizontal scrolling

Avoid accidental horizontal overflow.

---

# 11. Animation

Animations should improve perceived quality without harming usability or performance.

Use animation selectively.

Preferred characteristics:

- subtle
- fast
- intentional
- responsive
- interruptible
- accessible

Use existing animation libraries already installed in the project before adding another library.

If Framer Motion / Motion is already installed, prefer it for UI transitions.

For Three.js/WebGL:

- only use it where it creates meaningful visual value
- avoid using Three.js for simple UI effects
- avoid unnecessary GPU-heavy scenes
- respect reduced-motion preferences
- clean up animation loops and resources
- avoid blocking page rendering

Do not add Three.js merely because it looks impressive.

---

# 12. Performance

Performance is a first-class requirement.

Avoid:

- unnecessary re-renders
- huge client components
- unnecessary JavaScript
- large dependencies for small features
- unoptimized images
- expensive animations
- unnecessary API requests
- duplicate data fetching

For images:

- use appropriate image sizing
- avoid loading huge source images when unnecessary
- use lazy loading where appropriate

For animations:

- prefer transform and opacity
- avoid expensive layout-triggering animations
- avoid excessive blur/filter effects
- avoid continuous animation when it provides no value

---

# 13. Accessibility

All UI must remain accessible.

Consider:

- semantic HTML
- keyboard navigation
- focus states
- accessible labels
- button semantics
- form labels
- color contrast
- screen-reader-friendly content
- reduced motion

Do not use clickable divs when a button or link is appropriate.

Do not remove visible focus states without providing a replacement.

---

# 14. SEO

Preserve and improve SEO.

When modifying pages, check:

- page title
- description
- canonical URL where applicable
- Open Graph metadata
- structured data where applicable
- heading hierarchy
- image alt text
- semantic HTML
- internal linking

Do not accidentally remove existing metadata.

---

# 15. Data Fetching

Follow the existing data-fetching architecture.

Before adding a new request:

- search for existing API utilities
- search for existing query hooks
- search for existing fetch wrappers
- reuse existing authentication logic
- reuse existing error handling

Do not create duplicate API clients.

Do not hardcode API URLs if the project already has an environment/configuration system.

---

# 16. State Management

Before introducing new state:

1. Determine whether local component state is sufficient.
2. Check existing global state.
3. Check existing server-state/data-fetching patterns.
4. Reuse existing stores/hooks where appropriate.

Do not introduce Redux/Zustand/etc. for a problem that can be solved with local state.

Do not duplicate server state in multiple client stores unnecessarily.

---

# 17. Environment Variables and Secrets

Never expose secrets.

Do not read, modify, print or commit:

- `.env`
- `.env.local`
- production credentials
- API secrets
- database credentials
- private keys
- tokens

`.env.example` may be inspected when necessary.

Never put secrets directly into source code.

---

# 18. Dependency Management

Do not install dependencies automatically just because a library might be useful.

Before adding a dependency:

1. Check whether an existing dependency can solve the problem.
2. Check package.json.
3. Consider bundle size.
4. Consider maintenance.
5. Consider whether the feature actually requires the dependency.

Ask before adding major dependencies.

Avoid adding multiple libraries that solve the same problem.

---

# 19. File Cleanup

When asked to remove unused files:

DO NOT immediately delete files.

First:

1. Search imports.
2. Search route references.
3. Search dynamic references.
4. Search configuration references.
5. Search public asset references.
6. Check scripts and build configuration.
7. Check whether files are used by deployment tooling.
8. Check whether files are generated or required indirectly.

Then provide a list of files considered safe to remove.

Only delete files when there is strong evidence they are unused.

Never delete:

- environment files
- deployment configuration
- package manager lockfiles
- database migration files
- authentication configuration
- SEO configuration
- public assets with possible dynamic references

without verification.

---

# 20. Git Safety

Never run:

- git push
- git reset --hard
- git clean
- destructive branch operations

without explicit user approval.

Before significant changes:

- inspect git status
- inspect relevant git diff

Do not overwrite unrelated user changes.

If the working tree already contains changes:

- preserve them
- do not revert them
- do not assume they were created by the current task

---

# 21. Modification Strategy

For every task:

### Step 1 — Understand

Inspect only the relevant files first.

### Step 2 — Plan

Determine:

- what needs to change
- what can be reused
- what files are affected
- potential side effects

### Step 3 — Implement

Make the smallest clean change that solves the problem.

### Step 4 — Verify

Run the appropriate:

- typecheck
- lint
- tests
- build

### Step 5 — Review

Inspect the resulting diff.

Remove:

- unused imports
- unused variables
- temporary code
- debug logs
- unnecessary comments
- accidental changes

### Step 6 — Report

Tell the user:

- what changed
- files affected
- verification performed
- any remaining concerns

---

# 22. Verification

Do not claim a task is complete without verification when verification is reasonably possible.

For frontend changes, prefer:

1. typecheck
2. lint
3. relevant tests
4. production build when appropriate

If a command does not exist in package.json, do not invent it.

Inspect package.json first.

---

# 23. Error Handling

When encountering an error:

1. Read the complete error.
2. Identify the root cause.
3. Inspect relevant code/configuration.
4. Make the smallest appropriate fix.
5. Re-run the failing command.

Do not repeatedly make random changes.

Do not hide errors by disabling checks.

Do not downgrade dependencies simply to make an error disappear without understanding the compatibility issue.

---

# 24. Existing User Changes

The user's existing work is authoritative.

Never assume uncommitted code is incorrect.

Before changing a file with existing modifications:

- inspect the current diff
- understand what the user has changed
- preserve unrelated modifications

Never use destructive commands to "clean up" the working tree.

---

# 25. AI Behavior

Act as a senior software engineer and product-minded frontend developer.

Do not:

- over-engineer
- rewrite unnecessarily
- create files without reason
- install dependencies unnecessarily
- make unrelated improvements
- invent APIs
- invent backend behavior
- invent database fields
- pretend something was tested when it was not

Do:

- inspect first
- reason about existing architecture
- reuse existing code
- make focused changes
- verify changes
- prioritize maintainability
- prioritize performance
- prioritize UX

---

# 26. Frontend Quality Standard

Before considering a UI task complete, evaluate:

- Is the hierarchy clear?
- Does the layout feel intentional?
- Does it work on mobile?
- Are interactions obvious?
- Are hover/focus states polished?
- Are animations subtle and useful?
- Is the UI accessible?
- Is the page performant?
- Does it look consistent with the rest of the website?
- Does it feel like a real technology/e-commerce product rather than an AI-generated template?

If the answer is no, improve it before finishing.

---

# 27. Final Rule

When uncertain:

DO NOT guess.

Inspect the repository, existing implementation, package.json, configuration and related components first.

Preserve existing behavior unless the user explicitly asks for a change.

Quality and correctness are more important than making the largest possible change.