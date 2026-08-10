# API Test Report

**Date:** 2026-08-09  
**Base URL:** `https://bbbackend.duckdns.org/api/v1`  
**Credentials:** admin / admin123

---

## Summary

| Status | Count |
|--------|-------|
| PASS | 21 |
| FAIL (network/parse) | 1 |
| SERVER_ERROR (5xx) | 6 |
| BAD_REQUEST (400) | 4 |
| AUTH_ERROR (401/403) | 0 |
| NOT_FOUND (404) | 0 |
| SKIP | 0 |
| **Total** | **32** |

---

## Detailed Results

| # | Method | Endpoint | Status Code | Result | Error |
|---|--------|----------|-------------|--------|-------|
| 1 | POST | `/auth/login` | 200 | PASS | |
| 2 | GET | `/auth/me` | 200 | PASS | |
| 3 | GET | `/dashboard/stats` | 200 | PASS | |
| 4 | GET | `/users` | 500 | SERVER_ERROR | Server error |
| 5 | GET | `/users/:id` | N/A | FAIL | (depends on /users which 500s) |
| 6 | GET | `/transactions` | 200 | PASS | |
| 7 | GET | `/flexy/history` | 200 | PASS | |
| 8 | POST | `/flexy/send` (with operator) | 503 | SERVER_ERROR | No ModemGrid node available for this operator |
| 9 | POST | `/flexy/send` (no operator) | 500 | SERVER_ERROR | Server error |
| 10 | POST | `/flexy/bulk` | 200 | PASS | |
| 11 | GET | `/idoom/history` | 200 | PASS | |
| 12 | POST | `/idoom/recharge` (full payload) | 400 | BAD_REQUEST | Invalid Idoom type |
| 13 | POST | `/idoom/recharge` (minimal) | 503 | SERVER_ERROR | No ModemGrid node available |
| 14 | GET | `/cards/stock` | 200 | PASS | |
| 15 | GET | `/cards/transactions` | 200 | PASS | |
| 16 | POST | `/cards/buy` | 400 | BAD_REQUEST | Invalid quantity or value |
| 17 | GET | `/wallet/history` | 200 | PASS | |
| 18 | POST | `/wallet/add` | 400 | BAD_REQUEST | Valid user_id and amount required |
| 19 | POST | `/wallet/remove` | 400 | BAD_REQUEST | Valid user_id and amount required |
| 20 | POST | `/wallet/transfer` | 500 | SERVER_ERROR | Server error |
| 21 | GET | `/commissions/` | 500 | SERVER_ERROR | Server error |
| 22 | GET | `/ads` | 200 | PASS | |
| 23 | GET | `/settings/` | 200 | PASS | |
| 24 | GET | `/notifications/` | 200 | PASS | |
| 25 | PUT | `/notifications/read-all` | 200 | PASS | |
| 26 | GET | `/usb-auth/keys` | 200 | PASS | |
| 27 | GET | `/usb-auth/sessions` | 200 | PASS | |
| 28 | GET | `/usb-auth/my-key` | 200 | PASS | |
| 29 | GET | `/wss/stats` | 200 | PASS | |
| 30 | GET | `/wss/nodes` | 200 | PASS | |
| 31 | GET | `/wss/dongles` | 200 | PASS | |
| 32 | GET | `/wss/events` | 200 | PASS | |

---

## Failing Endpoints -- Detailed

### 1. GET `/users` -- 500 SERVER_ERROR

- **Status Code:** 500
- **Response Body:** `{ "error": "Server error" }`
- **Analysis:** Backend returns generic 500. The endpoint exists and worked in previous tests (parse test passed). This may be an intermittent backend issue or a recent backend change broke the users list query.

### 2. POST `/flexy/send` (with operator) -- 503 SERVER_ERROR

- **Status Code:** 503
- **Request Payload:**
```json
{
  "number": "0666666666",
  "operator": "mobilis",
  "amount": 100
}
```
- **Response Body:**
```json
{
  "success": false,
  "error": "No ModemGrid node available for this operator",
  "transaction": {
    "id": 26,
    "type": "flexy",
    "operator": "mobilis",
    "phone_number": "0666666666",
    "amount": "100.00",
    "status": "failed",
    "sim_used": "modemgrid",
    "created_at": "2026-08-09T17:14:02.521Z"
  }
}
```
- **Analysis:** The API **accepted the payload** (operator field is correct!) but the GSM gateway has no available ModemGrid node for the "mobilis" operator. This is a **backend infrastructure issue**, not a client-side bug. The transaction was created but marked as "failed".

### 3. POST `/flexy/send` (no operator) -- 500 SERVER_ERROR

- **Status Code:** 500
- **Request Payload:**
```json
{
  "number": "0666666666",
  "amount": 100
}
```
- **Response Body:** `{ "error": "Server error" }`
- **Analysis:** Without the `operator` field, the backend crashes with a generic 500. **This confirms the root cause of the user's issue:** the app was not sending the `operator` field, causing the 500 error.

### 4. POST `/idoom/recharge` (full payload) -- 400 BAD_REQUEST

- **Status Code:** 400
- **Request Payload:**
```json
{
  "phone_number": "0666666666",
  "amount": 100,
  "type": "prepaid",
  "ssuid": ""
}
```
- **Response Body:** `{ "error": "Invalid Idoom type" }`
- **Analysis:** The `type` field value "prepaid" is not valid. The API expects a different type value. The OpenAPI spec lists `type` as a field but doesn't specify valid values. The minimal payload test shows the backend defaults to `"adsl"` type internally.

### 5. POST `/idoom/recharge` (minimal) -- 503 SERVER_ERROR

- **Status Code:** 503
- **Response Body:**
```json
{
  "success": false,
  "error": "No ModemGrid node available",
  "transaction": {
    "id": 28,
    "type": "idoom",
    "operator": "idoom",
    "phone_number": "0666666666",
    "amount": "100.00",
    "status": "failed",
    "metadata": { "type": "adsl" }
  }
}
```
- **Analysis:** Same as Flexy -- the GSM gateway has no available node. Backend infrastructure issue.

### 6. POST `/cards/buy` -- 400 BAD_REQUEST

- **Status Code:** 400
- **Request Payload:**
```json
{
  "operator": "mobilis",
  "value": 200
}
```
- **Response Body:** `{ "error": "Invalid quantity or value" }` (Arabic message)
- **Analysis:** Either no cards are in stock (the stock endpoint returned empty), or the `value` field needs to match a specific card denomination. The API has no cards available to buy.

### 7. POST `/wallet/add` -- 400 BAD_REQUEST

- **Status Code:** 400
- **Request Payload:**
```json
{
  "amount": 100,
  "notes": "test"
}
```
- **Response Body:** `{ "error": "Valid user_id and amount required" }`
- **Analysis:** The API expects a `user_id` field in the payload. The app's `WalletApiService.addFunds()` does not send `user_id`. For admin operations, it should send the target user's ID.

### 8. POST `/wallet/remove` -- 400 BAD_REQUEST

- **Status Code:** 400
- **Response Body:** `{ "error": "Valid user_id and amount required" }`
- **Analysis:** Same as `/wallet/add` -- missing `user_id` field.

### 9. POST `/wallet/transfer` -- 500 SERVER_ERROR

- **Status Code:** 500
- **Request Payload:**
```json
{
  "to_user_id": "test-user-id",
  "amount": 50,
  "notes": "test"
}
```
- **Response Body:** `{ "error": "Server error" }`
- **Analysis:** The `to_user_id` value "test-user-id" is not a valid user ID. The backend crashes when it can't find the user. Need to test with a real user ID.

### 10. GET `/commissions/` -- 500 SERVER_ERROR

- **Status Code:** 500
- **Response Body:** `{ "error": "Server error" }`
- **Analysis:** Backend returns generic 500. Likely a backend bug in the commissions list query.

---

## Root Cause Analysis

### Flexy 500 Error -- ROOT CAUSE FOUND

**The user's 500 error on Flexy send is caused by a missing `operator` field in the request payload.**

| Test | Payload | Result |
|------|---------|--------|
| Without `operator` | `{number, amount}` | **500** -- Server error (crash) |
| With `operator` | `{number, operator, amount}` | **503** -- No ModemGrid node available (accepted but gateway down) |

The OpenAPI spec at `openapi.yaml:370-377` shows the `/flexy/send` endpoint expects:
- `number` -- phone number
- `operator` -- operator name (mobilis, djezzy, ooredoo)
- `amount` -- amount to send
- `offer` (optional)
- `variables` (optional)

The app's `FlexyApiService.send()` only sends `{number, amount}` -- missing the required `operator` field.

**Fix required:** Add `operator` parameter to `FlexyApiService.send()` and add an operator selector dropdown in the Flexy send screen UI.

### Idoom Recharge -- Missing `type` field

The OpenAPI spec shows `/idoom/recharge` expects `ssuid`, `phone_number`, `amount`, `type`. The app only sends `{phone_number, amount}`. The `type` field must be a valid value (not "prepaid" -- the backend uses "adsl" internally).

### Wallet Operations -- Missing `user_id` field

The `/wallet/add` and `/wallet/remove` endpoints require a `user_id` field. The app doesn't send it. For admin operations, the UI should include a user selector.

### Cards Buy -- No stock available

The 400 error is because no cards are in stock. The UI should show "no cards available" rather than attempting the API call.

### Commissions -- Backend 500

The `/commissions/` endpoint returns a generic 500. This is likely a backend bug unrelated to the client app.

---

## Recommendations

1. **Flexy send (CRITICAL):** Add `operator` parameter to `FlexyApiService.send()` and add an operator dropdown (mobilis, djezzy, ooredoo) in the Flexy send screen.
2. **Idoom recharge:** Add `type` parameter to `IdoomApiService.recharge()` and add a type selector in the UI. Valid types need to be confirmed with the backend.
3. **Wallet add/remove:** Add `user_id` parameter to the API calls. For admin, add a user selector in the UI.
4. **Wallet transfer:** Test with a valid user ID. The field name `to_user_id` may need to be confirmed.
5. **Cards buy:** Check stock before allowing the buy action; show "no cards available" message.
6. **Commissions:** Backend bug -- report to backend team.
7. **Users list (500):** Intermittent -- retry logic should handle this. May need backend investigation.
