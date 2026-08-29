# Day-38 Research Paper — DNS/DHCP: Decentralized Name Resolution and Privacy-Preserving Address Assignment

*Redji Jean Baptiste (Toussaint) — Phase 4 Batch 5*
*Applies RESEARCH-GRADE-STANDARD.md (Sections 2.1–2.5) + RESEARCH-PAPER-STANDARD.md (Section 2.6)*

---

## 2.1 Delta Section

```
Baseline:       Centralized DNS (external cloud DNS like 8.8.8.8) and DHCP
                (external DHCPv4 server in a data center). All mesh nodes
                forward DNS queries to the cloud; all devices request IP
                addresses from a central server. Privacy impact: cloud DNS
                provider observes every name query (e.g., "which doctors in
                Haiti does this user search for?"); central DHCP logs reveal
                which user is assigned which IP, enabling device tracking.

This design:   Local/distributed DNS resolver running on mesh nodes
                (optional caching resolver or forwarding to a local authoritative
                server); local DHCP server (or stateless DHCPv6) assigning
                addresses from a local pool without external connectivity
                required. Queries and DHCP assignments remain local to the mesh.

Delta:         DNS query privacy shifts from "cloud provider sees all queries"
                to "local mesh node handles queries, no external observation."
                DHCP address assignment privacy shifts from "central server logs
                device→IP mapping" to "local mesh DHCP log (if any) is governed
                by local policy, not external provider terms of service."

Justification: Days 33–37 prove that network policies and timestamps can be
                secure and auditable; Day-38 proves that they can also be
                privacy-preserving. Field 4 (Security) proof obligation:
                "Prove that mesh nodes can operate without external-cloud
                dependencies for critical infrastructure functions (DNS, DHCP)."
                Field 5 (Healthcare AI) proof obligation: "Prove that healthcare
                networks can assign addresses, resolve names, and infer device
                identity without leaking patient location/device type/usage
                patterns to external cloud." Haiti pilot (P38) includes health
                clinics; clinic staff and patients must not have their network
                queries tracked by external DNS providers.
```

---

## 2.2 Compliance Gap Analysis

**Reference standards:**
- **RFC 1035 & RFC 6891** (DNS core + EDNS extension) — DNS queries, caching, privacy options
- **RFC 8484** (DNS over HTTPS) and **RFC 8974** (DNS over QUIC) — privacy-preserving DNS
- **RFC 2131 & 3315** (DHCPv4 / DHCPv6) — address assignment
- **RFC 7626** (DNS Privacy Considerations) — query privacy, query forwarding, logging
- **HIPAA** (US Health Insurance Portability and Accountability Act) — healthcare data privacy (relevant to Field 5)

| Standard Clause | Requirement | Lab's Design | Compliant? | Gap Justification |
|---|---|---|---|---|
| RFC 7626 — DNS query privacy | DNS queries should not be logged by external providers; local caching is preferred to avoid repeated external queries | Lab configures local caching resolver (Bind or dnsmasq on R1); all mesh queries hit local cache, not external cloud | Compliant | — |
| RFC 8484 / 8974 — Encrypted DNS | DNS queries in-transit should be encrypted (DoH, DoQ) to prevent eavesdropping | Day-38 base lab uses unencrypted UDP DNS (classic DNS on port 53). Encryption between resolver and authoritative server is not configured | Gap named | Acceptable for CCNA scope: DNS-over-HTTPS/QUIC is intermediate-level config; full DNS privacy (end-to-end encryption) is a T4+ requirement (Field 4, P26+). Day-38 focuses on local caching (no cloud dependency); Field 4 research addresses DNS encryption. |
| RFC 2131 — DHCP server best practices | DHCP addresses should be assigned from a pool local to the network, with lease time and renewal mechanisms | Lab configures local DHCP server (Cisco IOS DHCP service or ISC DHCP) with local address pool (192.168.1.0/24); no external DHCP dependency | Compliant | — |
| HIPAA (healthcare context, Field 5) — patient-device privacy | DHCP logs and DNS queries should not reveal patient identity or location | Lab Design Analysis (§7, Field 5 section) acknowledges HIPAA compliance as a governance requirement; local DHCP/DNS ensures no external cloud logging | Partially compliant | Acceptable gap: full HIPAA compliance requires audit controls beyond Day-38 (encryption of DHCP/DNS logs, log access controls, breach-notification procedures). Day-38 focuses on the privacy-by-design principle (local processing, no external logging); HIPAA audit/compliance is T4+ (Field 5, P28+). |

---

## 2.3 Quantitative Benchmarking

### Benchmark 1: DNS Query Privacy — Query Leakage to External Cloud

```
Metric:              Percentage of DNS queries that are observable by an
                      external cloud DNS provider

Baseline value:      Centralized cloud DNS (e.g., 8.8.8.8):
                      - Every mesh node sends queries to 8.8.8.8
                      - Google (or any cloud DNS provider) observes 100% of
                        queries
                      - Example: 50-node Haiti pilot, 100 queries/minute
                        per node = 5000 queries/minute sent to cloud,
                        observable by provider
                      - Privacy leakage: 100% of queries visible externally

This design's value:  Local caching DNS resolver:
                      - First query for domain.com → resolver queries authoritative
                        server (1 external query)
                      - Subsequent queries within TTL → resolved from cache
                        (0 external queries)
                      - Typical cache hit rate: 80–95% (users re-query recent
                        domains)
                      - External observable queries: (1 - cache_hit_rate) =
                        5–20% of total queries
                      - Example: 50-node pilot, 100 queries/min, 90% cache
                        hit rate → 10 queries/min external (10% of baseline)
                      - Privacy leakage: 10% of queries visible externally

Delta:                Query privacy increase: 0% external visibility → 90%
                      local-cache hiding. Only 10% of queries leak externally
                      (authoritative server lookups, not repeated queries).

Confidence/Caveat:    Cache-hit rates are estimates (90% is typical for
                      enterprise/clinic networks); actual rate depends on
                      domain popularity and cache TTL. No live DNS traffic
                      analysis in this lab; figures are theoretical.
```

### Benchmark 2: DHCP Address-Device Tracking — Address Privacy

```
Metric:              Ability of an external DHCP provider (or attacker
                      monitoring DHCP logs) to correlate device MAC address
                      with assigned IP address

Baseline value:      Centralized cloud DHCP:
                      - Device requests IP; DHCP server logs MAC → IP mapping
                      - Cloud provider has complete mapping: "MAC
                        AA:BB:CC:DD:EE:FF was assigned 203.0.113.50 on
                        2025-08-29 14:05 to 2025-08-30 02:05"
                      - Attacker monitoring DHCP logs can track device across
                        subnets/VLANs by MAC
                      - Privacy risk: device identity leaked to external entity

This design's value:  Local DHCP server:
                      - Device requests IP; local DHCP server assigns from
                        local pool and logs locally
                      - Only local network administrators have access to DHCP
                        logs (local governance)
                      - External cloud provider has no visibility
                      - Privacy risk reduced: device→IP mapping is local,
                        governed by local policy

Delta:                Address-privacy tracking risk: high (external visibility)
                      → low (local governance only). Device MAC→IP correlation
                      is no longer observable by external cloud.

Confidence/Caveat:    Privacy assurance depends on local-log security
                      (encryption, access control). Day-38 configures local
                      DHCP but does not formally protect DHCP logs (encryption,
                      signing); that is T4+ (Field 4, P26+). Metric is
                      "external privacy leakage reduction," not "local privacy
                      guarantee."
```

---

## 2.4 Verification Traceability Matrix

| Requirement (from Lab Overview/Learning Objectives) | Verification Command(s) that test it | Covered? | Gap Note |
|---|---|---|---|
| Configure local DNS caching resolver | `show nameserver` (lists configured DNS servers, including local resolver); test resolution: `nslookup example.com` should use local resolver first | Yes | — |
| Verify DNS query caching | Monitor DNS traffic via `debug dns` or packet capture; send same query twice; verify second query is served from cache (no external query) | Yes | — |
| Configure local DHCP server | `show ip dhcp binding` shows assigned addresses; `show ip dhcp server status` shows pool status | Yes | — |
| Verify DHCP address privacy (local-only) | Monitor DHCP traffic; confirm DHCP requests/replies are local (no external DHCP server traffic) | Yes | — |
| Document privacy assumptions (local governance) | Lab manual's Design Analysis (§7) explicitly states local DHCP/DNS governance model | Yes | — |

---

## 2.5 Community Integration

**Contribution target:** Privacy-focused networking community (r/privacy, OWASP, privacy-conscious Cisco labs)

**Current state:**
- Working local DNS caching resolver
- Local DHCP server configuration
- Privacy design documentation

**Gap to contributable:**
1. **Encrypted DNS Integration:** Add DoH or DoQ support for queries that must go to external authoritative servers
2. **DHCP Logging Security:** Encrypt and cryptographically sign DHCP logs
3. **HIPAA Compliance Examples:** Document HIPAA-relevant audit controls for healthcare deployments
4. **Field-specific variants:** Base lab proves Fields 4+5 at moderate strength; contributing would benefit from Day-38-Field-4-Lab.md (security attestation) and Day-38-Field-5-Lab.md (healthcare-specific privacy)

---

## 2.6 Research-Field Linkage

### 2.6.a Research Fields Identified

This lab contributes evidence to two research fields:

- **Field 4: Security (Decentralized Infrastructure)** — Day-38 proves that critical infrastructure functions (DNS name resolution, DHCP address assignment) can be provided locally without external cloud dependency. This strengthens Field 4's claim that decentralized systems can be secure (self-sufficient, resilient to cloud outages/attacks).

- **Field 5: Healthcare AI & Ethics (Privacy-Preserving Medical Infrastructure)** — Day-38 proves that healthcare mesh nodes can assign addresses and resolve names without leaking patient/clinic location or device usage patterns to external cloud providers. This addresses Field 5's proof obligation: "Prove that medical-device networks can operate while preserving patient privacy."

### 2.6.b Proof Obligations

**Field 4 (Security):**
- **Proof obligation 1:** Local DNS caching resolver must handle 80–95% of queries from cache, reducing external DNS queries to ≤20% of total traffic.
  - *Validation:* On Day-38-Field-4-Lab.md, configure local resolver with typical TTLs (3600–86400 seconds). Generate 1000 DNS queries from typical user patterns (accessing clinic portal, email, web). Measure: what percentage are resolved from cache vs. external? Expected ≥80%.

- **Proof obligation 2:** Local DHCP server must assign addresses without reliance on external cloud DHCP, even if WAN link is down.
  - *Validation:* On Day-38-Field-4-Lab.md, disconnect WAN link. Simulate new device joining mesh (send DHCP discover). Verify local DHCP server assigns address from local pool (no external DHCP required).

**Field 5 (Healthcare AI):**
- **Proof obligation 1:** Local DHCP/DNS must not reveal clinic or patient location/device identity to external cloud providers.
  - *Validation:* On Day-38-Field-5-Lab.md, configure clinic-network DHCP/DNS as local-only. Monitor outbound traffic for DNS queries, DHCP packets. Verify no queries/packets are sent to external cloud DNS/DHCP (packet capture confirms no traffic to 8.8.8.8 or other cloud DNS). If clinic must use external DNS for specific domains (e.g., cloud EMR system), this query is logged locally (not sent to 8.8.8.8); external system does not learn clinic network topology.

- **Proof obligation 2:** DHCP address-assignment logs must be local and governed by clinic privacy policy (HIPAA compliant), not external provider policy.
  - *Validation:* Verify DHCP logs are stored locally (e.g., /var/log/dhcp.log); not sent to external cloud provider. Clinic administrator can apply local access controls and retention policies (e.g., "retain logs for 7 years for HIPAA audit").

### 2.6.c Haiti Deployment Linkage

**Field 4 (P38+ Infrastructure Autonomy):**
- **Module:** dcentral-core (all modules benefit from local DNS/DHCP)
- **When:** P38 pilot (50–100 nodes with healthcare services)
- **Why this proof matters:** P38 Haiti pilot includes health clinics. Clinics cannot rely on external cloud DNS/DHCP (internet is unreliable in rural Haiti). Day-38's local DNS/DHCP proof ensures that clinics can operate autonomously even if WAN is down. **Operational consequence:** P38 clinics can issue DIDs (via dcentral-core), assign mesh addresses (via DHCP), and resolve names (via DNS) without external dependencies, enabling Black Start operation.

**Field 5 (P38+ Healthcare Privacy at Scale):**
- **Module:** classIQ (healthcare AI inference on mesh-ai)
- **When:** P38 pilot through P55+ (healthcare services at scale)
- **Why this proof matters:** P38 pilot healthcare providers must comply with Haiti's healthcare data privacy law (analogous to HIPAA). Patient location (which clinic they visit) and device patterns (how often they access medical services) must not be observable by external cloud providers. Day-38's local DNS/DHCP proof ensures privacy is achievable by design (no queries sent to cloud). **Operational consequence:** P38+ health infrastructure can deploy edge AI (classIQ) for clinic decision support without privacy violation (queries remain local, inference results are local).

### 2.6.d Publication Linkage

- **Publication #4: *Critical Infrastructure Security* (Field 4, P60–P65, Harvard peer-reviewed)**
  - *Specific contribution:* Day-38's local DNS/DHCP proof demonstrates that critical infrastructure can be self-sufficient (no external cloud dependency for name resolution or address assignment). Publication cites this lab as evidence that decentralized mesh networks can operate autonomously.

- **Publication #2: *Equitable AI at the Edge* (Field 5, P60–P65, Harvard peer-reviewed)**
  - *Specific contribution:* Day-38's privacy-by-design proof (local DNS/DHCP, no cloud queries) demonstrates that healthcare networks can preserve patient privacy while running edge AI. Publication cites this lab as a privacy-preserving infrastructure example for clinical settings.

### 2.6.e Validation Gate

**Research milestone (Validation Gate):**
- **T4 publication on privacy-preserving DNS and decentralized address assignment (Field 4 + Field 5, P26+ target)** MUST be complete before P38 pilot healthcare deployment.
  - *Why:* Healthcare deployment at P38 requires formal proof that privacy is preserved (Haiti healthcare law compliance).
  - *Status:* Field 4 + Field 5 research targets P26/P28; timing met for P38.
  - *Consequence if missed:* P38 healthcare deployment delayed pending formal privacy proof.

---

## Appendix: Field-Specific Variants (Planned)

- **Day-38-Field-4-Lab.md (Security variant):** Emphasis on DNS/DHCP attestation and resilience.
- **Day-38-Field-5-Lab.md (Healthcare variant):** HIPAA compliance examples, patient-privacy audit controls.

---

*End of Day-38 Research Paper*
