## What this changes

<!-- One or two sentences. Link the issue if there is one (Fixes #123). -->

## Why

<!-- The user-visible motivation. What was broken / missing. -->

## How

<!-- High-level approach. Mention any new files, new dependencies, schema
changes, or new env vars. -->

## Testing

<!-- How you verified this works. Manual steps are fine for UI changes. -->

## Checklist

- [ ] `npm run build` passes locally.
- [ ] No deployment-specific brand, account, or provider secrets are committed.
- [ ] If this changes the schema: I tested migrations on a throwaway project.
- [ ] If this changes an API adapter: I redeployed and curl-tested the affected endpoints.
- [ ] No new dependencies, or the PR description justifies them.
