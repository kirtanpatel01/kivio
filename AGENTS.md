<!-- intent-skills:start -->
## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before planning or editing files for any substantial task or major feature:
- Run `pnpm exec intent list` from the workspace root to discover available local skills.
- If a listed skill matches the task, run `pnpm exec intent load <package>#<skill>` before writing plans or changing code.
- Explicitly align your implementation plan with the instructions, architectural standards, and anti-patterns documented in the loaded `SKILL.md`.
- Use the loaded `SKILL.md` guidance while making changes.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Feature Implementation & Planning Guidelines

Before implementing any major feature, architectural refactor, or substantial UX change:
1. **Discover & Load Intent Skills**: Always run `pnpm exec intent list` and load the applicable skills (`pnpm exec intent load <package>#<skill>`) to review the library's authoritative recommendations.
2. **Align the Plan**: Formulate your implementation plan (`/plan`) strictly following the loaded Intent guidance (e.g., query caching rules, router preload settings, loader lifecycle patterns, and state decoupling).
3. **Execute & Verify**: Implement the changes adhering to the design patterns and verify with type-checking (`pnpm exec tsc --noEmit`) and production builds (`pnpm run build`).

