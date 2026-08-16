# Lab 1 - Test Plan and Evidence

Automated tests are stored under:

- `server/tests/lab-01/`
- `client/tests/lab-01/`

## Test Cases

| Test ID | Test File | Tool | Test Description | Result |
|---|---|---|---|---|
| API-01 | `server/tests/lab-01/health.test.ts` | Supertest | `GET /api/health` returns HTTP 200 with the expected JSON | Pass |
| API-02 | `server/tests/lab-01/categories.test.ts` | Supertest | `GET /api/categories` returns four seeded categories in ID order | Pass |
| UI-01 | `client/tests/lab-01/App.test.tsx` | Vitest | The TokTickIT heading renders | Pass |
| UI-02 | `client/tests/lab-01/App.test.tsx` | Vitest | A successful API result displays Online and all four categories | Pass |
| UI-03 | `client/tests/lab-01/App.test.tsx` | Vitest | An API failure displays Offline and a useful error message | Pass |

## Test Commands

### Server Tests

Run from the `server` directory:

```powershell
npm.cmd test
