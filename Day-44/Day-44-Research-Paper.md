# Day 44 Research Paper — NAT Dynamic: Address Translation for Isolated Networks

Applies `RedjiJB-Labs/RESEARCH-PAPER-STANDARD.md` §2–2.6 to this lab's design.

---

## 2.1 Delta Section

```
Baseline:      Private RFC 1918 addresses on an internal network with no
               translation; any communication to external networks requires
               external routers to route and accept traffic destined to
               private addresses (non-standard, not recommended).
This design:   Dynamic NAT translates all outbound internal traffic to a
               shared pool of external (publicly valid) addresses; return
               traffic is reverse-translated back to internal addresses.
Delta:         Addition of NAT pool, ip nat inside/outside interface tags,
               and dynamic address translation rules.
Justification: Private address space (10.0.0.0/8, 172.16.0.0/12,
               192.168.0.0/16) is non-routable on the public internet by
               design (RFC 1918). NAT enables internal networks to use
               private addresses (abundant, collision-free) while presenting
               only the pool of external addresses to peers, solving both
               address-scarcity and segmentation goals simultaneously.
```

---

## 2.2 Compliance Gap Analysis

Dynamic NAT is defined functionally by **RFC 3022** (NAT behavior and terminology). This lab aligns with RFC 3022's core pattern.

| Standard | Requirement | Lab's Design | Compliant? | Gap |
|---|---|---|---|---|
| RFC 3022 (NAT) | Rewrite source IP/port on outbound traffic; reverse-rewrite on return | Lab uses `ip nat inside source list` with pool | Compliant | — |
| RFC 1918 (Private Addresses) | Internal hosts use private addresses; NAT translates to non-private | Lab internal uses 10.0.0.0/8; NAT pool uses public-range IPs | Compliant | — |
| NIST SP 800-41 (Firewall Guidance) | NAT should track connection state | Lab's NAT implicitly tracks state (inside source translation) | Functionally compliant | Not formally stateful like a modern stateful firewall; acceptable for CCNA scope |

---

## 2.3 Quantitative Benchmarking

```
Metric:              Address space efficiency — how many internal hosts can
                      be served by a small external pool?
Baseline value:      1:1 NAT (one internal IP per external IP) requires 1
                      pool address per internal host; pool of 5 external IPs
                      serves 5 internal hosts.
This design's value: Dynamic NAT (overloading) reuses pool IPs via port
                      translation; a pool of 5 × 65536 ports ≈ 327,000
                      concurrent sessions can share the same 5 external IPs.
Delta:                ~65,000× expansion in address capacity per pool IP,
                      calculated from TCP/UDP port range (1024–65535 =
                      64,512 usable ports per IP).
Confidence/Caveat:    Assumes no session persists beyond ~24 hours (port
                      reuse); real implementations hit practical limits
                      ~10,000–20,000 concurrent sessions per external IP
                      (due to system resource constraints, not address
                      exhaustion).
```

---

## 2.4 Verification Traceability Matrix

| Requirement | Verification | Covered? | Gap |
|---|---|---|---|
| 1. Configure inside/outside interfaces | `ip nat inside` on LAN interfaces; `ip nat outside` on external interface | Yes | |
| 2. Create NAT pool and bind to access list | `ip nat pool` + `ip nat inside source list` | Yes | |
| 3. Verify NAT translation in action | `show ip nat statistics` and `show ip nat translations` | Yes | Lab doesn't include a tcpdump/packet capture showing before/after IP addresses (advanced verification) |
| 4. Explain dynamic NAT vs static | Manual comparison in lab manual | Partial | Conceptual, not a practical test |

---

## 2.5 Community Integration

```
Contribution target:   GNS3 labs
Current state:         Manual NAT configuration lab
Gap to contributable:  No build_lab.py; no troubleshooting scenarios for
                        common NAT failures (e.g., inside/outside reversed,
                        ACL misconfigured).
```

---

## 2.6 Research-Field Linkage

### 2.6.a Research Fields Identified

- **Field 1: Black Start Systems (Address Translation for Isolated Networks)** — Dynamic NAT enables isolated networks to function autonomously using private addresses, without requiring external address assignment. Critical for offline-capable mesh networks.

### 2.6.b Proof Obligations

**Field 1:**
- Proof obligation 1: Internal private addresses must translate to external addresses without requiring a centralized address registry or external server.
  - Validation: Configure NAT pool locally on the router (no DHCP server, no external AAA). Internal hosts (using 10.0.0.0/8 addresses) initiate outbound traffic. Verify `show ip nat translations` shows translation from 10.x.x.x to pool address. No external dependency exists.

- Proof obligation 2: The NAT function must survive device restart with configuration intact (persist without external state).
  - Validation: Configure and verify NAT works. Reload the router. Verify NAT pool and rules are reloaded from startup-config. NAT functions immediately without manual re-entry.

### 2.6.c Haiti Deployment Linkage

**Field 1 (P38 onwards):** `dcentral-fieldops-mesh-core` uses private addressing internally; NAT at aggregation points enables isolated mesh segments to communicate without a central IP authority. Day-44 proves dynamic NAT functions offline.

### 2.6.d Publication Linkage

- **Publication #11: "Private-Address Routing in Decentralized Networks"** (Field 1, P38–P45)
  - Specific contribution: Day-44's dynamic NAT proof demonstrates that isolated networks can manage address assignment without external PKI or centralized coordination.

---

## Summary

Day-44 demonstrates dynamic NAT as an offline-capable mechanism for translating private addresses to shareable external addresses, unblocking Field 1 (Black Start isolated networking) for Haiti P38+.

