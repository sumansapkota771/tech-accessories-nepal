# Skills Reference

## Installed Skills

### impeccable (Design Intelligence)
- **Source**: `pbakaus/impeccable`
- **Purpose**: Design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract frontend interfaces. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, empty states.
- **Commands**: craft, shape, init, document, extract, critique, audit, polish, bolder, quieter, distill, harden, onboard, animate, colorize, typeset, layout, delight, overdrive, clarify, adapt, optimize, live
- **Location**: `~/.agents/skills/impeccable/`

### ui-ux-pro-max (UI/UX Design Intelligence)
- **Source**: `nextlevelbuilder/ui-ux-pro-max-skill`
- **Purpose**: Searchable database of UI styles, color palettes, font pairings, chart types, product recommendations, UX guidelines, and stack-specific best practices. 50 styles, 21 palettes, 50 font pairings, 20 charts, 8 stacks.
- **Stacks**: React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind
- **Location**: `~/.agents/skills/ui-ux-pro-max/`

### frontend-design (Design Principles)
- **Source**: `anthropics/skills`
- **Purpose**: Guidance for distinctive, intentional visual design. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults.
- **Location**: `~/.agents/skills/frontend-design/`

### opencode-delegate (Task Delegation)
- **Source**: `amelnagdy/delegate-skills`
- **Purpose**: Delegate coding tasks to OpenCode CLI as a background implementer, then review its diff and land it yourself.
- **Location**: `~/.agents/skills/opencode-delegate/`

### cross-border-ecommerce (International Expansion)
- **Source**: `nexscope-ai/ecommerce-skills`
- **Purpose**: Cross-border e-commerce expansion advisor. Scores target markets, compares fulfillment models, provides tax/duty compliance guides, maps payment preferences, builds phased expansion roadmaps.
- **Location**: `~/.agents/skills/cross-border-ecommerce/`

## Key Design Principles (from skills)

### Craft Floor (impeccable)
- Body text contrast >= 4.5:1, large text >= 3:1
- Shadows carry offset and soft blur
- Body measure 65-75ch, display max 6rem
- One authored motion moment, not scattered effects
- Theme browser surfaces (selection, caret, scrollbars, focus rings)
- Controls name their action; errors name the problem and recovery

### UI/UX Rules (ui-ux-pro-max)
- No emoji icons - use SVG icons (Lucide, Heroicons)
- Add `cursor-pointer` to all clickable elements
- Smooth transitions with `transition-colors duration-200`
- Consistent icon sizing (24x24 viewBox, w-6 h-6)
- Light mode: bg-white/80+ opacity for glass, #0F172A for body text
- Floating navbar with `top-4 left-4 right-4` spacing

### Design Principles (frontend-design)
- The hero is a thesis - open with the most characteristic thing
- Typography carries personality - pair display and body faces deliberately
- Structure is information - not decoration
- Leverage motion deliberately
- Match complexity to the vision
- Write from the end user's side of the screen
