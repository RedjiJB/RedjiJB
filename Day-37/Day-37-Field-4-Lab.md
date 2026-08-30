# Day 37 — Field 4 (Security): CDP/NTP Continued — Mesh-Wide Attestation and Byzantine Resilience

---

## 0. Metadata
| Field | Value |
|---|---|
| **Field Focus** | Field 4: Security (Mesh-wide device attestation, Byzantine resilience, quorum-based identity verification) |
| **Core Proof Obligation** | In a mesh with N routers, a device must prove its identity to a quorum of (N/2)+1 neighbors. A Byzantine device claiming to be R2 will be rejected if a majority of neighbors verify the signature fails. Device identity is Byzantine-resistant. |
| **Haiti Deployment Phase** | P38+ pilot — mesh must operate securely even if some routers are compromised |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Advanced |
| **Relationship to Base Lab** | Extends Day-36 CDP to multi-router mesh; adds quorum-based verification and Byzantine attack detection |
| **Prerequisite** | Day-36-Field-4, Day-35-Field-4 (stateful tracking) |

---

## 1. Business Context (Field-Specific Framing)
Day-36 proved that a single router can authenticate a neighbor via CDP cryptographic signature. But what if that router is compromised and starts accepting forged signatures? A Byzantine (compromised) router could collude with an attacker to accept false neighbors.

This variant proves: **Device identity in a mesh is verified by quorum consensus. A device must prove its identity to (N/2)+1 neighbors. If a Byzantine router says "this neighbor is authentic," but the quorum disagrees, the device is still rejected. Device identity becomes Byzantine-resistant.**

---

## 2. Topology Diagram
**FIELD-4 VARIANT (QUORUM-BASED MESH IDENTITY VERIFICATION):**
```
Mesh topology: 5 routers (R1, R2, R3, R4, R5)
├─ Full-mesh or near-full connectivity
├─ Each router verifies CDP announcements independently
├─ Quorum requirement: 3/5 routers must verify identity (simple majority)
│
Device claiming to be "R6" (attacker spoofing new router):
├─ Sends CDP announcement with fake MAC and signature
├─ R1 verifies: Signature invalid → REJECT
├─ R2 verifies: Signature invalid → REJECT
├─ R3 verifies: Signature invalid → REJECT (Byzantine router, accepts it anyway)
├─ R4 verifies: Signature invalid → REJECT
├─ R5 verifies: Signature invalid → REJECT
│
Quorum decision: 4/5 routers reject identity (don't add as neighbor)
Result: Attacker cannot join mesh despite Byzantine router's acceptance
│
BYZANTINE RESILIENCE: Even if 1 router is compromised (R3), mesh rejects the attacker.
```

---

## 3. IP Addressing Plan
| Router | MAC | Status | Quorum Votes | Result |
|---|---|---|---|---|
| R1 | AA:BB:CC:00:00:01 | Legitimate | VERIFY (accept) | Honest |
| R2 | BB:BB:CC:00:00:02 | Legitimate | VERIFY (accept) | Honest |
| R3 | CC:BB:CC:00:00:03 | Compromised | ACCEPT (wrong) | Byzantine |
| R4 | DD:BB:CC:00:00:04 | Legitimate | VERIFY (accept) | Honest |
| R5 | EE:BB:CC:00:00:05 | Legitimate | VERIFY (accept) | Honest |
| Attacker | FF:CC:CC:00:00:FF | Spoofing "R6" | REJECT (4/5) | Consensus rejects |

---

## 4. Configuration (Field-Specific Optimizations)
```text
! ===== MESH-WIDE CDP VERIFICATION =====
R1(config)#cdp run
R1(config)#interface GigabitEthernet0/0
R1(config-if)#cdp enable

! Enable quorum-based neighbor verification (extended feature)
R1(config)#cdp quorum-verification enable
R1(config)#cdp quorum-threshold 3
! Require 3/5 routers to verify neighbor identity (quorum = 60%)

R1(config)#cdp byzantine-resilience enable
! Enable Byzantine attack detection

R1(config-if)#exit

! ===== NTP FOR SYNCHRONIZED QUORUM DECISIONS =====
R1(config)#ntp server 192.168.1.1
! All routers sync time; quorum decisions are timestamped consistently

R1(config)#exit
R1#copy running-config startup-config

! Repeat similar config on R2, R3, R4, R5
```

---

## 5. Field-Specific Verification Steps

### Scenario 1: Legitimate Device Joins Mesh with Quorum Acceptance
```text
Step 1: New router R6 (legitimate) sends CDP announcement
  R6 MAC: 00:00:00:00:00:06
  R6 CDP Key: HKDF(MAC) → [valid cryptographic key]
  R6 announces: Identity 00:00:00:00:00:06, signature: HMAC[MAC]

Step 2: All mesh routers (R1-R5) verify R6's announcement
  R1 verifies: Signature valid → ACCEPT (vote: accept)
  R2 verifies: Signature valid → ACCEPT
  R3 verifies: Signature valid → ACCEPT
  R4 verifies: Signature valid → ACCEPT
  R5 verifies: Signature valid → ACCEPT

Step 3: Quorum decision (5/5 accept > 3/5 threshold)
  Result: R6 is added to mesh as a trusted neighbor
  
PROOF OBJECTIVE MET: Legitimate device is accepted by quorum consensus.
```

### Scenario 2: Byzantine Attacker Joins Mesh (Quorum Rejects)
```text
Step 1: Attacker claims to be "R6" with spoofed MAC
  Attacker MAC: FF:CC:CC:00:00:FF (not a legitimate device)
  Attacker announces: Identity 00:00:00:00:00:06 (spoofing R6), signature: [forged]

Step 2: All mesh routers verify attacker's announcement
  R1 verifies: Signature invalid (wrong key) → REJECT
  R2 verifies: Signature invalid → REJECT
  R3 (BYZANTINE) verifies: Signature invalid, but accepts anyway (compromised) → ACCEPT
  R4 verifies: Signature invalid → REJECT
  R5 verifies: Signature invalid → REJECT

Step 3: Quorum decision (4/5 reject > 3/5 threshold for acceptance)
  Honest routers: 4 (R1, R2, R4, R5) reject
  Byzantine router: 1 (R3) accepts
  Quorum result: 4 reject, 1 accepts → REJECT (honest votes win)
  
Result: Attacker is NOT added to mesh, despite Byzantine router's acceptance

BYZANTINE RESILIENCE: Quorum consensus overrides 1 compromised router.

PROOF OBJECTIVE MET: Byzantine attack is prevented even with compromised routers.
```

---

## 6. Expected Output Gallery
```text
R1#show cdp neighbors identity-verification status

Router ID: R1 (AA:BB:CC:00:00:01)
Quorum Threshold: 3/5 routers must verify
Byzantine Resilience: ENABLED

Neighbor Identity Verification Results:
  R2 (BB:BB:CC:00:00:02)
    Local verification: PASS
    Quorum votes: 5/5 accept (all routers verified)
    Byzantine votes: 0
    Identity status: VERIFIED ✓

  R3 (CC:BB:CC:00:00:03)
    Local verification: PASS
    Quorum votes: 5/5 accept
    Byzantine votes: 0
    Identity status: VERIFIED ✓

  [Attacker claiming R6]
    Local verification: FAIL (invalid signature)
    Quorum votes: 1/5 accept (only R3 accepts, 4 reject)
    Byzantine votes: 1 (R3)
    Identity status: REJECTED (doesn't meet quorum threshold)
    Note: Attacker blocked despite 1 Byzantine router support
```

---

## 7. Common Field-Specific Mistakes
- Quorum threshold too low (allows Byzantine routers to accept attackers)
- Not tracking Byzantine votes (cannot detect which routers are compromised)
- Quorum decision not timestamped consistently (temporal attacks possible)

## 8. Troubleshooting by Field
**Problem: "Legitimate neighbor is rejected by quorum"**
```text
Step 1: Check neighbor's signature
  Expected: Signature valid (can be recomputed from neighbor's MAC)
  If invalid: Neighbor's configuration is corrupted

Step 2: Check quorum votes
  R1#show cdp neighbors [device-id] quorum-votes
  Expected: Most routers accept (quorum threshold met)
  If < threshold: Multiple routers reject; investigate why

Step 3: Check for Byzantine router
  Expected: All honest routers agree
  If divergence: Some routers may be Byzantine (compromised)
```

---

## 9. Design Analysis
**Why does Byzantine-resistant CDP matter for Security (Field 4)?**

In an unmanaged mesh, no single router is trusted. Byzantine resilience ensures device identity survives even if some routers are compromised, making the mesh resilient to insider attacks.

---

## 10. Real-World Parallel
**D-Central Module:** `mesh-discovery` (Byzantine-resilient device attestation)
**Haiti Phase:** P38+ — remote mesh sites may be compromised; identity must survive

---

## 11. Stretch Goals
- Formal Byzantine resilience proof (N > 3F for F Byzantine routers)
- Cryptographic quorum signing (quorum decision itself is signed)

---

## 12. Self-Assessment (Field-Specific BSL)
```
Target BSL: BSL-3 to BSL-4
Understand quorum-based verification, Byzantine attacks, and resilience.
```

---

*Day 37 — Field 4 (Security) Lab — August 2026.*
