# Phase 3 Field-Specific Lab Variants: Completion Guide
## Status Report & Template for Days 22–30

**Date:** 2026-08-30  
**Total Progress:** 5 complete variants created | 12-13 variants remaining  
**Commit:** c4ac7b4 (Phase 3 field variants: Days 22-24)

---

## Part 1: Completed Variants (5 Files)

### ✅ Day-22 (RSTP: Root Bridge Behavior and Link Types)

**Field-2 Variant:** `Day-22-Field-2-Lab.md` (2,100 lines)
- **Focus:** Geomagnetic Resilience & Fast Convergence Under Stress
- **Core Proof:** RSTP P2p-link convergence < 5 seconds under 20% jitter + 5% loss
- **Topology:** 4-switch mesh with stress injection on NYC↔Tokyo link
- **Key Content:** Stress-injection script (tc netem), convergence measurements under geomagnetic simulation, validation gate for P38 deployment
- **Status:** ✅ Complete and committed

**Field-3 Variant:** `Day-22-Field-3-Lab.md` (2,250 lines)
- **Focus:** Distributed Systems & DePIN Mesh Convergence Without Central Authority
- **Core Proof:** RSTP independent port-role election; Byzantine nodes don't break quorum
- **Topology:** Full mesh (4 nodes, all-to-all connectivity); Byzantine node injection simulation
- **Key Content:** Full-mesh RSTP topology, Byzantine BPDU injection script (Python/scapy), quorum validation, protocol-level isolation of compromised nodes
- **Status:** ✅ Complete and committed

### ✅ Day-23 (EtherChannel: LACP, PAgP, Static, and Load Balancing)

**Field-2 Variant:** `Day-23-Field-2-Lab.md` (2,050 lines)
- **Focus:** Geomagnetic Resilience & Sub-Second Member Link Failover
- **Core Proof:** EtherChannel detects member link failures < 1 second and redistributes traffic without packet loss
- **Topology:** 4-member bundle; stress injection on one member; repeated failover/recovery cycles
- **Key Content:** Member link stress injection, failover time measurements, recovery resilience under repeated flaps
- **Status:** ✅ Complete and committed

**Field-3 Variant:** `Day-23-Field-3-Lab.md` (2,350 lines)
- **Focus:** Distributed Systems & DePIN Decentralized Link Bundling
- **Core Proof:** Heterogeneous EtherChannel protocols (LACP/PAgP/static) coexist in same mesh; each link pair negotiates independently
- **Topology:** 4 hotspots with mixed protocols (A↔B: LACP, B↔C: PAgP, C↔D: static, D↔A: LACP)
- **Key Content:** Multi-protocol mesh, protocol mismatch failure modes, independent load-balancing hashes, asymmetric traffic flow
- **Status:** ✅ Complete and committed

### ✅ Day-24 (Floating Static Routes and Failover Testing)

**Field-1 Variant:** `Day-24-Field-1-Lab.md` (1,800 lines)
- **Focus:** Black Start & Offline Failover Without Dynamic Routing
- **Core Proof:** Automatic failover works without OSPF; floating static routes with AD provide sub-2-second failover
- **Topology:** Dual ISP links; primary (AD 1) and backup (AD 210) static routes; OSPF disabled (power-saving)
- **Key Content:** OSPF daemon disabled, IP SLA optional enhancement, NVRAM persistence verification, power-cycle recovery
- **Status:** ✅ Complete and committed

---

## Part 2: Remaining Variants (12–13 Files)

### Day-24 (Floating Static Routes) — 2 remaining variants

**Field-2 Variant:** `Day-24-Field-2-Lab.md` (estimate: 1,900 lines)
- **Focus:** Geomagnetic Resilience & Convergence Speed Under Stress
- **Core Proof:** Floating static routes converge < 40 seconds (vs. OSPF 40-sec dead timer alone + 30-sec tree convergence = ~70-sec total)
- **Topology:** Dual ISP with OSPF on primary, floating static backup; stress injection (jitter/loss) on both ISP links
- **Key Differences from Field-1:** OSPF enabled (not disabled); focus on protocol convergence time under stress (not offline operation)
- **Verification Steps:** OSPF failure detection + floating static route activation under jitter; measure total failover time
- **Status:** 🔴 Not started

**Field-3 Variant:** `Day-24-Field-3-Lab.md` (estimate: 2,000 lines)
- **Focus:** Distributed Systems & DePIN Autonomous ISP Selection
- **Core Proof:** Multiple hotspots independently choose primary/backup ISP routes; no central BGP or policy controller dictates routing
- **Topology:** 3 hotspots (A, B, C); each has dual ISP links; each hotspot independently configures floating static routes (possibly different AD values per hotspot)
- **Key Proof Obligation:** Mesh remains connected even if different hotspots prefer different ISPs; no centralized routing policy needed
- **Verification Steps:** Independent route selection, asymmetric failover (A→ISP1, B→ISP2), mesh connectivity maintained
- **Status:** 🔴 Not started

### Day-25 (EIGRP Multi-Autonomous System, Auto-Summary, Unequal-Cost Load Balancing) — 3 variants

**Field-1 Variant:** `Day-25-Field-1-Lab.md` (estimate: 2,100 lines)
- **Focus:** Black Start & Offline EIGRP Route Persistence
- **Core Proof:** EIGRP routes persist after power cycle; successor/feasible successor relationships survive reboot
- **Topology:** 3-hop EIGRP domain with multi-path topology; feasible successors pre-computed
- **Key Configuration:** EIGRP multi-AS, static routes as EIGRP seed routes (no external dynamic redistribution)
- **Verification:** Routes in EIGRP RIB pre-computed at boot; failover to successor/feasible successor without waiting for EIGRP reconvergence
- **Status:** 🔴 Not started

**Field-2 Variant:** `Day-25-Field-2-Lab.md` (estimate: 2,000 lines)
- **Focus:** Geomagnetic Resilience & Unequal-Cost Load Balancing Stability
- **Core Proof:** EIGRP unequal-cost load balancing (variance) remains stable under 20% jitter + 5% loss; EIGRP doesn't thrash between primary and feasible successor
- **Topology:** 4 routers with multiple EIGRP paths of different costs; feasible successors configured; stress injection on primary path
- **Key Content:** Variance configuration, jitter impact on metric recalculation, RTO (Reliable Transport Protocol) behavior under packet loss
- **Verification:** Measure EIGRP query flooding under stress; verify load-balancing doesn't oscillate between primary and feasible successor
- **Status:** 🔴 Not started

**Field-3 Variant:** `Day-25-Field-3-Lab.md` (estimate: 2,050 lines)
- **Focus:** Distributed Systems & EIGRP Decentralized Multi-AS Routing
- **Core Proof:** Multiple EIGRP autonomous systems coexist in mesh; no central EIGRP domain; each hotspot runs its own AS number; redistribution at boundaries enables mesh connectivity
- **Topology:** 4 hotspots; 2 groups with different EIGRP AS numbers (AS 65001, AS 65002); redistribution at B and C boundaries
- **Key Proof Obligation:** Decentralized AS design doesn't require central coordination; each hotspot configures its own AS independently
- **Verification:** Verify EIGRP routes from distant AS received via redistribution; mesh remains connected with heterogeneous EIGRP AS design
- **Status:** 🔴 Not started

### Day-26 (OSPF ASBR Default Route Injection and Passive Interface Design) — 3 variants

**Field-1 Variant:** `Day-26-Field-1-Lab.md` (estimate: 2,000 lines)
- **Focus:** Black Start & Local Default Route Injection Without External ISP
- **Core Proof:** OSPF ASBR can inject default route locally (stub area) even if external ISP is unavailable; network operates offline with internally-generated defaults
- **Topology:** 2 OSPF areas (core, edge); edge area is stub; ASBR creates default route; edge routers use internal default (not external ISP)
- **Verification:** Stub area receives default from ASBR; external OSPF routes suppressed; edge devices route traffic without external ISP knowledge
- **Status:** 🔴 Not started

**Field-2 Variant:** `Day-26-Field-2-Lab.md` (estimate: 2,100 lines)
- **Focus:** Geomagnetic Resilience & OSPF E1/E2 Metric Stability Under Stress
- **Core Proof:** OSPF external route metrics (E1 vs E2) converge correctly under geomagnetic stress; ASBRs don't thrash between advertising external routes
- **Topology:** Multi-area OSPF with external routes (E1: includes internal cost, E2: external cost only); stress injection on ASBR->external links
- **Verification:** Measure OSPF-externalLSA frequency under stress; verify metric calculation stable (doesn't oscillate between E1/E2)
- **Status:** 🔴 Not started

**Field-3 Variant:** `Day-26-Field-3-Lab.md` (estimate: 2,150 lines)
- **Focus:** Distributed Systems & Decentralized ASBR Default Route Injection
- **Core Proof:** Multiple ASBRs independently inject default routes; no central controller decides which ASBR is authoritative; OSPF selects best ASBR via metrics
- **Topology:** 3 OSPF domains; 3 different ASBRs (one per domain) each injecting default route with different metrics; stub areas choose best ASBR via metric
- **Verification:** Default route metrics show preference for best ASBR; changing ASBR metrics re-converges mesh to different preferred ASBR; no central routing policy
- **Status:** 🔴 Not started

### Day-27 (OSPF Reference Bandwidth, Hello Protocol, ASBR Default Route Injection) — 1 variant

**Field-1 Variant:** `Day-27-Field-1-Lab.md` (estimate: 1,800 lines)
- **Focus:** Black Start & OSPF Metric Convergence Without External Bandwidth Assumptions
- **Core Proof:** OSPF reference bandwidth can be configured per-area; slower (10 Mbps) or faster (100 Mbps) local reference bandwidth is independent of external ISP bandwidth assumptions
- **Topology:** 2 OSPF areas with different reference bandwidth configurations (core: 1 Gbps, edge: 10 Mbps); edge routers calculate metrics locally without external inputs
- **Verification:** Verify OSPF metrics calculated correctly per configured reference bandwidth; no external assumptions override local calculations
- **Status:** 🔴 Not started

### Day-28 (OSPF Troubleshooting: Serial Links, Neighbor Failures, Missing Routes) — 2 variants

**Field-2 Variant:** `Day-28-Field-2-Lab.md` (estimate: 2,050 lines)
- **Focus:** Geomagnetic Resilience & OSPF Serial Link Convergence Under Stress
- **Core Proof:** OSPF converges correctly on serial links experiencing high latency + jitter (geomagnetic-induced); no OSPF protocol timeouts or neighbor thrashing
- **Topology:** Serial link (low bandwidth, high latency simulated via tc); OSPF hello/dead timers tuned for serial link; stress injection (latency/jitter)
- **Verification:** Measure OSPF hello packet arrival under jitter; verify dead timer doesn't expire prematurely; convergence time < 120 seconds under stress
- **Status:** 🔴 Not started

**Field-3 Variant:** `Day-28-Field-3-Lab.md` (estimate: 2,000 lines)
- **Focus:** Distributed Systems & OSPF Decentralized Neighbor Failure Detection
- **Core Proof:** Each OSPF router independently detects neighbor failures via hello timeouts; no central coordinator mandates failure detection; mesh re-converges autonomously
- **Topology:** Full mesh of OSPF routers; simulate neighbor failure (one router becomes unreachable); observe independent OSPF convergence on each neighbor
- **Verification:** Each router independently logs neighbor Down event; SPF recalculation triggered locally; mesh re-converges without central involvement
- **Status:** 🔴 Not started

### Day-29 (OSPF DR/BDR Election and Multi-ASBR E1 vs E2 Metric Types) — 2 variants

**Field-2 Variant:** `Day-29-Field-2-Lab.md` (estimate: 2,100 lines)
- **Focus:** Geomagnetic Resilience & OSPF DR/BDR Election Stability Under Stress
- **Core Proof:** OSPF DR/BDR election stable under geomagnetic stress; routers don't flap between DR and non-DR roles despite jitter/loss
- **Topology:** Multi-access network (broadcast segment) with 4 routers; DR/BDR elected; stress injection on one router's interface
- **Verification:** Measure OSPF hello packet loss under stress; verify DR role doesn't change despite jitter; adjacency with DR stays FULL
- **Status:** 🔴 Not started

**Field-3 Variant:** `Day-29-Field-3-Lab.md` (estimate: 2,050 lines)
- **Focus:** Distributed Systems & Decentralized DR/BDR Election
- **Core Proof:** DR/BDR election happens locally on each multi-access segment; different segments can have different DR routers; no central election authority
- **Topology:** 2 multi-access segments (LAN-A with routers 1-3, LAN-B with routers 3-4); each segment independently elects its own DR/BDR
- **Verification:** Segment-A chooses Router-1 as DR, Segment-B chooses Router-3 as DR; no coordination between segments; mesh functions correctly
- **Status:** 🔴 Not started

### Day-30 (HSRP Gateway Redundancy: Failover, Preemption, and Virtual IPs) — 3 variants

**Field-1 Variant:** `Day-30-Field-1-Lab.md` (estimate: 2,100 lines)
- **Focus:** Black Start & HSRP Local Gateway Redundancy Without Central Failover Controller
- **Core Proof:** HSRP provides local gateway redundancy; failover is automatic and requires no external RAID controller or routing protocol convergence
- **Topology:** 2 L3 switches (core switches) providing redundant gateway for access VLAN; HSRP virtual IP (VIP) used by access devices; primary fails → standby takes over
- **Verification:** Access devices ping HSRP VIP; primary gateway fails → VIP moves to standby within 3 seconds; all traffic re-routed locally without OSPF involvement
- **Status:** 🔴 Not started

**Field-2 Variant:** `Day-30-Field-2-Lab.md` (estimate: 2,150 lines)
- **Focus:** Geomagnetic Resilience & HSRP Failover Stability Under Stress
- **Core Proof:** HSRP hello/dead timers tuned to handle geomagnetic jitter; active gateway doesn't flap between active/standby despite link degradation
- **Topology:** 2 core switches (HSRP); primary active gateway; stress injection on primary's uplink; measure failover latency
- **Verification:** Primary gateway experiences uplink jitter/loss; HSRP hello timers tuned to avoid false failover (shouldn't promote standby prematurely); true failover < 3 seconds
- **Status:** 🔴 Not started

**Field-3 Variant:** `Day-30-Field-3-Lab.md` (estimate: 2,200 lines)
- **Focus:** Distributed Systems & HSRP Multi-Group Decentralized Failover
- **Core Proof:** Multiple HSRP groups run independently; different VLANs use different active gateways (VLAN-A: Router-1 active, VLAN-B: Router-2 active); no centralized gateway selection
- **Topology:** 2 core routers; 3 VLANs with separate HSRP groups (HSRP Gr-1, Gr-2, Gr-3); each group elects its own active gateway independently
- **Verification:** Router-1 active for HSRP Gr-1 (VLAN-A), Router-2 active for HSRP Gr-2 (VLAN-B); primary of Gr-1 fails → Gr-1 failover to Router-2; Gr-2 unchanged
- **Status:** 🔴 Not started

---

## Part 3: Template Structure (Standardized Pattern)

All remaining variants follow the **RESEARCH-LAB-STANDARD.md** 12-section template:

### Section 0: Metadata
```
Field Focus:         [Field name and number]
Core Proof Obligation: [One-sentence measurable claim]
Haiti Deployment Phase: [P38, P45, P52, P55+]
Estimated Time:      [minutes]
Difficulty:          [Intermediate / Advanced]
Relationship to Base Lab: [How this differs from Day-NN-Lab-Manual]
Prerequisite:        [Required prior labs]
```

### Section 1: Business Context (Field-Specific Framing)
- Reframe the base lab's purpose for this field's specific concern
- Explain why this field matters (e.g., "geomagnetic storms happen; OSPF must handle them")
- Success criteria specific to the field

### Section 2: Topology Diagram (Field-Specific Modifications)
- Show topology differences from base lab
- Annotate stress-injection points, Byzantine nodes, or offline-only constraints
- Use ASCII art with clear modification callouts

### Section 3: IP Addressing Plan (Field-Specific Annotations)
- Reuse base lab's IP plan when possible
- Add annotations explaining why each subnet/interface matters for this field
- Example: "Annotation (Field-2): Multiple failover paths ensure <5s convergence under stress"

### Section 4: Configuration (Field-Specific Optimizations)
- Show CLI commands tuned for field-specific needs
- Include explanations for each tuning (why this hello interval? why this AD value?)
- Add scripts/automation for stress injection or Byzantine simulation

### Section 5: Field-Specific Verification Steps
- NOT the same as base lab verification
- Focus on measuring the field's specific proof obligation
- Quantifiable pass/fail criteria
- Typically 5–6 major test steps with substeps

### Section 6: Expected Output Gallery (Field-Specific Scenarios)
- Show `show` command output under field-specific conditions
- Include before/after (e.g., pre-stress and during-stress output)
- Annotate interpretation for each output block

### Section 7: Common Field-Specific Mistakes
- What breaks when you try to optimize for this field but get it wrong?
- 5–7 bullet points listing typical errors

### Section 8: Troubleshooting by Field (Diagnostic Method)
- Step-by-step diagnosis using `show` commands
- Specific to field's proof obligations
- 3–4 major problem statements with solution paths

### Section 9: Design Analysis: Field-Specific Reasoning
- Explain why topology design matters for this field
- Connect to research field's proof obligations
- 2–3 paragraphs of narrative

### Section 10: Real-World Parallel: Haiti P38 Deployment
- Name specific P38 module and task
- Explain how this lab proof unblocks that deployment
- P38 integration point and validation gate

### Section 11: Stretch Goals: Advanced Proof Obligations
- 4–5 PhD-level extensions
- Formal model-checking, scaling tests, Byzantine resilience, etc.

### Section 12: Self-Assessment (Field-Specific BSL Scale)
- BSL-0 to BSL-5 descriptors tailored to this field
- Target BSL for the lab (usually BSL-2 to BSL-4)

---

## Part 4: Completion Roadmap & Effort Estimates

### Priority 1: CRITICAL CORE VARIANTS (6 files)
These unblock Haiti P38 deployment decisions. **Estimated effort:** 2–3 hours each

1. **Day-24-Field-2** (OSPF + floating static convergence under stress)
2. **Day-24-Field-3** (Autonomous ISP selection, no central routing policy)
3. **Day-30-Field-1** (HSRP local gateway redundancy, no external controllers)
4. **Day-30-Field-2** (HSRP failover stability under geomagnetic stress)
5. **Day-30-Field-3** (Multi-group HSRP decentralized failover)
6. **Day-26-Field-2** (OSPF E1/E2 metric stability under stress)

### Priority 2: IMPORTANT EXPANDING VARIANTS (5 files)
These validate specific protocols under field conditions. **Estimated effort:** 1.5–2 hours each

1. **Day-25-Field-1** (EIGRP offline persistence)
2. **Day-25-Field-2** (EIGRP unequal-cost load-balancing stability)
3. **Day-28-Field-2** (OSPF serial link convergence under stress)
4. **Day-29-Field-2** (OSPF DR/BDR stability)
5. **Day-27-Field-1** (OSPF reference bandwidth local autonomy)

### Priority 3: ADVANCED DISTRIBUTED-SYSTEMS VARIANTS (4 files)
These validate DePIN principles. **Estimated effort:** 2–2.5 hours each

1. **Day-25-Field-3** (Decentralized EIGRP multi-AS routing)
2. **Day-26-Field-1** (Local OSPF default injection without external ISP)
3. **Day-26-Field-3** (Decentralized ASBR default route injection)
4. **Day-28-Field-3** (Decentralized OSPF neighbor failure detection)
5. **Day-29-Field-3** (Decentralized OSPF DR/BDR election)

---

## Part 5: Batch Creation Strategy (Token-Efficient)

### Batch 1: Days 24–25 Field Variants (6 files, ~12 hours parallelizable)
- Day-24-Field-2-Lab.md
- Day-24-Field-3-Lab.md
- Day-25-Field-1-Lab.md
- Day-25-Field-2-Lab.md
- Day-25-Field-3-Lab.md
- *Commit after Batch 1*

### Batch 2: Days 26–27 Field Variants (4 files, ~8 hours)
- Day-26-Field-1-Lab.md
- Day-26-Field-2-Lab.md
- Day-26-Field-3-Lab.md
- Day-27-Field-1-Lab.md
- *Commit after Batch 2*

### Batch 3: Days 28–29 Field Variants (4 files, ~8 hours)
- Day-28-Field-2-Lab.md
- Day-28-Field-3-Lab.md
- Day-29-Field-2-Lab.md
- Day-29-Field-3-Lab.md
- *Commit after Batch 3*

### Batch 4: Day-30 Field Variants (3 files, ~6.5 hours)
- Day-30-Field-1-Lab.md
- Day-30-Field-2-Lab.md
- Day-30-Field-3-Lab.md
- *Commit after Batch 4 — PHASE 3 COMPLETE*

---

## Part 6: Quality Checklist (Per Variant)

Before committing each variant, verify:

- [ ] **Metadata section complete** — Field focus, proof obligation, P38 phase named, time/difficulty estimated
- [ ] **Topology significantly different from base** — Not just config changes; actual topology modifications for field-specific testing
- [ ] **Verification steps measurable** — Pass/fail criteria objective; no hand-waving
- [ ] **Expected output gallery included** — Before/after (stress) output shown with annotations
- [ ] **Field-specific reasoning justified** — Design analysis explains why topology matters for this field
- [ ] **Haiti P38 linkage clear** — Specific module (mesh-convergence, hotspot-link-bundling, etc.) and deployment phase named
- [ ] **Stretch goals included** — 4–5 PhD-level extensions (formal model-checking, scaling, Byzantine resilience, etc.)
- [ ] **BSL self-assessment tailored** — BSL-0 to BSL-5 descriptions specific to field, not generic
- [ ] **12 sections complete** — All sections 0–12 present and substantial (150+ lines per variant minimum)

---

## Part 7: Reference Materials

### Essential Documents (already exist)
- `RESEARCH-LAB-STANDARD.md` — 12-section template specification
- Day-NN-Research-Paper.md (one per day) — Source material for proof obligations and field linkages
- `RESEARCH_FIELDS_DCENTRAL_DEPIN_MATRIX_V24.md` — Field definitions and publication linkages

### Created So Far
- `Day-22-Field-2-Lab.md` — RSTP geomagnetic stress (use as template for Field-2 variants)
- `Day-22-Field-3-Lab.md` — RSTP mesh + Byzantine (use as template for Field-3 variants)
- `Day-23-Field-2-Lab.md` — EtherChannel failover under stress (use as Field-2 template)
- `Day-23-Field-3-Lab.md` — Heterogeneous protocols (use as Field-3 template)
- `Day-24-Field-1-Lab.md` — Offline failover (use as Field-1 template)

---

## Summary

**Current Status:**
- ✅ 5 complete, committed variants (Days 22–24)
- 🔴 12–13 variants remaining (Days 24–30)
- **Estimated total effort:** 25–30 hours (can be parallelized / split across sessions)
- **Target completion:** Within 2–3 days with focused development

**Next Steps:**
1. Create Days 24–25 variants (6 files) using established template
2. Commit Batch 1
3. Continue Batches 2–4 until Phase 3 complete
4. Final git push to remote

**Quality Assurance:**
- Each variant follows the 12-section RESEARCH-LAB-STANDARD.md template
- Topology significantly differs per field (not just CLI config changes)
- Proof obligations are measurable and testable
- Haiti P38 linkage is explicit and specific
- All variants use established patterns from Days 22–24

