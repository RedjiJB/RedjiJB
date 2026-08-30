# Day 24 — EtherChannel: LACP, PAgP, Static, and Load Balancing
## Field-3 Variant: Distributed Systems & DePIN Decentralized Link Bundling

---

## 0. Metadata

**Field Focus:**      Field 3:

**Core Proof Obligation:** EtherChannel negotiation and load-balancing decisions are made independently on each switch; no central controller orchestrates bundling; different bundle configurations on different link pairs can coexist in a mesh without conflicts.

**Haiti Deployment Phase:** P38 pilot (distributed-link-aggregation module); validation that mesh hotspots can independently choose their own EtherChannel strategies.

**Estimated Time:** 75–120 minutes

**Difficulty:** Advanced

**Relationship to Base Lab:** Same EtherChannel protocols; different topology (4 link pairs using mixed protocols: LACP, PAgP, static) and focus on independent negotiation/failure modes.

**Prerequisite:** Complete Day-24-Lab-Manual and ideally Day-24-Field-2-Lab.md. Familiarity with heterogeneous network configurations.

---

## 1. Business Context (Field-3 Framing)

The base Day-24 lab proves EtherChannel works when all link pairs use the same protocol (all LACP or all static). Haiti's P38 mesh is decentralized — there's no central authority dictating "use LACP on all inter-hotspot links." Instead, each pair of hotspots independently decides: "Do we have the infrastructure to run LACP negotiation? If yes, use LACP. If network conditions are poor, use static bundling." This lab proves that mixed protocols can coexist: some link pairs run LACP, others run static, all working correctly without interference or requiring central coordination.

**Success criteria:**
- Each link pair independently negotiates its protocol (LACP, PAgP, or static) without central mandate
- Mixed-protocol mesh remains loop-free and fully connected
- Each switch independently applies its own load-balancing hash; asymmetric hashes don't break traffic delivery
- Protocol mismatches are explicit in diagnostics (no silent failures)

---

## 2. Topology Diagram (Field-3 Heterogeneous Mesh)

```
[FIELD-3 HETEROGENEOUS ETHERCHANNEL MESH]

Hotspot-A ──[LACP]────────────────── Hotspot-B
             (2 members: active/active negotiation)

Hotspot-B ──[PAgP]────────────────── Hotspot-C
             (2 members: desirable/auto negotiation, CISCO proprietary)

Hotspot-C ──[Static]───────────────── Hotspot-D
             (2 members: on/on, no negotiation)

Hotspot-D ──[LACP]────────────────── Hotspot-A
             (3 members: full mesh closure)

[Mesh Summary:]
- 4 hotspots (A, B, C, D)
- 4 link pairs: A↔B (LACP), B↔C (PAgP), C↔D (Static), D↔A (LACP)
- Each pair independently chooses its protocol
- No central "link-provisioning controller" assigns protocols
- Mesh is fully meshed (all connected); spanning-tree forms correct loop-free topology

[Field-3 Proof Obligation:]
1. Each pair negotiates independently (no cross-link interference)
2. Heterogeneous protocols coexist (not all links use the same protocol)
3. Load-balancing hashes may differ per switch (A uses src-dst-ip, D uses src-dst-port)
4. Mesh remains operational even with asymmetric or suboptimal configurations
```

---

## 3. IP Addressing Plan (Field-3 Annotations)

```
L3 Routed Port-Channels (one per link pair):

Port-Channel 1 (A ↔ B): 10.1.0.0/30
  A: 10.1.0.1, B: 10.1.0.2
  └─ Annotation (Field-3): Independent of Port-Channel 2; different subnets
  
Port-Channel 2 (B ↔ C): 10.2.0.0/30
  B: 10.2.0.1, C: 10.2.0.2

Port-Channel 3 (C ↔ D): 10.3.0.0/30
  C: 10.3.0.1, D: 10.3.0.2

Port-Channel 4 (D ↔ A): 10.4.0.0/30
  D: 10.4.0.1, A: 10.4.0.2

[Field-3 Key Point: Each port-channel is independent; each pair negotiates independently.]
```

---

## 4. Configuration (Field-3 Heterogeneous Protocols)

### 4.1 Hotspot-A (LACP with B, LACP with D)

```
! Port-Channel 1: LACP bundle to Hotspot-B
interface range Gi0/1 – 0/2
 channel-group 1 mode active                [LACP active: initiates negotiation]
 no shutdown

interface port-channel 1
 ip address 10.1.0.1 255.255.255.252
 no switchport
 no shutdown

! Port-Channel 4: LACP bundle to Hotspot-D
interface range Gi1/1 – 1/3
 channel-group 4 mode active                [LACP active]
 no shutdown

interface port-channel 4
 ip address 10.4.0.2 255.255.255.252
 no switchport
 no shutdown

! Global load-balance hash (Field-3: A uses src-dst-ip)
port-channel load-balance src-dst-ip
```

### 4.2 Hotspot-B (LACP with A, PAgP with C)

```
! Port-Channel 1: LACP bundle to Hotspot-A
interface range Gi0/1 – 0/2
 channel-group 1 mode passive              [LACP passive: responds to negotiation from A]
 no shutdown

interface port-channel 1
 ip address 10.1.0.2 255.255.255.252
 no switchport
 no shutdown

! Port-Channel 2: PAgP bundle to Hotspot-C
interface range Gi1/1 – 1/2
 channel-group 2 mode desirable             [PAgP desirable: initiates negotiation]
 no shutdown

interface port-channel 2
 ip address 10.2.0.1 255.255.255.252
 no switchport
 no shutdown

! Global load-balance hash (Field-3: B uses src-dst-port)
port-channel load-balance src-dst-port
```

### 4.3 Hotspot-C (PAgP with B, Static with D)

```
! Port-Channel 2: PAgP bundle to Hotspot-B
interface range Gi0/1 – 0/2
 channel-group 2 mode auto                  [PAgP auto: responds to negotiation from B]
 no shutdown

interface port-channel 2
 ip address 10.2.0.2 255.255.255.252
 no switchport
 no shutdown

! Port-Channel 3: Static bundle to Hotspot-D
interface range Gi1/1 – 1/2
 channel-group 3 mode on                    [Static: no negotiation]
 no shutdown

interface port-channel 3
 ip address 10.3.0.1 255.255.255.252
 no switchport
 no shutdown

! Global load-balance hash (Field-3: C uses vlan-ip)
port-channel load-balance vlan-ip
```

### 4.4 Hotspot-D (Static with C, LACP with A)

```
! Port-Channel 3: Static bundle to Hotspot-C
interface range Gi0/1 – 0/2
 channel-group 3 mode on                    [Static: no negotiation]
 no shutdown

interface port-channel 3
 ip address 10.3.0.2 255.255.255.252
 no switchport
 no shutdown

! Port-Channel 4: LACP bundle to Hotspot-A
interface range Gi1/1 – 1/3
 channel-group 4 mode active                [LACP active]
 no shutdown

interface port-channel 4
 ip address 10.4.0.1 255.255.255.252
 no switchport
 no shutdown

! Global load-balance hash (Field-3: D uses src-dst-port)
port-channel load-balance src-dst-port
```

---

## 5. Field-Specific Verification Steps

### Step 1: Verify Independent Negotiation (No Central Mandate)

```
1.1  Verify A↔B bundle (LACP): Active on A, Passive on B
Hotspot-A# show etherchannel 1 summary
Port-Channel  Ports
Po1(RSU)      Gi0/1(P) Gi0/2(P)   [Active mode: initiated negotiation]

Hotspot-B# show etherchannel 1 summary
Po1(RSU)      Gi0/1(P) Gi0/2(P)   [Passive mode: responded to A's negotiation]

[FIELD-3 PROOF #1: A and B independently chose their modes (active/passive).
 No central controller told them. They negotiated and formed the bundle.]

1.2  Verify B↔C bundle (PAgP): Desirable on B, Auto on C
Hotspot-B# show etherchannel 2 summary
Po2(RSU)      Gi1/1(P) Gi1/2(P)   [PAgP protocol active]

Hotspot-C# show etherchannel 2 summary
Po2(RSU)      Gi0/1(P) Gi0/2(P)   [PAgP protocol active]

[FIELD-3 PROOF #2: B chose desirable (initiate), C chose auto (respond).
 Different from A↔B (which used LACP). Same mesh, different protocols.]

1.3  Verify C↔D bundle (Static): Both using mode on
Hotspot-C# show etherchannel 3 summary
Po3(RSU)      Gi1/1(P) Gi1/2(P)   [Static mode: no negotiation]

Hotspot-D# show etherchannel 3 summary
Po3(RSU)      Gi0/1(P) Gi0/2(P)   [Static mode: no negotiation]

[FIELD-3 PROOF #3: C and D both use static (mode on). No protocol negotiation.
 Their decision was local — they independently chose static.]

1.4  Verify D↔A bundle (LACP): Active on both
Hotspot-D# show etherchannel 4 summary
Po4(RSU)      Gi1/1(P) Gi1/2(P) Gi1/3(P)  [Active mode]

Hotspot-A# show etherchannel 4 summary
Po4(RSU)      Gi1/1(P) Gi1/2(P) Gi1/3(P)  [Active mode]

[FIELD-3 PROOF #4: Both A and D chose active. Both can initiate negotiation
 — this works (LACP allows active/active). Both form the bundle.]
```

### Step 2: Verify Mesh Connectivity (Loop-Free Spanning Tree)

```
2.1  Verify all hotspots can reach each other:
Hotspot-A# ping 10.2.0.1  (Hotspot-B to Hotspot-C link)
→ Should succeed (routed via B)

Hotspot-A# ping 10.3.0.1  (Hotspot-C to Hotspot-D link)
→ Should succeed (routed via D or B→C)

Hotspot-C# ping 10.1.0.1  (Hotspot-A to Hotspot-B link)
→ Should succeed (routed via D→A or B)

2.2  Verify spanning-tree is loop-free:
Hotspot-A# show spanning-tree
[Root should be consistent across all hotspots; port roles should form spanning tree]

[FIELD-3 PROOF #5: Heterogeneous EtherChannel protocols don't break spanning-tree.
 Mesh is fully connected and loop-free even though protocols differ per link pair.]
```

### Step 3: Verify Asymmetric Load-Balancing Hashes

```
3.1  Compare load-balancing hash configuration per hotspot:

Hotspot-A# show etherchannel load-balance
EtherChannel Load-Balancing Configuration:
  Model:          src-dst-ip
[Hotspot-A uses src-dst-ip hash]

Hotspot-D# show etherchannel load-balance
EtherChannel Load-Balancing Configuration:
  Model:          src-dst-port
[Hotspot-D uses src-dst-port hash]

3.2  Verify asymmetric hashing doesn't break traffic:
Send traffic between two subnets (A's LAN and D's LAN) and measure:
- Packet distribution on A's port-channel (should follow src-dst-ip hash)
- Packet distribution on D's port-channel (should follow src-dst-port hash)
- Overall delivery: should be successful (no loops, no dropped packets)

[FIELD-3 PROOF #6: Each hotspot applies its own hash independently.
 A might send a flow on member-1, D might route it back on member-2.
 The asymmetry is OK — traffic still flows correctly.]
```

### Step 4: Intentional Protocol Mismatch (Failure Mode Testing)

```
4.1  Temporarily misconfigure D↔A bundle (create protocol mismatch):
Hotspot-A# interface range Gi1/1 – 1/3
Hotspot-A# channel-group 4 mode passive  [Change from active to passive]

[Wait 30 seconds for LACP negotiation to fail]

4.2  Verify bundle breaks (explicit failure, not silent):
Hotspot-A# show etherchannel 4 summary
Port-Channel  Ports
Po4(SU)       Gi1/1(s) Gi1/2(s) Gi1/3(s)  [All ports show 's' (suspended)]

[Suspended = protocol mismatch detected; bundle not formed]

4.3  Verify this is explicit in diagnostics (not silent):
Hotspot-A# show etherchannel 4 detail | include "Protecting"
[Should show "suspended" state in status]

[FIELD-3 PROOF #7: Protocol mismatch is EXPLICIT. No silent failure.
 Operators can immediately see the problem in show commands.
 This is critical for Field-3: decentralized systems need visible failure modes.]

4.4  Restore the bundle (fix the mismatch):
Hotspot-A# channel-group 4 mode active
[Bundle re-forms after LACP re-negotiation]
```

### Step 5: Verify Independent Failure Handling

```
5.1  Fail one link pair (e.g., shutdown one member of A↔B bundle):
Hotspot-A# interface Gi0/1
Hotspot-A# shutdown

5.2  Verify:
- A↔B bundle degrades but stays operational (1 member remains)
- B↔C bundle is unaffected (independent link)
- C↔D bundle is unaffected
- D↔A bundle is unaffected
- Mesh routing still works via alternate paths

[FIELD-3 PROOF #8: Each link pair fails independently. One bundle's failure
 doesn't cascade to other bundles. This is decentralization: local failures don't
 require global re-orchestration.]
```

---

## 6. Expected Output Gallery (Field-3 Scenarios)

### 6.1 Heterogeneous Bundle Status (All Protocols Active)

```
Hotspot-A# show etherchannel summary
Flags: D - down, P - bundled, s - suspended

Number of channel-groups in use: 2
Number of aggregators: 2

Group  Port-channel  Protocol    Ports
────────────────────────────────────────
1      Po1(RSU)      LACP        Gi0/1(P)   Gi0/2(P)
4      Po4(RSU)      LACP        Gi1/1(P)   Gi1/2(P)   Gi1/3(P)

[Interpretation: A has 2 port-channels (Po1 to B, Po4 to D), both LACP, both active.]

Hotspot-B# show etherchannel summary
Group  Port-channel  Protocol    Ports
────────────────────────────────────────
1      Po1(RSU)      LACP        Gi0/1(P)   Gi0/2(P)
2      Po2(RSU)      PAgP        Gi1/1(P)   Gi1/2(P)

[Interpretation: B has 2 port-channels (Po1 to A via LACP, Po2 to C via PAgP).
 Different protocols on different pairs — this is Field-3's key proof.]

Hotspot-C# show etherchannel summary
Group  Port-channel  Protocol    Ports
────────────────────────────────────────
2      Po2(RSU)      PAgP        Gi0/1(P)   Gi0/2(P)
3      Po3(RSU)      Static      Gi1/1(P)   Gi1/2(P)

[Interpretation: C has PAgP to B, Static to D. Again, different protocols.]

Hotspot-D# show etherchannel summary
Group  Port-channel  Protocol    Ports
────────────────────────────────────────
3      Po3(RSU)      Static      Gi0/1(P)   Gi0/2(P)
4      Po4(RSU)      LACP        Gi1/1(P)   Gi1/2(P)   Gi1/3(P)

[Interpretation: D has Static to C, LACP to A. Heterogeneous protocols throughout mesh.]
```

### 6.2 Protocol Mismatch Detection (Failure Mode)

```
[After changing A's Po4 to passive mode while D remains active, LACP negotiation fails]

Hotspot-A# show etherchannel 4 summary
Flags: D - down, P - bundled, s - suspended

Group  Port-channel  Protocol    Ports
────────────────────────────────────────
4      Po4(SU)       LACP        Gi1/1(s)   Gi1/2(s)   Gi1/3(s)

[All members show 's' (suspended); Po4 shows SU (Switched Up in status, but members not bundled)]

Hotspot-D# show etherchannel 4 summary
Group  Port-channel  Protocol    Ports
────────────────────────────────────────
4      Po4(SU)       LACP        Gi1/1(s)   Gi1/2(s)   Gi1/3(s)

[D also shows suspended state; LACP negotiation failed on both sides.]

Hotspot-A# show etherchannel 4 detail | include "Protocol"
Aggregate interface: Port-channel4
   Protocols: LACP
   Port-channel members:
      Gi1/1        (suspended)
      Gi1/2        (suspended)
      Gi1/3        (suspended)

[INTERPRETATION (Field-3): Failure is EXPLICIT and SYMMETRIC.
 Both A and D detected the mismatch and suspended their members.
 Operators can see the problem immediately — no silent failure.]
```

---

## 7. Common Field-3 Mistakes

1. **Mixing incompatible protocols on one link (e.g., LACP on one end, PAgP on the other):** The bundle won't form; members suspend. This is the correct failure mode, but some expect it to "just work." Document why it doesn't: protocols are incompatible at the negotiation level.

2. **Using same port-channel number for different links:** If you configure Po1 on both A↔B and C↔D links, they conflict. Use unique port-channel numbers per link pair.

3. **Forgetting that Static doesn't negotiate:** With mode on/on (static), both sides must independently be configured. If only one side has the channel-group command, the link won't bundle. Verify both ends are configured identically.

4. **Expecting symmetric load-balancing distribution with asymmetric hashes:** If A uses src-dst-ip and D uses src-dst-port, a given flow might be on different members at each end. This is OK — traffic still flows. Don't expect perfect symmetry.

5. **Not accounting for spanning-tree on port-channel itself:** Port-channel interfaces participate in STP/RSTP like any switch port. A bridge loop on port-channels can cause RSTP blocking, blocking the entire bundled link.

---

## 8. Troubleshooting by Field (Diagnostic Method)

### Problem: Protocol mismatch but bundle still shows as 'P' (bundled)

```
Step 1: What protocol is actually negotiating?
  show etherchannel N detail | include "Protocols"
  → Should show which protocol (LACP, PAgP, Static)
  → If shows LACP but far-end is PAgP, check configuration

Step 2: Are both ends running the same protocol?
  Compare config on both switches:
  Hotspot-A# show run | include channel-group
  Hotspot-B# show run | include channel-group
  → Both should reference the same protocol mode
  → If A shows "mode active" (LACP) and B shows "mode desirable" (PAgP), reconfigure

Step 3: How long until bundle forms?
  run "show etherchannel N summary" every second for 30 seconds
  → Should show members transition from 's' to 'P' within 10–15 seconds
  → If members stay 's' after 30 seconds, mismatch is permanent
```

### Problem: Mesh routing is broken (B can't reach D)

```
Step 1: Are all four port-channels active?
  show etherchannel summary
  → All should show Po1–Po4 in the output
  → If any missing, the mesh is incomplete

Step 2: Are all port-channels UP (not 'D' or 's')?
  → All members should show 'P' (bundled)
  → If any show 's', fix protocol mismatch first

Step 3: Is spanning-tree blocking a port-channel?
  show spanning-tree | include "Port-channel"
  → All port-channels should be in Forwarding state (not Blocking)
  → If blocking, check STP for loops

Step 4: Can B reach D via individual interfaces (not port-channel)?
  B# ping 10.3.0.1  (D's port-channel 3 IP)
  → If fails, IP routing may be broken (not an EtherChannel issue)
  → If succeeds, routing works; problem is specific to port-channels
```

---

## 9. Design Analysis: Field-3 Reasoning

Traditional networks use centralized control: a network architect designs "all uplinks use LACP" and deploys that policy everywhere. Decentralized networks (Field-3) empower each link pair to choose its own strategy. This is critical for Field-3 (DePIN) because:

1. **No Single Authority:** No central "link provisioning server" mandates protocol choices
2. **Resilience:** If one link's configuration is suboptimal, other links aren't affected
3. **Adaptation:** Over time, different link pairs can evolve different strategies based on local conditions

This topology (4 links with 3 different protocols: LACP, PAgP, static) proves that heterogeneous configurations can coexist and still form a correct spanning tree. The mesh remains loop-free and fully connected even though operators made different choices per link pair.

---

## 10. Real-World Parallel: Haiti P38 Distributed Hotspots

In P38, each hotspot pair will independently decide how to bundle links:
- Hotspot-A and Hotspot-B have stable power and networking infrastructure → use LACP (more automated)
- Hotspot-C and Hotspot-D are in remote areas with unreliable power → use static bundling (simpler, lower CPU cost)
- Hotspot-E has Cisco equipment, Hotspot-F has vendor-X equipment → negotiate what they both support

No central deployment team mandates all pairs use the same protocol. Each pair independently chooses based on local conditions. Day-24-Field-3 proves this is operationally feasible: heterogeneous protocols can coexist without breaking the mesh.

**P38 Integration Point:** distributed-link-aggregation module, hotspot-autonomy task
**Validation Gate:** Day-24-Field-3 proof complete before P38 mesh design allows heterogeneous configurations

---

## 11. Stretch Goals: Advanced Proof Obligations

1. **Formal model-check heterogeneous protocol mesh:**
   - Prove that any mix of LACP, PAgP, and static protocols forms a connected, loop-free graph
   - Prove that changing one link's protocol doesn't require reconfiguring others

2. **Test protocol migration:**
   - Change Po2 from PAgP to LACP while mesh is operational
   - Measure disruption time (should be < 5 seconds)
   - Verify mesh re-converges to spanning tree

3. **Scale test:**
   - Extend mesh to 8 hotspots with even more heterogeneous protocols
   - Measure convergence time as mesh size scales
   - Document scalability limits

4. **Byzantine protocol negotiation:**
   - What if one hotspot sends false negotiation PDUs (claiming to support a protocol it doesn't)?
   - Do other hotspots detect the anomaly and isolate it?
   - Document Byzantine resilience in protocol negotiation

---

## 12. Self-Assessment (Field-3 BSL Scale)

After completing this lab, rate yourself:

**BSL-0–1:** Read the lab; completed it with manual  
**BSL-2:** Could repeat without manual; understand heterogeneous protocols and independent negotiation  
**BSL-3:** Could rebuild from topology; diagnose protocol mismatches and verify spanning-tree  
**BSL-4:** Could extend mesh to 8 hotspots; mix protocols strategically  
**BSL-5:** Could teach this lab and connect to Haiti P38's decentralized governance model  

**Target: BSL-3 to BSL-4**

---

## References

- IEEE 802.3ad: Link Aggregation Control Protocol (LACP)
- Cisco IOS: EtherChannel, PAgP, Load Balancing
- Day-24-Research-Paper.md (Section 2.6: Field-3 linkage)
- RESEARCH-LAB-STANDARD.md
