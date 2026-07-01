# Contributing to `@coherence/workstation-sdk` (TypeScript)

Thanks for your interest in contributing to the Coherence Workstation plugin SDK
(TypeScript). This document explains how to set up the package, the sign-off we
require on every commit, and what we expect before a pull request is merged.

## Development setup

This package lives in the `packages/cw-workstation-sdk-ts/` directory of the
[`peak-mind-llc/coherence-workstation`](https://github.com/peak-mind-llc/coherence-workstation)
monorepo and is developed from the repository root.

```bash
# From the repository root
npm install

# From this package directory
cd packages/cw-workstation-sdk-ts

npm test          # run the vitest suite
npm run typecheck # tsc --noEmit
npm run docs:api  # generate the typedoc API reference
```

The SDK targets React 18 and ships TypeScript sources directly; please keep new
code typed and avoid introducing runtime dependencies that the workstation host
does not already provide.

## Developer Certificate of Origin (DCO)

This project uses the [Developer Certificate of Origin](https://developercertificate.org/)
instead of a Contributor License Agreement. There is no CLA to sign and no bot
to interact with — you simply certify the DCO on each commit.

Every commit must carry a `Signed-off-by` trailer. Add it automatically with the
`-s` flag:

```bash
git commit -s -m "Your commit message"
```

This appends a line like:

```
Signed-off-by: Your Name <you@example.com>
```

By signing off you assert that you wrote the change (or otherwise have the right
to submit it under the project's open-source license), per the DCO text linked
above. The name and email must be real and match your git identity. Commits
without a valid sign-off cannot be merged.

## Pull request checklist

Before opening a PR, please confirm:

- [ ] Tests pass (`npm test`).
- [ ] Types check cleanly (`npm run typecheck`).
- [ ] Lint is clean (the repository runs `ruff`/`eslint`-equivalent checks in CI; match the existing code style).
- [ ] New or changed behavior is covered by a test.
- [ ] Every commit is signed off (`git commit -s`).
- [ ] The PR targets the `dev` branch (the monorepo's integration branch).

## CI expectations

Continuous integration runs the test suite, the type check, and lint/format
checks on every pull request. PRs must be green before review and merge. The DCO
sign-off is verified as part of the review.

## License

By contributing, you agree that your contributions are licensed under the
[Apache License 2.0](./LICENSE) that governs this package.
