# Day 25 Field 3 Lab — EIGRP Distributed Mesh with Byzantine Neighbor Detection

**Field Focus:**      Field 3: Distributed Systems (DePIN)
**Core Proof Obligation:** EIGRP full mesh with no hub maintains routing when Byzantine nodes drop 5% of EIGRP packets
**Haiti Deployment Phase:** P38 pilot (distributed consensus, 50+ nodes)
**Estimated Time:**   120 minutes
**Difficulty:**       Advanced
**Relationship to Base Lab:** Same EIGRP protocol; topology restructured as full mesh (no hub), with Byzantine neighbor simulation

---

## 1. Business Context (Field-Specific Framing)

The Day 25 base lab uses a hub-and-spoke topology where R1 is central. This creates a single point of failure: if R1 goes down, R2 and R3 lose direct contact. This variant restructures as a full mesh where every router connects to every other — no hub, no single point of failure. Additionally, it introduces Byzantine neighbor detection: one router (simulated to drop 5% of EIGRP hellos) is trusted to still participate, but the topology must detect and tolerate this degraded link without removing the Byzantine neighbor entirely. This proves the distributed-consensus layer (no centralized authority, Byzantine fault tolerance) needed for the P38 pilot's DePIN governance model.

---

## 2. Topology Diagram (Field-Specific Modifications)

```
[FIELD-3 VARIANT: Fully Meshed, Byzantine-Resilient EIGRP]

    R1 ←→ R2
    ↕   ↙ ↕ ↗
    R3 ←→ R4

Full mesh: Every router connects to every other.
- R1 ↔ R2 (direct)
- R1 ↔ R3 (direct)
- R1 ↔ R4 (direct)
- R2 ↔ R3 (direct)
- R2 ↔ R4 (direct)
- R3 ↔ R4 (direct)

Total: 6 point-to-point links (vs. 4 in base lab's partial mesh)

Byzantine simulation:
- R3 is configured to drop 5% of EIGRP hello packets (simulates degraded link)
- R1, R2, R4 must detect this is a "bad but not dead" neighbor
- EIGRP should still prefer R3's direct path over multi-hop alternatives (if metrics favor it)
- If R3's Byzantine behavior worsens (e.g., 50% loss), EIGRP should converge to bypass R3 entirely

Key differences from base lab:
- Fully connected mesh (6 links vs 4)
- No hub; any router can be primary gateway to LAN
- Byzantine neighbor detection and metric weighting
- Voting/consensus: 3-of-4 routers must agree on R4 LAN reachability
```

---

## 3. IP Addressing Plan (Field-Specific Annotations)

Extended to cover 6 point-to-point links:

| Segment | Network | Sizing Reason |
|---|---|---|
| R1–R2 | 10.0.12.0 /30 | Direct link; low-latency, high-reliability (primary path) |
| R1–R3 | 10.0.13.0 /30 | Direct link; Byzantine node; will be degraded |
| R1–R4 | 10.0.14.0 /30 | Direct link to LAN edge; backup path |
| R2–R3 | 10.0.23.0 /30 | Direct link; medium reliability |
| R2–R4 | 10.0.24.0 /30 | Direct link to LAN edge; alternate path |
| R3–R4 | 10.0.34.0 /30 | Direct link; Byzantine node R3 involved |
| R4 LAN | 192.168.4.0 /24 | Convergence target; should be reachable via multiple paths |

All routers still use /32 loopbacks (1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4) as router IDs.

---

## 4. Configuration (Field-Specific Optimizations)

Base EIGRP with metric weighting for Byzantine neighbor:

```cisco
! R1
router eigrp 100
 no auto-summary
 network 10.0.0.0
 network 10.0.14.0 0.0.0.3
 passive-interface loopback0
 variance 3
 ! Explanation: variance 3 allows EIGRP to use degraded (Byzantine) paths
 ! if needed, as long as they're within 3x the best metric.

! Add manual bandwidth tuning to penalize Byzantine link (R1↔R3)
interface f1/1
 description R1 to R3 (Byzantine neighbor)
 ip address 10.0.13.1 255.255.255.252
 no shutdown
 bandwidth 64
 ! Explanation: Reduce bandwidth from typical 100 Mbps to 64 kbps,
 ! making the R1→R3 direct path less attractive than R1→R2→R3
 ! This forces EIGRP to prefer multi-hop routes away from the Byzantine link

! R2
router eigrp 100
 no auto-summary
 network 10.0.0.0
 network 10.0.14.0 0.0.0.3
 passive-interface loopback0
 variance 3

! R3 (BYZANTINE NODE)
interface f1/1
 description R3 to R1 (Byzantine: drops 5% of packets)
 ip address 10.0.13.2 255.255.255.252
 no shutdown
 ! In GNS3, simulate Byzantine behavior via "delay" + random packet loss
 ! Set 5% loss on this interface to simulate Byzantine hello dropping

router eigrp 100
 no auto-summary
 network 10.0.0.0
 network 10.0.14.0 0.0.0.3
 passive-interface loopback0
 variance 3

! R4
router eigrp 100
 no auto-summary
 network 10.0.0.0
 network 192.168.4.0 0.0.0.255
 passive-interface loopback0
 variance 3
```

---

## 5. Field-Specific Verification Steps

These verify **Byzantine resilience and distributed consensus**:

### 5.1 Baseline: Full Mesh Without Byzantine Interference
```
1. Verify all 6 links are up and EIGRP neighbors formed:
   R1# show ip eigrp neighbors
   ! Expected: 3 neighbors (R2, R3, R4)
   R1# show ip eigrp topology | include 192.168.4.0
   ! Expected: Multiple paths to R4 LAN from different neighbors

2. Baseline path costs (before Byzantine simulation):
   R1# show ip route 192.168.4.0
   ! Record: All paths and their metrics for comparison
```

### 5.2 Introduce Byzantine Behavior (5% Hello Loss on R1↔R3)
```
3. In GNS3, configure R1↔R3 link with 5% packet loss:
   [GNS3] R1–R3 link properties: delay 0ms, loss 5%
   ! Simulates R3 as Byzantine: hello packets occasionally dropped

4. Monitor R1's perception of R3 neighbor:
   R1# show ip eigrp neighbors (repeat every 10 seconds for 1 minute)
   ! Expected: R3 neighbor remains CONNECTED (not DELETED)
   !           Dead Time will fluctuate (5% loss causes irregular hellos)

5. Record R1's routing to R4 LAN:
   R1# show ip route 192.168.4.0
   ! Should still show multiple paths; R3 path may have higher metric due to hello loss
```

### 5.3 EIGRP Metric Consensus (Voting Test)
```
6. Check routing table on all routers:
   R1# show ip route 192.168.4.0
   R2# show ip route 192.168.4.0
   R3# show ip route 192.168.4.0 (R3 itself, as Byzantine node)
   R4# show ip route 192.168.4.0 (R4 LAN edge; should show loopback)

   Proof obligation: All 4 routers agree on how to reach 192.168.4.0
   (3-of-4 agreement acceptable if R3 is isolated by Byzantine detection)
```

### 5.4 Byzantine Escalation Test
```
7. Increase Byzantine behavior: R1↔R3 loss to 50% (instead of 5%):
   [GNS3] R1–R3 link: loss 50%
   ! Simulate a severely degraded link

8. Monitor neighbor formation:
   R1# show ip eigrp neighbors (repeat every 10 seconds for 2 minutes)
   ! Expected: R3 may eventually be DELETED (3 missed hellos in a row)

   Proof obligation PASS: R3 is dropped if Byzantine behavior is too severe
   Proof obligation FAIL: Neighbor remains CONNECTED despite 50% loss
```

### 5.5 Mesh Redundancy Proof (Bypass Byzantine Node)
```
9. With R3 still at 50% loss (or completely removed), verify R4 LAN is still reachable:
   R1# ping 192.168.4.1 (repeat count 10)

   Expected paths (if R3 removed):
   - R1→R2→R4→LAN
   - R1→R4→LAN (direct, if available)

   Proof obligation PASS: 100% ping success despite R3's Byzantine state
   Proof obligation FAIL: Ping fails; topology has single-point-of-failure dependency on R3
```

### 5.6 Restore and Rebalance
```
10. Restore R1↔R3 to normal (0% loss):
    [GNS3] R1–R3 link: loss 0%

11. Wait 30 seconds for EIGRP to re-converge

12. Verify R3 is re-elected as neighbor:
    R1# show ip eigrp neighbors | include 10.0.13
    ! Expected: R3 neighbor re-appears, Dead Time normalizes

13. Check that R3's path metrics improve (no longer penalized):
    R1# show ip route 192.168.4.0
    ! Expected: R1→R3→R4 path metric improves, becomes competitive again
```

---

## 6. Expected Output Gallery (Field-3 Specific)

### Output 1: Full-mesh EIGRP neighbors (baseline)
```
R1# show ip eigrp neighbors
H   Address          Interface       Hold   Uptime   SRTT   RTO  Q  Seq
0   10.0.12.2        Gi0/0            12    00:05:23    8    48  0  18
1   10.0.13.2        Fa1/1            10    00:05:20   12    72  0  17
2   10.0.14.2        Fa1/0            14    00:05:22   10    60  0  16

! Note: 3 neighbors from full mesh (R2, R3, R4); R1 is hub-like in topology
! but EIGRP sees it as equal peer to all three
```

### Output 2: Multiple paths to R4 LAN (mesh redundancy)
```
R1# show ip route 192.168.4.0
Routing entry for 192.168.4.0/24
  Known via "eigrp 100", distance 90, metric 2681856
  Maximum path variance: 3
  Routing Descriptor Blocks:
  * 10.0.14.254, from 10.0.14.2, via FastEthernet1/0  (direct R1→R4)
      Route metric 2681856, traffic share count 4
  10.0.12.2, from 10.0.12.2, via GigabitEthernet0/0  (R1→R2→R4)
      Route metric 2681856, traffic share count 4
  10.0.13.2, from 10.0.13.2, via FastEthernet1/1  (R1→R3→R4, Byzantine link)
      Route metric 5363712, traffic share count 2

! Note: 3 paths active; R1→R3→R4 has higher metric (penalized by low bandwidth)
! but still active (variance 3 allows it); traffic share reflects quality
```

### Output 3: Byzantine link degraded (dead timer fluctuating)
```
R1# show ip eigrp neighbors
H   Address          Interface       Hold   Uptime   SRTT   RTO  Q  Seq
0   10.0.12.2        Gi0/0            13    00:08:45    8    48  0  24
1   10.0.13.2        Fa1/1             7    00:08:42   22    132  0  23  ← Dead Time LOW due to hello loss
2   10.0.14.2        Fa1/0            14    00:08:44   10    60  0  22

! Note: R3 neighbor (10.0.13.2) has Dead Time = 7 (vs. 12+ for others)
! Indicates hellos are being missed; Byzantine behavior detected but tolerated
```

### Output 4: After R3 removed (50% loss unacceptable)
```
R1# show ip eigrp neighbors
H   Address          Interface       Hold   Uptime   SRTT   RTO  Q  Seq
0   10.0.12.2        Gi0/0            13    00:10:02    8    48  0  31
1   10.0.14.2        Fa1/0            14    00:10:01   10    60  0  30

! Note: R3 neighbor disappeared; EIGRP removed it after 3 missed hellos
! Only 2 neighbors remain; R4 LAN still reachable via R2 or direct link
```

---

## 7. Common Field-3 Mistakes

1. **Not creating all 6 mesh links** — topology must be fully connected, or Byzantine node will become single point of failure
2. **Setting Byzantine loss too high initially** → neighbor drops immediately, no gradual degradation
3. **Not configuring variance high enough** → if variance 1, degraded paths are dropped even with only 5% loss
4. **Assuming bandwidth reduction alone will handle Byzantine node** → EIGRP still elects Byzantine neighbor as successor if metrics are identical; need explicit penalty (bandwidth tuning + loss simulation)
5. **Forgetting to verify "3-of-4 consensus"** → the topology has 4 routers; if 1 is Byzantine, proof obligation requires 3 to agree on routing to R4 LAN
6. **Measuring Byzantine resilience without failover test** → proving "Byzantine node is tolerated at 5% loss" is only half the proof; also prove "Byzantine node is abandoned at 50% loss"

---

## 8. Troubleshooting by Field (Diagnostic Method)

**Problem: "R3 neighbor drops immediately; Byzantine tolerance failed"**

```
Step 1: Is the Byzantine loss percentage applied correctly?
  [GNS3] Right-click R1↔R3 link → verify "5% loss" is configured
  → If loss is 50% or higher, neighbor will drop; reduce to ≤ 5%

Step 2: Are other links interfering?
  Show ip eigrp neighbors (check all neighbors' Dead Time values)
  → If all neighbors' Dead Times are very low, system-wide latency is too high

Step 3: Is EIGRP hold timer too short?
  show ip protocols | include Timers
  → If default hold is 40s, neighbors shouldn't drop from 5% loss
  → If hold is 15s (aggressive), 5% loss might be marginal; increase Byzantine loss tolerance test

Step 4: Is R3 still advertising routes despite low Dead Time?
  show ip eigrp topology (check for R3-originated routes)
  → If R3 is DELETED from neighbors, it should still be reachable via EIGRP topology
  → If R3 routes disappear, topology has no backup path (single-point-of-failure)
```

**Problem: "Byzantine node cannot be removed; still has 3-of-4 consensus"**

```
Step 1: Is convergence too slow?
  Increase Byzantine loss to 50% and wait 2 minutes for EIGRP to re-run DUAL queries

Step 2: Is variance preventing removal?
  show ip protocols | include Variance
  → If variance is very high (e.g., 10), degraded paths stay active; reduce to 3 or less

Step 3: Is there a static route still pointing toward R3?
  show ip route static
  → If any static routes exist, EIGRP can't override them; remove or check for manual intervention

Step 4: Are EIGRP queries actually reaching other routers?
  debug eigrp packet (limited to 10s) — watch for queries to R2/R4 asking for alternate path to R4 LAN
  → If no queries seen, DUAL algorithm may not be running; verify "router eigrp 100" is active
```

---

## 9. Design Analysis: Field-3 Reasoning

This variant proves Byzantine resilience is achievable in a distributed, fully-meshed topology without centralized arbitration. Every router can independently calculate metrics to any destination; EIGRP's DUAL algorithm ensures loop-free paths even when one router is degraded. The key insight: a full mesh gives N(N-1)/2 paths for N routers; with N=4, there are 6 possible links, so losing any one link (or having one Byzantine node) never partitions the topology. This validates the DePIN hypothesis: "distributed routing can survive Byzantine neighbor without requiring centralized validation."

---

## 10. Real-World Parallel: Haiti Deployment Phase

**P38 Haiti Pilot (50+ nodes, distributed consensus):** D-Central's governance layer (who is a validator, who controls gateways) must work across 50+ geographically distributed nodes with no central authority. This lab proves a full-mesh EIGRP topology can tolerate some nodes being Byzantine (or simply poorly connected) without losing global consensus on reachability. With 50 nodes, a full mesh becomes impractical (2,450 links), but the principle scales: each node connects to a subset of neighbors, and Byzantine resilience is proved at local level (each node checks 3+ neighbors for consensus). This lab validates the smaller-scale proof; field trials with larger topologies will confirm scaling.

---

## 11. Stretch Goals: Advanced Proof Obligations

- Formally prove that full-mesh EIGRP topology with 4 nodes can tolerate 1 Byzantine node (mathematical proof of connectivity)
- Extend to N nodes: prove that full mesh can tolerate up to (N-1)/2 Byzantine nodes without partitioning
- Implement consensus voting: 3-of-4 nodes must agree on path before traffic is routed (add voting layer on top of EIGRP)
- Measure Byzantine detection latency: how many missed hellos until EIGRP declares neighbor down? Can this be bounded?

---

## 12. Self-Assessment (Field-3 BSL Scale)

- **BSL-0 AWARENESS** — You've read this lab once; you don't understand full-mesh topology.
- **BSL-1 LAB CAPABLE** — You completed this lab following the manual, with 6 mesh links and Byzantine simulation.
- **BSL-2 OFFLINE** — You could repeat this lab with manual + GNS3, creating full mesh and configuring Byzantine loss.
- **BSL-3 RECOVERABLE** — You could rebuild this topology from scratch and design your own Byzantine detection mechanism.
- **BSL-4 MAINTAINABLE** — You could extend this to 5+ nodes (10+ mesh links) and re-prove Byzantine resilience.
- **BSL-5 TEACHABLE** — You could teach this lab to others and explain why full-mesh + Byzantine tolerance matters for DePIN governance, how to generalize this to large distributed systems.

**Target BSL for Field-3:** BSL-2 to BSL-3 (hands-on mesh creation and Byzantine tolerance measurement required).

---

## References

- [RFC 7868 EIGRP](https://tools.ietf.org/html/rfc7868)
- [Practical Byzantine Fault Tolerance (Castro & Liskov, 1999)](https://pmg.csail.mit.edu/papers/osdi99.pdf)
- Day 25 Base Lab Manual
- RESEARCH-LAB-STANDARD.md
