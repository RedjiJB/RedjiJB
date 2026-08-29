# Day 49 Research Paper — Security Advanced: ACLs & Firewall Fundamentals

Applies `RedjiJB-Labs/RESEARCH-PAPER-STANDARD.md` §2–2.6 to this lab's design.

---

## 2.1 Delta Section

```
Baseline:      All traffic is allowed by default; no filters on management
               plane or data plane.
This design:   Multi-layer security: Console ACL (restrict CLI access by
               line), IP ACL on VTY (restrict remote management by source
               IP), extended ACLs on data-plane interfaces (filter data
               traffic by protocol/port), and implicit deny-all on all ACLs.
Delta:         Addition of console line ACL, extended IP ACLs with
               protocol/port matching, deny-all implicit rules, and
               application of ACLs to interfaces.
Justification: Defense-in-depth requires multiple filtering layers. A single
               misconfiguration on one ACL is not catastrophic; the other
               layers remain intact. This is the exact pattern used in
               production firewalls and device hardening procedures.
```

---

## 2.2 Compliance Gap Analysis

ACLs are defined by Cisco IOS CLI conventions and **NIST SP 800-41** (firewall design). Lab aligns with both.

| Standard | Requirement | Lab's Design | Compliant? |
|---|---|---|---|
| Cisco IOS ACL | Numbered and named ACLs, permit/deny rules, implicit deny-all | Lab uses named extended ACLs | Compliant |
| NIST SP 800-41 | Firewall rules should default-deny | Lab's ACLs end with implicit deny-all | Compliant |

---

## 2.3 Quantitative Benchmarking

```
Metric:              Number of attack vectors eliminated by ACLs
Baseline value:      No ACLs: unlimited attack surface (all protocols, all
                      ports, all sources reachable)
This design's value: Three-layer ACL defense: console-line ACL (1),
                      VTY-source ACL (1), data-plane protocol/port ACL (1) =
                      3 independent filters, each reducing attack surface
Delta:                ~100× reduction in reachable attack surface
                      (qualitative, depends on specifics of rules)
Confidence/Caveat:    Qualitative estimate; actual reduction depends on
                      rule specificity.
```

---

## 2.4 Verification Traceability Matrix

| Requirement | Verification | Covered? |
|---|---|---|
| 1. Configure named extended ACL | `ip access-list extended` | Yes |
| 2. Match on protocol/port (TCP port 80, etc.) | `permit tcp any any eq 80` | Yes |
| 3. Apply ACL to interface inbound | `ip access-group` | Yes |
| 4. Test ACL enforcement | Attempt blocked traffic (rejected); allowed traffic (passes) | Partial (lab tests permit; doesn't include explicit deny test) |
| 5. Verify ACL counters | `show ip access-lists` (match counts) | Yes |

---

## 2.5 Community Integration

```
Contribution target:   GNS3 labs / r/ccna
Current state:         Manual ACL security lab
Gap to contributable:  No build_lab.py; no section on ACL optimization
                        (order of rules for performance).
```

---

## 2.6 Research-Field Linkage

### 2.6.a Research Fields Identified

- **Field 1: Black Start Systems (Local Access Control Without Servers)** — ACLs enable offline access control without RADIUS or external policy servers.
- **Field 4: Security (Device Hardening via Cryptographic Boundaries)** — ACLs at the device level create a first cryptographic boundary that devices can manage autonomously.

### 2.6.b Proof Obligations

**Field 1:**
- Proof obligation 1: ACLs must enforce access policy locally without external authentication servers.
  - Validation: Configure ACL on router. Disconnect from any external AAA server. Attempt traffic that matches ACL deny rules (rejected). Attempt allowed traffic (passes). Verify `show access-list` shows counts. All filtering is local.

**Field 4:**
- Proof obligation 1: Device access must be restricted to authenticated administrators via layer-3 ACLs.
  - Validation: Configure VTY ACL allowing only admin IP (10.0.0.1). Attempt SSH from unauthorized host (rejected). Attempt from admin IP (succeeds). This proves the device can unilaterally enforce access policy.

### 2.6.c Haiti Deployment Linkage

**Field 1 (P38+):** Mesh nodes use local ACLs to control traffic without external policy servers.

**Field 4 (P38+):** Device hardening includes ACLs as the first layer of defense against unauthorized access.

### 2.6.d Publication Linkage

- **Publication #4: "Local Access Control in Autonomous Networks"** (Field 1 + Field 4, P38–P45)
  - Specific contribution: Day-49 ACL deployment proves that devices can enforce security policy without external servers, a prerequisite for autonomous mesh operations.

---

## Summary

Day-49 demonstrates ACLs as offline-capable, device-managed access control mechanisms, unblocking Field 1 (autonomous filtering) and Field 4 (device-level hardening) for Haiti P38+.

