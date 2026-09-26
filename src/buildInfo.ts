// What this build is: its version, and whether it has the review pages.
// The Building blocks page is for reviewing the app's parts and for the
// automated browser tests. It is left out of the real site: only a build
// made with VITE_REVIEW_PAGES=1 (as the browser tests' build is) has it.
// When the value is not set, the build tool drops the page's code entirely.
export const reviewPages = import.meta.env.VITE_REVIEW_PAGES === '1';

/** This version of the app, from package.json. */
export const appVersion: string = __APP_VERSION__;
