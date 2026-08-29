# The Research-Lab Standard: Field-Specific Lab Variants

## What this document is

This is the reference standard for every `Day-NN-Field-F-Lab.md` companion document in `RedjiJB-Labs/`. It defines, once, the structure and methodology for creating field-specific lab variants — topologies that dive deep into one research field's proof obligations while keeping the core networking function intact.

**The core principle:** One base lab can't optimally prove all research fields simultaneously. Field 1 (Black Start) wants offline resilience; Field 2 (Geomagnetic) wants stress simulation; Field 3 (DePIN) wants distributed consensus. A single topology either over-engineers for some or under-specs for others. Field-specific variants solve this by giving each field its own topology, configuration, and verification, while still teaching the same CCNA concept.

---

## 1. Why separate topologies per field?

Each research field defines what "success" means differently:

| Field | Success Criteria | Topology Emphasis |
|---|---|---|
| **1. Black Start** | System operates offline, survives power loss, recovers from cold start | Minimal external dependencies, redundant local storage, recovery procedures |
| **2. Geomagnetic** | System converges/recovers under space-weather stress (jitter, packet loss, latency) | Multiple failover paths, aggressive convergence timers, stress injection points |
| **3. DePIN** | Distributed consensus works; no single point of failure; Byzantine nodes don't break quorum | Full mesh topology, no hub, multiple leaders, consensus verification |
| **4. Security** | Cryptographic proofs verifiable; tampering detected; isolation enforced | Attestation verification points, proof-of-authorship markers, tamper tests |
| **5. Healthcare AI** | Privacy preserved; fairness proven across populations; inference auditable | Privacy-sensitive data separation, population-diverse nodes, inference logging |
| **6. Autonomous Law** | Decisions recorded immutably; governance audit trail clear; legal liability chain complete | Vote recording, decision log, action timeline with timestamps, appeal recording |
| **7. Haiti** | Design scales to 50+ nodes; cost models validated; governance operable in Haitian legal framework | Scale factor (50–10K nodes); real-world conditions; legal compliance testing |

A single Day-24 (OSPF) topology cannot simultaneously optimize for all seven. The Field-1 variant removes complexity (offline-focused). The Field-2 variant adds stress simulation. The Field-3 variant restructures as a mesh. Each tells a complete story for its field.

---

## 2. The Field-Specific Lab Template

Each `Day-NN-Field-F-Lab.md` file contains these sections, in order:

### 0. Metadata

```
Field Focus:         [name and number, e.g., "Field 2: Geomagnetic Resilience"]
Core Proof Obligation: [one sentence, e.g., "OSPF converges < 60s under geomagnetic stress"]
Haiti Deployment Phase: [P38 pilot, P45 expansion, P52 scale, or P55+ mature]
Estimated Time:      [minutes]
Difficulty:          [Intermediate / Advanced]
Relationship to Base Lab: [e.g., "Same OSPF protocol; different topology and stress scenarios"]
Prerequisite:        [e.g., "Complete Day-24-Lab-Manual first"]
```

### 1. Business Context (Field-Specific Framing)

Restate the base lab's business context, but frame it explicitly for this field's proof obligation.

**Example (Day-24 Field-2 variant):**
> Naive OSPF deployment converges in 10–30 seconds after link loss under ideal conditions. But production networks don't experience ideal conditions — geomagnetic storms can cause up to 20% latency jitter and 5% packet loss on long-distance links. This lab proves that OSPF can converge reliably even under these stress conditions, unblocking the P38 pilot deployment of mesh-connectivity in geomagnetically resilient configurations.

**Example (Day-01 Field-1 variant):**
> The base topology assumes continuous internet connectivity, external DNS, and stable power. This variant strips away those assumptions: all required services run locally, configuration survives power-cycle, devices boot to a working state with zero external input. This proves the Black Start layer (BSL-3) for enterprise topology design.

### 2. Topology Diagram (Field-Specific Modifications)

Show the modified topology with differences from the base lab called out explicitly. Use ASCII art or describe in text with clear annotations.

**Example notation:**
```
[FIELD-1 VARIANT]
NY-ROUTER
  ├─ Local DNS (new)
  ├─ Local NTP (new)
  └─ Redundant power with UPS (new)

[FIELD-2 VARIANT]
NY-ROUTER ← [JITTER INJECTOR: ±20% latency, ±5% loss]
ISP-ROUTER

[FIELD-3 VARIANT]
Full mesh: NY-RTR ↔ Tokyo-RTR ↔ ISP-RTR (no single hub)
```

### 3. IP Addressing Plan (Field-Specific Annotations)

Use the same subnetting methodology as the base lab, but annotate why each subnet size or placement matters for this field.

**Example (Field-1):**
```
NYC-LAN: 192.168.1.0/24
  └─ Annotated: Sized for 100+ devices; local DNS cache must cover all IPs
  
ISP-RTR ↔ NY-RTR: 10.0.0.0/30
  └─ Annotated: P2P link; timeout to local cache if ISP link drops
```

### 4. Configuration (Field-Specific Optimizations)

Step-by-step CLI commands, but justified for this field's proof obligations.

**Example (Field-2 OSPF variant):**
```
NY-ROUTER(config-router)# timers basic 5 15 10 40
! Explanation: Geomagnetic stress reduces link stability. Tighter hello/dead timers
! (5s hello vs 10s default, 15s dead vs 40s default) let OSPF detect failures faster,
! proving convergence < 60s even under 20% jitter.
```

**Example (Field-1 DNS variant):**
```
NY-ROUTER(config)# ip dns server
! Explanation: Converts this router into an authoritative DNS cache, removing
! dependence on external ISP DNS during offline operation.
```

### 5. Field-Specific Verification Steps

These are NOT the same as the base lab's verification steps. They test the field-specific proof obligation.

**Example (Field-2, after inducing stress):**
```
1. Inject 20% latency variance and 5% packet loss on the ISP link
   [simulated in GNS3 or with tc command on Linux]

2. Shut down the primary NY-RTR ← ISP link

3. Measure OSPF convergence time:
   - Record timestamp when link goes down (via `show ip ospf neighbor`)
   - Run `ping Tokyo-subnet` continuously
   - Record timestamp when ping succeeds again
   - Verify convergence time < 60 seconds
   - Proof obligation: PASSED if < 60s, FAILED if ≥ 60s

4. Repeat 5 times; record min/max/average convergence time
```

**Example (Field-1, offline mode):**
```
1. Power off the NY-ROUTER's external WAN link (unplug ISP)
2. Attempt DNS resolution: nslookup ny.company.local
   └─ Should resolve to local cache; no timeout or SERVFAIL
3. Attempt device configuration push via local Ansible
   └─ Should succeed without internet connectivity
4. Verify running-config still in memory and can be saved to startup-config
```

### 6. Expected Output Gallery (Field-Specific Scenarios)

Show realistic console output **under field-specific conditions**, not just happy-path output.

**Example (Field-2 stress output):**
```
[Under 20% latency jitter]
NY-ROUTER# show ip ospf neighbor
Neighbor ID Pri State Dead Time Address Interface
192.168.2.1 1 FULL 36 10.0.0.2 GigabitEthernet0/0
    (Notice: Dead Time fluctuates between 30-40 due to jitter)

[After link loss, convergence begins]
NY-ROUTER# show ip ospf neighbor
Neighbor ID Pri State Dead Time Address Interface
192.168.2.1 1 EXSTART 8 10.0.0.2 GigabitEthernet0/0
    (Converging to FULL state; timestamp recorded)

[After ~45 seconds]
NY-ROUTER# show ip ospf neighbor
Neighbor ID Pri State Dead Time Address Interface
Tokyo-RTR-IP 1 FULL 40 10.0.1.2 GigabitEthernet0/1
    (Failover path now primary; convergence complete at T=45s)
```

### 7. Common Field-Specific Mistakes

What breaks when you try to optimize for this field but get it wrong?

**Example (Field-1):**
- Configuring only SSH but forgetting to create a local user database → SSH login fails when external AAA is unavailable
- Enabling IP directed broadcast → unnecessary packets consume offline power budget
- NAT configuration that depends on external DNS → traffic can't route offline

**Example (Field-2):**
- OSPF hello interval too aggressive (1s) → false link failures under 20% jitter
- No backup routes → single link loss means network partition
- Metric calculation doesn't account for latency variance → suboptimal convergence path chosen

### 8. Troubleshooting by Field (Diagnostic Method)

Step-by-step diagnosis using only `show` commands and first principles, specific to this field's proof obligations.

**Example (Field-2, "convergence is slow"):**
```
Step 1: Is the backup route even in the routing table?
  show ip route | include Tokyo
  → If absent, OSPF hasn't learned a second path; check if secondary link is configured

Step 2: Is OSPF seeing the secondary neighbor?
  show ip ospf neighbor | include Tokyo-RTR
  → If not in the output, OSPF hasn't discovered it; check link connectivity and hello timers

Step 3: Is jitter delaying hello packets?
  debug ip ospf hello (limited to 10 seconds)
  → If hellos arrive inconsistently, verify stress injection is too aggressive

Step 4: Is the dead timer expiring correctly?
  show timers wait is disabled   [field-2 specific: OSPF fast-reroute]
  → If disabled, enable it to reduce failover time
```

### 9. Design Analysis: Field-Specific Reasoning

Why does this field-specific topology's design *matter* for the research field?

**Example (Field-1, offline operation):**
> Traditional OSPF assumes continuous DNS, NTP, and external syslog. This design proves those assumptions are unnecessary by removing them. Every critical function (time sync, name resolution, routing) operates independently offline, validating that the topology can survive both network isolation and power-management constraints. This unblocks Black Start (BSL-3) for enterprise routing designs, proving the hypothesis: "network autonomy is achievable at OSPF scale without sacrificing operational visibility."

**Example (Field-2, geomagnetic resilience):**
> Geomagnetic storms introduce latency variance and packet loss that standard OSPF metrics ignore. This design explicitly measures and bounds convergence time under realistic geomagnetic stress, moving from "OSPF works in labs" to "OSPF works during space-weather events." This proof unblocks P38 pilot deployment of mesh-connectivity in geographically distributed communities where atmospheric phenomena degrade RF links.

### 10. Real-World Parallel: Haiti Deployment Phase

Which actual D-Central module and deployment phase depends on this lab's proof?

**Example (Day-24 Field-2):**
> In the P38 Haiti pilot (50–100 nodes, geomagnetically resilient mesh), mesh-connectivity relies on OSPF running across 15+ hotspots. Each hotspot experiences varying atmospheric and geomagnetic conditions. This lab proves OSPF can converge reliably under those conditions. The field-2 variant's stress-test results feed directly into the PoC (Proof-of-Coverage) tuning for Haiti's first island-wide mesh. Before P38 deployment, these convergence-time benchmarks must be validated in field trials with real DSCOVR data.

**Example (Day-01 Field-1):**
> D-Central's core topology (dcentral-core module) must operate offline in the event of total internet loss. This lab variant proves the feasibility: a minimal, offline-capable topology can still provide routing, local resolution, and basic services. In the P38 Haiti pilot, dcentral-core nodes must boot and reach quorum without external infrastructure. This lab validates the architectural assumptions underlying that design.

### 11. Stretch Goals: Advanced Proof Obligations

Beyond the core proof, what would a PhD-level validation look like?

**Example (Field-2):**
- Formal model check OSPF's convergence logic against a geomagnetic-jitter model (using TLA+)
- Run convergence-time benchmarks against the actual ESA Swarm geomagnetic-field model
- Prove that no Byzantine neighbor can cause convergence time to exceed 60s
- Validate against a 1-year geomagnetic-event dataset from NOAA SWPC

**Example (Field-1):**
- Prove using symbolic execution that cold-boot recovery terminates in finite time
- Verify offline DNS cache consistency (no stale entries cause cascading failures)
- Formal verification of the power-failure recovery sequence (no state corruption)

### 12. Self-Assessment (Field-Specific BSL)

Evaluate yourself on this field-specific lab using a modified BSL scale.

```
BSL-0 AWARENESS      - You've read this lab once. You couldn't replicate it.
BSL-1 LAB CAPABLE    - You completed this lab with the manual open, and it worked.
BSL-2 OFFLINE        - You could repeat this lab with the manual, no internet.
BSL-3 RECOVERABLE    - You could rebuild this lab from the topology diagram only; 
                        given the field's proof obligation, you'd know what to test.
BSL-4 MAINTAINABLE   - You could modify this lab's topology to fit a different
                        scenario (different scale, different stress model, etc.)
                        and still hit the same proof obligation.
BSL-5 TEACHABLE      - You could teach this lab's field-specific design to someone
                        else, correctly explaining why each topology choice matters
                        for the research field.

Target BSL for this lab: [2–4, depending on field difficulty]
```

---

## 3. When to use base lab vs. field-specific?

### Use the **base lab** (Day-NN-Lab-Manual.md) when:
- You're learning CCNA for the first time and need a comprehensive, general walkthrough
- You want to understand the networking concept without field-specific complexity
- You're preparing for the CCNA exam (exam doesn't test research-field-specific variants)
- You want to see all applicable fields lightly (without optimizing for one)

### Use a **field-specific variant** (Day-NN-Field-F-Lab.md) when:
- You're preparing to contribute to the Haiti deployment and need to prove your design works for a specific research field
- You want to deeply understand one field's proof obligations (offline resilience, geomagnetic stress, etc.)
- You're developing topology-specific configurations that other fields don't care about
- You're ready to move beyond CCNA fundamentals into applied research-grade work

---

## 4. How to balance topology changes

### The rule: Change topology structure, keep the core function.

**Day-24 OSPF example:**

**Base lab:**
- 2 branches (NY, Tokyo) + ISP
- Static topology, no stress
- Converges under ideal conditions

**Field-1 variant (Black Start):**
- Same 2 branches + ISP
- Remove external DNS dependency (add local DNS)
- Remove external NTP dependency (add local NTP)
- Add local config storage for cold recovery
- Still tests OSPF core function; adds offline resilience

**Field-2 variant (Geomagnetic):**
- 4 branches (NY, Tokyo, two additional to test mesh)
- Add stress injection points (jitter, packet loss, latency)
- Tighter OSPF timers to test rapid convergence
- Still tests OSPF core function; adds stress validation

**Field-3 variant (DePIN):**
- Full mesh: every branch connects to every other (no ISP hub)
- Add Byzantine failure simulation (node drops packets randomly 5% of time)
- Add consensus voting for best path (not just RFC OSPF metric)
- Still tests OSPF core function; restructures for distributed ownership

**The principle:** Every variant recognizes the same OSPF protocol and routing concept, but the topology and configuration change to emphasize one research field's specific concerns.

---

## 5. How to structure multi-variant labs

If a base lab applies to multiple fields (common case), you create one file per field:

```
Day-24-Lab-Manual.md        [base: all fields lightly]
Day-24-Field-1-Lab.md       [deep dive: Black Start]
Day-24-Field-2-Lab.md       [deep dive: Geomagnetic]
Day-24-Field-3-Lab.md       [deep dive: DePIN]
Day-24-Research-Paper.md    [integrates all above; section 2.6 names all fields]
```

Each field variant is **independent** — you don't need to complete Field-1 before tackling Field-2. But the research paper (see RESEARCH-PAPER-STANDARD.md) ties them together and explains how all three variants prove different aspects of the same concept.

---

## 6. Verification

When you finish a field-specific lab variant, verify:

1. **Topology change is meaningful for the field** — not just a superficial difference
   - Field-1 variant actually removes external dependencies (check)
   - Field-2 variant actually adds measurable stress (check)
   - Field-3 variant actually changes from centralized to distributed (check)

2. **Core function still works** — you haven't accidentally broken the CCNA concept
   - OSPF routing still happens (check)
   - Convergence still occurs (check)
   - Verification steps confirm connectivity (check)

3. **Proof obligation is testable** — section 5 (verification) can objectively pass/fail
   - Measurable metric (convergence time < 60s)
   - Repeatable (run 5 times, record all)
   - No hand-waving ("it works better")

4. **Real-world parallel makes sense** — section 10 clearly connects to a Haiti deployment phase
   - P38, P45, or P55+ is named
   - Specific module (mesh-connectivity, etc.) is named
   - Success criteria from the lab feeds into deployment success criteria
