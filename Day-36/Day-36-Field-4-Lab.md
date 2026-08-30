# Day 36 — Field 4 (Security): CDP/NTP with Cryptographic Device Attestation and Timestamped Identity Proof

## 0. Metadata
| Field | Value |
|---|---|
| **Field Focus** | Field 4: Security (Cryptographic device discovery attestation, NTP-synchronized proof-of-identity timestamps, tamper-resistant topology) |
| **Core Proof Obligation** | CDP neighbor announcements are cryptographically signed with device MAC-derived identity. NTP timestamps are synchronized across all devices. A device cannot join the mesh and claim to be neighbor X without proving it knows the cryptographic key tied to neighbor X's MAC. |
| **Haiti Deployment Phase** | P34 (security foundational), P38 pilot — device discovery must be authenticated |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Advanced |
| **Relationship to Base Lab** | CDP discovers neighbors; NTP synchronizes time. Field-4 adds: CDP announcements are signed, time is synchronized, and proof-of-identity is bound to MAC→IPv6→CDP-signature chain. |
| **Prerequisite** | Day-31-Field-4 (IPv6 identity), Day-32-Field-4 (OSPF auth), Day-36-Research-Paper |

## 1. Business Context (Field-Specific Framing)
CDP (Cisco Discovery Protocol) lets routers announce themselves to neighbors: "I'm router R1, version X, interface GigabitEthernet0/0." But what if an attacker announces: "I'm router R1 (spoofed identity), you should route through me"? Without cryptographic device attestation, mesh topology is vulnerable to spoofing attacks.

This variant proves: **CDP announcements are cryptographically signed using a key derived from the device's MAC address (proven in Day-31). NTP ensures all devices have synchronized time, making timestamps unforgeable. A device claiming to be neighbor X must prove it knows the key tied to X's MAC.**

---

## 2. Topology Diagram
**FIELD-4 VARIANT (CRYPTOGRAPHIC CDP ATTESTATION):**
```
R1 (NYC) Identity: MAC AA:BB:CC:00:00:01, IPv6 2001:DB8:0:1::1
├─ CDP Key: derived from MAC via HKDF(MAC + secret) = KEY_R1
├─ CDP Announcement (signed):
│  ├─ Device ID: R1 (NYC Clinic Router)
│  ├─ Interface: GigabitEthernet0/0
│  ├─ IP: 192.168.1.1
│  ├─ IPv6: 2001:DB8:0:1::1 (derived from MAC per Day-31)
│  └─ Signature: HMAC-SHA256[announcement | KEY_R1]
│
R2 (Tokyo) Identity: MAC BB:BB:CC:00:00:02, IPv6 2001:DB8:0:2::2
├─ CDP Key: derived from MAC = KEY_R2
├─ CDP Announcement (signed with KEY_R2)
│
NTP Master (R1) Timestamp: 2026-08-30T15:23:45.123Z (UTC, synchronized)
├─ All devices sync time to R1
└─ Timestamps on all CDP signatures use synchronized time
```

## 3. IP Addressing Plan
| Device | MAC | IPv6 (Derived) | CDP Key | Attestation |
|---|---|---|---|---|
| R1 | AA:BB:CC:00:00:01 | 2001:DB8:0:1::1 (A811:22FF:FE00:0001) | HKDF(MAC) | **CDP signature proves device is R1 (MAC-verified)** |
| R2 | BB:BB:CC:00:00:02 | 2001:DB8:0:2::2 (B911:22FF:FE00:0002) | HKDF(MAC) | **CDP signature proves device is R2 (MAC-verified)** |
| Time Source | [R1 NTP Master] | [Synchronized] | [NTP key] | **All timestamps are trusted and synchronized** |

---

## 4. Configuration (Field-Specific Optimizations)
```text
! ===== CDP WITH CRYPTOGRAPHIC SIGNING =====
R1(config)#cdp run
! Enable CDP globally

R1(config)#interface GigabitEthernet0/0
R1(config-if)#cdp enable
! Enable CDP on this interface

R1(config-if)#cdp advertise version 2
! Use CDP version 2 (supports additional fields for cryptographic data)

! Configure CDP cryptographic signing (extended/custom implementation)
R1(config)#cdp authentication method hmac-sha256
R1(config)#cdp authentication key-string shared-cdp-key
! (In production, key is derived from device MAC and stored securely)

R1(config-if)#exit

! ===== NTP CONFIGURATION (for timestamp synchronization) =====
R1(config)#ntp master 1
! Set R1 as NTP master (stratum 1)

R1(config)#ntp source 192.168.1.1
R1(config)#service timestamps log datetime msec
! All logs use NTP-synchronized timestamps with millisecond precision

R1(config)#exit
R1#copy running-config startup-config
```

## 5. Field-Specific Verification Steps
**Proof obligation:** CDP neighbors are authenticated; device identity is proven via MAC-derived cryptographic signatures.

### Scenario 1: CDP Neighbor Discovery with Cryptographic Verification
```text
Step 1: Query CDP neighbors on R1
  R1#show cdp neighbors
  Expected: Lists R2 as neighbor (if they're directly connected)
    Device ID: R2, Platform: Cisco, Ports: Gi0/0 to Gi0/1

Step 2: Query detailed CDP information including signature
  R1#show cdp neighbors detail
  Expected: For neighbor R2:
    Device ID: R2 (Tokyo Clinic Router)
    Entry address(es):
      IP: 192.168.2.2
      IPv6: 2001:DB8:0:2::2 (shows as derived EUI-64 format)
    Platform: Cisco 3945
    Capabilities: Router, Switch
    [CRYPTOGRAPHIC VERIFICATION]
    CDP Signature: HMAC-SHA256[announcement | KEY_R2]
    Signature Status: VERIFIED ✓

Step 3: Verify timestamp is synchronized via NTP
  R1#show ntp associations
  Expected: R2 is showing time from R1's NTP (synchronized)

Step 4: Verify IPv6 address matches MAC-derived EUI-64
  R2's MAC: BB:BB:CC:00:00:02
  Derived EUI-64: B911:22FF:FE00:0002
  CDP reports IPv6: 2001:DB8:0:2:B911:22FF:FE00:0002
  MATCH: ✓ Device identity is cryptographically verified

PROOF OBJECTIVE MET: R2's CDP announcement is authenticated and device identity is verified via MAC→IPv6 derivation.
```

### Scenario 2: CDP Spoofing Attack Prevention
```text
Step 1: Attacker sends forged CDP announcement claiming to be R2
  Attacker announces: "I'm R2 (spoofed), interfaces: Gi0/0, IPv6: 2001:DB8:0:2::2"
  Attacker's actual MAC: CC:CC:CC:00:00:03 (different from R2's BB:BB:CC:00:00:02)

Step 2: R1 receives forged announcement and attempts verification
  R1 queries: "Verify HMAC-SHA256[announcement | KEY_R2]"
  But attacker doesn't know KEY_R2 (derived from R2's MAC BB:BB:CC:00:00:02)
  Attacker can only compute: HMAC-SHA256[announcement | KEY_ATTACKER]
  
Step 3: Signature verification fails
  Expected signature: HMAC-SHA256[announcement | KEY_R2]
  Actual signature: HMAC-SHA256[announcement | KEY_ATTACKER]
  MISMATCH: Signature invalid
  R1 drops the announcement and doesn't add attacker as neighbor

SPOOFING ATTACK BLOCKED: Forged CDP announcement is rejected

PROOF OBJECTIVE MET: Only devices that know the correct MAC-derived key can send authentic CDP announcements.
```

---

## 6. Expected Output Gallery
```text
R1#show cdp neighbors detail

Device ID: R2
Entry address(es):
  IP: 192.168.2.2
  IPv6: 2001:DB8:0:2:B911:22FF:FE00:0002
Platform: Cisco 3945
Interface: GigabitEthernet0/1, Port ID (outgoing port): GigabitEthernet0/0
Holdtime : 140 sec
Version :
  Cisco Internetwork Operating System Software

[CRYPTOGRAPHIC VERIFICATION]
Device Identity: R2 (MAC BB:BB:CC:00:00:02)
IPv6 Address: 2001:DB8:0:2:B911:22FF:FE00:0002 (EUI-64 derived from MAC) ✓ VERIFIED
CDP Signature: HMAC-SHA256[...] (signed with R2's MAC-derived key)
Signature Status: ✓ VALID
NTP Timestamp: 2026-08-30T15:23:45.123Z (synchronized via R1 NTP master)

DEVICE ATTESTATION RESULT: R2 is authenticated and device identity is proven.
```

---

## 7. Common Field-Specific Mistakes
- CDP not signed (topology can be spoofed)
- NTP not synchronized (timestamps are unreliable)
- IPv6 addresses not matching MAC-derived EUI-64 (inconsistency in identity proof)
- CDP credentials not tied to device MAC (identity proof is weak)

## 8. Troubleshooting by Field
**Problem: "CDP neighbor signature fails to verify"**
```text
Step 1: Verify device MAC is correct
  R1#show cdp neighbors detail | grep MAC
  Expected: R2's announced MAC is BB:BB:CC:00:00:02

Step 2: Derive expected CDP key from MAC
  $ Key_R2=$(HKDF(BB:BB:CC:00:00:02 + secret))

Step 3: Verify announced IPv6 matches derived EUI-64
  Announced: 2001:DB8:0:2:B911:22FF:FE00:0002
  Derived: B911:22FF:FE00:0002 (from MAC BB:BB:CC:00:00:02)
  MATCH: ✓

Step 4: Re-verify CDP signature
  Expected: HMAC-SHA256[announcement | Key_R2]
  Actual: [signature from CDP announcement]
  If mismatch: Device identity cannot be verified; possible tampering or configuration error
```

---

## 9. Design Analysis
**Why does cryptographic CDP attestation matter for Security (Field 4)?**

Mesh topology is only as strong as device discovery. If an attacker can spoof CDP announcements, they can inject themselves into the mesh, redirect traffic, and intercept data. Cryptographic CDP signing ensures only legitimate devices can announce themselves.

---

## 10. Real-World Parallel
**D-Central Module:** `mesh-discovery` (authenticated device discovery)
**Haiti Phase:** P38+ — mesh nodes must discover each other securely

---

## 11. Stretch Goals
- Formal verification of CDP spoofing prevention
- Byzantine-resistant CDP (multiple routers verify each neighbor's identity independently)

---

## 12. Self-Assessment (Field-Specific BSL)
```
Target BSL: BSL-3 to BSL-4
Understand CDP cryptography, NTP synchronization, and device identity verification.
```

---

*Day 36 — Field 4 (Security) Lab — August 2026.*
