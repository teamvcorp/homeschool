# Production setup — first administrator, and the database guard

Everything here is deliberately manual. There is no "create the first admin" web page, and
there is not going to be one: an endpoint that mints an administrator is a backdoor that
someone eventually forgets to remove, and it is trivially findable. Creating the first
account requires shell access to the machine that holds the database credentials, which is
the correct bar.

---

## The database guard, and why the extra flag exists

`lib/env.ts` resolves the database name, and it refuses two things outright:

| Situation | Result |
|---|---|
| `NODE_ENV` is not `production` and the database is `va_school` | **Refused**, unless `ALLOW_PRODUCTION_DB=1` |
| `NODE_ENV` is `production` and the name looks like a test database (`test`, `dev`, `staging`, `sandbox`, `scratch`, `tmp`) | **Refused**, always |

`MONGODB_DB` in `.env.local` is `va_school_test`, so **everything you run locally hits the
test database by default** — including the e2e harnesses, the fixture seeder, and
`db:reset-test`. That default is the safety net. `ALLOW_PRODUCTION_DB=1` is how you step
over it on purpose, for one command, and it is required precisely because reaching
production from a developer laptop should be an explicit act rather than a forgotten
environment variable.

Verified behaviour (probe run 2026-08-06):

```
default                                 -> va_school_test
MONGODB_DB=va_school                    -> REFUSING to use the production database
                                           "va_school" with NODE_ENV=development.
MONGODB_DB=va_school ALLOW_PRODUCTION_DB=1 -> va_school
```

---

## Creating the first administrator in production

Run this **once**, from a shell that has the production `MONGODB_URI`:

```bash
MONGODB_DB=va_school ALLOW_PRODUCTION_DB=1 \
  npm run seed:admin -- --email you@thevacorp.com --name "Robert Von Der Becke"
```

What it does:

1. Creates the indexes if they are missing (the unique email index is what makes the
   duplicate check race-proof rather than advisory).
2. Refuses if a user with that email already exists — it will not overwrite an account.
3. **Generates the password itself and prints it once.** It is not accepted as an argument
   on purpose: a password passed on the command line lands in your shell history and in the
   process list, where other users on the machine can read it.
4. Stores only an Argon2id hash. The printed password is not recoverable.

Then:

- **Save the password to a password manager before closing the terminal.**
- Sign in at `/login` and change it.
- Clear the line from your shell history if your shell keeps one.

Additional administrators are created the same way — there is no invite flow.

> **On a real production host** (where `NODE_ENV=production` is already set), drop both
> variables — `npm run seed:admin -- --email … --name "…"` is enough, because production is
> already the default there and the guard is not in the way.

---

## Checklist before the first real family uses the site

- [ ] Production admin created, password changed from the generated one
- [ ] The seeded development admin (`admin@test.local`) and the harness admin
      (`e2e-admin@test.local`) exist **only** in `va_school_test` — confirm neither is in
      `va_school`
- [ ] Atlas Network Access restricted to the deployment's addresses, not `0.0.0.0/0`
- [ ] `ANTHROPIC_API_KEY` set (the language lens degrades to browser-only translation
      without it — it does not break)
- [ ] `es.ts` and `lo.ts` reviewed by native speakers — **currently outstanding**, and the
      Lao especially cannot be self-verified

---

## Things that must never be run against production

- `npm run db:reset-test` — it has three independent gates and will refuse, but do not test
  that. A destructive test helper on this project was once run against the live database and
  permanently destroyed a family's enrollment application.
- `npm run seed:test-fixtures` — writes fixture applications and a fixture parent account.
- Any harness in `scripts/e2e/` — every one of them refuses a non-localhost base URL, and
  they all write data.
