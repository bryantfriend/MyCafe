# MyCafe Platform Readiness

## Firebase

- `firebase.json` defines Hosting, Firestore rules/indexes, Storage rules, and Functions.
- `firestore.rules` keeps cafe data public-readable, restricts owner/admin changes, and limits user-created reviews and analytics events.
- `storage.rules` allows public reads and limits uploads to authenticated image files under 5 MB.
- `firestore.indexes.json` covers the main owner, review, analytics, cafe slug, and Circle host/date queries.

## Trusted Writes

Cloud Functions live in `firebase/functions`.

- `recordAnalyticsEvent`
- `submitReview`
- `reserveCircleSeat`
- `syncLoyaltyEvents`
- `recalculateCafeAnalytics`
- `optimizeUploadedImage`

Client wrappers live in `packages/firebase/trustedWrites.js` so pages can move from direct writes to callable trusted writes incrementally.

## PWA And Offline

- `manifest.json` enables install metadata and shortcuts.
- `service-worker.js` precaches the shell and local Mano menu JSON.
- Menu JSON requests use network-first caching, so a QR menu can reopen offline after one successful load.

## Quality Gates

- `npm run check` syntax-checks JavaScript files.
- `npm test` runs domain tests.
- `npm run build` runs both.
- `.github/workflows/checks.yml` runs CI on push and pull request.
- `npm run optimize:images` reports oversized image assets before production deploy.

## Deploy

- `npm run deploy` deploys Hosting, Firestore, Storage, and Functions through Firebase CLI.
- `npm run deploy:hosting` deploys only static Hosting.
- `npm run deploy:rules` deploys only Firestore and Storage rules.
