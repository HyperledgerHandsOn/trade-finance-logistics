# Chaincode API Reference

This document covers all invokable functions across both versions of the trade workflow chaincode: `trade_workflow` (the base version from the book) and `trade_workflow_v1` (the upgraded version with ABAC support). For each function, the arguments, caller restrictions, and any preconditions are listed.

---

## Table of Contents

- [Participants and Roles](#participants-and-roles)
- [Initialization](#initialization)
- [Version Differences](#version-differences)
- [Trade Agreement Functions](#trade-agreement-functions)
- [Letter of Credit Functions](#letter-of-credit-functions)
- [Export License Functions](#export-license-functions)
- [Shipment Functions](#shipment-functions)
- [Payment Functions](#payment-functions)
- [Query Functions](#query-functions)

---

## Participants and Roles

Both chaincode versions revolve around four organizations, each mapped to a specific role in the trade workflow:

| Role | Organization | Abbreviation |
|------|-------------|--------------|
| Exporter | ExporterOrg | `expKey` |
| Exporter's Bank | ExporterBankOrg | `ebKey` |
| Importer | ImporterOrg | `impKey` |
| Importer's Bank | ImporterBankOrg | `ibKey` |
| Carrier | CarrierOrg | `carKey` |
| Regulatory Authority | RegulatorOrg | `raKey` |

In `trade_workflow_v1`, an additional role called **Exporting Entity** (`ExportingEntityOrg`) is introduced. It is a composite of the Exporter and Exporter's Bank, used to represent cases where either party can trigger export-side actions. See [Version Differences](#version-differences) for details.

---

## Initialization

### `Init`

Called once when the chaincode is instantiated. Writes all participant identities and initial account balances to the ledger.

**Arguments** (positional, all strings):

| Index | Field | Type | Notes |
|-------|-------|------|-------|
| 0 | Exporter | string | Identity of the exporting party |
| 1 | Exporter's Bank | string | |
| 2 | Exporter's Account Balance | integer (as string) | Must parse as int |
| 3 | Importer | string | Identity of the importing party |
| 4 | Importer's Bank | string | |
| 5 | Importer's Account Balance | integer (as string) | Must parse as int |
| 6 | Carrier | string | |
| 7 | Regulatory Authority | string | |

**Access:** No restriction — called by the instantiating peer admin.

**Notes for `trade_workflow_v1`:** If called with 0 arguments (during an upgrade), the function returns success immediately and leaves the ledger state untouched. This allows upgrading the chaincode binary without resetting participant data.

---

## Version Differences

The function signatures are identical between `trade_workflow` and `trade_workflow_v1`. The differences are in access control:

| Function | `trade_workflow` caller | `trade_workflow_v1` caller |
|----------|------------------------|---------------------------|
| `acceptTrade` | ExporterOrg | **ExportingEntityOrg** |
| `requestEL` | ExporterOrg | **ExportingEntityOrg** |
| `prepareShipment` | ExporterOrg | **ExportingEntityOrg** |
| `requestPayment` | ExporterOrg | **ExportingEntityOrg** |
| `getTradeStatus` | ImporterOrg or ExporterOrg | adds ExportingEntityOrg |
| `getLCStatus` | ImporterOrg or ExporterOrg | adds ExportingEntityOrg |
| `getELStatus` | ExporterOrg or RegulatorOrg | **ExportingEntityOrg** or RegulatorOrg |
| `getShipmentLocation` | Importer, Exporter, or Carrier | adds ExportingEntityOrg |
| `getBillOfLading` | Importer, Exporter, or Carrier | adds ExportingEntityOrg |
| `getAccountBalance` (exporter) | ExporterOrg | ExporterOrg or **ExportingEntityOrg** |

`ExportingEntityOrg` is checked via `authenticateExportingEntityOrg()`, defined in `accessControlUtils.go`. It accepts certificates issued by either the exporter's CA or the exporter's bank's CA.

---

## Trade Agreement Functions

### `requestTrade`

Importer submits a request to trade. Creates a new `TradeAgreement` record on the ledger with status `REQUESTED`.

**Caller:** ImporterOrg only.

**Arguments:**

| Index | Field | Type | Notes |
|-------|-------|------|-------|
| 0 | Trade ID | string | Unique identifier for this trade |
| 1 | Amount | integer (as string) | Value of the trade |
| 2 | Description of Goods | string | Free-text description |

**Preconditions:** None — this is the first step in the workflow.

**Ledger effect:** Writes a `TradeAgreement` struct with `Status = REQUESTED` and `Payment = 0`.

---

### `acceptTrade`

Exporter confirms they agree to fulfill the trade request. Updates the trade record status to `ACCEPTED`.

**Caller:** ExporterOrg (or ExportingEntityOrg in v1).

**Arguments:**

| Index | Field | Type |
|-------|-------|------|
| 0 | Trade ID | string |

**Preconditions:** A trade record with the given ID must exist on the ledger.

**Ledger effect:** Updates `TradeAgreement.Status` to `ACCEPTED`. If already accepted, logs a message and returns success without writing.

---

## Letter of Credit Functions

### `requestLC`

Importer asks their bank to issue a Letter of Credit for a given trade. Creates an `LetterOfCredit` record with status `REQUESTED`.

**Caller:** ImporterOrg only.

**Arguments:**

| Index | Field | Type |
|-------|-------|------|
| 0 | Trade ID | string |

**Preconditions:** The trade must exist and have status `ACCEPTED`. If the trade has not been accepted yet, returns an error.

**Ledger effect:** Writes a `LetterOfCredit` struct. The beneficiary is set to the exporter's identity (looked up from ledger state). Amount is inherited from the trade agreement.

---

### `issueLC`

Importer's bank formally issues the Letter of Credit, setting an ID, expiry date, and optionally a list of required documents.

**Caller:** ImporterOrg only (in practice, the importer's bank acts through this org in both versions).

**Arguments:**

| Index | Field | Type | Notes |
|-------|-------|------|-------|
| 0 | Trade ID | string | |
| 1 | L/C ID | string | Unique identifier for the L/C |
| 2 | Expiry Date | string | Format is not validated — use a consistent format |
| 3+ | Documents (optional) | string... | Zero or more document identifiers required under the L/C |

**Preconditions:** An L/C record for the trade must exist with status `REQUESTED`. If already `ISSUED` or `ACCEPTED`, logs and returns success without re-writing.

**Ledger effect:** Updates the `LetterOfCredit` record with the ID, expiry date, documents list, and sets `Status = ISSUED`.

---

### `acceptLC`

Exporter's bank reviews the L/C terms and accepts them, enabling the export license request to proceed.

**Caller:** ExporterOrg only (both versions).

**Arguments:**

| Index | Field | Type |
|-------|-------|------|
| 0 | Trade ID | string |

**Preconditions:** L/C must exist and have status `ISSUED`. If status is `REQUESTED` (not yet issued), returns an error. If already `ACCEPTED`, returns success without writing.

**Ledger effect:** Updates `LetterOfCredit.Status` to `ACCEPTED`.

---

## Export License Functions

### `requestEL`

Exporter submits an export license application to the regulatory authority. Pulls relevant trade details from existing ledger records to populate the application.

**Caller:** ExporterOrg (or ExportingEntityOrg in v1).

**Arguments:**

| Index | Field | Type |
|-------|-------|------|
| 0 | Trade ID | string |

**Preconditions:** The L/C for this trade must have status `ACCEPTED`. The trade record must also exist.

**Ledger effect:** Writes an `ExportLicense` struct with `Status = REQUESTED`. The exporter, carrier, goods description, and regulatory authority are all pulled from existing ledger state — they do not need to be passed as arguments.

---

### `issueEL`

Regulatory authority approves the export license application.

**Caller:** RegulatorOrg only (both versions).

**Arguments:**

| Index | Field | Type | Notes |
|-------|-------|------|-------|
| 0 | Trade ID | string | |
| 1 | E/L ID | string | Unique identifier for the export license |
| 2 | Expiry Date | string | |

**Preconditions:** An export license record for the trade must exist with status `REQUESTED`. If already `ISSUED`, logs and returns success without re-writing.

**Ledger effect:** Updates the `ExportLicense` record with the ID, expiry date, and sets `Status = ISSUED`.

---

## Shipment Functions

### `prepareShipment`

Exporter marks the goods as ready for pickup at the source port. This sets the shipment location to `SOURCE`.

**Caller:** ExporterOrg (or ExportingEntityOrg in v1).

**Arguments:**

| Index | Field | Type |
|-------|-------|------|
| 0 | Trade ID | string |

**Preconditions:** The export license for this trade must have status `ISSUED`. If the shipment location is already set to `SOURCE`, returns success (idempotent). If the location is anything other than `SOURCE` (i.e., the shipment has already moved), returns an error.

**Ledger effect:** Writes `SOURCE` to the shipment location key for this trade.

---

### `acceptShipmentAndIssueBL`

Carrier inspects the shipment at the source port and issues a Bill of Lading, transferring custody of the goods.

**Caller:** CarrierOrg only (both versions).

**Arguments:**

| Index | Field | Type | Notes |
|-------|-------|------|-------|
| 0 | Trade ID | string | |
| 1 | B/L ID | string | Unique identifier for the Bill of Lading |
| 2 | Expiration Date | string | |
| 3 | Source Port | string | Port of loading |
| 4 | Destination Port | string | Port of discharge |

**Preconditions:** The shipment location must currently be `SOURCE`. If not prepared yet, or if the location has moved past `SOURCE`, returns an error.

**Ledger effect:** Writes a `BillOfLading` struct. The exporter, carrier, goods description, amount, and beneficiary (importer's bank) are pulled from existing ledger state. The shipment location is **not** updated here — use `updateShipmentLocation` for that.

---

### `updateShipmentLocation`

Carrier updates the recorded location of the shipment as it moves from source to destination.

**Caller:** CarrierOrg only (both versions).

**Arguments:**

| Index | Field | Type | Notes |
|-------|-------|------|-------|
| 0 | Trade ID | string | |
| 1 | Location | string | Intended values are `SOURCE` and `DESTINATION`, but the chaincode does not restrict to these |

**Preconditions:** The shipment must have been prepared (location key must exist). If location is already set to the new value, logs a message but still writes.

**Ledger effect:** Overwrites the shipment location key with the new value.

---

## Payment Functions

### `requestPayment`

Exporter's bank signals that payment is due. Acts as a marker on the ledger that a payment request is pending.

**Caller:** ExporterOrg (or ExportingEntityOrg in v1).

**Arguments:**

| Index | Field | Type |
|-------|-------|------|
| 0 | Trade ID | string |

**Preconditions:**
- The shipment must have been prepared (location must be set).
- Full payment must not already have been settled.
- If the shipment is still at `SOURCE` and a partial payment has already been made, returns an error (prevents duplicate partial payment requests).
- If a payment request is already pending, returns success without creating a duplicate.

**Ledger effect:** Writes a marker entry under the payment key. The marker is deleted when `makePayment` is processed.

---

### `makePayment`

Importer's bank transfers funds to the exporter. Payment is made in two tranches: 50% when the shipment is at `SOURCE`, and the remainder when it reaches `DESTINATION`.

**Caller:** ImporterOrg only (both versions).

**Arguments:**

| Index | Field | Type |
|-------|-------|------|
| 0 | Trade ID | string |

**Preconditions:** A payment request must be pending for this trade (the marker from `requestPayment` must exist). The shipment location must be set.

**Ledger effect:**
- If shipment is at `SOURCE`: transfers `Amount / 2`.
- Otherwise: transfers `Amount - Payment` (the remaining balance).
- Updates `TradeAgreement.Payment`, `expBalKey` (exporter balance), and `impBalKey` (importer balance).
- Deletes the pending payment marker.
- Note: the chaincode logs a warning if the importer's balance is insufficient but does **not** reject the transaction. Balance can go negative.

---

## Query Functions

All query functions return a JSON string on success. They do not modify ledger state.

### `getTradeStatus`

Returns the current status of a trade agreement.

**Caller:** ImporterOrg or ExporterOrg (adds ExportingEntityOrg in v1).

**Arguments:**

| Index | Field | Type |
|-------|-------|------|
| 0 | Trade ID | string |

**Response:** `{"Status": "<REQUESTED|ACCEPTED>"}`

---

### `getLCStatus`

Returns the current status of the Letter of Credit for a trade.

**Caller:** ImporterOrg or ExporterOrg (adds ExportingEntityOrg in v1).

**Arguments:**

| Index | Field | Type |
|-------|-------|------|
| 0 | Trade ID | string |

**Response:** `{"Status": "<REQUESTED|ISSUED|ACCEPTED>"}`

---

### `getELStatus`

Returns the current status of the Export License for a trade.

**Caller:** ExporterOrg or RegulatorOrg (ExportingEntityOrg replaces ExporterOrg in v1).

**Arguments:**

| Index | Field | Type |
|-------|-------|------|
| 0 | Trade ID | string |

**Response:** `{"Status": "<REQUESTED|ISSUED>"}`

---

### `getShipmentLocation`

Returns the recorded location of the shipment.

**Caller:** ImporterOrg, ExporterOrg, or CarrierOrg (adds ExportingEntityOrg in v1).

**Arguments:**

| Index | Field | Type |
|-------|-------|------|
| 0 | Trade ID | string |

**Response:** `{"Location": "<SOURCE|DESTINATION|...>"}`

---

### `getBillOfLading`

Returns the full Bill of Lading record for a trade.

**Caller:** ImporterOrg, ExporterOrg, or CarrierOrg (adds ExportingEntityOrg in v1).

**Arguments:**

| Index | Field | Type |
|-------|-------|------|
| 0 | Trade ID | string |

**Response:** Full JSON of the `BillOfLading` struct:

```json
{
  "Id": "BL-001",
  "ExpirationDate": "2018-12-31",
  "Exporter": "LumberInc",
  "Carrier": "ShippingCo",
  "DescriptionOfGoods": "Wood for Toys",
  "Amount": 50000,
  "Beneficiary": "ImportersBank",
  "SourcePort": "Port of Oakland",
  "DestinationPort": "Port of Nhava Sheva"
}
```

---

### `getAccountBalance`

Returns the current account balance for either the exporter or importer.

**Caller:** Depends on the entity queried — exporters can only query their own balance, and importers can only query theirs.

**Arguments:**

| Index | Field | Type | Notes |
|-------|-------|------|-------|
| 0 | Trade ID | string | Required but used only for context; balance is global, not per-trade |
| 1 | Entity | string | Must be `"exporter"` or `"importer"` (case-insensitive) |

**Access by entity:**
- `"exporter"`: ExporterOrg only (adds ExportingEntityOrg in v1)
- `"importer"`: ImporterOrg only (both versions)

**Response:** `{"Balance": "<integer as string>"}`
