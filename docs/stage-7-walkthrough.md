# Stage 7 walkthrough: the encryption module

Nothing changes for testers or in the live app: the encryption is built and
tested, and waits for sync (Stages 8 and 9). The automated checks are
`src/crypto/crypto.test.ts` (25 tests, including fixed test vectors and a
published test vector for the cipher) and `e2e/stage7.spec.ts`.

## On the Deploy Preview

1. [ ] The footer now has **Building blocks (for review)** again. That's
   expected: previews include the review page; the live site doesn't.
2. [ ] Open **Building blocks**, find **How fast is this phone?** and press
   **Run the check**. It says how long unlocking took and "Encryption on this
   device: works".
3. [ ] Run it on your iPhone, and on the **oldest phone** you or a tester
   can borrow. Write down each phone and the time below. It should be under
   two seconds; if an old phone takes much longer, tell me and I'll adjust
   the settings.

| Phone (model, year) | Time |
| --- | --- |
| | |
| | |

4. [ ] The live site (https://say-it-once-home.netlify.app) still has no
   Building blocks link.

## The review

5. [ ] Read `docs/crypto-review-brief.md`, fill in the parts in brackets,
   and send it with `docs/crypto-review.md` to one or more reviewers.
6. [ ] Note who you've asked, and when:

## Result

- Passed / failed:
- Anything to change:
- Date:
