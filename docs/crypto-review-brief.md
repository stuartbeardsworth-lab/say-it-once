# Request for a cryptography review: Say It Once

This is a short brief for you (the owner) to send to possible reviewers.
Edit the parts in brackets.

---

**What we'd like reviewed:** the client-side encryption of Say It Once, a
record-keeping web app for people in the UK recovering from serious injury
or illness. The data is health and financial information about vulnerable
people. Optional sync will store only ciphertext on our server.

**Size:** about 800 lines of TypeScript (much of it comments) using libsodium (XChaCha20-Poly1305,
secretstream, Argon2id, BLAKE2b) and WebCrypto AES-GCM for one
non-extractable device key. There is a design document and tests with test
vectors. The server and sync protocol are not in this review. One part is
already in use: password-locked backup files (`src/crypto/backup.ts`, an
Argon2id key and secretstream over the backup zip, with the readable header
as associated data), so please look at that first.

**What's attached:**

- `docs/crypto-review.md`: the design, formats, test vectors, known limits,
  and ten specific questions.
- The code (`src/crypto/`) and tests, in [a private repository we'll give you
  access to / a zip].

**What we'd like back:** a written report of findings ranked by severity,
answers to the questions in section 8, and a short re-check once we've fixed
anything serious.

**Timing:** [when you'd like it by]. **Budget:** [your budget, or ask for a
quote].

**Contact:** [how to reach you].

---

Where to look for reviewers (for you, not to send): independent applied
cryptographers, or security consultancies that do cryptography reviews.
Ask for someone who has reviewed libsodium-based designs and web or mobile
apps. It helps to ask for a fixed-price quote for the scope above.
