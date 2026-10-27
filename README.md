# hassan47khan.github.io

My personal site: who I am, three projects (Trimly, SubTrak, a movie recommender), my record and how to reach me. Live at <https://hassan47khan.github.io/>.

## Stack

Vite + TypeScript, no framework. One HTML page (`index.html`), one stylesheet (`src/style.css`) and one script (`src/main.ts`). The page is fully readable without JavaScript; the script adds the entrances, the pinned project stage, the Trimly replay and video, and the contact form.

## Commands

Requires Node 22 or newer.

```bash
npm install
npm run dev        # local dev server with hot reload
npm run typecheck  # tsc --noEmit (strict, noUncheckedIndexedAccess)
npm run build      # production build into dist/
npm run preview    # serve dist/ at http://localhost:4173
npm run test:a11y  # Playwright + axe-core against the preview build (needs `npx playwright install chromium` once)
```

Images, the video and the favicon live in `assets/` and are referenced with relative paths; Vite fingerprints them at build time. `public/assets/og.jpg` is copied as is so the social preview URL stays stable.

## Deploys

Every push to `main` runs `.github/workflows/deploy.yml`: `npm ci`, typecheck, build, then publish `dist/` to GitHub Pages. Pull requests run `.github/workflows/checks.yml`: build, Lighthouse CI (scores only warn for now) and the axe accessibility suite, which fails the check on any violation.

## Reduced motion

`prefers-reduced-motion: reduce` is handled in two places:

- **CSS** turns off animations and near-zeroes transitions, shows entrance content immediately, and stops the wordmark scaling.
- **TypeScript** reads the preference once at start-up and then skips the IntersectionObserver entrances, the scroll-linked wordmark transforms and the staggered chat replay, uses instant instead of smooth scrolling for the work index, and does not autoplay the Trimly ad (the Play button still starts it).
