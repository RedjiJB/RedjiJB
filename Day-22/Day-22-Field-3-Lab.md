# Day 22 — RSTP: Root Bridge Behavior and Link Types
## Field-3 Variant: Distributed Systems & DePIN Mesh Convergence Without Central Authority

---

## 0. Metadata

**Field Focus:** Field 3: Distributed Systems & DePIN Governance (Decentralized Consensus, Byzantine Fault Tolerance)

**Core Proof Obligation:** RSTP port-role election works independently on every node; no central controller is required to prevent loops or establish shortest-path tree; Byzantine nodes (sending false BPDUs) don't break quorum.

**Haiti Deployment Phase:** P38 pilot (distributed-STP module); validation that mesh hotspots can self-govern topology without central authority.

**Estimated Time:** 90–120 minutes

**Difficulty:** Advanced

**Relationship to Base Lab:** Same RSTP protocol; different topology (full mesh, not tree) and failure modes (Byzantine BPDU injection, Byzantine node isolation).

**Prerequisite:** Complete Day-22-Lab-Manual and ideally Day-22-Field-2-Lab.md. Familiarity with Byzantine fault tolerance concepts (quorum, consensus, faulty replicas).

---

## 1. Business Context (Field-3 Framing)

The base Day-22 lab proves RSTP works on a managed topology. But Haiti's P38 mesh is designed to be **decentralized**: no central "STP controller" orchestrates which switch is root or which links are blocked. Instead, each hotspot independently calculates port roles based on BPDU exchanges with neighbors. This lab proves that local, independent RSTP calculations lead to a globally correct spanning tree — even when one or more Byzantine nodes send malicious or corrupted BPDUs.

**Success criteria:**
- RSTP converges to a consistent spanning tree without central orchestration (all nodes independently compute roles)
- 3/4 Byzantine nodes (majority quorum) can form a correct spanning tree even if 1/4 sends false BPDUs
- Mesh topology remains loop-free and all nodes stay connected after Byzantine node isolation
- Convergence time < 120 seconds (allowing for multi-hop delays in full mesh)

---

## 2. Topology Diagram (Field-3 Mesh Topology)

```
[FIELD-3 FULL MESH TOPOLOGY]

       ┌─────────────────────────────────────┐
       │    All switches fully meshed:        │
       │   Every node connects to every other │
       │        (6 links, 4 nodes)            │
       └─────────────────────────────────────┘

        Node-A ◄────────────► Node-B
         ▲         │╱╲│         ▲
         │    ┌────┘  └────┐    │
         │    │            │    │
         └────┼────────────┼────┘
              │            │
              ▼            ▼
        Node-C ◄────────────► Node-D

[Links (6 total):]
A ↔ B  (P2p: priority 128)
A ↔ C  (P2p: priority 128)
A ↔ D  (P2p: priority 128)
B ↔ C  (P2p: priority 128)
B ↔ D  (P2p: priority 128)
C ↔ D  (P2p: priority 128)

[Node Roles for this Field-3 scenario:]
- Node-A: Designated Root (priority 4096, lowest bridge ID)
- Node-B: Alternate (Blocking, connected to Root)
- Node-C: Alternate (Blocking, connected to Root and B)
- Node-D: Byzantine (initially honest; then transitions to Byzantine mode)
         [Initially Alternate, then starts sending false BPDUs claiming to be root]

[FIELD-3 MODIFICATIONS from base Day-22:]
- Full mesh: every node has multiple paths to every other node
  → This forces RSTP to calculate port roles on every link independently
  → No central "hub"; each node is peer to others
  
- Byzantine Node (Node-D):
  → Initially honest RSTP (converges to correct spanning tree)
  → Phase 2: Injects false BPDUs (claiming D is the root with priority 1)
  → Phase 3: Observe how A, B, C detect and isolate the Byzantine node
  → Phase 4: Restore honest operation; verify re-convergence

- No single point of failure: if any one link fails, mesh stays connected via alternate paths
```

---

## 3. IP Addressing Plan (Field-3 Annotations)

```
VLAN 1 (Default, Layer 2 RSTP domain):
└─ No IP addressing needed; RSTP operates at Layer 2 only
└─ Annotation (Field-3): Each node independently makes loop-prevention decisions
                         without central DNS, DHCP, or routing server

PC Subnets (Layer 3, for connectivity verification only):
Node-A LAN: 192.168.1.0/24    [Assigned on edge Fa0/1–0/10]
  └─ Annotation: Each node has its own isolated subnet; cross-node traffic routes
                 through RSTP-converged spanning tree (Layer 2 forwarding)

Node-B LAN: 192.168.2.0/24    [Assigned on edge Fa0/1–0/10]
Node-C LAN: 192.168.3.0/24    [Assigned on edge Fa0/1–0/10]
Node-D LAN: 192.168.4.0/24    [Assigned on edge Fa0/1–0/10]

Mesh Links (all P2p, explicitly configured):
All 6 inter-node links: No IP addresses (Layer 2 only, for RSTP BPDUs)
└─ Annotation (Field-3): IP subnetting is irrelevant; RSTP operates below Layer 3
                         Proves mesh loop-prevention works without routing or DNS
```

---

## 4. Configuration (Field-3 Mesh Topology & Byzantine Simulation)

### 4.1 RSTP Core Configuration (All Nodes)

```
! Rapid Spanning Tree (802.1w)
spanning-tree mode rapid-pvst

! Node-A: Root (lowest priority = most likely to be elected root)
interface vlan 1
 ip address 192.168.0.1 255.255.255.0
spanning-tree vlan 1 priority 4096

! Nodes B, C, D: Higher priority (further from root, but equal among peers)
spanning-tree vlan 1 priority 8192    [Node-B]
spanning-tree vlan 1 priority 8192    [Node-C]
spanning-tree vlan 1 priority 8192    [Node-D, initially honest]
```

### 4.2 Mesh Link Configuration (All Nodes)

```
! Node-A: Mesh links to B, C, D
interface Gi0/1
 description Mesh to Node-B
 spanning-tree link-type point-to-point
 spanning-tree port priority 128

interface Gi0/2
 description Mesh to Node-C
 spanning-tree link-type point-to-point
 spanning-tree port priority 128

interface Gi0/3
 description Mesh to Node-D
 spanning-tree link-type point-to-point
 spanning-tree port priority 128

! Node-B: Similar to Node-A (Gi0/1 to A, Gi0/2 to C, Gi0/3 to D)
! Node-C: Similar to Node-A (Gi0/1 to A, Gi0/2 to B, Gi0/3 to D)
! Node-D: Similar to Node-A (Gi0/1 to A, Gi0/2 to B, Gi0/3 to C)

! PC-facing ports (edge, for end devices)
interface range Fa0/1 – 0/10
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
```

### 4.3 Byzantine Node Injection (Node-D, Phases 1-4)

**Phase 1: Honest Operation (0–30 seconds)**
```
Node-D is configured with normal RSTP; behaves honestly. Observes:
- A is elected root (priority 4096, lowest)
- B, C, D are all Alternates, computing shortest paths to A
- No topology changes
```

**Phase 2: Malicious BPDU Injection (30–60 seconds)**
```
! On Node-D, configure a process to inject false BPDUs claiming D is root
! Simulated via IOS EEM (Embedded Event Manager) or manual BPDU crafting

Node-D(config)# event manager applet inject-false-bpdu
 event timer watchdog time 30000
 action 1.0 cli command "enable"
 action 2.0 cli command "debug spanning-tree events"
 ! [In real Cisco, we'd need to craft raw Ethernet frames; this is pseudocode]

[Alternatively, simulate with tcpdump + scapy on a GNS3 bridge host:]
```bash
#!/usr/bin/env python3
# Inject false BPDU from Node-D claiming D is the root
import scapy.all as scapy

dst_mac = "ff:ff:ff:ff:ff:ff"       # BPDU multicast
src_mac = "00:00:00:00:00:04"       # Node-D MAC
vlan_id = 1
root_priority = 1                    # Claim root with priority 1 (lower than A's 4096)
root_mac = "00:00:00:00:00:04"      # Claim D's MAC is the root

# Send false BPDU every 2 seconds
while True:
    frame = create_false_bpdu(src_mac, dst_mac, root_priority, root_mac)
    scapy.send(frame, iface="veth-d-to-b", verbose=0)
    time.sleep(2)
```

**Phase 3: Observe Byzantine Impact (60–120 seconds)**
```
During malicious BPDU injection, expect:
- A detects D is claiming to be root (false BPDU with priority 1)
- B and C receive false BPDUs from D and initially believe D is root
- RSTP should NOT accept the false BPDU (it violates root bridge ID rules)
- OR, if implementation is naive, A/B/C might briefly recalculate (role thrashing)

Measure:
- How long until A/B/C detect the anomaly?
- Do they isolate Node-D or do they accept the false root claim?
- Correct behavior: Ignore false BPDU (D's bridge ID is still 8192, not 1; or
                   use MAC tiebreaker to verify D is not actually the root)
```

**Phase 4: Restore Honest Operation (120–150 seconds)**
```
Stop the false-BPDU injection. Observe:
- A/B/C should re-converge to the correct root (A)
- D rejoins as an Alternate node
- Convergence time should be < 30 seconds
```

---

## 5. Field-Specific Verification Steps

### Step 1: Establish Correct Spanning Tree (All Nodes Honest)

```
1.1  Power up all four nodes: Node-A, Node-B, Node-C, Node-D
1.2  Wait 60 seconds for RSTP election (full mesh takes longer than tree)
1.3  Verify all nodes agree on root (should be Node-A):

Node-A# show spanning-tree
  Spanning tree enabled protocol rstp
  Root ID Priority 4096 Address aaaa.aaaa.aaaa  (THIS BRIDGE IS ROOT)

Node-B# show spanning-tree
  Root ID Priority 4096 Address aaaa.aaaa.aaaa  (Node-A is root)

Node-C# show spanning-tree
  Root ID Priority 4096 Address aaaa.aaaa.aaaa  (Node-A is root)

Node-D# show spanning-tree
  Root ID Priority 4096 Address aaaa.aaaa.aaaa  (Node-A is root)

[CRITICAL VERIFICATION: All four nodes must independently report the same root.
 This proves decentralized consensus — no central controller told them.]
```

### Step 2: Verify Port Roles on Full Mesh

```
2.1  On each node, record all port roles (should span all 6 links correctly)

Node-A# show spanning-tree interface brief
Interface      Role PortPri.Nbr State    Type       (illustrative output)
Gi0/1          Desig 128.1      FWD     P2p
Gi0/2          Desig 128.2      FWD     P2p
Gi0/3          Desig 128.3      FWD     P2p
[Node-A is root; all ports are Designated (sends BPDUs to all neighbors)]

Node-B# show spanning-tree interface brief
Gi0/1          Root  128.1      FWD     P2p     [Link to Node-A (root)]
Gi0/2          Altn  128.2      BLK     P2p     [Link to Node-C (loop block)]
Gi0/3          Altn  128.3      BLK     P2p     [Link to Node-D (loop block)]
[Node-B has one Root port (to A), two Alternate ports (to C and D)]

Node-C# show spanning-tree interface brief
Gi0/1          Root  128.1      FWD     P2p     [Link to Node-A (root)]
Gi0/2          Altn  128.2      BLK     P2p     [Link to Node-B (loop block)]
Gi0/3          Altn  128.3      BLK     P2p     [Link to Node-D (loop block)]

Node-D# show spanning-tree interface brief
Gi0/1          Root  128.1      FWD     P2p     [Link to Node-A (root)]
Gi0/2          Altn  128.2      BLK     P2p     [Link to Node-B (loop block)]
Gi0/3          Altn  128.3      BLK     P2p     [Link to Node-C (loop block)]

2.2  Verify loop-free topology:
- A: 3 Designated ports (no loops, A is the point of convergence)
- B, C, D: 1 Root port + 2 Alternate (blocked) ports each
  [This is the correct spanning tree for a full mesh]

2.3  [FIELD-3 CRITICAL PROOF] Verify EVERY node computed this independently:
- No central controller sent commands
- Each node used only BPDUs from neighbors (gossip protocol)
- All four nodes converged to the SAME root (consensus) and same port roles
- This proves decentralized STP works
```

### Step 3: Inject Byzantine BPDUs (Node-D becomes Malicious)

```
3.1  Start false-BPDU injection script on Node-D (Section 4.3, Phase 2):
$ sudo python3 inject-false-bpdu.py

3.2  On Node-A, monitor for topology changes:
Node-A# debug spanning-tree events (time for 60 seconds)
! Watch for BPDUs from Node-D claiming priority 1 (false root claim)

3.3  Record timestamp when A first receives a false BPDU:
[T_byzantine_start = 30 seconds]

3.4  Observe on Node-B (neighbor to D):
Node-B# show spanning-tree interface Gi0/3
! Should still show D as Alternate (not Root), proving B rejects the false BPDU

[INTERPRETATION: Node-B independently validates root claims. D's false BPDU
 is rejected because D's source MAC doesn't match the claimed root MAC.]
```

### Step 4: Measure Byzantine Detection Latency

```
4.1  Monitor all four nodes' port roles every 5 seconds during Byzantine injection:

Iteration 1 (T=35s):
 A: Desig Desig Desig  [A is still root, no role changes]
 B: Root Altn Altn    [B still sees A as root]
 C: Root Altn Altn
 D: Desig Desig Desig [D's false BPDU claims D is root; B/C receive it]

[Between 35s and 40s, nodes may temporarily believe D is root]

Iteration 2 (T=40s):
 A: Desig Desig Desig  [A is still root]
 B: Root Altn Altn    [B still sees A as root; detected D's false claim]
 C: Root Altn Altn    [C still sees A as root; detected D's false claim]
 D: Desig Desig Desig [D continues injecting false BPDUs]

[FIELD-3 PROOF: Within 5–10 seconds, all nodes reject the Byzantine root claim
 and continue recognizing A as root. Quorum (3/4) is maintained; Byzantine node
 is isolated via protocol mechanics, not central intervention.]

4.2  Record Byzantine Detection Latency:
ΔT_byzantine_detection = (time until B/C reject D's false claim) - T_byzantine_start
PASS if < 10 seconds: Fast enough to prevent false root adoption
FAIL if > 20 seconds: Byzantine node could have caused topology thrashing
```

### Step 5: Stop Byzantine Injection & Re-Convergence

```
5.1  Kill false-BPDU injection:
$ Ctrl+C in the python script (or disable EEM applet)

5.2  Wait 30 seconds for RSTP to stabilize
5.3  Verify all nodes re-converge to the original correct tree:

Node-A# show spanning-tree
 Root ID Priority 4096 Address aaaa.aaaa.aaaa  (THIS BRIDGE IS ROOT)
 [All ports remain Designated]

Node-B through Node-D:
 [Should return to: 1 Root port, 2 Alternate ports]

5.4  Measure re-convergence time:
ΔT_recovery = (time until D returns to Alternate) - T_byzantine_stop
PASS if < 30 seconds: Network recovers from Byzantine attack quickly
```

### Step 6: Validate Connectivity Through Spanning Tree

```
6.1  Test Layer 3 connectivity (through Layer 2 RSTP-managed topology):
Node-A-PC> ping 192.168.2.1  (Node-B's PC)
→ Should succeed (frame goes: A-PC → A(Fa0/1) → A(Gi0/1) → B(Gi0/1) → B(Fa0/1) → B-PC)

Node-B-PC> ping 192.168.3.1  (Node-C's PC)
→ Should succeed (frame may go: B-PC → B → B(Gi0/2 blocked) → REROUTE via A → C)
  [Since Gi0/2 is Alternate (blocked), frames go B→A→C]

Node-D-PC> ping 192.168.1.1  (Node-A's PC)
→ Should always succeed (D→A direct link always works)

6.2  After Byzantine injection:
Connectivity should be briefly disrupted (< 10 seconds) while A/B/C reject false BPDU.
After 10 seconds, connectivity must be restored and remain stable.
PASS: No routing loops, no packet loss > 5% during transition
```

---

## 6. Expected Output Gallery (Field-3 Scenarios)

### 6.1 Correct Mesh Spanning Tree (All Honest)

```
Node-A# show spanning-tree
VLAN0001
  Spanning tree enabled protocol rstp
  Root ID Priority 4096 Address aaaa.aaaa.aaaa  <- THIS BRIDGE IS THE ROOT
  Bridge ID Priority 4096 Address aaaa.aaaa.aaaa
  Root port is none (this bridge is root)
  Hello time 2, Forward delay 15, Max age 20

Interface           Role PortPri.Nbr Type       Edge Root Guard LoopGuard
 ─────────────────────────────────────────────────────────────────────────
 Gi0/1               Desig 128.1    P2p        -    -    -      -
 Gi0/2               Desig 128.2    P2p        -    -    -      -
 Gi0/3               Desig 128.3    P2p        -    -    -      -
 Fa0/1–0/10         Edge  128.4–13  P2p Edge   Yes  -    -      -

[Interpretation: A has all ports Designated; sends BPDUs to all neighbors. No Alternate
 (blocked) ports because A is the root.]

Node-B# show spanning-tree
VLAN0001
  Spanning tree enabled protocol rstp
  Root ID Priority 4096 Address aaaa.aaaa.aaaa  <- Node-A is the root
  Bridge ID Priority 8192 Address bbbb.bbbb.bbbb
  Root port is Gi0/1, cost 4
  Hello time 2, Forward delay 15, Max age 20

Interface           Role PortPri.Nbr Type       Edge Root Guard LoopGuard
 ─────────────────────────────────────────────────────────────────────────
 Gi0/1               Root  128.1    P2p        -    -    -      -
 Gi0/2               Altn  128.2    P2p        -    BLK  -      -
 Gi0/3               Altn  128.3    P2p        -    BLK  -      -
 Fa0/1–0/10         Edge  128.4–13  P2p Edge   Yes  -    -      -

[Interpretation: B has one Root port (Gi0/1 to A) and two Alternate ports (Gi0/2, Gi0/3
 blocked). This is correct for a full mesh: B must block at least one link to prevent loops.]
```

### 6.2 During Byzantine BPDU Injection (Node-D Claims False Root)

```
[At T=35 seconds, Node-D starts sending false BPDUs claiming priority 1]

Node-B# show spanning-tree interface Gi0/3
Gi0/3 (link to Node-D)
 Port ID 128.3
 Role: Alternate, State: Blocking
 Port Timers: Forward Delay time expired
 BPDU: Designated Role
   Designated Bridge ID: 0001.dddd.dddd.dddd  <- FALSE CLAIM (priority 1)
   Designated Root ID: 0001.dddd.dddd.dddd    <- FALSE CLAIM (D is "root")
 Local Bridge has better BPDU (priority 4096 from A)

[CRITICAL OBSERVATION: Gi0/3 shows Role: Alternate (still blocked), proving that B
 validated the root claim and rejected D's false BPDU. B correctly determined that A
 (priority 4096 + MAC comparison) is the real root, not D (priority 1 + wrong MAC).]

Node-A# debug spanning-tree events | include 0001
[If D's false BPDU reaches A, A logs the anomalous priority 1 claim and ignores it]

[FIELD-3 PROOF: All nodes use the same validation logic (root priority, MAC comparison).
 Quorum (3/4 honest nodes: A, B, C) agrees D is not the root. D (Byzantine node) is
 isolated without central orchestration.]
```

### 6.3 After Byzantine Injection Stops (Re-Convergence)

```
[At T=120 seconds, false-BPDU injection stops]

Node-D# show spanning-tree interface
[D's ports return to normal: Gi0/1 = Root (to A), Gi0/2–0/3 = Alternate (blocked)]

Node-B# show spanning-tree
[Same as Section 6.1: Normal mesh spanning tree, all four nodes agree on root]

[All connectivity restored within 10–20 seconds]
```

---

## 7. Common Field-3 Mistakes

1. **Creating a star topology instead of full mesh:** If you miss any link (e.g., C ↔ D), the topology becomes a tree, not a mesh. A full mesh forces RSTP to block exactly N-1 links (3 links for 4 nodes); a tree blocks the minimum necessary.

2. **Incorrect priority assignment:** If you set different priorities (e.g., A=4096, B=4096, C=8192, D=16384), root election may not converge to A. All non-root nodes should have equal priority (8192); only the intended root gets 4096.

3. **Trusting auto-detected link types:** In a full mesh with high link counts, auto-detection may classify some links as "Shr" if there's any brief packet loss during startup. Always explicitly configure `spanning-tree link-type point-to-point` on every mesh link.

4. **Not accounting for multi-hop RSTP delays:** In a 4-node mesh, RSTP convergence to a consistent tree takes longer than a 2-node tree because BPDUs must propagate through 2–3 hops. Budget 60 seconds for full mesh RSTP (vs. 30 seconds for simple tree).

5. **False Byzantine injection (e.g., simply shutting down Node-D):** If you test Byzantine resilience by just shutting down a node, RSTP will quickly remove it from the tree (link down). Real Byzantine nodes are **present but dishonest** — they send false BPDUs. You must simulate active malice, not passive failures.

6. **Misinterpreting "Alternate blocked" as a failure:** Alternate (blocked) ports are **correct**. In a full mesh, most ports must be blocked to prevent loops. RSTP keeps them up and monitored in case the primary (Root) port fails.

---

## 8. Troubleshooting by Field (Diagnostic Method)

### Problem: Nodes don't agree on root (some think A, others think D)

```
Step 1: Is every mesh link actually configured?
 Node-A# show interface | include Gi | include "up"
 → Should list at least 3 Gi interfaces (links to B, C, D)
 → If missing a link, mesh is incomplete; add it

Step 2: Are all mesh links configured as P2p?
 Node-A# show spanning-tree interface brief
 → Type column should show "P2p" for all mesh links (not "Shr")
 → If "Shr", reconfigure: spanning-tree link-type point-to-point

Step 3: Is the intended root actually the lowest bridge ID?
 Node-A# show spanning-tree | include Bridge ID
 → Should show Bridge ID Priority 4096 Address aaaa.aaaa.aaaa
 → If priority is 8192 or higher, A is not the intended root
 FIX: spanning-tree vlan 1 priority 4096

Step 4: Are topology changes still occurring (convergence not stable)?
 Node-A# debug spanning-tree events (for 30 seconds)
 → Should see "Topology Change BPDU received" at startup, then stable
 → If "Topology Change" occurs every few seconds, mesh is thrashing
 FIX: Wait longer for convergence (60+ seconds for full mesh)
```

### Problem: Byzantine node (D) is accepted as root (nodes briefly think D is root)

```
Step 1: Did the Byzantine injection actually start?
 $ ps aux | grep inject-false-bpdu.py
 → Script should be running
 FIX: Re-run the script; check file permissions

Step 2: Is the false BPDU reaching other nodes?
 Node-B# debug spanning-tree bpdu (enable brief debug)
 → Should see BPDUs from D with anomalous priority
 → If D's BPDUs don't reach B, check link connectivity (show interface Gi0/3)

Step 3: Are nodes validating root claims correctly?
 Node-B# show spanning-tree | include "Root ID"
 → Should show A (aaaa.aaaa.aaaa), not D (dddd.dddd.dddd)
 → If showing D, B accepted the false claim (vulnerability!)
 FIX: Check RSTP implementation (Cisco should reject invalid BPDUs)

Step 4: How long before nodes re-converge to the correct root?
 Measure time from false-BPDU injection start to "Root ID: aaaa.aaaa.aaaa" on B
 → Should be < 10 seconds
 → If > 30 seconds, Byzantine node caused prolonged convergence corruption
```

### Problem: Mesh has multiple loops (not spanning tree)

```
Step 1: Is there a port role mismatch?
 Compare roles across all nodes. In a correct spanning tree:
 - Exactly one Root port per non-root node (points to root)
 - Exactly N-1 blocking (Alternate) ports per node (to prevent loops)
 - Sum of all Designated ports = N-1 (one per link, both ends don't both have Designated)

 If you see two Designated ports on the same link (both ends claim Designated),
 RSTP is broken or not converged.

Step 2: Did all nodes pick the same root?
 Show spanning-tree on all four nodes; Root ID should be identical
 FIX: If different, wait longer for convergence or reconfigure priorities

Step 3: Are all links actually P2p?
 Some auto-detected "Shr" links can cause RSTP to place both ends as Designated
 FIX: Explicitly configure spanning-tree link-type point-to-point
```

---

## 9. Design Analysis: Field-3 Reasoning

In centralized systems, a controller orchestrates topology. In DePIN (decentralized infrastructure), each node must independently make decisions. RSTP enables this: every node calculates port roles based only on BPDUs from neighbors (local gossip). No global state, no central coordinator.

The full-mesh topology forces RSTP to do real work: with only one primary link (tree), RSTP is trivial (one port is Root, rest are Alternate). With six mesh links, RSTP must calculate cost to root on every path, compare costs, and decide which ports to block. This complexity is why the full-mesh variant is Field-3 (DePIN): it proves that local algorithms scale to mesh networks without central orchestration.

The Byzantine variant adds a real-world concern: what if one hotspot is compromised or malfunctioning? Can the mesh survive? This lab proves that 3/4 honest nodes can reject a Byzantine node's false claims via protocol mechanics alone (comparison of bridge IDs, root-ID validation). This is the foundation of Byzantine Fault Tolerance (BFT): consensus despite faulty nodes.

---

## 10. Real-World Parallel: Haiti P38 Distributed Mesh

In P38, 15+ hotspots will be spread across terrain without a central "network operations center." Each hotspot runs RSTP locally. No central controller tells them which links to block or which switch is root. When a link fails, the RSTP on that hotspot detects it locally and re-converges the mesh.

This lab variant proves the feasibility: a 4-node full-mesh reaches consensus on root and topology without a controller. In P38, scaling to 15+ nodes will require careful tuning (larger hello intervals, more conservative timers) but the principle is proven here.

The Byzantine test adds confidence: if one hotspot is compromised or misconfigured, the other 14 can still form a correct spanning tree. The mesh remains operational even under adversarial conditions.

**P38 Integration Point:** distributed-STP module, hotspot-autonomy task
**Validation Gate:** Day-22-Field-3 proof complete before P38 deployment model is finalized

---

## 11. Stretch Goals: Advanced Proof Obligations

1. **Formal model-check full-mesh RSTP convergence:**
   - Use TLA+ to prove that any N-node full mesh reaches a spanning tree in finite time
   - Prove that the spanning tree is loop-free and connected
   - Prove convergence time is bounded by O(N log N) BPDUs

2. **Byzantine-resilient RSTP validation:**
   - Prove that up to (N-1)/3 Byzantine nodes cannot prevent a quorum from converging
   - Model Byzantine nodes that send conflicting BPDUs, suppress BPDUs, or replay old BPDUs
   - Measure resilience: at what Byzantine fraction does convergence fail?

3. **Scaling test: 8-node, 16-node, 32-node full mesh:**
   - Measure convergence time as N scales
   - At what scale does RSTP become impractical (convergence > 5 minutes)?
   - Document the breaking point for Haiti deployment planning

4. **Byzantine persistence: What if Byzantine node is permanent?**
   - Instead of stopping Byzantine injection, leave it running indefinitely
   - Do honest nodes converge to a stable state with D as Alternate (isolated)?
   - Can honest nodes form a correct spanning tree even with one permanently Byzantine peer?

---

## 12. Self-Assessment (Field-3 BSL Scale)

After completing this lab, rate yourself:

**BSL-0 AWARENESS**
- You've read this lab; you understand the concept of full-mesh RSTP and Byzantine resilience.
- You couldn't set up the topology or explain why each link matters.

**BSL-1 LAB CAPABLE**
- You completed this lab with the manual open.
- All four nodes converge to the correct spanning tree (A as root).
- Byzantine detection latency < 10 seconds on all runs.

**BSL-2 OFFLINE**
- You could repeat this lab without the manual (topology diagram + protocols).
- You understand why full mesh requires blocking N-1 ports (vs. tree).
- You can predict which ports should be Designated/Alternate/Root on any node.

**BSL-3 RECOVERABLE**
- You could rebuild this lab from scratch and explain the proof obligation to someone else.
- You can modify the topology (e.g., 8 nodes instead of 4) and predict convergence behavior.
- You understand the DePIN implication: consensus without central authority.

**BSL-4 MAINTAINABLE**
- You can adjust Byzantine injection parameters (priority claims, BPDU frequency) and predict impact.
- You can script automated verification (loop through all nodes, parse spanning-tree output, check consistency).
- You can extend the lab to test Byzantine persistence or N-node scaling.

**BSL-5 TEACHABLE**
- You can teach this lab to someone else, explaining why full-mesh topology forces distributed consensus.
- You can connect this to Haiti P38 (hotspot autonomy, no central controller).
- You can defend the design against skeptics ("Why not use a central STP controller?" → "Because P38 has no central authority")

**Target for this lab: BSL-3 to BSL-4** (recoverable and maintainable; able to verify distributed consensus)

---

## References

- IEEE 802.1D-2004: Rapid Spanning Tree Protocol
- Leslie Lamport, "The Byzantine Generals Problem" (foundational BFT paper)
- Cisco IOS Software Configuration Guide: RSTP, Rapid PVST+
- Day-22-Research-Paper.md (Section 2.6: Field-3 linkage and proof obligations)
- RESEARCH-LAB-STANDARD.md (Section 2: Field-Specific Lab Template)
