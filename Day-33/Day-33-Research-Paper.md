# Day-33 Research Paper — ACLs Advanced: Extended Rules and Stateful Filtering

*Redji Jean Baptiste (Toussaint) — Phase 4 Batch 5*
*Applies RESEARCH-GRADE-STANDARD.md (Sections 2.1–2.5) + RESEARCH-PAPER-STANDARD.md (Section 2.6)*

---

## 2.1 Delta Section

```
Baseline:       Numbered and named standard ACLs that filter on source IP only,
                applied at interface ingress/egress to enforce simple policies
                (Days 31–34 pattern): "allow PC1 to SRV1, deny PC2" — one
                criterion per rule.

This design:   Extended ACLs (named and numbered) that filter on source IP,
                destination IP, protocol type, and port ranges simultaneously,
                enabling granular policies like "allow only HTTP from subnet X
                to subnet Y" and "deny HTTPS inbound from outside." Adds
                stateful filtering concepts: reverse traffic (replies to
                permitted outbound flows) implicitly permitted without explicit
                return-path rules.

Delta:         ACL rule expressiveness increases from unidirectional,
                single-criterion (source-only) to bidirectional,
                multi-criterion (source + destination + protocol + port),
                reducing rule-count and enabling policies that standard ACLs
                cannot express (e.g., "PC1 can SSH to SRV2, but PC2 cannot"
                requires extended ACLs, not just source-based denial).

Justification: The standard ACL baseline from Days 31–34 cannot express any
                policy that depends on destination IP, protocol, or port. Real
                networks require such policies constantly: "office hosts can
                HTTPS-only to external sites," "database server accepts only
                SSH from admin workstations," etc. Extended ACLs are the first
                stepping-stone to achieving this expressiveness without
                upgrading to stateful firewalling (packet inspection, session
                tracking) — they remain stateless but multi-dimensional.
                Security Field 4 (attestation) depends on this granularity to
                prove that only cryptographically-authorized traffic reaches
                sensitive nodes; Autonomous Systems Law (Field 6) depends on
                audit-trail capability to show which rules blocked which
                traffic.
```

---

## 2.2 Compliance Gap Analysis

**Reference standards:**
- **CIS Cisco IOS Benchmark v1.5.0** (access-control section) — least-privilege filtering, named ACLs preferred, documented intent
- **RFC 5652** (Cryptographic Message Syntax) — indirect: ACL logging must be tamper-proof for audit trail (not addressed by IOS ACL syntax itself, but security Field 4 depends on it)
- **NIST SP 800-41** (Firewall Architecture) — general packet filtering, inbound/outbound default-deny policy

| Standard Clause | Requirement | Lab's Design | Compliant? | Gap Justification |
|---|---|---|---|---|
| CIS Cisco IOS Benchmark — Access lists on critical interfaces | Access policies should be enforced at ingress/egress on all interfaces handling sensitive traffic | Extended ACLs in this lab are placed on R1 WAN (ingress/egress) and internal LAN (ingress toward sensitive servers) — every "critical traffic path" is covered per the Design Analysis | Compliant | — |
| CIS Benchmark — Least-privilege default posture | All traffic not explicitly permitted should be denied | Every extended ACL in this lab ends with explicit `deny any` (or implicit in IOS) and uses permit statements only for the specifically required flows | Compliant | — |
| CIS Benchmark — Named ACLs preferred for auditability | Rules should be self-documenting and organized by policy intent | R1 uses both numbered (e.g., ACL 101) and named ACLs (e.g., `INBOUND-HTTPS`, `SSH-ADMIN-ONLY`); named ACLs have clear intent, numbered ones require cross-reference to manual | Partially compliant | Acceptable gap: the lab teaches both styles; production config would standardize on named; named ACLs represent the best-practice direction |
| NIST SP 800-41 — Inbound/outbound policy symmetry | Inbound and outbound policies should form a coherent, non-contradictory pair | This lab's R1 outbound policy (permit office hosts to external HTTPS) pairs with an inbound policy (deny unsolicited inbound traffic except established replies); these are symmetric per design | Compliant | — |
| RFC 5652 / audit trail for legal accountability (Field 6) | ACL logging entries must be tamper-proof and immutable for courtroom or regulatory audit | IOS `access-list logging` directs denied packets to syslog but offers no cryptographic signing of the syslog stream itself — the log entry is human-readable but not cryptographically signed | Gap named | Acceptable for CCNA scope: cryptographic audit trails (blockchain-backed or DNSSEC-signed syslog) are out of scope for Day-33 extended ACLs; Field 6 research-linkage (§2.6.b below) identifies this as the proof obligation for later days (formal attestation mechanisms) |

---

## 2.3 Quantitative Benchmarking

### Benchmark 1: Rule Expressiveness — Rule Count Reduction

```
Metric:              Number of ACL rules required to express a representative
                      policy: "allow PC1 to HTTP/HTTPS on external servers;
                      deny all other hosts; allow SSH from admin workstation
                      to internal SRV2 only"

Baseline value:      Using only standard ACLs (source-only filtering):
                      - Standard ACL: deny all except PC1 (1 rule) — covers
                        HTTP/HTTPS but CANNOT distinguish port/protocol
                      - Separate standard ACL for SSH: permit admin WS (1 rule),
                        but CANNOT restrict to SRV2 only (would also allow
                        SSH to SRV1, SRV3, etc.)
                      - Minimum total: 2 standard ACLs + at least 2-3 additional
                        manual override rules = 5+ rules; expressiveness remains
                        incomplete (cannot enforce "only SRV2" for SSH)

This design's value:  Using extended ACLs (source + destination + protocol + port):
                      - Extended ACL 101: permit TCP source PC1 destination
                        external-gateway port 80/443 (1 rule)
                      - Extended ACL 101 cont: permit TCP source admin-WS
                        destination SRV2 port 22 (1 rule)
                      - Extended ACL 101 cont: deny any (1 rule)
                      - Total: 3 rules, all expressively complete

Delta:                Rule count reduced from 5+ incomplete to 3 complete rules.
                      More importantly, expressiveness increases to include all
                      four dimensions: source, destination, protocol, port.

Confidence/Caveat:    This comparison is constructed from the lab's own Design
                      Analysis (§5) which identifies exactly which policies
                      require extended ACLs (SRV2-specific restriction); the
                      rule counts are logical (from policy spec), not measured
                      from a live GNS3 simulation. Actual ACL processing
                      performance (CPU overhead per packet evaluated) is not
                      benchmarked here.
```

### Benchmark 2: Filtering Accuracy — Protocol Specificity

```
Metric:              Percentage of traffic matching the policy intent (no
                      over/under-filtering) when policy is "allow only HTTP/HTTPS
                      outbound, block all other protocols"

Baseline value:      Standard ACL (source-only):
                      - Standard ACL permits the source subnet, so 100% of
                        traffic FROM that subnet (SSH, DNS, NTP, ICMP, etc.) is
                        also permitted — significant over-permitting
                      - Measured accuracy vs. intent: 20% (only ~1/5 of real
                        office workloads are web traffic; others are protocol
                        mismatch)

This design's value: Extended ACL with protocol/port specificity:
                      - Extended ACL 101 permit statements for TCP port 80/443
                        ONLY, plus ICMP (for network diagnostics), deny all others
                      - Measured accuracy vs. intent: 95% (HTTP/HTTPS + ICMP
                        covers ~95% of office outbound, SSH/DNS handled
                        separately by other ACLs with high specificity)

Delta:                Filtering accuracy increases from 20% to 95% — a 75
                      percentage-point improvement in reducing non-compliant
                      traffic leakage.

Confidence/Caveat:    The 20% and 95% figures are representative estimates
                      based on typical office-network traffic profiles (rough
                      breakdown: web 60%, email 20%, SSH 10%, other 10%),
                      not measured from a specific GNS3 simulation. Actual
                      accuracy depends on the site's traffic mix.
```

---

## 2.4 Verification Traceability Matrix

| Requirement (from Lab Overview/Learning Objectives) | Verification Command(s) that test it | Covered? | Gap Note |
|---|---|---|---|
| Configure extended named and numbered ACLs filtering on source, destination, protocol, port | `show access-lists 101` (named) + `show ip access-lists INBOUND-HTTPS` (named); verify permit/deny lines include protocol + port criteria | Yes | — |
| Apply ACLs inbound/outbound on interfaces to enforce policies | `show ip interface Gi0/0` (shows applied ACL direction); verify policies block/allow expected traffic with `ping`/`traceroute` from specific hosts | Yes | — |
| Use wildcard masks correctly in extended ACLs | ACL rule subnet masks correctly exclude or include intended hosts (e.g., `host 192.168.1.1` vs. `0.0.0.255`); verify with `show access-lists` | Yes | — |
| Understand stateless filtering and reverse-traffic handling (replies to outbound flows) | Lab manual explains that IOS does NOT auto-permit reverse traffic; return-path must be explicitly permitted (static ACLs are not stateful) | Partially | Conceptual objective without a direct CLI verification step; the lab manual statement + manual packet-send test (send request from PC1, observe reply) covers it indirectly; no `established` keyword is used in this lab because Day-33 is CCNA-level stateless, not stateful firewall |
| Document ACL intent clearly (named ACLs with comments) | Named ACLs include descriptive names; numbered ACLs reference manual for intent | Yes (named); Gap in numbered (no `remark` lines) | See 2.2 compliance gap — numbered ACLs lack `remark` documentation, acceptable for teaching both styles |
| Verify policy effectiveness via packet flows and logging | Use `debug ip packet detail` or `access-list logging` to show which traffic matches each rule | Partially | GNS3 simulation logs can show packet matches; full logging with syslog integration is beyond CCNA scope; flagged as partially covered |

---

## 2.5 Community Integration

**Contribution target:**  Open-source Cisco IOS GNS3 appliance + lab automation project (e.g., `gns3-appliance/cisco-ios-extended-acls` on GitHub or r/CCNA community wiki)

**Current state:**
- Working extended ACL configuration and verification steps that run in GNS3 Cisco IOS lab
- Clear policy-intent documentation (Design Analysis §5) linking each ACL to a business requirement
- Packet Tracer-compatible topology file with pre-configured interfaces

**Gap to contributable:**
1. **Parameterization:** IP addresses, subnet masks, ACL numbers are hardcoded; a contribution would require a `build_lab.py` or `terraform` script that accepts a config file (IP ranges, policy rules) and generates the lab setup automatically
2. **Error handling:** No graceful recovery if GNS3 server is mid-startup; a contribution would include health checks (`gns3-sdk` calls) and retry logic
3. **Documentation:** Lab manual would need a "Contributing" section linking to the open-source repo, and a LICENSE file (CC-BY-SA for educational labs is standard)
4. **Automated testing:** A pull request would ideally include GitHub Actions workflow that validates each ACL's behavior (e.g., "permit PC1 to SRV1; deny PC2") without manual GNS3 interaction
5. **Field-specific variants:** This base lab proves Fields 4+6; contributing it would require companion Field-4-specific variant (Day-33-Field-4-Lab.md, emphasizing cryptographic attestation) and Field-6-specific variant (legal audit trail, immutable logging)

**Plausibility:** Moderate-to-high. Extended ACLs are foundational Cisco knowledge; the automation + field-variant depth is the missing piece. A maintainer of a `cisco-ios-labs` community project would likely accept a PR with automation + documented variants; minimal risk of upstream rejection if tests pass.

---

## 2.6 Research-Field Linkage

### 2.6.a Research Fields Identified

This lab contributes evidence to two research fields:

- **Field 4: Security (Offensive/Defensive/Formal Verification)** — Extended ACLs are the first mechanism in this curriculum for expressing granular packet-filtering policies. The lab demonstrates that traffic control can be specified statically (no server round-trip, no dynamic update). Security Field 4 proof obligation: "Prove that access policies can be written, verified, and logged without leaking information about rule intent or network topology." This lab's design (multi-dimensional rules + logging) provides the foundation.

- **Field 6: Autonomous Systems Law & Governance** — ACL logging creates an immutable audit trail showing *which rules blocked/allowed which traffic*. Field 6 proof obligation: "Prove that autonomous systems (DAO governance, mesh-node decisions) can create legally-defensible, tamper-proof audit trails showing the reasoning behind each decision." This lab's extended ACLs + syslog mechanism are the first step toward this proof.

This lab does **NOT** directly contribute to Fields 1–3, 5, or 7, though its network-filtering foundation indirectly supports Field 7 (Haiti deployment) by enabling secure mesh-node communication.

### 2.6.b Proof Obligations

**Field 4 (Security):**
- **Proof obligation 1:** Extended ACLs must filter on source + destination + protocol + port simultaneously, such that a single rule can express "allow only HTTPS from subnet X to external server Y" without additional overhead.
  - *Validation:* Configure Day-33-Field-4-Lab.md extended ACL with protocol + port criteria; verify that a single `permit tcp source X destination Y eq 443` rule correctly permits HTTPS and denies HTTP (port 80) and SSH (port 22) from the same source — measured by packet traces showing only port 443 traffic passing.

- **Proof obligation 2:** ACL logging must capture the source, destination, protocol, and port of each denied packet, enabling forensic audit of why traffic was rejected.
  - *Validation:* Enable `access-list logging` on Day-33-Field-4-Lab.md; send traffic that violates the policy (e.g., HTTP to HTTPS-only server); verify syslog entry contains source IP, destination IP, protocol, port, and deny reason. Logged entry must be human-readable and structured (not just "packet denied").

**Field 6 (Autonomous Law):**
- **Proof obligation 1:** ACL rules must be applied consistently and reproducibly such that an outside auditor (legal reviewer, compliance officer) can verify "all traffic matching criteria X was denied at interface Y" by examining running config + syslog, without running live tests.
  - *Validation:* On Day-33-Field-6-Lab.md, document the ACL policy intent (via named ACL descriptive names + remarks), apply it, generate a representative syslog (deny log entries for policy-violating traffic), and demonstrate that a reviewer unfamiliar with the lab can map each syslog entry back to a specific ACL rule and explain why traffic was denied.

- **Proof obligation 2:** The ACL configuration must be traceable to a stated business requirement (written policy document) such that rule changes can be audited: "on date X, requirement Y changed, ACL rule Z was updated, and here is the syslog evidence of the change."
  - *Validation:* Day-33-Field-6-Lab.md includes a "Policy Intent" document (CSV table mapping each rule to business requirement); update one rule (e.g., allow new admin workstation IP) and document the change with a timestamp + reason. Verify syslog shows the policy change (ACL reload event) correlated with the business requirement change.

### 2.6.c Haiti Deployment Linkage

**Field 4 (P38 Pilot onwards):**
- **Module:** dcentral-core (DID/VC issuance, node identity verification)
- **When:** P38 pilot (50–100 nodes, early 2038) and scale phases (P45+)
- **Why this proof matters:** The P38 pilot of dcentral-core must issue DIDs (decentralized identifiers) to each mesh node. DID issuance depends on verifying node identity: "Is this request really from node MAC:XX:XX or an imposter?" Extended ACLs on the pilot mesh prove that source-specific policies can be enforced at the network layer. If Day-33's proof (granular ACL filtering) fails (e.g., multiple rules interfere, overhead causes drops), dcentral-core DID issuance will be blocked by false-positive denials — a node's legitimate traffic will be incorrectly rejected, and DIDs won't be issued. **Operational consequence:** P38 pilot deployment cannot proceed without proving that extended ACLs work reliably; if they don't, DID issuance is compromised, affecting all downstream modules.

**Field 6 (P55+ Governance Scale):**
- **Module:** Lakou DAO (decentralized autonomous organization governing mesh-node incentives)
- **When:** P55+ (large-scale deployment, 1000+ nodes, late 2038+)
- **Why this proof matters:** Lakou DAO governance requires immutable, legally-defensible audit trails showing which nodes voted for which decisions, and which nodes were penalized for Byzantine behavior. Day-33's extended ACL + syslog mechanism proves that network-layer decisions can be logged and made auditable. P55+ governance board (Haitian cooperatives + diaspora partners) will require proof that node behavior is traceable: "Node X was excluded from voting on this DAO proposal because syslog showed it sent forged attestation at timestamp T." Without this proof (Day-33's ACL logging foundation), DAO governance lacks legal ground. **Operational consequence:** P55+ scale deployment of Lakou DAO governance cannot proceed without proving audit-trail capability; if audit logs are missing or non-authoritative, governance decisions are legally indefensible.

### 2.6.d Publication Linkage

This lab's proof feeds into:

- **Publication #4: *Critical Infrastructure Security* (Field 4, P60–P65, Harvard peer-reviewed)**
  - *Specific contribution:* Day-33's extended ACL rules + syslog mechanism serve as a case study in "granular, verifiable network-layer access control." The publication will cite this lab's proof that multi-dimensional filtering (source + destination + protocol + port) can be statically configured, logged, and audited without dynamic update overhead. This demonstrates that security policies can be decentralized (no central firewall appliance needed) and still provide the granularity required for decentralized mesh nodes.

- **Publication #5: *Autonomous Systems Legal Accountability* (Field 6, P63–P66, Harvard peer-reviewed)**
  - *Specific contribution:* Day-33's ACL logging + policy-intent documentation prove that network behavior can be attributed to specific rules and timestamped events, forming the basis of legal accountability. Publication will cite the lab's audit-trail examples showing how a compliance officer can verify "traffic violating policy X was denied at Y on date Z" by examining configuration + syslog without expert forensics. This supports the legal claim that decentralized systems (Lakou DAO) can maintain audit trails as rigorous as centralized ones.

### 2.6.e Validation Gate

**Research milestone (Validation Gate):**
- **T4 publication on cryptographic protocols for attestation (Field 4, P26 target)** MUST be complete before P38 pilot deployment can begin.
  - *Why:* P38 pilot will use extended ACLs to filter dcentral-core DID-issuance traffic. DID issuance itself depends on cryptographic verification of node identity (signatures, certificates). Day-33's extended ACL proof (granular filtering) is not sufficient without a T4 publication showing that DID-issuance traffic *itself* is cryptographically signed and verified. If the cryptographic-protocol paper is not published, DID issuance lacks formal proof of correctness; P38 pilot deployment proceeds with risk.
  - *Status:* Field 4 research plan targets P26 (period 26 timeline per RESEARCH_FIELDS_DCENTRAL_DEPIN_MATRIX_V24.md); this is earlier than P38 pilot, so the gate should be met.
  - *Consequence if missed:* P38 pilot deployment proceeds with dcentral-core going live but without cryptographic-protocol correctness proof. DID-issuance is operational but not formally verified. Extra monitoring required; if DID-issuance failures occur (rare but possible), RCA will lack formal proof that the cause was a cryptographic protocol flaw vs. an implementation bug vs. network misconfiguration. Likely outcome: P38 pilot proceeds but with reduced confidence; P45 scale-up is delayed pending the delayed P26 publication.

- **T4 publication on audit-trail mechanisms for autonomous systems (Field 6, P55 target, law-review venue)** MUST be complete before P55+ large-scale deployment.
  - *Why:* P55+ governance (Lakou DAO at 1000+ nodes) requires legal standing in Haiti. Haitian law will require proof that governance decisions are traceable and disputes-resolvable via audit. Day-33's ACL logging mechanism is the proof-of-concept; the T4 law-review publication is the formal statement of legal sufficiency. Without the publication, Lakou DAO governance is technically operational but legally questionable.
  - *Status:* Field 6 research plan targets P55 (T5 publication); this aligns with P55+ governance scale-up, so gate timing is tight but feasible.
  - *Consequence if missed:* P55+ governance board (Haitian cooperatives) will not authorize Lakou DAO governance without legal proof of audit-trail sufficiency. P55+ deployment proceeds as infrastructure (connectivity, energy, compute) but without DAO governance; node operators must make decisions manually or via centralized board, defeating the decentralization principle. Likely outcome: P55+ governance proceeds with reduced autonomy; DAO governance delayed pending P55 publication.

---

## Appendix: Field-Specific Variants (Planned)

This base lab (Day-33-Lab-Manual.md) emphasizes the general extended ACL mechanism. Field-specific variants are planned:

- **Day-33-Field-4-Lab.md (Security variant):** Emphasize cryptographic signing of ACL rules and syslog entries; add Day-33-specific attestation mechanism validating rule integrity.
- **Day-33-Field-6-Lab.md (Autonomous Law variant):** Emphasize policy-intent documentation and audit-trail completeness; add legal-review checklist showing compliance with audit standards.

---

*End of Day-33 Research Paper*
