# Day 25 Field 2 Lab — EIGRP Unequal-Cost Load Balancing Under Geomagnetic Stress

**Field Focus:**      Field 2: Geomagnetic Resilience
**Core Proof Obligation:** EIGRP converges and maintains load balancing <60s under geomagnetic stress (20% jitter, 5% loss)
**Haiti Deployment Phase:** P38 pilot (mesh-connectivity under space-weather stress)
**Estimated Time:**   120 minutes
**Difficulty:**       Advanced
**Relationship to Base Lab:** Same EIGRP protocol; topology adds stress injection and aggressive timers to test convergence under realistic geomagnetic conditions

---

## 1. Business Context (Field-Specific Framing)

Naive EIGRP deployment converges in 10–30 seconds after link loss under ideal conditions. But production networks in geographically distributed areas (especially Haiti's region, subject to frequent space-weather events) experience geomagnetic storms that cause up to 20% latency jitter and 5% packet loss on long-distance links. This lab proves that EIGRP's unequal-cost load balancing can maintain both convergence <60s and traffic distribution under these stress conditions, unblocking the P38 pilot deployment of mesh-connectivity in geomagnetically resilient configurations.

---

## 2. Topology Diagram (Field-Specific Modifications)

```
[FIELD-2 VARIANT: Geomagnetic Stress Testing]

        R1 (hub)
       /        \
      /          \
    R2            R3
      \        /
       \      /
        R4 ← [JITTER INJECTOR: ±20% latency, ±5% packet loss]
        |
       SW1 — PC1 (continuous ping to measure convergence time)

Stress injection points:
- All R1↔R2, R1↔R3, R2↔R4, R3↔R4 links: Add 20ms base latency + ±20% variance (16–24ms jitter)
- All links: Add 5% random packet loss
- Simulate 3 sudden link failures (R1←→R2, then recover; R1←→R3, then recover)
- Measure convergence time from failure to "ping succeeds to R4 LAN via alternate path"

Key differences from base lab:
- Aggressive EIGRP timers: hello 5s, dead 15s (vs base default 10s/40s)
- Stress injection via GNS3 "delay" and "loss" on each link
- Repeated failure/recovery cycles to measure convergence consistency
```

---

## 3. IP Addressing Plan (Field-Specific Annotations)

Identical to Day 25 base lab. Annotations focus on geomagnetic resilience:

| Segment | Network | Sizing Reason |
|---|---|---|
| R1–R2 | 10.0.12.0 /30 | Path 1: Primary via Gigabit (lower latency baseline) |
| R1–R3 | 10.0.13.0 /30 | Path 2: Secondary via FastEthernet (higher latency, stress focus) |
| R2–R4 | 10.0.24.0 /30 | Backup mesh path; stress tests rapid convergence via alternate route |
| R3–R4 | 10.0.34.0 /30 | Backup mesh path; stress tests rapid convergence via alternate route |
| R4 LAN | 192.168.4.0 /24 | Convergence target: verify R1 can reach R4 LAN via both paths under stress |

---

## 4. Configuration (Field-Specific Optimizations)

Same EIGRP as Day 25, plus aggressive timers to detect failures faster under jitter:

```cisco
! R1
router eigrp 100
 no auto-summary
 network 10.0.0.0
 passive-interface loopback0
 variance 2
 !
 ! FIELD-2 SPECIFIC: Aggressive timers for rapid failure detection under jitter
 ! Explanation: Geomagnetic jitter causes hello packets to arrive irregularly.
 ! Tighter timers (hello 5s vs 10s default, dead 15s vs 40s default) let EIGRP
 ! detect failures faster, proving convergence < 60s even under 20% jitter.
 !
interface g0/0
 ip address 10.0.12.1 255.255.255.252
 no shutdown
 ! Primary path to R2; will be stressed with 20ms latency
interface f1/0
 ip address 10.0.13.1 255.255.255.252
 no shutdown
 ! Backup path to R3; will be stressed with 20ms + 5% jitter + loss

! Apply aggressive timers at interface level (FIELD-2 specific)
! (Note: In GNS3/IOS, timers are usually set globally via "timers basic" in router config, not per-interface)
!
! Alternative approach (more portable):
router eigrp 100
 timers basic 5 15 10 40
 ! Explanation: hello 5s (detect failure in ~15s if 3 hellos missed)
 !             hold 15s (timeout for neighbor if 3 hellos missed)
 !             update 10s (faster route updates under stress)
 !             query 40s (faster query timeout)
```

**Field-2 specific notes:**
- Timers `5 15 10 40` are much tighter than default `10 40 30 120`
- This allows EIGRP to detect link failure and converge to alternate path faster
- Under 20% latency jitter, more aggressive timers might trigger false positives; test empirically

---

## 5. Field-Specific Verification Steps

These verify **convergence time under stress**, not just that routing works:

### 5.1 Baseline (No Stress)
```
1. Verify EIGRP converged normally (no stress injected yet):
   R1# show ip route
   ! Record: Both paths to 192.168.4.0/24 present

2. Baseline ping test (measure latency without stress):
   R1# ping 192.168.4.1
   ! Record: Reply time (should be <5ms without stress)
```

### 5.2 Apply Geomagnetic Stress
```
3. In GNS3 network graph, add delay and loss to all links:
   - R1←→R2: Add 20ms delay, 5% loss
   - R1←→R3: Add 20ms delay, 5% loss
   - R2←→R4: Add 20ms delay, 5% loss
   - R3←→R4: Add 20ms delay, 5% loss
   ! (Simulates geomagnetic storm affecting all RF links equally)

4. Verify stress applied; re-run ping:
   R1# ping 192.168.4.1 (repeat count 10)
   ! Record: Latency ~20ms, some packet loss; convergence still works
```

### 5.3 Simulate Link Failure Under Stress
```
5. Shut down the primary path (R1←→R2):
   [GNS3] Disconnect R1←→R2 link (simulates RF link loss during geomagnetic event)
   ! Record: Timestamp T0 (link down moment)

6. Start continuous ping from R1 to R4 LAN (before step 5):
   R1# ping 192.168.4.1 -c 100 (Linux) or ping -t 192.168.4.1 (Windows)
   ! Note which ping number fails (link loss) and which succeeds again (failover)

7. Monitor EIGRP convergence:
   R1# show ip eigrp neighbors (watch for R2 neighbor to disappear)
   R1# show ip route 192.168.4.0 (watch for only R3 path to remain, then both again)

8. Record convergence time:
   - T_failure: Ping from step 6 starts failing (primary link down)
   - T_convergence: First successful ping via alternate path (R1→R3→R4 path active)
   - Convergence time = T_convergence − T_failure

   Proof obligation PASS: Convergence time < 60 seconds
   Proof obligation FAIL: Convergence time ≥ 60 seconds OR connectivity lost
```

### 5.4 Verify Load Balancing Under Stress
```
9. Restore the primary path (R1←→R2):
   [GNS3] Reconnect R1←→R2 link
   ! Wait for R2 neighbor to re-form

10. Check that both paths are active and load-balancing:
    R1# show ip route 192.168.4.0
    ! Should show both 10.0.12.2 and 10.0.13.2 with variance 2

11. Measure traffic distribution (manual count of ping replies via each path):
    ! Run 100 pings; count successes via R2 vs. R3
    ! With variance 2, expect roughly 2:1 traffic ratio (better path gets 2/3)

    Proof obligation PASS: Traffic ratio within expected variance range
    Proof obligation FAIL: Traffic heavily skewed or one path missing
```

### 5.5 Repeated Convergence Test
```
12. Repeat steps 5–8 four more times (total 5 convergence measurements):
    Convergence time cycle 1: ____ seconds
    Convergence time cycle 2: ____ seconds
    Convergence time cycle 3: ____ seconds
    Convergence time cycle 4: ____ seconds
    Convergence time cycle 5: ____ seconds

    Average: ____ seconds
    Min/Max: ____ / ____ seconds

    Proof obligation PASS: Average < 60s, consistent across cycles (std dev < 10s)
    Proof obligation FAIL: High variance in convergence time or exceeds 60s
```

---

## 6. Expected Output Gallery (Field-2 Specific)

### Output 1: Under geomagnetic stress (20ms delay, 5% loss)
```
R1# ping 192.168.4.1 -c 20
PING 192.168.4.1 (192.168.4.1) 56(84) bytes of data.
64 bytes from 192.168.4.1: icmp_seq=1 ttl=62 time=24.3 ms
64 bytes from 192.168.4.1: icmp_seq=2 ttl=62 time=23.8 ms
64 bytes from 192.168.4.1: icmp_seq=3 ttl=62 time=25.1 ms
(seq=4 lost due to 5% loss)
64 bytes from 192.168.4.1: icmp_seq=5 ttl=62 time=24.5 ms
...
--- 192.168.4.1 statistics ---
20 packets transmitted, 19 received, 5% packet loss, time 19000ms
rtt min/avg/max/stddev = 23.8/24.3/25.1/0.5 ms

! Note: Latency ~24ms (stress applied), some loss; routing still works
```

### Output 2: After R1←→R2 failure (convergence via R3 path)
```
R1# show ip route 192.168.4.0
Routing entry for 192.168.4.0/24
  Known via "eigrp 100", distance 90, metric 2681856
  Routing Descriptor Blocks:
  * 10.0.13.2, from 10.0.13.2, via FastEthernet1/0
      Route metric 2681856, traffic share count 1

! Note: Only R3 path present; R2 path disappeared (convergence happened)
! Time from shutdown to this output = convergence time
```

### Output 3: After R1←→R2 recovers (dual-path active again)
```
R1# show ip route 192.168.4.0
Routing entry for 192.168.4.0/24
  Known via "eigrp 100", distance 90, metric 2681856
  Maximum path variance: 2
  Routing Descriptor Blocks:
  * 10.0.12.2, from 10.0.12.2, via GigabitEthernet0/0
      Route metric 2681856, traffic share count 2
  10.0.13.2, from 10.0.13.2, via FastEthernet1/0
      Route metric 5363712, traffic share count 1

! Note: Both paths restored; R2 route now preferred (traffic share 2:1)
```

---

## 7. Common Field-2 Mistakes

1. **EIGRP timers too aggressive (hello < 3s)** → false-positives from random jitter cause constant failover thrashing
2. **Not injecting stress uniformly across all links** → asymmetric latency/loss creates artificial routing preferences
3. **Measuring convergence time from "show ip route" change** instead of "ping success" → off-by-significant-margin error
4. **Assuming variance will help if timers fail to detect failure** → variance requires the neighbor to still exist in the topology; if dead-timer expires first, neighbor is removed and variance doesn't matter
5. **Not accounting for gratuitous ARP timeout** → PC's ARP cache may still point to old gateway MAC even after EIGRP converges; full convergence includes ARP refresh (~30s)
6. **Forgetting to disable stress at end of test** → next test inherits stress conditions and baseline measurements become meaningless

---

## 8. Troubleshooting by Field (Diagnostic Method)

**Problem: "Convergence time exceeds 60 seconds under stress"**

```
Step 1: Are hellos arriving at all under 20% jitter?
  debug eigrp packet (limited to 10 seconds)
  → If hello packets are completely lost, jitter is too severe; reduce to 10%

Step 2: Is dead timer expiring too soon?
  show ip eigrp neighbors (check Dead Time column; should decrease gradually)
  → If neighbor disappears after 3-4 hellos, timer is working; check metric calculation

Step 3: Is the alternate path even in the topology?
  show ip eigrp topology (check for "Feasible successors")
  → If no feasible successor exists, second path is not loop-safe; check metrics

Step 4: Is variance high enough?
  show ip protocols | include variance
  → If variance 1, only equal-cost paths install; with asymmetric metrics, need variance ≥ 2

Step 5: What is the actual convergence time?
  Run the test again with timestamp recording (manual clock-watching or GNS3 event log)
  → If actual time is, say, 45s, increase hello interval back toward default (timer too aggressive)
  → If actual time is 120s, aggressive timers may be causing false positives; increase slightly
```

**Problem: "Ping fails during convergence but routing table shows route present"**

```
Step 1: Is it a TTL issue?
  traceroute 192.168.4.1 (check hop count)
  → If any hop shows, IP connectivity exists but endpoint unreachable

Step 2: Is ARP stale?
  R1# show arp 192.168.4.1
  → If MAC doesn't correspond to current active EIGRP neighbor, ARP is stale
  → ARP timeout is typically 4 hours; HSRP-like gratuitous ARP can refresh within 30s

Step 3: Is there a firewall or access-list dropping traffic?
  show ip access-lists (check for deny rules matching 192.168.4.0)
  → Unlikely in this lab, but possible if accidentally configured during stress setup

Step 4: Is the issue transient (only during first few seconds after convergence)?
  Repeat test; if ping succeeds within 5s of convergence, ARP refresh is the bottleneck
  → Record this as "ARP convergence time" separately from "EIGRP convergence time"
```

---

## 9. Design Analysis: Field-2 Reasoning

Geomagnetic storms introduce latency variance and packet loss that standard EIGRP metrics ignore. This design explicitly measures and bounds convergence time under realistic geomagnetic stress, moving from "EIGRP works in labs" to "EIGRP works during space-weather events." This proof unblocks P38 pilot deployment of mesh-connectivity in geographically distributed communities where atmospheric phenomena degrade RF links. By proving convergence < 60s under 20% jitter + 5% loss, we establish operational bounds: if convergence time increases linearly with network size, adding nodes should still stay within acceptable MTTR windows (recovery within business-hour monitoring windows, not multi-hour outages).

---

## 10. Real-World Parallel: Haiti Deployment Phase

**P38 Haiti Pilot (50–100 nodes, geomagnetically resilient mesh):** Mesh-connectivity in the P38 design relies on EIGRP running across 15+ hotspots. Each hotspot experiences varying atmospheric and geomagnetic conditions. This lab proves EIGRP can converge reliably under those conditions. The field-2 variant's stress-test results (convergence time, load-balancing consistency) feed directly into the PoC (Proof-of-Coverage) tuning for Haiti's first island-wide mesh. Before P38 deployment, these convergence-time benchmarks must be validated in field trials with real DSCOVR geomagnetic data, simulating predicted storm intensities during deployment window.

---

## 11. Stretch Goals: Advanced Proof Obligations

- Formal model check EIGRP's convergence logic against a geomagnetic-jitter model (using TLA+ or mCRL2)
- Run convergence-time benchmarks against the actual ESA Swarm geomagnetic-field model, not synthetic jitter
- Prove that no Byzantine neighbor (one that randomly drops 5% of EIGRP packets) can cause convergence time to exceed 60s
- Validate against a 1-year geomagnetic-event dataset from NOAA SWPC; confirm real-world convergence times match lab benchmarks

---

## 12. Self-Assessment (Field-2 BSL Scale)

- **BSL-0 AWARENESS** — You've read this lab once; you couldn't replicate the stress setup.
- **BSL-1 LAB CAPABLE** — You completed this lab following the manual, with stress injection and convergence measurement.
- **BSL-2 OFFLINE** — You could repeat this lab with manual + GNS3 stress simulation, measuring convergence reliably.
- **BSL-3 RECOVERABLE** — You could rebuild this topology from scratch and design your own stress model for "geomagnetic equivalence."
- **BSL-4 MAINTAINABLE** — You could adapt this lab's stress model to test other routing protocols (OSPF, BGP) under the same geomagnetic conditions.
- **BSL-5 TEACHABLE** — You could teach this lab to someone else and explain why geomagnetic stress matters for Haiti deployment, how to quantify "realistic" jitter/loss, and what convergence time is acceptable.

**Target BSL for Field-2:** BSL-2 to BSL-3 (hands-on stress injection and convergence measurement required).

---

## References

- [RFC 7868 EIGRP](https://tools.ietf.org/html/rfc7868)
- [NOAA SWPC Geomagnetic Storm Data](https://www.swpc.noaa.gov/)
- [ESA Swarm Mission Geomagnetic Field Model](https://earth.esa.int/web/guest/missions/esa-operational-earth-missions/swarm)
- Day 25 Base Lab Manual
- RESEARCH-LAB-STANDARD.md
