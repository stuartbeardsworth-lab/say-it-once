# Stage 8a walkthrough: the server's code and tests

There's nothing to click yet. The server isn't live, and the app doesn't use
it until Stage 9. These checks are about trusting what's been built.

1. [ ] On the pull request, the checks include **Server typecheck and tests
   (PostgreSQL)**, and it's green. It runs 24 tests against a real database,
   covering:
   - signing in;
   - codes used once, five tries, and limits;
   - cookies that other websites can't use;
   - signing out a lost phone;
   - two devices unable to overwrite each other;
   - retried requests not applied twice;
   - each account seeing only its own data;
   - files in pieces;
   - deleting a record, and deleting an account leaving nothing behind.
2. [ ] Read **What the server can and can't see** at the top of
   `docs/server.md`. It should match what you'd tell a tester or put in a
   privacy notice. Tell me if anything surprises you.
3. [ ] The app on the preview works exactly as before. Nothing in it has
   changed.

## Before Stage 8b

These are for you, when you're ready. I'll give step-by-step instructions for
each.

- Buy the web address (for example `sayitonce.co.uk`, about £10 a year).
- Open a Hetzner Cloud account (a small server is a few pounds a month).
- Open an account with an EU email provider (I'll suggest one).

## Result

- Passed / failed:
- Anything to change:
- Date:
