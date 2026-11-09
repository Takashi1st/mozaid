# Mozaid AI — End-to-End Test Infrastructure Specification
## (وثيقة البنية التحتية للاختبارات الشاملة لمنصة مزايد)

**Document Version:** 1.0.0  
**Status:** Approved & Implemented  
**Target Platform:** Mozaid AI (منصة مزايد) — Real-Time Auctions, E-Procurement, and Escrow Platform for Yemen  
**Execution Engine:** Vitest / Node.js 22 Native Test Harness  

---

## 1. Test Philosophy: Opaque-Box & Requirement-Driven

The Mozaid AI E2E testing framework is engineered around a strict **Opaque-Box, Requirement-Driven** philosophy:
1. **Zero Coupling to Internal Implementation Details**: Tests interact strictly with public interfaces, domain engines, simulated network/event boundaries, and observable state machines. Refactoring underlying algorithms or database queries does not break contract tests.
2. **Authoritative Specification Derivation**: Every test case derives its inputs and expected outputs directly from authoritative requirement documents:
   - `PROJECT.md`: Master architectural blueprint, milestone boundaries, interface contracts, and 48-feature inventory.
   - `docs/PRD.md`: Functional requirements, localized Yemeni market rules, Anti-Sniping parameters, and Escrow lifecycles.
   - `docs/USECASES.md`: Step-by-step user personas, actor preconditions, main paths, alternative paths, and failure modes.
   - `docs/DATABASE_SCHEMA.sql` & `docs/DATABASE_SCHEMA.md`: Data invariants, currency constraints (YER, USD, SAR), relational constraints, and audit log schemas.
3. **Deterministic & Isolated Execution**: Every test sets up its own clean initial state (users, wallets, listings, timers), avoids state leakage across tests, and executes deterministically without dependencies on external live network services (telecom SMS networks, live bank portals, or live external AI endpoints).
4. **Adversarial & Edge-Condition Hardening**: Incorporates adversarial testing, edge-case probing, permission boundaries, concurrency conflicts, forged voucher submissions, anti-sniping threshold limits, and localized network outages.

---

## 2. Feature Inventory Mapping & Coverage Matrix

Every single feature of the 48 features defined in `PROJECT.md § Feature Inventory` is mapped across all four testing tiers:

| # | Feature Name | Milestone | Tier 1: Happy Paths (>=5) | Tier 2: Boundaries (>=5) | Tier 3: Cross-Feature Combinations | Tier 4: Real-World Scenarios |
|---|--------------|-----------|---------------------------|--------------------------|-----------------------------------|------------------------------|
| 1 | Real-Time Live Bidding Room | M3 | Join room, receive price ticker, sync countdown, broadcast bid, user presence | Disconnect recovery, expired room join, stale timer sync, zero-latency burst, malformed room ID | Live room + deposit lock + anti-sniping extension | Scenario 1, Scenario 4 |
| 2 | Quick-Action & Custom Bid Placement | M3 | Quick increment (+5k, +10k), custom bid, sequential increments, auto-next-min bid, bid broadcast | Below min increment, negative amount, non-numeric bid, string injection, massive overflow | Quick bid + anti-sniping trigger + outbid notification | Scenario 1, Scenario 4 |
| 3 | Anti-Sniping Extension Receiver | M3 | Bid at 119s triggers +120s, timer reset broadcast, multiple extensions, extension event payload, countdown update | Bid at exactly 120s vs 121s, extension cap at 20x, bid when closed, clock drift tolerance, extension disabled on buy-now | Anti-sniping + multiple competitors + Araboon hold | Scenario 1, Scenario 4 |
| 4 | Listing Discovery & Filter Hub | M4 | Filter by category, filter by city (Sana'a, Aden), price range filter, search query, active status filter | Empty search results, invalid category ID, special unicode chars, negative price filter, governorate mismatch | Discovery + AI generation + real-time room join | Scenario 1, Scenario 2 |
| 5 | Araboon / Bid Deposit Lock | M2 | Freeze required deposit, check available balance, freeze ledger update, lock status, multiple active deposits | Insufficient balance, double lock prevention, zero deposit requirement, lock on closed auction, currency mismatch | Deposit lock + live bidding + refund for outbid | Scenario 1 |
| 6 | Deposit Refund for Outbid/Losers | M2 | Auto-unlock on auction close, refund to outbid user, wallet available balance restoration, refund audit record, batch refund | Loser refund after winner default, refund on canceled auction, zero-balance refund, duplicate refund prevention, partial hold refund | Refund + winner escrow deduction + notification | Scenario 1 |
| 7 | Escrow Settlement & Payment | M2 | Fund winning bid into escrow, deduct available balance, transition status to `holding`, generate escrow contract, verify amounts | Insufficient winner balance, double escrow creation, payment after deadline, currency mismatch, unauthorized escrow funder | Escrow settlement + seller dispatch + inspection countdown | Scenario 1, Scenario 3 |
| 8 | Inspection Window Countdown (48h) | M2 | Start 48h countdown on delivery, compute inspection deadline, active timer inspection, status `inspecting`, remaining time calculation | Delivery not confirmed yet, custom window hours (24h/72h), inspection elapsed calculation, zero window, daylight saving resilience | Inspection window + auto-release + dispute filing | Scenario 1, Scenario 3 |
| 9 | Goods Acceptance & Fund Release | M2 | Buyer confirms acceptance, 2.5% fee deducted, net credited to seller wallet, status `completed`, mutual review requested | Non-buyer attempts confirmation, confirmation after dispute opened, double confirmation, zero platform fee, uninspected confirmation | Acceptance + fee ledger + seller payout | Scenario 1 |
| 10 | Formal Dispute Filing | M2 | Open dispute within 48h, attach defect photos, freeze escrow funds, transition status to `disputed`, assign dispute officer | Dispute filed after 48h expires, non-buyer files dispute, empty evidence URLs, dispute on non-inspecting escrow, duplicate dispute | Dispute + AI evidence analysis + arbitration room | Scenario 3 |
| 11 | Digital Arbitration Room Chat | M2 | Buyer posts claim, seller submits rebuttal, officer posts guidance, message history ordering, system notice broadcast | Unauthorized chatter, message exceeding max length, chat in closed dispute, forged timestamp, empty message | Arbitration chat + AI summary + binding ruling | Scenario 3 |
| 12 | Buy-Now Direct Purchase | M3 | Pay buy-now price, instant auction close, declare winner, auto-cancel pending bids, trigger escrow creation | Buy-now when disabled, offer below buy-now price, buy-now by seller, buy-now after expiration, concurrent buy-now race | Buy-now + deposit refund + escrow lock | Scenario 1 |
| 13 | AI Listing Generation (Multimodal) | M1 | Extract title from prompt/image, estimate market value, suggest starting price & increment, structured specs table, warranty terms | Empty description, corrupted image payload, unsupported image format, extreme valuation request, network timeout fallback | AI listing + manual edit + publishing | Scenario 1 |
| 14 | Manual Listing Publishing & Setup | M4 | Set starting price, reserve price, min increment, deposit amount, city selection, duration configuration | Starting price <= 0, reserve < starting price, min increment > starting price, past end date, invalid city | Setup + moderation scan + discovery index | Scenario 1, Scenario 2 |
| 15 | Image Moderation Check | M4 | Valid image passes, background scan status, multiple images checked, safe score calculation, approved flag set | Explicit image blocked, oversize payload rejected, invalid mime type, corrupt byte stream, empty image list | Moderation + AI appraisal + listing active | Scenario 1 |
| 16 | Real-Time Seller Dashboard | M3 | View active bids, viewer count tally, bidder reputation lookup, reserve price indicator, real-time telemetry | Unauthorized viewer dashboard, zero viewer room, negative bids tally, hidden reserve leak check, seller self-bid restriction | Dashboard + live room + emergency pause | Scenario 1, Scenario 4 |
| 17 | Dispatch & Delivery Notification | M2 | Mark dispatched with tracking, courier vs in-person pickup, notify buyer, transition to `dispatched`, record dispatch timestamp | Non-seller attempts dispatch, dispatch before escrow funded, double dispatch, empty courier info, dispatch on canceled deal | Dispatch + inspection countdown start | Scenario 1, Scenario 3 |
| 18 | Automated Escrow Auto-Release | M2 | 48h passes without dispute, evaluate auto-release, credit seller net payout, deduct 2.5% fee, close escrow | Auto-release when dispute active, evaluate before 48h elapsed, evaluate on refunded escrow, concurrency idempotency, notification trigger | Auto-release + fee ledger + payout | Scenario 1 |
| 19 | Trusted Seller Badge Acquisition | M2 | Verify KYC verified, >5 deals completed, >=4.8 rating, award trusted badge, display badge on profile | KYC unverified rejected, exactly 5 deals (boundary), 4.79 rating rejected, banned seller check, revoked badge on dispute surge | Trusted badge + high-value listing + buyer trust | Scenario 1 |
| 20 | AI-Powered RFP / Tender Drafting | M1 | Generate markdown RFP, scope of work, technical specifications, financial terms, evaluation matrix | Empty project requirements, adversarial prompt injection, non-procurement query, ultra-long text input, fallback template | AI RFP + tender publishing + supplier notification | Scenario 2 |
| 21 | Reverse Tender Publishing | M4 | Set lots, qualification criteria, budget ceiling, deadline, select category & governorate | Budget ceiling <= 0, past deadline, missing qualification criteria, invalid governorate, unauthorized issuer | Tender publishing + supplier matching + reverse room | Scenario 2 |
| 22 | Real-Time Reverse Bidding Room | M3 | Connect to reverse room, display lowest bid, broadcast new lower bid, anonymized bidder ID, live countdown | Upward bid rejected, equal bid rejected, closed tender room, unauthorized supplier, room reconnect | Reverse room + anonymous bids + conditional award | Scenario 2 |
| 23 | Supplier Compliance Review | M4 | Review supplier licenses, verify tax card, check past track record, score compliance, mark qualified | Expired commercial register, blacklisted contractor, unverified documents, zero past deals, score below threshold | Compliance + conditional awarding + contract | Scenario 2 |
| 24 | Conditional Awarding (الترسية المشروطة) | M4 | Award tender to optimal supplier, balance price & quality score, issue conditional award notice, set acceptance window, formalize award | Award to non-bidding supplier, award above budget cap, award on expired tender, issuer self-award, double award | Awarding + escrow guarantee + execution milestone | Scenario 2 |
| 25 | Tender Matching & Notifications | M4 | Match supplier category, match governorate, filter verified suppliers, trigger SMS/app alert, record dispatch log | Supplier in different governorate, supplier category mismatch, opt-out supplier, notification failure retry, duplicate alert filter | Matching + notification + reverse bidding | Scenario 2 |
| 26 | Anonymous Reverse Bidding | M3 | Submit bid with masked ID, enforce decrement rule, update room lowest price, store internal supplier link, maintain anonymity | Attempt to reveal competitor name, decrement smaller than min step, bid above current lowest, bid after tender closed, supplier bid on own tender | Anonymous bidding + room broadcast + winner selection | Scenario 2 |
| 27 | Contractor Certification Vault | M4 | Upload commercial register, upload tax card, upload engineering license, track expiry dates, verify document status | Upload expired license, corrupted file upload, oversized PDF/image, missing required certificate, revoke invalid license | Certification + compliance check + tender bidding | Scenario 2 |
| 28 | Live Multi-Auction Supervision Hub | M5 | Admin grid view, active room tickers, live volume aggregation, high-risk flag highlight, filter rooms by governorate | Unauthorized access non-admin, empty active rooms, high concurrency tickers, stale ticker handling, multi-currency display | Supervision + emergency controls + audit log | Scenario 4 |
| 29 | Emergency Auction Pause & Resume | M3 | Admin pauses auction, timer freeze, incoming bids rejected, admin resumes auction, timer restored & broadcast | Non-admin pause attempt, pause already paused auction, resume unpaused auction, bid placed while paused, pause reason missing | Pause + rollback + resume | Scenario 4 |
| 30 | Erroneous Bid Rollback | M3 | Admin cancels erroneous bid, restore previous highest bid, notify room of rollback, update current price, recalculate next min bid | Rollback non-existent bid, rollback by non-admin, rollback of only bid in auction, rollback on closed auction, rollback audit trail | Rollback + time extension + resume | Scenario 4 |
| 31 | Manual Time Extension | M3 | Admin adds extra minutes, compensate outage, broadcast extended time, update endsAt in DB, record admin reason | Negative extension seconds, extension by non-admin, extension beyond max safety cap, extension on completed deal, zero second extension | Outage extension + live bidding resumption | Scenario 4 |
| 32 | Bank & Hawala Deposit Queue | M2 | View pending vouchers, filter by channel (Kuraimi, OneCash), inspect receipt photo, match transfer ref, view user details | Empty queue, filter invalid channel, unauthorized viewer, duplicate voucher detection, missing receipt image | Queue review + approval + wallet credit | Scenario 5 |
| 33 | Deposit Approval & Instant Credit | M2 | Admin approves voucher, credit available balance, status `approved`, send SMS confirmation, write transaction log | Double approval attempt, approve already rejected voucher, approve by non-admin, negative amount voucher, balance overflow safety | Approval + wallet credit + escrow deposit | Scenario 5 |
| 34 | Deposit Rejection with Reason | M2 | Admin rejects voucher, record rejection reason, status `rejected`, send SMS explanation, balance untouched | Reject already approved voucher, rejection without reason, rejection by non-admin, resubmission with same ref, audit log entry | Rejection + SMS notice + user resubmission | Scenario 5 |
| 35 | Seller Payout Disbursement | M2 | Initiate manual payout, select channel (Kuraimi, Al-Omqy), deduct available balance, record payout reference, status `disbursed` | Payout exceeding available balance, payout to frozen funds, payout by non-admin, negative payout amount, duplicate disbursement | Acceptance + payout + audit record | Scenario 1, Scenario 5 |
| 36 | Platform Commission Accounting | M2 | Accrue 2.5% on completion, segregate by currency (YER, USD, SAR), compute cumulative fees, generate fee ledger entry, zero leakage | Fee on refunded deal (zero fee), fee rounding precision (2 decimals), unauthorized fee modification, currency conversion isolation, fee reconciliation | Completion + commission accounting + financial reporting | Scenario 5 |
| 37 | Real-Time Shill Bidding Sentinel | M1 | Detect matching bidder/seller IP, detect rapid bid inflation pattern, score risk confidence, flag auction `suspicious`, notify moderator | Different IP legitimate bids, low confidence below threshold, empty bid history, seller different subnet, proxy IP handling | Sentinel flag + admin pause + account ban | Scenario 4 |
| 38 | Shadow Account Blacklisting & Device Ban | M5 | Ban user ID, blacklist device fingerprint, block login/bidding, cancel active bids, record ban justification | Ban already banned user, ban by non-admin, access attempt from banned device, ban appeal status, unban workflow | Sentinel detection + device ban + blacklist check | Scenario 4 |
| 39 | National ID OCR & Data Extraction | M2 | Extract full name, extract national ID number, extract birth date, extract issuing authority, compute OCR confidence score | Blurry image low confidence, non-Yemeni ID card format, forged/tampered text, corrupted ID image, partial field extraction | OCR extraction + selfie match + KYC approval | Scenario 5 |
| 40 | Selfie Liveness & Verification | M2 | Verify liveness check, match selfie against ID photo, compute facial confidence score, pass match threshold (>=0.85), store result | Static photo spoof attempt, face mismatch (<0.70 score), multiple faces in frame, missing ID portrait, poor lighting failure | Liveness + OCR + verified badge | Scenario 5 |
| 41 | KYC Approval / Rejection Workflow | M2 | Admin reviews OCR & selfie, approve KYC status `verified`, grant bidder privileges, reject with reason note, update profile | Approve already verified user, reject without reason note, review by non-admin, review unsubmitted user, status rollback prevention | KYC approval + trusted seller + bidding eligibility | Scenario 5 |
| 42 | AI Evidence Difference Analyzer | M2 | Compare listing photo vs defect photo, identify damage/crack not in original, summarize evidence, recommend settlement ratio, assist officer | Identical photos uploaded, completely unrelated photo, low quality evidence photo, ungrounded claim, multi-photo discrepancy list | Evidence analysis + arbitration chat + ruling | Scenario 3 |
| 43 | Binding Arbitration Ruling | M2 | Issue refund to buyer, issue payout to seller, issue split settlement, release frozen funds accordingly, close dispute | Ruling without officer authorization, split ratio not summing to 100%, ruling on closed dispute, negative split amount, dispute appeal window | Evidence analyzer + binding ruling + fund split | Scenario 3 |
| 44 | Regional & Currency GMV Dashboards | M5 | Aggregate GMV by governorate, calculate completion rates, group GMV by currency (YER, USD, SAR), render volume chart metrics, time range filter | Empty governorate data, multi-currency unmixed totals, division by zero deals, future date filter, non-admin access | Regional aggregation + commission tracking | Scenario 5 |
| 45 | Multi-Currency Digital Wallet | M2 | Maintain YER balance, maintain USD balance, maintain SAR balance, separate available vs frozen, transaction history ledger | Negative balance transaction, cross-currency illegal swap, frozen balance overdraft, balance discrepancy check, zero-amount transfer | Multi-currency deposit + lock + refund + payout | Scenario 5 |
| 46 | Yemeni SMS OTP Gateway Integration | M1 | Validate carrier prefix (77x, 73x, 71x, 70x), generate 6-digit OTP, send OTP code, verify correct code, expire after 300s | Invalid carrier prefix (e.g. 78x), expired OTP code, incorrect OTP code, replay used code, brute-force rate limit (5 attempts) | SMS OTP + registration + KYC verification | Scenario 5 |
| 47 | Offline-First PWA & Asset Optimization | M4 | Service worker cache hit, PWA manifest verification, bundle size check (<500KB), offline fallback response, static asset caching | Offline bid submission queue, stale cache invalidation, cache storage quota limit, unsupported browser fallback, network reconnection sync | PWA cache + live bidding + offline recovery | Scenario 4 |
| 48 | Audit Logging & Change Tracking | M2 | Log admin pause action, log deposit approval, log dispute ruling, log manual extension, query audit logs by actor/target | Audit log tampering prevention, log query with invalid date, non-admin audit log view, missing action metadata, high-volume log throughput | Audit logging across all administrative interventions | All Scenarios |

---

## 3. Test Architecture & Runner Invocation Semantics

### 3.1 Directory & File Layout

```
tests/
└── e2e/
    ├── harness/
    │   ├── test-framework.ts         # Lightweight, zero-dependency Vitest-compatible runner & assertion suite
    │   ├── types.ts                  # Comprehensive domain types & test contracts
    │   ├── fixtures.ts               # Pre-configured test fixtures (users, wallets, listings, vouchers)
    │   └── mock-platform.ts          # Deterministic in-memory Mozaid AI platform implementation
    ├── tier1-features.test.ts        # Tier 1: 48 Features × >=5 Happy Path Tests (240+ test cases)
    ├── tier2-boundaries.test.ts      # Tier 2: 48 Features × >=5 Boundary/Corner Tests (240+ test cases)
    ├── tier3-cross-feature.test.ts   # Tier 3: Cross-Feature Pairwise & Multi-Module Combination Tests
    ├── tier4-scenarios.test.ts       # Tier 4: Comprehensive Real-World Yemeni Market End-to-End Scenarios
    └── runner.ts                     # Master CLI test runner executing all tiers and reporting metrics
```

### 3.2 Runner Invocation Semantics

The test suite is executable in two fully supported modes:

1. **Standalone Native Mode (Zero External Dependencies)**:
   ```powershell
   node --experimental-strip-types tests/e2e/runner.ts
   ```
   - Requires only Node.js (v22+).
   - Instantly compiles and executes all 4 tiers without waiting for `node_modules` installations.
   - Outputs comprehensive ANSI-colored progress, test case counts per feature, execution durations, and a complete coverage scorecard.

2. **Vitest Integration Mode**:
   ```powershell
   npx vitest run tests/e2e/
   ```
   - Automatically detected when `vitest` is installed in `node_modules`.
   - Compatible with CI/CD pipelines, coverage reports (`c8`/`istanbul`), and IDE test explorers.

---

## 4. Coverage Thresholds & Quality Invariants

| Tier | Focus Area | Required Count | Target Metric |
|------|------------|----------------|---------------|
| **Tier 1** | Primary Feature Behavior (Happy Paths) | >=5 test cases per feature | 48 features × 5 = **240 test cases minimum** |
| **Tier 2** | Boundary, Corner & Edge Cases | >=5 test cases per feature | 48 features × 5 = **240 test cases minimum** |
| **Tier 3** | Cross-Feature Combinations & State Transitions | >=15 comprehensive multi-module flows | **100% Core Module Interaction Coverage** |
| **Tier 4** | Real-World Yemeni Market Application Scenarios | 5 complete end-to-end multi-actor workflows | **100% Real-World Persona & Currency Coverage** |

### Absolute Invariants Enforced by Tests
1. **Zero-Leakage Commission Invariant**: Platform commission is exactly 2.50% on all successful forward auctions. Escrow payout + Platform Fee = Total Winning Amount.
2. **Anti-Sniping Safety Ceiling**: Extensions cannot exceed 20 consecutive triggers (maximum +2400 seconds) under any circumstance.
3. **Dual-Wallet Segregation**: `available_balance + frozen_escrow_balance` must strictly equal total deposited funds minus withdrawals/purchases.
4. **Anonymous Tender Integrity**: In reverse tenders, supplier identities are strictly masked in public room broadcasts until conditional awarding is formalized.
5. **Carrier-Specific Validation**: Phone numbers must strictly adhere to Yemeni telecom operator prefixes: Yemen Mobile (`77x`), YOU (`73x`), Sabafon (`71x`), Y (`70x`).

---

## 5. Real-World Application Scenarios (Tier 4 Specifications)

### Scenario 1: Prime Commercial Real Estate Forward Auction (Sana'a - Hadda District)
- **Context**: A commercial office building in Sana'a listed at 150,000,000 YER.
- **Workflow**:
  1. Multimodal AI listing generation and manual configuration with 5,000,000 YER Araboon deposit requirement.
  2. Four verified bidders lock required deposits in their YER wallets.
  3. Live bidding room opens; bids escalate rapidly with +1,000,000 YER increments.
  4. At T-45s remaining, a bid triggers Anti-Sniping extension (+120s).
  5. Winning bid placed at 165,000,000 YER.
  6. Losing bidders automatically receive full deposit unlock back to available balances.
  7. Winner funds winning escrow balance via Kuraimi Bank transfer voucher.
  8. Seller confirms property deed handover and buyer inspects premises during 48h inspection window.
  9. Buyer confirms acceptance: 2.5% platform fee (4,125,000 YER) credited to platform ledger, 160,875,000 YER credited to seller.
  10. Seller earns Trusted Seller badge following transaction completion.

### Scenario 2: Hospital Solar Energy & Battery System Reverse Procurement (Aden)
- **Context**: Al-Amal Hospital issues a reverse procurement tender for a 100kW hybrid solar system with a 65,000 USD budget ceiling.
- **Workflow**:
  1. Tenderer drafts formal RFP using Gemini AI tender prompt.
  2. Tender published with technical specifications, ISO certifications, and Yemen engineering licenses required.
  3. Smart matching notifies three qualified renewable energy contractors in Aden.
  4. Real-time reverse bidding session opens: contractors submit decreasing competitive bids (62,000 USD -> 59,500 USD -> 57,000 USD).
  5. Bids broadcast anonymously with masked contractor handles (`المورد #1`, `المورد #2`).
  6. Tender closes; Tenderer reviews contractor certification vault (tax cards, engineering licenses).
  7. Conditional awarding granted to the contractor offering optimal technical quality and pricing.
  8. Performance escrow guarantee locked in USD.

### Scenario 3: Commercial Cargo Truck Auction & Disputed Transmission Defect (Taiz)
- **Context**: Medium-duty commercial truck sold in Taiz for 12,000,000 YER.
- **Workflow**:
  1. Forward auction completed; winner locks escrow payment.
  2. Seller marks truck as dispatched for physical inspection.
  3. 48-hour physical inspection window starts.
  4. Buyer mechanical inspection uncovers internal transmission crack omitted from auction listing description.
  5. Buyer files formal dispute at hour 26 with workshop defect photos.
  6. Escrow funds locked; tripartite digital arbitration room opens connecting Buyer, Seller, and Platform Dispute Officer.
  7. AI Evidence Difference Analyzer scans original listing photos vs workshop defect photos and flags genuine non-disclosed mechanical crack.
  8. Dispute Officer proposes binding settlement: 30% repair compensation refund to buyer (3,600,000 YER) and 70% net payout to seller (8,400,000 YER minus fee).
  9. Both parties accept; escrow funds released according to binding arbitration split; audit log recorded.

### Scenario 4: Agricultural Water Well Machinery Auction Under Grid Outage (Hodeidah)
- **Context**: High-capacity industrial water pump auction in Hodeidah with severe local telecom/grid outages.
- **Workflow**:
  1. Live auction active; bidder accidentally types an extra zero (5,000,000 YER instead of 500,000 YER) due to mobile lag.
  2. Severe telecom outage cuts connectivity for several bidders.
  3. Live Multi-Auction Supervision Hub alerts Admin.
  4. Admin activates Emergency Auction Pause: countdown freezes, room notified.
  5. Admin executes Erroneous Bid Rollback: cancels 5,000,000 YER bid, restores previous valid high bid (450,000 YER).
  6. Admin grants Manual Time Extension (+120 minutes) to compensate for local telecom outage.
  7. Admin resumes auction; connectivity recovers and bidders conclude auction fairly; full administrative audit trail preserved.

### Scenario 5: Multi-Currency Digital Wallet, SMS OTP, and Hawala Voucher Cycle
- **Context**: User registration, KYC verification, multi-currency deposit, and platform accounting cycle.
- **Workflow**:
  1. User registers with Yemen Mobile phone number (`+967 777123456`); system validates carrier prefix and verifies 6-digit SMS OTP.
  2. User uploads Yemeni Smart National ID; OCR extracts full name and 11-digit national ID number.
  3. User completes selfie liveness check; facial match confidence reaches 0.94; Admin approves KYC verified badge.
  4. User deposits funds across multiple channels:
     - 10,000,000 YER via Kuraimi Bank transfer voucher.
     - 5,000 USD via OneCash digital wallet slip.
     - 20,000 SAR via Al-Omqy Exchange hawala receipt.
  5. Financial Admin inspects queue and approves all three vouchers; balances credited to separate currency ledgers in wallet.
  6. User executes trades across currencies; platform commission accounting aggregates 2.5% revenue segregated by currency without cross-rate leakage.
  7. Regional GMV dashboard displays live volume charts across Sana'a, Aden, Taiz, and Hodeidah governorates.
