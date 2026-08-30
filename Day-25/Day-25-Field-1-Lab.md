# Day 25 Field 1 Lab — EIGRP Offline Operation with NVRAM Persistence

**Field Focus:**      Field 1: Black Start Systems
**Core Proof Obligation:** EIGRP topology remains operable offline; configuration persists across power cycles without external resources
**Haiti Deployment Phase:** P38 pilot (dcentral-core, offline-capable mesh)
**Estimated Time:**   90 minutes
**Difficulty:**       Intermediate
**Relationship to Base Lab:** Same EIGRP protocol; topology removes external dependencies (DNS, NTP, external logging)

---

## 1. Business Context (Field-Specific Framing)

The Day 25 base lab assumes continuous internet connectivity and external management infrastructure (syslog, NTP, external DNS). This variant removes all external dependencies: EIGRP routing must work offline, configurations must survive power-cycle via NVRAM persistence, and every router must achieve quorum and route discovery from a cold start with zero external input. This proves the Black Start layer (BSL-3) for enterprise topology design in isolated environments like Haiti's P38 pilot.

---

## 2. Topology Diagram (Field-Specific Modifications)

```
[FIELD-1 VARIANT: Offline EIGRP with Local Services]

        R1 (hub) — Local config storage (NVRAM + backup)
       /        \
      /          \
    R2            R3 — Local time sync (loopback-based NTP simulation)
      \        /
       \      /
        R4 — Local DNS cache for loopback names
        |
       SW1 — PC1 (no external gateway, offline-only)

Key differences from base lab:
- All routers use NVRAM (copy run start) for persistent config storage
- No external NTP/DNS dependency; routers use loopback addresses for identification
- Cold-start recovery procedure: power-cycle all routers, verify EIGRP converges without manual intervention
- No syslog, all debugging via local "show" commands
```

---

## 3. IP Addressing Plan (Field-Specific Annotations)

Identical to Day 25 base lab. Annotations focus on offline survivability:

| Segment | Network | Sizing Reason |
|---|---|---|
| R1–R2 | 10.0.12.0 /30 | Point-to-point, no DHCP needed |
| R1–R3 | 10.0.13.0 /30 | Static addressing mandatory (no DHCP server in this variant) |
| R2–R4 | 10.0.24.0 /30 | Loopback IDs (1.1.1.1, 2.2.2.2, etc.) serve as router identifiers; no external DNS needed |
| R3–R4 | 10.0.34.0 /30 | All addresses deliberately chosen for human memorization (10.0.x.y pattern) |
| R4 LAN | 192.168.4.0 /24 | Sized for growth; no DHCP server required, all hosts use static IPs |
| Loopbacks | 1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4 /32 | Serve as stable router identifiers in offline environment |

---

## 4. Configuration (Field-Specific Optimizations)

Same EIGRP commands as Day 25, plus explicit NVRAM persistence and offline-safe design:

```cisco
! R1
hostname R1
interface g0/0
 ip address 10.0.12.1 255.255.255.252
 no shutdown
interface f1/0
 ip address 10.0.13.1 255.255.255.252
 no shutdown
interface loopback0
 ip address 1.1.1.1 255.255.255.255
 no shutdown
!
! EIGRP configuration (offline-safe: no dependencies on external timers)
router eigrp 100
 no auto-summary
 network 10.0.0.0
 passive-interface loopback0
 ! Explanation: Every loopback is passive (no EIGRP hellos wasted).
 ! No external management services configured; routing is self-contained.
!
! CRITICAL FOR FIELD-1: Save config to NVRAM immediately after any change
! (Do this manually after verifying, or use EEM for automation)
end
copy run start
! Explanation: Persists running config to startup-config in NVRAM.
! On next power cycle, router boots with identical EIGRP config,
! avoiding manual re-entry in offline environment.
```

**Field-1 specific notes:**
- No `logging` statements (no external syslog server in offline environment)
- No `ntp server` statements (loopback IPs serve as identifiers; no absolute time sync needed)
- No `ip name-server` statements (DNS cached locally, or operators use IP addresses directly)
- All interface addresses static (no DHCP client configuration)

---

## 5. Field-Specific Verification Steps

These verify **offline operation and cold-start recovery**, not just routing correctness:

### 5.1 Pre-Failure Baseline
```
1. On each router, save config to NVRAM:
   R1# copy run start
   Destination filename [startup-config]?
   [confirm]
   ! Record: All four routers have configs saved

2. Verify EIGRP neighbors and routing table:
   R1# show ip eigrp neighbors
   R1# show ip route
   ! Record: All neighbors present, all routes in table

3. Test offline LAN connectivity (ping R4 LAN from R1):
   R1# ping 192.168.4.1
   ! Record: Success (proof that routing works before cold-start)
```

### 5.2 Simulated Cold-Start (Power Cycle)
```
4. Power-cycle all four routers simultaneously (unplug + wait 30 seconds):
   ! Simulate a site-wide power event or emergency shutdown/restart

5. Wait 2 minutes for routers to boot and EIGRP to converge

6. Verify EIGRP converged without manual intervention:
   R1# show ip eigrp neighbors
   R1# show ip route | include 192.168.4.0
   ! Proof obligation PASS: Neighbors present, R4 LAN route reachable
   ! Proof obligation FAIL: Missing neighbors or routes → config not persisted or EIGRP failed to re-converge
```

### 5.3 Offline Reachability Test
```
7. Unplug ISP/external gateway (simulate total Internet loss):
   ! Verify EIGRP routes still work between internal routers

8. Test internal LAN-to-LAN connectivity:
   R1# ping 192.168.4.1 (R4's LAN)
   R2# ping 192.168.4.1 (same LAN, via R4)
   ! Proof obligation: All internal routes work offline

9. Attempt to reach non-existent external host:
   R1# ping 8.8.8.8
   % Unroutable; no external route
   ! Expected: No external routes; internal-only routing confirmed
```

### 5.4 Repeated Cold-Start (Prove Reliability)
```
10. Power-cycle all routers 3 more times (total 4 cold-starts)
    Record convergence time each cycle:
    - Cycle 1: ____ seconds to convergence
    - Cycle 2: ____ seconds to convergence
    - Cycle 3: ____ seconds to convergence
    - Cycle 4: ____ seconds to convergence

    Proof obligation PASS: Convergence time consistent across cycles (±5 seconds)
    Proof obligation FAIL: Convergence time degrades or routers fail to form neighbors
```

---

## 6. Expected Output Gallery (Field-1 Specific)

### Output 1: After first cold-start (T=2 min)
```
R1# show ip eigrp neighbors
H   Address          Interface       Hold   Uptime   SRTT   RTO  Q  Seq
0   10.0.12.2        Gi0/0            12    00:02:01   12    60  0  2
1   10.0.13.2        Fa1/0            14    00:01:58   14    70  0  2

! Note: Uptime shows ~2 minutes since boot, confirming EIGRP converged after power-cycle
```

### Output 2: Routing table after offline cold-start
```
R1# show ip route
Codes: C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type type 2

Gateway of last resort is not set

D    192.168.4.0/24 [90/2681856] via 10.0.12.2, 00:02:01, GigabitEthernet0/0
                    [90/2681856] via 10.0.13.2, 00:01:59, FastEthernet1/0

! Note: Both paths to R4 LAN present; EIGRP varianc working post-cold-start
```

### Output 3: NVRAM persistence verification
```
R1# show startup-config | include router eigrp
router eigrp 100
  no auto-summary
  network 10.0.0.0
  passive-interface loopback0

! Confirms: Startup-config matches running-config; will survive next power-cycle
```

---

## 7. Common Field-1 Mistakes

1. **Forgetting to `copy run start` after config changes** → router boots with old config or factory defaults
2. **Configuring external NTP/DNS that's unavailable offline** → router gets stuck waiting for external services that never respond
3. **Enabling logging to an external syslog server without a local fallback** → startup fails if syslog is unreachable
4. **Using DHCP for router interfaces** → no IP addresses at cold-start, EIGRP can't form adjacencies
5. **Configuring `ip helper-address` for DHCP relay without a local DHCP server** → requests timeout, users can't get IPs
6. **Not verifying config persistence across a power-cycle before declaring Field-1 success** → untested assumptions lead to failures

---

## 8. Troubleshooting by Field (Diagnostic Method)

**Problem: "After power-cycle, routers have no EIGRP neighbors"**

```
Step 1: Did this router boot at all?
  show version | include uptime
  → If uptime < 5 min, router just rebooted; wait for EIGRP to converge

Step 2: Is the startup-config persistent?
  show startup-config | include router eigrp
  → If absent, config was never saved to NVRAM; use "copy run start" now

Step 3: Are interfaces up after boot?
  show ip interface brief
  → If down, check for startup-script issues or missing "no shutdown" commands

Step 4: Is EIGRP process running?
  show ip eigrp neighbors
  → If empty, check "show ip protocols" to confirm EIGRP is enabled

Step 5: Is EIGRP advertising networks?
  show ip protocols | include Networks
  → If no networks listed, "network 10.0.0.0" statement missing from startup-config
```

**Problem: "Offline routing works, but takes too long after cold-start"**

```
Step 1: How long from boot to first EIGRP neighbor seen?
  show log | grep EIGRP (if syslog present) or manual timing during next cold-start

Step 2: Is there a startup script that's delaying router readiness?
  show run | include startup-script or boot sequence issues

Step 3: Are there interface startup issues (hardware detection delay)?
  ! Some routers take extra time to detect serial or Fast Ethernet interfaces
  → Check interface status after boot; if any are in "up/down" state, wait for stabilization
```

---

## 9. Design Analysis: Field-1 Reasoning

This topology proves offline autonomy is achievable at EIGRP scale without sacrificing operational visibility (local show commands still work). Every critical function (routing, identification via loopbacks, configuration persistence) operates independently offline, validating that the topology can survive both network isolation and power-management constraints. This unblocks Black Start (BSL-3) for enterprise routing designs, proving the hypothesis: **"network autonomy is achievable at EIGRP scale without external infrastructure dependency."**

In Haiti's P38 pilot, dcentral-core nodes must boot and reach quorum without external infrastructure. This lab validates the architectural assumptions: EIGRP routers can recover from power loss, persist configuration across boot cycles, and reestablish full routing connectivity without operator intervention or external services.

---

## 10. Real-World Parallel: Haiti Deployment Phase

**P38 Haiti Pilot (50–100 nodes, offline-capable core):** D-Central's core topology must operate offline in the event of total internet loss. This lab proves the feasibility: a minimal, offline-capable EIGRP topology can boot from cold start, establish its own neighbor relationships, and restore full routing without any external management plane. Before P38 deployment, these cold-start recovery benchmarks must be validated in field trials simulating real power-loss scenarios in Haiti's electrical grid environment (frequent blackouts, uneven generator coverage). This lab provides the baseline: if cold-start recovery takes >5 minutes in a 4-router lab, scaling to 50+ nodes will only be slower — the field-1 variant sets the upper bound on acceptable recovery time.

---

## 11. Stretch Goals: Advanced Proof Obligations

- Prove using symbolic execution that cold-boot recovery terminates in finite time (all EIGRP routers will eventually form neighbors)
- Verify NVRAM consistency across multiple write cycles (no corruption of stored config after 10+ power-cycles)
- Formal verification of power-failure recovery sequence: no state corruption, config persistence survives worst-case power-loss scenario
- Measure cold-start convergence time as a function of router count (4 → 8 → 16 routers) and prove O(log n) or better scaling

---

## 12. Self-Assessment (Field-1 BSL Scale)

- **BSL-0 AWARENESS** — You've read this lab once; you couldn't replicate it.
- **BSL-1 LAB CAPABLE** — You completed this lab following the manual step-by-step.
- **BSL-2 OFFLINE** — You could repeat this lab with the manual present but no internet.
- **BSL-3 RECOVERABLE** — You could rebuild this offline EIGRP topology from the topology diagram only; given Field-1's proof obligation, you'd know what to test (cold-start recovery, NVRAM persistence, no external dependencies).
- **BSL-4 MAINTAINABLE** — You could modify this topology (add more routers, change subnets) while preserving offline operation and cold-start recovery.
- **BSL-5 TEACHABLE** — You could teach this lab to someone else, correctly explaining why each offline-specific design choice (NVRAM persistence, loopback identification, no external services) matters for Black Start.

**Target BSL for Field-1:** BSL-2 to BSL-3 (hands-on verification of offline operation required).

---

## References

- [RFC 7868 EIGRP](https://tools.ietf.org/html/rfc7868) — Cisco's EIGRP protocol specification
- Day 25 Base Lab Manual — "EIGRP Multi-Autonomous System, Auto-Summary, and Unequal-Cost Load Balancing"
- RESEARCH-LAB-STANDARD.md — Field-specific lab variant methodology
