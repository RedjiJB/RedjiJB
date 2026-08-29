# Day 45 Research Paper — NAT Static: Offline Address Mapping & Proof-of-Ownership

Applies `RedjiJB-Labs/RESEARCH-PAPER-STANDARD.md` §2–2.6 to this lab's design.

---

## 2.1 Delta Section

```
Baseline:      No address translation; private internal addresses map 1:1
               to external addresses (if routable at all), requiring every
               internal host to have a unique, publicly-known identity.
This design:   Static NAT maps specific internal addresses to specific
               external addresses on a persistent, 1:1 basis; the mapping is
               configured once and persists indefinitely.
Delta:         Addition of static NAT rules (ip nat inside source static
               X Y) establishing permanent bidirectional address mappings.
Justification: Static NAT enables a device to have a persistent external
               identity (same external address always) while keeping the
               internal address private and flexible. Unlike dynamic NAT
               (which reuses addresses based on demand), static NAT is
               appropriate for infrastructure services (servers, gateways)
               that require a stable, predictable external address. This is
               also the foundation for proof-of-ownership: a device that
               always translates to the same external address can
               cryptographically prove that address is "theirs" via signing
               or certificates.
```

---

## 2.2 Compliance Gap Analysis

Static NAT is defined by RFC 3022 (same as dynamic). This lab uses the 1:1 static pattern, fully compliant.

| Standard | Requirement | Lab's Design | Compliant? |
|---|---|---|---|
| RFC 3022 (Static NAT) | 1:1 permanent bidirectional mapping | Lab uses `ip nat inside source static` | Compliant |
| RFC 1918 + RFC 6598 | Proper use of private/shared address space | Lab maps internal private (10.x) to external (172.x, 192.x) | Compliant |

---

## 2.3 Quantitative Benchmarking

```
Metric:              Address stability over time
Baseline value:      No NAT: internal address changes = external address
                      changes (tied together). Any internal network
                      reconfiguration affects external identities.
This design's value: Static NAT: internal address can change; external
                      identity stays the same (decoupled). Allows internal
                      renumbering without affecting external peers.
Delta:                Decoupling of internal and external address spaces,
                      enabling network evolution without external disruption.
Confidence/Caveat:    Qualitative benefit; quantified as "1 internal
                      reconfiguration can occur without X external
                      notifications" (X depends on external peer count).
```

---

## 2.4 Verification Traceability Matrix

| Requirement | Verification | Covered? |
|---|---|---|
| 1. Configure static NAT rule (inside source static) | `ip nat inside source static 10.1.1.10 203.0.113.10` | Yes |
| 2. Verify 1:1 mapping persists | `show ip nat translations` (should list the mapping) | Yes |
| 3. Test bidirectional traffic through static NAT | Internal host initiates to external peer; external peer initiates to internal via static-mapped address | Partial (lab tests outbound; doesn't fully test inbound to the static-mapped address) |
| 4. Explain why static NAT is used for servers | Manual discussion in lab | Partial |

---

## 2.5 Community Integration

```
Contribution target:   GNS3 labs
Current state:         Manual static NAT lab
Gap to contributable:  No build_lab.py; no section on static NAT +
                        port forwarding (common production combo).
```

---

## 2.6 Research-Field Linkage

### 2.6.a Research Fields Identified

- **Field 1: Black Start Systems (Offline Address Mapping)** — Static NAT enables persistent, offline-managed address mappings without centralized DHCP or assignment servers.
- **Field 4: Security (Proof-of-Ownership via Stable Identity)** — A device with a persistent external address can cryptographically prove ownership of that address (via DNSSEC, TLSA, or equivalent), creating a root of trust.

### 2.6.b Proof Obligations

**Field 1:**
- Proof obligation 1: Static NAT mappings must be configured locally and survive without external address-assignment services.
  - Validation: Configure static mapping on router. Disable/disconnect any external DHCP or address-assignment service. Verify mapping persists and traffic flows bidirectionally through it.

**Field 4:**
- Proof obligation 1: A device's external address must be persistent and cryptographically claimable by the device.
  - Validation: Configure static NAT mapping (internal 10.1.1.10 → external 203.0.113.10). Device digitally signs a message claiming "I own 203.0.113.10." Peer verifies the signature using the address. This proves the device is consistently associated with one external identity.

### 2.6.c Haiti Deployment Linkage

**Field 1 (P38+):** Mesh nodes use static NAT at aggregation points to present stable external identities without centralized address management.

**Field 4 (P38+):** Each node's persistent external address becomes the basis for its cryptographic identity (DIDs, certificates).

### 2.6.d Publication Linkage

- **Publication #8: "Decentralized Identity via Persistent Network Addresses"** (Field 4, P45–P52)
  - Specific contribution: Day-45 static NAT proves that persistent addresses can be managed offline; this paper uses this proof as a foundation for decentralized identity systems.

---

## Summary

Day-45 demonstrates static NAT as an offline-capable, persistent address-mapping mechanism, unblocking Field 1 (autonomous address management) and Field 4 (proof-of-ownership via stable identity) for Haiti P38+.

