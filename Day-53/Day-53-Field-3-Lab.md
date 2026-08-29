# Day 53 Field-3 Variant — GRE Tunnels (Distributed Consensus)

## 0. Metadata

```
Field Focus:         Field 3: Distributed Consensus (DePIN)
Core Proof Obligation: Full-mesh GRE tunnel network (3+ hops) maintains consensus on which tunnel is primary; Byzantine endpoints don't break mesh connectivity.
Haiti Deployment Phase: P52+ (scale phase) — mesh must tolerate a compromised or offline tunnel endpoint without losing mesh connectivity.
Estimated Time:      2.5 hours
Difficulty:          Advanced
Relationship to Base Lab: Extends from point-to-point (RA ↔ RB) to full-mesh (RA ↔ RB, RB ↔ RC, RA ↔ RC); consensus elects primary path via metrics.
Prerequisite:        Complete Day 53 Lab Manual first; understand GRE protocol and basic mesh concepts.
```

---

## 1. Business Context (Field-3 Framing)

In a P52+ mesh with 50–1000 hotspots, no two-hotspot pair can afford a single GRE tunnel. Instead, each hotspot is connected to multiple peers via redundant tunnels. If one tunnel fails or one peer is Byzantine (online but sending corrupted data), the mesh must route around it.

**The problem:** Simple failover (if tunnel A fails, use tunnel B) doesn't scale. In a 50-hotspot mesh, each hotspot has 49 tunnels; managing which one to use requires coordination. A Byzantine-resilient mesh requires consensus: a tunnel is used only if a quorum of neighbors agrees it's healthy.

**This variant proves:** A 3-router full-mesh (RA ↔ RB, RB ↔ RC, RA ↔ RC) with consensus-based tunnel selection ensures that even if one tunnel is Byzantine, the other two form a quorum and keep the mesh connected.

---

## 2. Topology Diagram (Field-3 Variant)

```
[FIELD-3 VARIANT — Distributed Consensus Mesh]

         RA
        /  \
       /    \
     RB ---- RC

Full-mesh tunnels:
- RA ↔ RB (Tunnel 1)
- RB ↔ RC (Tunnel 2)
- RA ↔ RC (Tunnel 3)

Consensus mechanism:
- Each tunnel has a "health score" (keepalive success rate)
- A tunnel is considered "up" only if ≥2 out of 3 endpoints agree
- Routing protocol (OSPF) reflects tunnel health; routes use consensus-approved tunnels
- If one tunnel is Byzantine (always down, despite being configured), quorum ignores it
```

---

## 3. IP Addressing Plan (Field-3 Annotations)

| Device | Loopback | Tunnel to RB | Tunnel to RC | Tunnel to RA |
|---|---|---|---|---|
| RA | 3.3.3.1/32 | 10.1.0.1/30 | 10.3.0.1/30 | — |
| RB | 3.3.3.2/32 | 10.1.0.2/30 | 10.2.0.1/30 | — |
| RC | 3.3.3.3/32 | — | 10.2.0.2/30 | 10.3.0.2/30 |

**Field-3 Annotations:**
- Each tunnel has its own /30 subnet (not shared)
- Loopback IPs used for OSPF router identification (each router has a unique ID)
- Consensus operates at the OSPF/metric level (routing protocol reflects tunnel health)

---

## 4. Configuration (Field-3 Optimizations)

### 4.1 RA: Loopback and Multiple Tunnels

```text
RA(config)#interface Loopback 0
RA(config-if)#ip address 3.3.3.1 255.255.255.255
RA(config-if)#exit

RA(config)#interface GigabitEthernet0/0
RA(config-if)#ip address 1.1.1.1 255.255.255.0
RA(config-if)#no shutdown
RA(config-if)#exit

RA(config)#interface Tunnel 1
RA(config-if)#ip address 10.1.0.1 255.255.255.252
RA(config-if)#tunnel source 1.1.1.1
RA(config-if)#tunnel destination 2.2.2.2
RA(config-if)#tunnel keepalive 2 6
RA(config-if)#no shutdown
RA(config-if)#exit

RA(config)#interface Tunnel 3
RA(config-if)#ip address 10.3.0.1 255.255.255.252
RA(config-if)#tunnel source 1.1.1.1
RA(config-if)#tunnel destination 4.4.4.3
RA(config-if)#tunnel keepalive 2 6
RA(config-if)#no shutdown
RA(config-if)#exit

RA(config)#router ospf 1
RA(config-router)#network 3.3.3.1 0.0.0.0 area 0
RA(config-router)#network 10.1.0.0 0.0.0.3 area 0
RA(config-router)#network 10.3.0.0 0.0.0.3 area 0
RA(config-router)#exit
```

**Explanation for Field-3:**
- Loopback: OSPF uses this for router ID (distributed consensus uses stable IDs)
- Tunnels 1 & 3: RA connects to RB and RC (full-mesh)
- OSPF network statements: Advertise tunnel subnets; OSPF calculates metrics based on tunnel health

### 4.2 RB: Loopback and Tunnels to RA and RC

```text
RB(config)#interface Loopback 0
RB(config-if)#ip address 3.3.3.2 255.255.255.255
RB(config-if)#exit

RB(config)#interface GigabitEthernet0/0
RB(config-if)#ip address 2.2.2.2 255.255.255.0
RB(config-if)#no shutdown
RB(config-if)#exit

RB(config)#interface Tunnel 1
RB(config-if)#ip address 10.1.0.2 255.255.255.252
RB(config-if)#tunnel source 2.2.2.2
RB(config-if)#tunnel destination 1.1.1.1
RB(config-if)#tunnel keepalive 2 6
RB(config-if)#no shutdown
RB(config-if)#exit

RB(config)#interface Tunnel 2
RB(config-if)#ip address 10.2.0.1 255.255.255.252
RB(config-if)#tunnel source 2.2.2.2
RB(config-if)#tunnel destination 4.4.4.3
RB(config-if)#tunnel keepalive 2 6
RB(config-if)#no shutdown
RB(config-if)#exit

RB(config)#router ospf 1
RB(config-router)#network 3.3.3.2 0.0.0.0 area 0
RB(config-router)#network 10.1.0.0 0.0.0.3 area 0
RB(config-router)#network 10.2.0.0 0.0.0.3 area 0
RB(config-router)#exit
```

### 4.3 RC: Loopback and Tunnels to RB and RA

```text
RC(config)#interface Loopback 0
RC(config-if)#ip address 3.3.3.3 255.255.255.255
RC(config-if)#exit

RC(config)#interface GigabitEthernet0/0
RC(config-if)#ip address 4.4.4.3 255.255.255.0
RC(config-if)#no shutdown
RC(config-if)#exit

RC(config)#interface Tunnel 2
RC(config-if)#ip address 10.2.0.2 255.255.255.252
RC(config-if)#tunnel source 4.4.4.3
RC(config-if)#tunnel destination 2.2.2.2
RC(config-if)#tunnel keepalive 2 6
RC(config-if)#no shutdown
RC(config-if)#exit

RC(config)#interface Tunnel 3
RC(config-if)#ip address 10.3.0.2 255.255.255.252
RC(config-if)#tunnel source 4.4.4.3
RC(config-if)#tunnel destination 1.1.1.1
RC(config-if)#tunnel keepalive 2 6
RC(config-if)#no shutdown
RC(config-if)#exit

RC(config)#router ospf 1
RC(config-router)#network 3.3.3.3 0.0.0.0 area 0
RC(config-router)#network 10.2.0.0 0.0.0.3 area 0
RC(config-router)#network 10.3.0.0 0.0.0.3 area 0
RC(config-router)#exit
```

---

## 5. Field-3 Verification Steps

### 5.1 Verify Mesh Formation (All Tunnels Up)

```text
RA#show ip route ospf | include "3.3.3"
O 3.3.3.2 [110/1000] via 10.1.0.2, 00:00:15, Tunnel1
O 3.3.3.3 [110/1000] via 10.3.0.2, 00:00:15, Tunnel3
! OR via 10.1.0.2 (through RB) if direct tunnel to RC is down

RB#show ip route ospf | include "3.3.3"
O 3.3.3.1 [110/1000] via 10.1.0.1, 00:00:15, Tunnel1
O 3.3.3.3 [110/1000] via 10.2.0.2, 00:00:15, Tunnel2

RC#show ip route ospf | include "3.3.3"
O 3.3.3.1 [110/1000] via 10.3.0.1, 00:00:15, Tunnel3
O 3.3.3.2 [110/1000] via 10.2.0.1, 00:00:15, Tunnel2
```

**Expected:** Each router knows how to reach the other two via OSPF. Multiple paths exist (redundancy).

### 5.2 Test Connectivity (All Tunnels)

```text
RA#ping 3.3.3.2
!!!!!
RA#ping 3.3.3.3
!!!!!
```

### 5.3 Simulate Byzantine Tunnel: Tunnel 1 (RA ↔ RB) Fails

```text
RA#show interface tunnel 1
Tunnel1 is up, line protocol is up

RA(config)#interface tunnel 1
RA(config-if)#shutdown
RA(config-if)#exit
```

Wait 10 seconds for OSPF to reconverge.

### 5.4 Verify Consensus: Mesh Still Connected (via Alternate Path)

```text
RA#show ip route ospf | include "3.3.3.2"
O 3.3.3.2 [110/2000] via 10.3.0.2, 00:00:08, Tunnel3
! RA reaches RB via RC (Tunnel3 ↔ Tunnel2); cost is higher (2000 vs. 1000) but path exists

RA#ping 3.3.3.2
!!!!!
```

**Expected:** Even though the direct tunnel RA ↔ RB is down, RA can still reach RB via RC. Mesh maintains connectivity.

### 5.5 Verify RB and RC Still See Each Other Directly

```text
RB#show ip route ospf | include "3.3.3.3"
O 3.3.3.3 [110/1000] via 10.2.0.2, 00:00:15, Tunnel2
! RB ↔ RC tunnel is still up (doesn't depend on RA ↔ RB tunnel)

RB#ping 3.3.3.3
!!!!!
```

**Expected:** RB and RC tunnel is unaffected by RA's tunnel failure; consensus doesn't prevent direct communication.

### 5.6 Recover Tunnel and Verify Rebalancing

```text
RA(config)#interface tunnel 1
RA(config-if)#no shutdown
RA(config-if)#exit
```

Wait 10 seconds for OSPF to reconverge.

```text
RA#show ip route ospf | include "3.3.3.2"
O 3.3.3.2 [110/1000] via 10.1.0.2, 00:00:15, Tunnel1
! Direct path is back; OSPF rebalances to lower-cost route
```

**PROOF OBLIGATION PASS:** Mesh maintained connectivity even with one tunnel down. Consensus allowed the other tunnels to form a quorum path. Recovery restored the direct path.

---

## 6. Expected Output Gallery (Field-3 Scenarios)

### Full Mesh Connectivity

```
RA#show ip ospf neighbor
Neighbor ID     Pri   State           Dead Time   Address         Interface
3.3.3.3         0     FULL/ -         00:00:38    10.3.0.2        Tunnel3
3.3.3.2         0     FULL/ -         00:00:34    10.1.0.2        Tunnel1
```

### After Tunnel 1 Shutdown

```
[Tunnel1 is down; RA loses direct neighbor 3.3.3.2]

RA#show ip ospf neighbor
Neighbor ID     Pri   State           Dead Time   Address         Interface
3.3.3.3         0     FULL/ -         00:00:38    10.3.0.2        Tunnel3
[Neighbor 3.3.3.2 no longer reachable via Tunnel1]

[But via Tunnel3, RA can reach 3.3.3.2 through 3.3.3.3]

RA#show ip route ospf
     3.3.3.0/32 is subnetted, 3 subnets
O       3.3.3.2 [110/2000] via 10.3.0.2, 00:00:08, Tunnel3
        [Cost 2000 = RA→RC (1000) + RC→RB (1000); direct path was 1000]
O       3.3.3.3 [110/1000] via 10.3.0.2, 00:00:15, Tunnel3
```

---

## 7. Common Field-3 Mistakes

1. **Not creating a full mesh** → If you only have RA ↔ RB and RB ↔ RC (no RA ↔ RC), a single tunnel failure breaks the mesh.
   - **Fix:** All three routers must have direct tunnels to all others (3 tunnels minimum for 3 routers).

2. **OSPF not converging after tunnel change** → Tunnel is shutdown, but OSPF neighbor state doesn't transition; OSPF keeps using the dead neighbor.
   - **Fix:** Ensure OSPF is running on all tunnel interfaces and neighbor timers are reasonable (default should work).

3. **Misconfiguring tunnel endpoint IPs** → Tunnel destinations don't match; tunnels never come up.
   - **Fix:** Double-check tunnel source and destination on each router:
     - RA Tunnel1 source: 1.1.1.1 destination: 2.2.2.2 (RB)
     - RB Tunnel1 source: 2.2.2.2 destination: 1.1.1.1 (RA)

4. **Not verifying consensus mechanism** → Testing basic failover (tunnel down, alternate path works) is not the same as testing consensus Byzantine resilience.
   - **Fix:** Test that the mesh behaves correctly *with quorum* (2 tunnels up, 1 down), not just binary (1 up, 1 down).

---

## 8. Troubleshooting by Field-3 (Diagnostic Method)

**Symptom: "Tunnel is down, but OSPF neighbor state is still FULL"**

```text
Step 1: Is the tunnel interface actually down?
  show interface tunnel 1 | include "line protocol"
  → Should show "line protocol is down". If it says "up", the tunnel didn't shut down.

Step 2: Has OSPF detected the neighbor loss?
  show ip ospf neighbor detail
  → Should show "Dead Time 0:00:00" (dead). If still shows active timeout, wait or manually clear OSPF.

Step 3: Is OSPF adjacency still forming?
  debug ip ospf adj (limited to 10 seconds)
  → Should see "Down event" or "Neighbor Down" message when tunnel goes down.

Step 4: Force OSPF to recalculate
  clear ip ospf process
  → OSPF clears all neighbors and starts fresh. All should come back up via remaining tunnels.
```

**Symptom: "After tunnel failure, reachability to other routers is lost"**

```text
Step 1: Are all three tunnels configured (full mesh)?
  show interface tunnel 1
  show interface tunnel 2
  show interface tunnel 3
  → If only 2 exist, mesh is not full; single failure breaks connectivity.

Step 2: Are all OSPF routes available?
  show ip route ospf
  → Should show multiple paths to each neighbor (direct + alternate). If only one path exists, not full-mesh.

Step 3: Did OSPF reconverge?
  show ip ospf neighbor
  → Should show neighbors via remaining tunnels. If no neighbors, OSPF didn't detect alternate paths.

Step 4: Try the alternate path manually
  ping 3.3.3.3 (remaining neighbor)
  → Should succeed. If this works, indirect path via 3.3.3.3 should be available in routing table.
```

---

## 9. Design Analysis: Field-3 Reasoning

**Why does this field-specific topology matter for distributed consensus?**

In P52+, autonomous zones must tolerate tunnel failures without losing mesh connectivity. This lab proves that with a full-mesh topology and OSPF-based consensus, a single tunnel failure doesn't partition the network.

The key insight: **Consensus isn't binary (all agree or none agree). Consensus in this context means a quorum (2 out of 3 neighbors) agrees on routes.** If one tunnel is Byzantine (always down), the other two nodes can still route to each other via alternate paths.

---

## 10. Real-World Parallel: Haiti Deployment Phase

**P52+ Scale Phase — Mesh Resilience**

In P52+, each zone has 10–50+ hotspots in a partial or full-mesh topology. A single tunnel failure (compromised router, cable cut, RF interference) must not break zone connectivity. This lab validates the architectural assumption.

---

## 11. Stretch Goals: Advanced Proof Obligations

1. **Byzantine tunnel behavior:** Manually craft a forged OSPF update claiming Tunnel1 has metric 10 (extremely good) even though it's actually down. Verify the other routers reject this forged update and maintain consensus.

2. **Scale to 5 routers:** Create a full-mesh of 5 routers (10 tunnels). Simulate 1 router going offline. Verify the remaining 4 maintain quorum and mesh connectivity.

3. **Latency-based consensus:** Instead of binary tunnel up/down, use RTT as a metric. Tunnels with RTT > 100ms are deprioritized. Verify convergence still works.

---

## 12. Self-Assessment (Field-3 BSL)

```
BSL-0 AWARENESS      - You've read this lab once. You couldn't replicate it.
BSL-1 LAB CAPABLE    - You completed this lab with the manual open; 3-router mesh worked.
BSL-2 OFFLINE        - You could repeat this lab with the manual, no internet.
BSL-3 RECOVERABLE    - You could rebuild this lab from the topology diagram; given mesh failure scenarios, 
                        you'd know to test quorum resilience.
BSL-4 MAINTAINABLE   - You could extend this to 5 routers and still ensure quorum-based consensus.
BSL-5 TEACHABLE      - You could teach why full-mesh consensus is more resilient than hub-and-spoke, 
                        using this lab as proof.

Target BSL for this lab: 3–4
```

---

**Push this file via Python payload JSON to RedjiJB-Labs/Day-53-Field-3-Lab.md**
