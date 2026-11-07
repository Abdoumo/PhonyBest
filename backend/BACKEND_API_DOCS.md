# Flexy GSM Backend API Documentation

**Version:** 1.0.0
**Description:** ModemGrid PRO - GSM Modem Management Platform

## Table of Contents
- [LOGIN](#login)
- [LOGOUT](#logout)
- [API-KEYS](#api-keys)
- [CREATE](#create)
- [{KEY_ID}](#{key_id})
- [CHANGE-PASSWORD](#change-password)
- [MISC](#misc)
- [APIS](#apis)
- [{API_ID}](#{api_id})
- [NEW](#new)
- [KEYBOARD](#keyboard)
- [HISTORY](#history)
- [{HISTORY_ID}](#{history_id})
- [MODEMS](#modems)
- [DETECT](#detect)
- [NAMESPACES](#namespaces)
- [{MODEM_ID}](#{modem_id})
- [TEST](#test)
- [EXTRACT-VARIABLES](#extract-variables)
- [WSS](#wss)
- [SAVE](#save)
- [RESTART](#restart)
- [STATUS](#status)
- [POOLS](#pools)
- [{POOL_ID}](#{pool_id})
- [SMS](#sms)
- [{SMS_ID}](#{sms_id})
- [DELETE-ALL](#delete-all)
- [UNREAD-COUNT](#unread-count)
- [DEFINITIONS](#definitions)
- [EXECUTE](#execute)
- [{MODEM_NUM}](#{modem_num})
- [{PATH}](#{path})

---

## LOGIN

### GET `/auth/login`

**Summary:** Login Page

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| error | query | No | undefined |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/auth/login`

**Summary:** Login

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## LOGOUT

### GET `/auth/logout`

**Summary:** Logout Get

**Responses:**
- **200**: Successful Response

---

### POST `/auth/logout`

**Summary:** Logout

**Responses:**
- **200**: Successful Response

---

## API-KEYS

### GET `/auth/api-keys`

**Summary:** List Api Keys

**Responses:**
- **200**: Successful Response

---

## CREATE

### POST `/auth/api-keys/create`

**Summary:** Create Api Key

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## {KEY_ID}

### POST `/auth/api-keys/{key_id}/revoke`

**Summary:** Revoke Api Key

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| key_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/auth/api-keys/{key_id}/delete`

**Summary:** Delete Api Key

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| key_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## CHANGE-PASSWORD

### POST `/auth/change-password`

**Summary:** Change Password

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## MISC

### GET `/admin/`

**Summary:** Admin Dashboard

**Description:** Admin dashboard with overview showing all dongles.

**Responses:**
- **200**: Successful Response

---

### GET `/`

**Summary:** Root

**Responses:**
- **200**: Successful Response

---

### GET `/health`

**Summary:** Health Check

**Responses:**
- **200**: Successful Response

---

## APIS

### GET `/admin/apis`

**Summary:** List Apis

**Description:** List all API definitions.

**Responses:**
- **200**: Successful Response

---

## {API_ID}

### GET `/admin/apis/{api_id}/test`

**Summary:** Test Api Form

**Description:** Form to test API with variables.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| api_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/admin/apis/{api_id}/edit`

**Summary:** Edit Api Form

**Description:** Form to edit API with modem selection.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| api_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/apis/{api_id}/edit`

**Summary:** Update Api

**Description:** Update API definition and dongle/pool assignment.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| api_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/apis/{api_id}/delete`

**Summary:** Delete Api

**Description:** Delete API definition.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| api_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/apis/{api_id}/test/start`

**Summary:** Api Test Start

**Description:** Start API test execution in background, return UUID immediately.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| api_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## NEW

### GET `/admin/apis/new`

**Summary:** New Api Form

**Description:** Form to create new API with modem selection.

**Responses:**
- **200**: Successful Response

---

### POST `/admin/apis/new`

**Summary:** Create Api

**Description:** Create new API definition with sequential steps and assign to a modem or pool.

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/admin/pools/new`

**Summary:** New Pool Form

**Description:** Form to create a new dongle pool.

**Responses:**
- **200**: Successful Response

---

### POST `/admin/pools/new`

**Summary:** Create Pool

**Description:** Create a new dongle pool.

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## KEYBOARD

### GET `/admin/keyboard`

**Summary:** Keyboard

**Description:** Keyboard page ÔÇö quick-launch APIs with variables.

**Responses:**
- **200**: Successful Response

---

## HISTORY

### GET `/admin/history`

**Summary:** List History

**Description:** List USSD execution history, max 30-day range, defaults to today.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| start_date | query | No | string |
| end_date | query | No | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/admin/wss/history`

**Summary:** Wss History

**Description:** WSS request history ÔÇö sessions received via WSS client, with date filtering.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| start_date | query | No | string |
| end_date | query | No | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/api/v1/history`

**Summary:** List History

**Description:** List USSD execution history.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| status | query | No | string |
| limit | query | No | integer |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/api/v1/history/{history_id}`

**Summary:** Get History

**Description:** Get history entry details.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| history_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/api/v1/history/{history_id}/cancel`

**Summary:** Cancel History

**Description:** Cancel an active execution.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| history_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## {HISTORY_ID}

### GET `/admin/history/{history_id}`

**Summary:** View History

**Description:** View history entry details.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| history_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## MODEMS

### GET `/admin/modems`

**Summary:** List Modems

**Description:** List all detected modems/dongles.

**Responses:**
- **200**: Successful Response

---

### GET `/api/v1/modems`

**Summary:** List Modems

**Description:** List all registered modems and their status.

**Responses:**
- **200**: Successful Response

---

### POST `/api/v1/modems/register/{modem_id}`

**Summary:** Register Modem

**Description:** Register a new modem.

- modem_id: Unique identifier (e.g., 'modem1', 'modem2')
- port: Serial port (optional, e.g., '/dev/ttyUSB0')
- auto_detect: Auto-detect port if not specified (default: true)

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |
| port | query | No | string |
| auto_detect | query | No | boolean |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### DELETE `/api/v1/modems/{modem_id}`

**Summary:** Unregister Modem

**Description:** Unregister and disconnect a modem.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/api/v1/modems/detect`

**Summary:** Detect Modems

**Description:** Auto-detect all connected modems and register them with auto-generated dongle IDs.

Flow:
1. Scan all ttyUSB* ports
2. Send AT+CGSN (IMEI) and AT+CIMI (IMSI) to identify each modem
3. Register as dongle1, dongle2, etc. (no config file needed)
4. Save to database for persistence

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| max_modems | query | No | integer |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/api/v1/modems/detected`

**Summary:** Get Detected Modems

**Description:** Scan and show all detected modems without registering them.
Useful to see what's connected before registering.

**Responses:**
- **200**: Successful Response

---

### POST `/api/v1/modems/detect-all`

**Summary:** Detect All Ports

**Description:** Detect all serial ports, group by IMEI, register ONE dongle per physical USB modem.
Automatically picks the best port (verbose/+CUSD > highest port number).

**Responses:**
- **200**: Successful Response

---

### GET `/api/v1/modems/ports`

**Summary:** Get Available Ports

**Description:** Get all AT-responsive serial ports with details.
Shows which ports are verbose (receive +CUSD) for selection.

**Responses:**
- **200**: Successful Response

---

### POST `/api/v1/modems/{modem_id}/select-port`

**Summary:** Select Modem Port

**Description:** Select/change the serial port for a modem.
Useful when multiple ports respond to AT and you need to choose the verbose one.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |
| port | query | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/api/v1/modems/{modem_id}/status`

**Summary:** Get Modem Status

**Description:** Get status for a specific modem.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/api/v1/modems/{modem_id}/connect`

**Summary:** Connect Modem

**Description:** Connect a specific modem.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/api/v1/modems/{modem_id}/disconnect`

**Summary:** Disconnect Modem

**Description:** Disconnect a specific modem.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/api/v1/modems/{modem_id}/test-ussd`

**Summary:** Test Modem Ussd

**Description:** Send a test USSD code on a specific modem.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |
| ussd_code | query | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/api/v1/modems/hilink/detect`

**Summary:** Detect Hilink Modems

**Description:** Scan network for Huawei HiLink modems (E3372, E3531, etc.).

Args:
    base_ip: Base IP range (e.g., '192.168.8')
    start: Start of IP range (default: 1)
    end: End of IP range (default: 10)

Returns:
    List of detected HiLink modems with device info

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| base_ip | query | No | string |
| start | query | No | integer |
| end | query | No | integer |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/api/v1/modems/hilink/register`

**Summary:** Register Hilink Modem

**Description:** Register a Huawei HiLink modem via HTTP API.

- dongle_id: Unique identifier (e.g., 'dongle1')
- host: Modem IP address (or namespace proxy IP like 10.1.0.2)
- username: Web UI username (default: admin)
- password: Web UI password (default: admin)
- host_header: Host header to send (e.g. '192.168.8.1') when reaching the
  modem via a namespace proxy IP

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| dongle_id | query | Yes | string |
| host | query | No | string |
| username | query | No | string |
| password | query | No | string |
| host_header | query | No | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/api/v1/modems/hilink/register-namespaces`

**Summary:** Register Hilink Namespaces

**Description:** Auto-register HiLink modems exposed via the network-namespace proxy setup
(setup_modem_namespaces.sh). Each modem N is reachable at 10.N.0.2 with
Host header set to the real modem IP.

- count: number of modems to register (default 3)
- modem_ip: the real modem IP used as Host header (default 192.168.8.1)

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| count | query | No | integer |
| modem_ip | query | No | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/api/v1/modems/{modem_id}/pin/status`

**Summary:** Get Modem Pin Status

**Description:** Get SIM PIN status for a HiLink modem.
Shows whether the SIM is ready, needs a PIN, or needs a PUK.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/api/v1/modems/{modem_id}/pin/enter`

**Summary:** Enter Modem Pin

**Description:** Enter the SIM PIN code to activate/unlock a HiLink modem's SIM.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |
| pin | query | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/api/v1/modems/{modem_id}/pin/enable`

**Summary:** Enable Modem Pin

**Description:** Enable PIN protection on a HiLink modem's SIM.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |
| pin | query | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/api/v1/modems/{modem_id}/pin/disable`

**Summary:** Disable Modem Pin

**Description:** Disable PIN protection on a HiLink modem's SIM.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |
| pin | query | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/api/v1/modems/{modem_id}/pin/puk`

**Summary:** Enter Modem Puk

**Description:** Enter PUK code and set a new PIN for a PUK-locked HiLink modem SIM.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |
| puk | query | Yes | string |
| new_pin | query | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/api/v1/modems/{modem_id}/ussd`

**Summary:** Send Modem Ussd

**Description:** Send USSD code on any modem (serial or HiLink).
Automatically detects modem type and uses appropriate method.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |
| ussd_code | query | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/api/v1/modems/{modem_id}/apis/{api_name}`

**Summary:** Assign Api To Modem

**Description:** Assign an API to a specific modem.
When this API is called, it will use this specific modem.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |
| api_name | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### DELETE `/api/v1/modems/{modem_id}/apis/{api_name}`

**Summary:** Remove Api From Modem

**Description:** Remove an API assignment from a modem.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |
| api_name | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/api/v1/modems/{modem_id}/apis`

**Summary:** Get Modem Apis

**Description:** Get all APIs assigned to a specific modem.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## DETECT

### POST `/admin/modems/detect`

**Summary:** Detect Modems Ui

**Description:** Detect and register all connected modems from UI.

**Responses:**
- **200**: Successful Response

---

## NAMESPACES

### POST `/admin/modems/namespaces/setup`

**Summary:** Setup Namespaces

**Description:** Run setup_modem_namespaces.sh setup, then auto-detect and register dongles.
The script regenerates modem_ips.conf with all proxy IPs, then we immediately
scan those IPs to register the modems.

**Responses:**
- **200**: Successful Response

---

### POST `/admin/modems/namespaces/teardown`

**Summary:** Teardown Namespaces

**Description:** Run setup_modem_namespaces.sh teardown and mark all modems disconnected.

**Responses:**
- **200**: Successful Response

---

## {MODEM_ID}

### POST `/admin/modems/{modem_id}/rename`

**Summary:** Rename Modem

**Description:** Rename a dongle.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/modems/{modem_id}/credit-config`

**Summary:** Save Credit Config

**Description:** Save USSD code and regex for credit checking on a dongle.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/modems/{modem_id}/check-credit`

**Summary:** Check Credit

**Description:** Send USSD to check credit, extract balance with regex, store and return it.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/admin/modems/{modem_id}`

**Summary:** Modem Detail

**Description:** View modem detail with API assignments and terminal.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/modems/{modem_id}/ussd`

**Summary:** Send Ussd Ui

**Description:** Send USSD from modem detail page ÔÇö synchronous, returns response directly.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/modems/{modem_id}/apis/{api_id}`

**Summary:** Assign Api To Modem Ui

**Description:** Assign an API to a modem from UI.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |
| api_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/modems/{modem_id}/apis/{api_id}/remove`

**Summary:** Remove Api From Modem Ui

**Description:** Remove an API assignment from a modem from UI.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |
| api_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/modems/{modem_id}/ussd/cancel`

**Summary:** Cancel Ussd Session

**Description:** Cancel current USSD session on modem.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/admin/modems/{modem_id}/ports`

**Summary:** Select Modem Port Ui

**Description:** UI to select the serial port for a modem.
Shows all AT-responsive ports and identifies which is verbose.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/admin/modems/{modem_id}/sms`

**Summary:** Sms Inbox

**Description:** View SMS inbox for a modem ÔÇö reads from system database (harvested from SIM).

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/modems/{modem_id}/sms/{sms_id}/delete`

**Summary:** Delete Sms

**Description:** Delete a single SMS from system memory.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |
| sms_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/modems/{modem_id}/sms/delete-all`

**Summary:** Delete All Sms

**Description:** Delete all SMS for this dongle from system memory.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/modems/{modem_id}/ports/select`

**Summary:** Do Select Port Ui

**Description:** Handle port selection from UI form.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## TEST

### GET `/admin/apis/test/{session_id}/status`

**Summary:** Api Test Status

**Description:** Poll execution status by session UUID.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| session_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## EXTRACT-VARIABLES

### GET `/admin/api/extract-variables`

**Summary:** Extract Variables

**Description:** Extract variable names from template.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| template | query | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## WSS

### GET `/admin/wss`

**Summary:** Wss Config Page

**Description:** WSS client configuration page.

**Responses:**
- **200**: Successful Response

---

## SAVE

### POST `/admin/wss/save`

**Summary:** Wss Save Config

**Description:** Save WSS client configuration.

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## RESTART

### GET `/admin/wss/restart`

**Summary:** Wss Restart

**Description:** Restart the WSS client connection.

**Responses:**
- **200**: Successful Response

---

## STATUS

### GET `/admin/wss/status`

**Summary:** Wss Status Api

**Description:** JSON endpoint for WSS client status (for AJAX polling).

**Responses:**
- **200**: Successful Response

---

## POOLS

### GET `/admin/pools`

**Summary:** List Pools

**Description:** List all dongle pools.

**Responses:**
- **200**: Successful Response

---

## {POOL_ID}

### GET `/admin/pools/{pool_id}`

**Summary:** Pool Detail

**Description:** View pool detail with dongles and balances.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| pool_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/pools/{pool_id}/add`

**Summary:** Add Modem To Pool

**Description:** Add a dongle to a pool.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| pool_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/pools/{pool_id}/remove/{modem_id}`

**Summary:** Remove Modem From Pool

**Description:** Remove a dongle from a pool.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| pool_id | path | Yes | string |
| modem_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/admin/pools/{pool_id}/delete`

**Summary:** Delete Pool

**Description:** Delete a pool.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| pool_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## SMS

### GET `/admin/sms`

**Summary:** Sms Viewer

**Description:** View all SMS messages stored in system memory (from all dongles).

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| dongle | query | No | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## {SMS_ID}

### POST `/admin/sms/{sms_id}/delete`

**Summary:** Delete Stored Sms

**Description:** Delete a single SMS from system memory.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| sms_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## DELETE-ALL

### POST `/admin/sms/delete-all`

**Summary:** Delete All Stored Sms

**Description:** Delete all SMS from system memory.

**Responses:**
- **200**: Successful Response

---

## UNREAD-COUNT

### GET `/admin/sms/unread-count`

**Summary:** Sms Unread Count

**Description:** JSON endpoint for unread SMS count (for nav badge polling).

**Responses:**
- **200**: Successful Response

---

## DEFINITIONS

### GET `/api/v1/definitions`

**Summary:** List Api Definitions

**Description:** List all API definitions.

**Responses:**
- **200**: Successful Response

---

### POST `/api/v1/definitions`

**Summary:** Create Api Definition

**Description:** Create a new API definition.

**Request Body (application/json):**

**Responses:**
- **201**: Successful Response
- **422**: Validation Error

---

### GET `/api/v1/definitions/{api_id}`

**Summary:** Get Api Definition

**Description:** Get a specific API definition.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| api_id | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### PUT `/api/v1/definitions/{api_id}`

**Summary:** Update Api Definition

**Description:** Update an API definition.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| api_id | path | Yes | string |

**Request Body (application/json):**

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### DELETE `/api/v1/definitions/{api_id}`

**Summary:** Delete Api Definition

**Description:** Delete an API definition.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| api_id | path | Yes | string |

**Responses:**
- **204**: Successful Response
- **422**: Validation Error

---

## EXECUTE

### POST `/api/v1/execute/{api_name}`

**Summary:** Execute Ussd Api

**Description:** Execute USSD API by name on a specific modem.
Returns the session UUID immediately ÔÇö execution runs in the background.
Poll GET /api/v1/execute/status/{session_id} to check progress.

Example:
POST /api/v1/execute/addmoney
{"variables": {"amount": "500", "phone": "0771234567", "pin": "1234"}, "modem_id": "dongle1"}

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| api_name | path | Yes | string |
| x-api-key | header | No | undefined |

**Request Body (application/json):**

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### GET `/api/v1/execute/status/{session_id}`

**Summary:** Get Execution Status

**Description:** Poll execution status by session UUID.

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| session_id | path | Yes | string |
| x-api-key | header | No | undefined |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## {MODEM_NUM}

### GET `/modem/{modem_num}`

**Summary:** Proxy Root Redirect

**Description:** Redirect bare /modem/1 to /modem/1/html/index.html

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_num | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

## {PATH}

### GET `/modem/{modem_num}/{path}`

**Summary:** Proxy Request

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_num | path | Yes | string |
| path | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### PUT `/modem/{modem_num}/{path}`

**Summary:** Proxy Request

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_num | path | Yes | string |
| path | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### DELETE `/modem/{modem_num}/{path}`

**Summary:** Proxy Request

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_num | path | Yes | string |
| path | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

### POST `/modem/{modem_num}/{path}`

**Summary:** Proxy Request

**Parameters:**
| Name | In | Required | Type |
|------|----|----------|------|
| modem_num | path | Yes | string |
| path | path | Yes | string |

**Responses:**
- **200**: Successful Response
- **422**: Validation Error

---

