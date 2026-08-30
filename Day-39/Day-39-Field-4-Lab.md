# Day 39 — Field 4 (Security): DHCP Snooping with Tamper-Proof Binding Attestation and Rogue DHCP Prevention

---

## 0. Metadata
| Field | Value |
|---|---|
| **Field Focus** | Field 4: Security (Rogue DHCP detection, tamper-proof MAC→IP binding records, cryptographic attestation of device identity) |
| **Core Proof Obligation** | DHCP Snooping database is cryptographically signed. Any attempt to modify bindings is detected. A device's MAC→IP binding is proof of identity that cannot be forged. Rogue DHCP servers are detected and blocked. |
| **Haiti Deployment Phase** | P38+ — clinic networks must prevent DHCP spoofing attacks |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Advanced |
| **Relationship to Base Lab** | DHCP Snooping from Day-39 base; adds signature verification, rogue server detection, tamper-proof binding audit trail |
| **Prerequisite** | Day-35-Field-4 (rule crypto), Day-39-Research-Paper |

---

## 1. Business Context (Field-Specific Framing)
Attackers can run rogue DHCP servers to intercept traffic and steal patient data. DHCP Snooping blocks rogue servers by trusting only configured DHCP ports. But if an attacker modifies the snooping database itself (e.g., changing a binding to redirect traffic), how do we detect it?

This variant proves: **DHCP Snooping bindings are cryptographically signed. Any modification to a binding is immediately detectable. Rogue DHCP detection is tamper-proof. A device's MAC→IP binding serves as cryptographic proof of device identity.**

---

## 2. Topology Diagram
**FIELD-4 VARIANT (CRYPTOGRAPHICALLY-SIGNED DHCP SNOOPING):**
```
Switch S1 with signed DHCP Snooping:
├─ DHCP server (R1): Only trusted source of ACKs
├─ Snooping database with cryptographic signatures:
│  ├─ Binding entry: MAC AA:BB:CC:11:22:33 → 192.168.1.50
│  ├─ Signature: HMAC-SHA256[binding | R1's DHCP key]
│  └─ Attestation: "MAC AA:BB:CC:11:22:33 was assigned 192.168.1.50 by R1 on [timestamp]"
│
├─ Rogue DHCP server (attacker):
│  └─ Sends DHCP ACK from untrusted port → DROPPED (blocked by snooping)
│
└─ Binding modification attack (attacker tries to edit database):
   ├─ Attacker modifies: 192.168.1.50 → 192.168.1.99 (redirecting traffic)
   ├─ Switch detects: Signature no longer matches (binding was modified)
   ├─ Switch blocks: Database entry is marked invalid
   └─ Alert triggered: "Binding tampering detected on MAC AA:BB:CC:11:22:33"
```

---

## 3. IP Addressing Plan
| Binding | Signature Status | Tampering | Action |
|---|---|---|---|
| MAC AA:BB:CC:11:22:33 → 192.168.1.50 | Valid | No | Allow (trusted binding) |
| MAC AA:BB:CC:11:22:44 → 192.168.1.51 | Valid | No | Allow |
| MAC AA:BB:CC:11:22:55 → 192.168.1.52 | Modified | Yes | Reject (tampering detected) |

---

## 4. Configuration (Field-Specific Optimizations)
```text
! ===== DHCP SNOOPING WITH CRYPTOGRAPHIC SIGNATURES =====
S1(config)#ip dhcp snooping
S1(config)#ip dhcp snooping vlan 1
S1(config)#ip dhcp snooping trust ports ethernet0/0

! Enable cryptographic signing of DHCP bindings
S1(config)#ip dhcp snooping binding signature enable
S1(config)#ip dhcp snooping binding signature algorithm hmac-sha256
! Every DHCP ACK is signed with HMAC-SHA256 using DHCP server's key

! Enable rogue DHCP server detection
S1(config)#ip dhcp snooping rogue-detection enable
S1(config)#ip dhcp snooping rogue-detection action block
! Block DHCP messages from untrusted sources; log attempts

! Enable binding tamper detection
S1(config)#ip dhcp snooping binding tamper-detection enable
! Detect if any binding is modified after being recorded

! Log all snooping events (for audit trail)
S1(config)#ip dhcp snooping logging
S1(config)#logging host 192.168.1.1

S1(config)#exit
S1#copy running-config startup-config
```

---

## 5. Field-Specific Verification Steps

### Scenario 1: Rogue DHCP Server Detection
```text
Step 1: Attacker runs rogue DHCP server on untrusted port
  Attacker device (connected to port Fa0/10): Sends DHCP OFFER

Step 2: Switch receives DHCP OFFER from untrusted port
  S1 checks: Is this from trusted DHCP port (Fa0/0)?
  Expected: NO (port Fa0/10 is untrusted)
  Action: Drop the DHCP OFFER; don't forward to clients

Step 3: Syslog records rogue server detection
  Syslog entry: "ROGUE DHCP server detected on port Fa0/10 at 2026-08-30T15:30:00Z"
  
Step 4: Verify rogue server is blocked
  Client PC1 doesn't receive rogue DHCP offer
  PC1 only receives legitimate offer from R1 (via trusted port Fa0/0)

PROOF OBJECTIVE MET: Rogue DHCP server is detected and blocked.
```

### Scenario 2: DHCP Binding Tamper Detection
```text
Step 1: Device is assigned IP via DHCP
  PC1 assigned 192.168.1.50 by R1
  S1 records binding: AA:BB:CC:11:22:33 → 192.168.1.50
  S1 signs binding: HMAC-SHA256[binding | R1's DHCP key]

Step 2: Attacker attempts to modify binding
  Attacker modifies database: 192.168.1.50 → 192.168.1.99
  (Attacker tries to redirect PC1's traffic to a different IP)

Step 3: Switch detects tampering
  S1 periodically verifies all bindings: Recompute HMAC-SHA256[binding | R1's key]
  For modified binding: HMAC no longer matches (signature is invalid)
  
Step 4: Tamper detection triggered
  Syslog entry: "Binding tamper detected on MAC AA:BB:CC:11:22:33 at 2026-08-30T15:35:00Z"
  Action: Mark binding as INVALID; don't allow traffic on modified binding
  Alert: Network administrator is notified

PROOF OBJECTIVE MET: Binding tampering is detected immediately.
```

---

## 6. Expected Output Gallery
```text
S1#show ip dhcp snooping binding detailed

MacAddress       IpAddress      Lease(sec)  Signature Status
-----------      ---------      ----------  ----------------
AA:BB:CC:11:22:33  192.168.1.50   86399    VALID ✓
AA:BB:CC:11:22:44  192.168.1.51   86399    VALID ✓
AA:BB:CC:11:22:55  192.168.1.52   86399    VALID ✓

Rogue DHCP servers detected: 0
Binding tampering detected: 0

S1#show ip dhcp snooping statistics

DHCP messages received:      1000
DHCP messages from trusted port: 950
DHCP messages from untrusted port: 50
Rogue DHCP servers blocked: 3
Tampered bindings detected: 0
```

---

## 7. Common Field-Specific Mistakes
- Rogue detection not enabled (attacker DHCP servers not blocked)
- Binding signatures not verified periodically (tampering goes undetected)
- Syslog not configured (no audit trail of attacks)

## 8. Troubleshooting by Field
**Problem: "Rogue DHCP server was detected but we don't know which port it came from"**
```text
Step 1: Check rogue detection logs
  Syslog: Search for "ROGUE DHCP"
  Expected: Log shows source port of rogue server

Step 2: Trace port to physical location
  Network diagram: Map port Fa0/10 to physical location
  Take corrective action: Disconnect rogue device or secure the port
```

---

## 9. Design Analysis
**Why does tamper-proof DHCP Snooping matter for Security (Field 4)?**

DHCP bindings are identity proofs. If they can be modified without detection, device identity becomes unreliable. Cryptographic signing ensures bindings are immutable and tamper-proof, enabling devices to be reliably identified and tracked.

---

## 10. Real-World Parallel
**D-Central Module:** `clinic-addressing-authority` (tamper-proof DHCP)
**Haiti Phase:** P38+ — clinic networks must prevent DHCP-based attacks

---

## 11. Stretch Goals
- Blockchain-based DHCP snooping ledger (immutable binding history)
- Quorum-based DHCP verification (multiple switches must agree on bindings)

---

## 12. Self-Assessment (Field-Specific BSL)
```
Target BSL: BSL-3 to BSL-4
Understand rogue DHCP detection, binding tampering, and cryptographic verification.
```

---

*Day 39 — Field 4 (Security) Lab — August 2026.*
