# Day 38 — Field 4 (Security): DNS/DHCP Decentralized with Cryptographic Address Attestation

---

## 0. Metadata
| Field | Value |
|---|---|
| **Field Focus** | Field 4: Security (Decentralized DNS/DHCP without external cloud, address assignment attestation, spoofing prevention) |
| **Core Proof Obligation** | DHCP assignments are cryptographically signed. DNS responses are authenticated. A device cannot claim an IP address without proof that the DHCP server assigned it. |
| **Haiti Deployment Phase** | P38+ — mesh nodes must assign addresses and resolve names locally without cloud dependency |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Advanced |
| **Relationship to Base Lab** | Local DNS/DHCP servers replace cloud providers. Field-4 adds: DHCP assignments are signed, DNS responses are authenticated. |
| **Prerequisite** | Day-31-Field-4 (IPv6 identity), Day-38-Research-Paper |

---

## 1. Business Context (Field-Specific Framing)
Cloud-based DNS and DHCP leak query metadata to ISPs and advertisers. Haiti clinics need privacy-preserving, locally-controlled naming and address assignment. Decentralized DNS/DHCP prevents external observation but introduces security risk: how do devices trust DNS responses and DHCP assignments from local servers?

This variant proves: **Local DNS/DHCP can be cryptographically authenticated. Devices trust local servers because their responses are signed by the servers' MAC-derived identities (Day-31). No external cloud needed, no metadata leakage, full security.**

---

## 2. Topology Diagram
**FIELD-4 VARIANT (AUTHENTICATED LOCAL DNS/DHCP):**
```
R1 (NYC Clinic) running local DNS + DHCP
├─ Identity: MAC AA:BB:CC:00:00:01, IPv6 2001:DB8:0:1::1
├─ DNS Server:
│  ├─ Signing key: Derived from MAC (Day-31)
│  ├─ Response format: A-record + signature (RRSIG)
│  └─ Example: ny.clinic → 192.168.1.50 [RRSIG signed by R1's key]
│
├─ DHCP Server:
│  ├─ Assignment signing: Every DHCP ACK is signed
│  ├─ Response format: DHCP ACK + signature
│  └─ Example: Device X assigned 192.168.1.100 [HMAC-SHA256(ACK)]
│
└─ Clients verify signatures using R1's public key (derived from MAC per Day-31)
```

---

## 3. IP Addressing Plan
| Service | Address | Signing Key | Proof Obligation |
|---|---|---|---|
| DNS | 192.168.1.1 | MAC-derived RSA key | **All DNS responses are signed; clients verify with R1's public key** |
| DHCP | 192.168.1.1 | MAC-derived HMAC key | **All DHCP ACKs are signed; clients verify assignment is authentic** |
| Clients | 192.168.1.100-200 | [Assigned via DHCP] | **Address proof: DHCP server signed the assignment** |

---

## 4. Configuration (Field-Specific Optimizations)
```text
! ===== LOCAL DNS SERVER (R1) WITH SIGNING =====
R1(config)#ip dns server
R1(config)#ip domain-name ny.clinic

! Add DNS records with DNSSEC (DNS Security Extensions)
R1(config)#dnssec sign-zone ny.clinic

! Sign zone with R1's private key (derived from MAC)
R1(config)#dnssec ksk-rollover ny.clinic

! Add zone-signing key (ZSK) for DNS responses
R1(config)#dns answer validation
! Clients can verify DNS responses using R1's public key

! ===== LOCAL DHCP SERVER (R1) WITH SIGNING =====
R1(config)#ip dhcp pool clinic-clients
R1(dhcp-config)#network 192.168.1.0 255.255.255.0
R1(dhcp-config)#default-router 192.168.1.1
R1(dhcp-config)#dns-server 192.168.1.1
R1(dhcp-config)#exit

! Enable DHCP option 82 (Relay Agent Information)
R1(config)#ip dhcp relay information option

! Configure DHCP authentication (sign all ACKs)
R1(config)#dhcp authentication method hmac-sha256
R1(config)#dhcp authentication shared-secret clinic-dhcp-secret
! (Secret derived from R1's MAC in production)

R1(config)#exit
R1#copy running-config startup-config
```

---

## 5. Field-Specific Verification Steps

### Scenario 1: DNS Response Authentication
```text
Step 1: Client (PC1) queries DNS
  PC1#nslookup clinic-server.ny.clinic
  Query: clinic-server.ny.clinic → R1's DNS server

Step 2: R1 returns signed DNS response
  Response: ny.clinic IN A 192.168.1.50
  RRSIG (DNS signature): [signature of A-record using R1's private key]

Step 3: Client verifies DNS signature
  PC1 validates RRSIG using R1's public key (derived from R1's MAC via Day-31)
  Expected: Signature valid ✓
  
  Result: Client trusts DNS response because it's signed by R1 (whose identity is proven)

PROOF OBJECTIVE MET: DNS response is authenticated; client can trust result without cloud lookup.
```

### Scenario 2: DHCP Address Assignment Authentication
```text
Step 1: Client (PC2) boots and requests IP via DHCP
  PC2: DHCP DISCOVER

Step 2: R1's DHCP server sends DHCP OFFER
  R1 → PC2: DHCP OFFER (IP 192.168.1.100)
  Signature: HMAC-SHA256[DHCP-OFFER | clinic-dhcp-secret]

Step 3: Client sends DHCP REQUEST
  PC2: DHCP REQUEST (request 192.168.1.100)

Step 4: R1's DHCP server sends signed DHCP ACK
  R1 → PC2: DHCP ACK (IP 192.168.1.100)
  Signature: HMAC-SHA256[DHCP-ACK | clinic-dhcp-secret]
  
Step 5: Client verifies DHCP ACK signature
  PC2 validates signature using shared secret (or R1's public key if asymmetric)
  Expected: Signature valid ✓
  
  Result: Client knows 192.168.1.100 was legitimately assigned by R1

PROOF OBJECTIVE MET: DHCP assignment is authenticated; device identity is bound to assigned IP via cryptographic proof.
```

---

## 6. Expected Output Gallery
```text
R1#show dns statistics

DNS Statistics:
  Queries: 234
  Responses: 234
  Responses signed: 234 (100%)
  Signature failures: 0
  
[DNSSEC Status]
Zone: ny.clinic
  DNSSEC enabled: Yes
  Zone-signing key: [R1's MAC-derived RSA public key]
  All responses include RRSIG: Yes

R1#show ip dhcp binding

Bindings from all pools:

IP address       Hardware address        Type       State          Expiration
192.168.1.100    00:0c:29:4d:e1:23      Automatic  Active         Aug 30 2026 06:55 PM
192.168.1.101    00:0c:29:4d:e2:45      Automatic  Active         Aug 30 2026 07:00 PM
192.168.1.102    00:0c:29:4d:e3:67      Automatic  Active         Aug 30 2026 07:05 PM

[AUTHENTICATION STATUS]
All DHCP ACKs signed: Yes
Signature algorithm: HMAC-SHA256
Signature verification: 3/3 bindings verified ✓
```

---

## 7. Common Field-Specific Mistakes
- DNS signatures not included in responses (responses not authenticated)
- DHCP ACKs not signed (assignment can be spoofed)
- Client doesn't verify signatures (trusts server blindly)

## 8. Troubleshooting by Field
**Problem: "DNS responses are not signed"**
```text
Step 1: Verify DNSSEC is enabled on zone
  R1#show dns zone | grep dnssec
  Expected: DNSSEC enabled for ny.clinic
  If not: Configure "dnssec sign-zone ny.clinic"

Step 2: Verify R1's signing key is present
  R1#show crypto key pubkey-chain
  Expected: R1's public key is listed
  If missing: Generate key or restore from backup
```

---

## 9. Design Analysis
**Why does authenticated decentralized DNS/DHCP matter for Security (Field 4)?**

Centralized cloud DNS/DHCP leak metadata and create single points of failure. Local DNS/DHCP servers avoid these issues but introduce trust risk: why should clients trust a local server? Cryptographic authentication (signing DNS responses and DHCP ACKs) solves this by tying server identity to hardware MAC (proven in Day-31).

---

## 10. Real-World Parallel
**D-Central Module:** `local-naming-authority` (clinic-local DNS/DHCP)
**Haiti Phase:** P38+ — clinics must control naming and address assignment locally

---

## 11. Stretch Goals
- Blockchain-based DNS/DHCP ledger (immutable address assignments)
- Multi-signer DNS (quorum-based authentication for critical zones)

---

## 12. Self-Assessment (Field-Specific BSL)
```
Target BSL: BSL-3 to BSL-4
Understand authenticated DNS/DHCP, DNSSEC, and cryptographic address assignment.
```

---

*Day 38 — Field 4 (Security) Lab — August 2026.*
