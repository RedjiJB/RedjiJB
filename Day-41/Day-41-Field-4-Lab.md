# Day 41 — Field 4 (Security): SNMP Decentralized Monitoring with Cryptographic Device Attestation and Tamper-Proof Telemetry

---

## 0. Metadata
| Field | Value |
|---|---|
| **Field Focus** | Field 4: Security (Decentralized SNMP monitoring, cryptographic attestation of monitored devices, tamper-proof telemetry collection, no external cloud dependency) |
| **Core Proof Obligation** | SNMP queries and responses are cryptographically signed. Device metrics (CPU, memory, link status) reported via SNMP are verified to come from known devices. Monitoring data cannot be forged or tampered with. |
| **Haiti Deployment Phase** | P38+ — mesh must monitor itself locally without cloud dependency; monitoring must be trustworthy |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Advanced |
| **Relationship to Base Lab** | SNMP monitoring from Day-41 base; adds cryptographic authentication, tamper detection, decentralized collection (no cloud monitoring service) |
| **Prerequisite** | Day-36-Field-4 (CDP attestation), Day-41-Research-Paper |

---

## 1. Business Context (Field-Specific Framing)
Cloud monitoring services (Splunk, Datadog) receive all operational metrics and can observe network patterns. Haiti clinics need monitoring for troubleshooting but can't leak operational telemetry to external cloud. Decentralized SNMP monitoring lets routers collect metrics locally. But how do we trust SNMP data if an attacker spoofs metrics?

This variant proves: **SNMP metrics are cryptographically signed by source routers. A monitoring station can verify that metrics come from known devices and haven't been tampered with. Monitoring is decentralized (no cloud); attestation is cryptographic.**

---

## 2. Topology Diagram
**FIELD-4 VARIANT (AUTHENTICATED DECENTRALIZED SNMP):**
```
Monitoring Architecture:
├─ Local monitoring station (Raspberry Pi on clinic LAN)
│  ├─ SNMP Manager (reads metrics from all routers)
│  ├─ Trusts only signed SNMP responses
│  └─ Verifies signatures using router public keys (from MAC-derived identities)
│
├─ R1 (NYC Router) running SNMP Agent
│  ├─ Identity: MAC AA:BB:CC:00:00:01, IPv6 2001:DB8:0:1::1
│  ├─ SNMP signing key: Derived from MAC
│  ├─ Metrics: CPU 45%, Memory 60%, Link status: UP
│  └─ Response: SNMP reply + signature (HMAC-SHA256[metrics | R1's key])
│
├─ R2 (Tokyo Router) running SNMP Agent
│  ├─ Identity: MAC BB:BB:CC:00:00:02
│  ├─ Metrics: CPU 30%, Memory 50%, Link status: UP
│  └─ Response signed with R2's MAC-derived key
│
└─ Attack scenario (attacker spoofs metrics):
   ├─ Attacker sends fake SNMP response: "R1 CPU 99%, memory critical"
   ├─ Monitoring station receives response
   ├─ Station verifies signature using R1's public key
   ├─ Signature doesn't match (attacker doesn't know R1's key)
   └─ Fake metrics are rejected as untrusted
```

---

## 3. IP Addressing Plan
| Device | Identity (MAC) | SNMP Signing Key | Metrics Trustworthiness |
|---|---|---|---|
| R1 | AA:BB:CC:00:00:01 | HKDF(MAC) | **SNMP metrics from R1 are signed; monitoring station verifies** |
| R2 | BB:BB:CC:00:00:02 | HKDF(MAC) | **SNMP metrics from R2 are signed; trust verified** |
| Monitor | [Local] | [Trusted] | **Monitoring station holds public keys of all routers** |

---

## 4. Configuration (Field-Specific Optimizations)
```text
! ===== ROUTER R1: SNMP AGENT WITH CRYPTOGRAPHIC SIGNING =====
R1(config)#snmp-server community public RO 1
! Restrict to trusted monitoring station (1.1.1.1)

R1(config)#snmp-server host 192.168.1.1 version 3 priv public
! Send SNMP traps to local monitoring station with encryption

! Enable SNMP authentication (Sign all SNMP messages)
R1(config)#snmp-server user monitor default auth sha shared-auth-key priv aes 128 shared-priv-key
! User "monitor" with authentication (auth) and encryption (priv)
! Auth key and priv key are derived from R1's MAC identity

! Enable SNMP message signing (Field-4 security feature)
R1(config)#snmp-server signing enable
R1(config)#snmp-server signing algorithm hmac-sha256
! Every SNMP message is signed with HMAC-SHA256 using R1's key

R1(config)#exit
R1#copy running-config startup-config

! Repeat for R2:
R2(config)#snmp-server user monitor default auth sha shared-auth-key priv aes 128 shared-priv-key
R2(config)#snmp-server signing enable
```

---

## 5. Field-Specific Verification Steps

### Scenario 1: Trusted SNMP Data Collection
```text
Step 1: Monitoring station queries R1's metrics
  Monitor#snmpget R1 1.3.6.1.2.1.25.3.2.1.5.1 (CPU usage OID)

Step 2: R1 responds with signed SNMP data
  R1 response: CPU usage = 45%
  Signature: HMAC-SHA256[metrics | R1's SNMP key]

Step 3: Monitoring station verifies signature
  Monitor verifies: HMAC-SHA256[metrics | R1's public key]
  Expected: Signature valid ✓
  
  Result: Monitoring station trusts CPU metric came from R1 (verified via signature)

Step 4: Store trusted metric in local database
  Local monitoring database records:
    Timestamp: 2026-08-30T15:00:00Z
    Source: R1 (MAC AA:BB:CC:00:00:01) [VERIFIED]
    Metric: CPU = 45%
    Signature: VALID ✓

PROOF OBJECTIVE MET: SNMP metric is trusted because it's cryptographically verified.
```

### Scenario 2: Spoofed SNMP Metrics Attack Blocked
```text
Step 1: Attacker sends forged SNMP response
  Attacker sends: "CPU usage = 99%, memory = 95%, link down"
  Pretending to be R1
  Signature: [forged HMAC]

Step 2: Monitoring station receives forged response
  Station queries for R1's CPU metric
  Receives spoofed metric: CPU 99%
  Signature in response: [attacker's HMAC]

Step 3: Station verifies signature
  Station computes: HMAC-SHA256[metrics | R1's public key]
  Expected signature: HMAC-SHA256[CPU 99% | R1's actual key]
  Actual signature: [attacker's HMAC]
  
  MISMATCH: Signatures don't match

Step 4: Spoofed metrics are rejected
  Syslog entry: "SNMP metric from R1 failed verification at 2026-08-30T15:05:00Z"
  Monitoring station doesn't update dashboard with spoofed metrics
  
Result: False metrics are rejected; monitoring data integrity is maintained

PROOF OBJECTIVE MET: Spoofed SNMP metrics cannot bypass signature verification.
```

---

## 6. Expected Output Gallery
```text
Monitor#show snmp metrics R1

SNMP Metrics from R1 (MAC AA:BB:CC:00:00:01):
  Timestamp: 2026-08-30T15:00:00Z
  Source verification: CRYPTOGRAPHICALLY VERIFIED ✓
  
  CPU usage: 45%
  Memory usage: 60%
  Link 1 status: UP
  Link 2 status: UP
  Uptime: 45 days 3 hours
  
Signature verification: PASS
Trust level: HIGH (metrics cryptographically verified)

Monitor#show snmp monitoring-station statistics

Local Monitoring Dashboard:
  Routers monitored: 2 (R1, R2)
  Metrics collected: 12
  Metrics verified: 12 (100%)
  Spoofed metrics blocked: 0
  
Monitoring cloud dependency: NONE (fully decentralized)
```

---

## 7. Common Field-Specific Mistakes
- SNMP authentication not enabled (messages not signed, can be spoofed)
- Monitoring station doesn't verify signatures (accepts spoofed metrics)
- Cloud monitoring service still used despite SNMP auth (defeats decentralization purpose)

## 8. Troubleshooting by Field
**Problem: "SNMP metrics fail verification"**
```text
Step 1: Verify R1's SNMP signing key is correct
  R1#show running-config | include "snmp.*signing"
  Expected: "snmp-server signing enable" is configured
  If missing: Configure signing on R1

Step 2: Verify monitoring station has R1's public key
  Monitor#show snmp public-keys
  Expected: R1's public key (MAC-derived) is stored
  If missing: Import R1's public key

Step 3: Re-verify signature
  Monitor#snmpget R1 1.3.6.1.2.1.25.3.2.1.5.1 verify-signature
  Expected: Signature verifies with R1's key
  If fails: Key mismatch; check that monitoring station has current R1 key
```

---

## 9. Design Analysis
**Why does authenticated SNMP matter for Security (Field 4)?**

Monitoring data reveals network health, device behavior, and operational patterns. If attacker spoofs monitoring data, they can: (1) hide network compromises, (2) cause false alerts, (3) disrupt operations by faking critical metrics. Cryptographic SNMP authentication ensures monitoring data is trustworthy.

---

## 10. Real-World Parallel
**D-Central Module:** `mesh-monitoring` (decentralized SNMP with authentication)
**Haiti Phase:** P38+ — mesh must self-monitor without external dependencies

---

## 11. Stretch Goals
- Blockchain-based SNMP metric ledger (immutable monitoring history)
- Byzantine-resistant monitoring quorum (multiple monitoring stations verify each metric)
- Real-time anomaly detection with cryptographic proofs

---

## 12. Self-Assessment (Field-Specific BSL)
```
Target BSL: BSL-3 to BSL-4
Understand authenticated SNMP, decentralized monitoring, and spoofing prevention.
```

---

*Day 41 — Field 4 (Security) Lab — August 2026. SNMP cryptographic authentication completes Phase 3 field-specific variants. All 15 labs created for Days 31-40.*
