# The Research-Paper Standard: Full Rigor + Research-Field Linkage

## What this document is

This is the reference standard for every `Day-NN-Research-Paper.md` document in `RedjiJB-Labs/`. It extends the **Research-Grade Standard** (5 sections: Delta, Compliance Gap, Benchmarking, Traceability, Community Integration) with a **6th section: Research-Field Linkage**, which explicitly names which research fields this lab proves, what proof obligations it satisfies, and when those proofs matter operationally (Haiti deployment phase).

**The distinction:** Research-Grade (Sections 1–5) makes a lab defensible against technical skepticism: "Your design is different from the naive baseline, compliant with standards, benchmarked, fully verified, and reusable." Section 2.6 makes the lab purposeful against mission skepticism: "This design's proof unblocks this phase of the Haiti deployment, because it demonstrates this specific research field's proof obligation."

---

## 1. Why research-field linkage matters

A CCNA lab that passes Research-Grade rigor is good engineering. A CCNA lab that ALSO names which research field(s) it proves is part of a coherent system. Example:

**Without linkage (generic good lab):**
> "This OSPF lab tests convergence time and follows RFC 2328. We measured convergence in 30 seconds. Students can build and verify this design."

**With linkage (mission-driven lab):**
> "This OSPF lab tests convergence time under geomagnetic stress, proving Field 2 (Geomagnetic Resilience). Proof obligation: convergence < 60s even under ±20% latency jitter. This unblocks P38 Haiti pilot deployment of mesh-connectivity because geomagnetically-resilient routing is a validation gate for the PoC module to go live. Supporting research: Field-2-variant labs (Day-24-Field-2, Day-29-Field-2, Day-30-Field-2) all validate this under different topologies. Harvard publication #18 (*Formally Verified Autonomous Failover Under Space Weather*) cites this proof."

The second version connects the lab to the larger mission and shows *why* getting it right matters.

---

## 2. Sections 1–5: Identical to Research-Grade Standard

Before writing Section 2.6, complete **Sections 2.1–2.5 exactly as defined in RESEARCH-GRADE-STANDARD.md**:

### 2.1 Delta Section
```
Baseline:      [the naive/standard alternative]
This design:   [what the lab actually does]
Delta:         [the specific difference, stated as a design decision]
Justification: [why the delta is worth its cost]
```

### 2.2 Compliance Gap Analysis
A table showing this lab's design vs. an external standard (RFC, CIS Benchmark, etc.), naming any gaps and whether they're acceptable for CCNA scope.

### 2.3 Quantitative Benchmarking
Actual numbers from this lab (address space efficiency, convergence time, etc.), not vague claims. Example: "The naive design requires 7 × 254 = 1,778 addresses; VLSM design uses 46 addresses — a 97.4% reduction."

### 2.4 Verification Traceability Matrix
A table proving every learning objective from the base lab has at least one verification step that tests it. Flag uncovered objectives.

### 2.5 Community Integration
Name a specific contribution target (repo, wiki, community) and the concrete gap between "works for me" and "ready to contribute."

---

## 3. Section 2.6 (NEW): Research-Field Linkage

This section explicitly connects the lab's design to the research fields and Haiti deployment. Answer each subsection for EACH field the lab contributes to.

### 2.6.a: Research Fields Identified

List the fields by name and number. Be honest — don't force a field if the lab doesn't genuinely contribute.

**Example (Day-24 OSPF research paper):**
```
This lab contributes evidence to three research fields:
- Field 1: Black Start Systems (offline routing)
- Field 2: Geomagnetic Resilience (stress-robust convergence)
- Field 3: Distributed Systems & DePIN Governance (mesh-routing foundation)

This lab does NOT directly contribute to Fields 4–7 (though its routing work indirectly supports Field 7 deployment).
```

**Example (Day-38 DNS research paper):**
```
This lab contributes evidence to two research fields:
- Field 4: Security (attestation of DNS responses)
- Field 5: Healthcare AI (privacy-preserving name resolution)

Field 7 (Haiti) depends on this lab's DNS design for local name authority.
```

### 2.6.b: Proof Obligations — What Must This Lab Prove?

For EACH field listed above, state 1–2 concrete, measurable claims the lab's design must satisfy. These are NOT just "it works" — they are specific to the field's research goal.

**Example (Day-24 for Field 1: Black Start):**
```
Field 1 Proof Obligation:
- OSPF routing must function when external DNS is unavailable (offline cache mode)
- Convergence must not depend on NTP or external time source (local time sufficient)
- Running configuration must survive device reboot without external input

Validation: Successfully restart Day-24 router and verify OSPF adjacencies reform
           with zero external dependencies (no NTP, no external DNS, no cloud state)
```

**Example (Day-24 for Field 2: Geomagnetic):**
```
Field 2 Proof Obligation:
- OSPF convergence time after link loss must be < 60 seconds
- Under simulated geomagnetic stress (±20% latency jitter, ±5% packet loss)
- Measured across 5 consecutive link-down events

Validation: Inject jitter/loss into Day-24-Field-2 topology, measure convergence time
           for each of 5 failover events; all 5 must be < 60s; record min/max/average
```

**Example (Day-38 for Field 4: Security):**
```
Field 4 Proof Obligation:
- DNS cache invalidation must not leak stale data to unauthorized parties
- A DNS poisoning attempt (forged response injection) must be detectible via
  response validation or logging
- Offline DNS resolution (cache hit) must match online resolution (no divergence)

Validation: Configure Day-38-Field-4 with DNSSEC or response-signature validation;
           attempt DNS spoofing; verify attempt is logged/rejected; validate
           cached vs. live responses match
```

### 2.6.c: Haiti Deployment Linkage

When and how does this proof matter operationally in the Haiti deployment?

**Example (Day-24 for Field 2):**
```
Haiti Deployment Phase: P38 pilot (50–100 nodes, early 2038)
Module: mesh-connectivity (Proof-of-Coverage + mesh routing)

Linkage: The P38 pilot deploys mesh-connectivity across 15 hotspots in Haiti.
         Each hotspot runs OSPF across its neighbors. Haiti's equatorial location
         exposes nodes to dynamic geomagnetic activity (SAA expansion, seasonal
         CME risk). Day-24's Field-2 proof (OSPF convergence < 60s under stress)
         becomes a validation gate: if convergence fails under simulated stress,
         mesh-connectivity goes live anyway but with extra monitoring. If convergence
         passes (which this design does), PoC attestation is trusted to run autonomously
         without manual intervention.
```

**Example (Day-38 for Field 4):**
```
Haiti Deployment Phase: P38 pilot onwards
Module: dcentral-core (node identity, DID/VC issuance, name authority)

Linkage: dcentral-core must issue and validate decentralized identifiers (DIDs)
         for every node in the mesh. DIDs rely on authoritative name resolution.
         Day-38's proof (offline DNS resolution + spoofing detection) unblocks
         dcentral-core's offline-mode operation. Without it, DID issuance fails
         during internet outages. This affects P38 onwards: every phase depends
         on DIDs working reliably.
```

### 2.6.d: Publication Linkage

Which of the 17 Harvard peer-reviewed publications (P60–P68) would cite this lab's proof?

Reference the user's research matrix document (RESEARCH_FIELDS_DCENTRAL_DEPIN_MATRIX_V24.md) for the exact publication names and timelines.

**Example (Day-24):**
```
This lab's proof feeds into:
- Publication #18 (*Formally Verified Autonomous Failover Under Space Weather*)
  by Field 2 (P38, target venue: CCS/S&P)
  Specific contribution: convergence-time benchmarks under geomagnetic-jitter
                         model feed into formal verification of failover logic

- Publication #3 (*Distributed Platforms Without Trusted Authorities*)
  by Field 3 (P60–P65, target venue: Harvard peer-reviewed)
  Specific contribution: OSPF mesh-routing proof validates decentralized
                         path selection (no single authoritative topology)
```

**Example (Day-38):**
```
This lab's proof feeds into:
- Publication #4 (*Critical Infrastructure Security*)
  by Field 4 (P60–P65, target venue: Harvard peer-reviewed)
  Specific contribution: DNS attestation mechanism validates that name
                         resolution can be cryptographically signed,
                         supporting zero-trust architecture

- Publication #2 (*Equitable AI at the Edge*)
  by Field 5 (P60–P65, target venue: Harvard peer-reviewed)
  Specific contribution: privacy-preserving DNS (no query logging) supports
                         edge AI inference without exposing user query patterns
```

### 2.6.e: Validation Gate — Research Milestone Before Deployment

What research output must be published BEFORE this lab's proof unblocks Haiti deployment?

**Example (Day-24):**
```
Research Milestone (Validation Gate):
- T4 publication on geomagnetic-resilient routing (Field 2, P23 target)
  MUST be complete before P38 pilot deployment
- Why: P38 pilot deployment board requires peer-reviewed evidence that OSPF
  can converge reliably under space-weather stress. Convergence-time benchmarks
  from Day-24-Field-2 feed into that paper's quantitative results.
- If gate missed: P38 pilot deployment proceeds with extra monitoring; if
  geomagnetic event occurs during early pilot, PoC recovery will be manual.
```

**Example (Day-38):**
```
Research Milestone (Validation Gate):
- T4 publication on cryptographic protocols for attestation (Field 4, P26 target)
  MUST be complete before dcentral-core goes to P38 pilot
- Why: DID/VC issuance assumes cryptographic protocols are formally verified.
  Day-38's DNS-attestation proof feeds into that paper as a case study in
  verifiable name resolution.
- If gate missed: dcentral-core uses DNS resolution but without spoofing-detection
  in the P38 pilot; attestation envelope doesn't include DNS proof.
```

---

## 4. Template: Full Research-Paper Structure

```
# Day-NN Research Paper — [Topic]

## 2.1 Delta Section
[Sections 1–5 from Research-Grade, as-is]

## 2.2 Compliance Gap Analysis
[from Research-Grade]

## 2.3 Quantitative Benchmarking
[from Research-Grade]

## 2.4 Verification Traceability Matrix
[from Research-Grade]

## 2.5 Community Integration
[from Research-Grade]

## 2.6 Research-Field Linkage

### 2.6.a Research Fields Identified
This lab contributes to [Field X, Field Y, ...]:
- [Field name + definition]
- [Why this lab contributes]

### 2.6.b Proof Obligations

**Field X:**
- Proof obligation 1: [measurable claim]
  Validation: [how to test it]
- Proof obligation 2: [measurable claim]
  Validation: [how to test it]

**Field Y:**
- Proof obligation 1: [measurable claim]
  Validation: [how to test it]

### 2.6.c Haiti Deployment Linkage

**Field X (Phase P???):**
- Module: [module name]
- When: [deployment phase and scale]
- Why this proof matters: [operational consequence]

**Field Y (Phase P???):**
- Module: [module name]
- When: [deployment phase and scale]
- Why this proof matters: [operational consequence]

### 2.6.d Publication Linkage

This lab's proof feeds into:
- Publication #N: [title] (Field X, P??, venue)
  Contribution: [specific way this lab's proof appears]
- Publication #M: [title] (Field Y, P??, venue)
  Contribution: [specific way this lab's proof appears]

### 2.6.e Validation Gate

Before Haiti deployment can proceed:
- Research milestone [X]: [publication or proof requirement]
  Status: [Published / In progress / Blocked]
  Consequence if missed: [what changes in deployment]
```

---

## 5. Writing guidance for Section 2.6

### Be specific, not vague.

**Bad:**
> "This lab proves geomagnetic resilience."

**Good:**
> "This lab proves OSPF convergence < 60s under ±20% latency jitter and ±5% packet loss, simulating geomagnetic-induced disturbances on equatorial RF links. Field-2-specific topology adds stress injection points; Field-2-specific verification measures convergence time across 5 failover events. Result: this design qualifies for P38 pilot deployment of mesh-connectivity where atmospheric disturbances are observed."

### Be honest about limitations.

**Bad:**
> "This lab proves all research fields equally."

**Good:**
> "This lab's base design contributes to Fields 1, 3, and 7 at moderate strength (common OSPF foundation). Field-2-specific variant (Day-24-Field-2-Lab.md) provides strong evidence for Field 2 (geomagnetic resilience). Field-specific variants exist for optimal proof per field."

### Connect to real milestones.

**Bad:**
> "This lab supports the Haiti deployment."

**Good:**
> "P38 pilot (50–100 nodes, Q1 2038) depends on mesh-connectivity's PoC module going live. PoC module depends on OSPF convergence proof (this lab, Field 2). If Day-24-Field-2 convergence < 60s, PoC can operate autonomously. If > 60s, PoC requires extra monitoring during geomagnetic events, delaying full deployment to P45."

---

## 6. Scope discipline

### Sections 1–5 stay focused on technical rigor.
- Delta: design vs. baseline
- Compliance: design vs. standard
- Benchmarking: numbers
- Traceability: requirements vs. verification
- Community: reusability

### Section 2.6 focuses on research purpose and mission linkage.
- Fields: which research this lab proves
- Proof obligations: what must be true for that research to be valid
- Deployment: when this proof matters operationally
- Publications: how this proof appears in peer-reviewed work
- Validation gate: what research milestone must land before deployment

The two scopes complement each other: 1–5 make the lab defensible; 2.6 makes it purposeful.

---

## 7. Verification

Before finalizing a research paper, check:

1. **Sections 1–5 are complete and honest** (per Research-Grade Standard)
   - Delta Section names a real baseline, not a strawman ✓
   - Compliance Gap Analysis uses a real, named standard (not fabricated) ✓
   - Benchmarking has actual numbers, not claims ✓
   - Traceability Matrix covers all learning objectives ✓
   - Community Integration targets a specific, plausible project ✓

2. **Section 2.6 is complete and linked to real research**
   - Fields identified are subset of the 7 fields (not made up) ✓
   - Proof obligations are measurable and testable ✓
   - Haiti deployment phases (P38, P45, P52, P55+) are real phases from user's timeline ✓
   - Publications named exist in RESEARCH_FIELDS_DCENTRAL_DEPIN_MATRIX_V24.md ✓
   - Validation gate references a research milestone, not vague goals ✓

3. **Field-specific variants are referenced**
   - If this base lab has field-specific variants (e.g., Day-24-Field-2-Lab.md),
     Section 2.6 names them explicitly ✓
   - Each field-specific variant is documented in RedjiJB-Labs/Day-NN/ directory ✓

4. **No circular reasoning**
   - This paper doesn't claim "this lab proves X because the deployment says so"
   - Instead: "this lab proves X (measurable), which is necessary for deployment phase Y" ✓
