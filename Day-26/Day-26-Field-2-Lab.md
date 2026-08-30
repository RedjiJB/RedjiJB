# Day 26 Field 2 Lab — OSPF ASBR Under Geomagnetic Stress

**Field Focus:**      Field 2: Geomagnetic Resilience
**Core Proof Obligation:** OSPF ASBR default-route injection converges <60s under geomagnetic stress (jitter, loss)
**Haiti Deployment Phase:** P38 pilot (geomagnetically-resilient default gateway election)
**Estimated Time:**   120 minutes
**Difficulty:**       Advanced
**Relationship to Base Lab:** Same OSPF ASBR protocol; topology adds stress injection and measures default-route propagation convergence

---

## 1. Business Context (Field-Specific Framing)

Naive OSPF ASBR injection converges within 10-30 seconds under ideal conditions. During geomagnetic storms with 20% latency jitter and 5% packet loss, OSPF's slower timers (hello 10s, dead 40s) mean default-route propagation can take 60+ seconds. This variant applies stress and measures convergence time for default-route distribution across the domain, proving R38 pilot gateways remain responsive even under space-weather events.

---

## 2. Topology Diagram

```
[FIELD-2 VARIANT: Geomagnetic Stress on OSPF ASBR]

        R1 (ASBR, stressed links)
       /        \
      [STRESS]  [STRESS]
      /          \
    R2            R3
      \        /
      [STRESS][STRESS]
       \      /
        R4 -- PC1

Stress injection: 20ms latency + ±20% jitter + 5% packet loss on all links
Convergence test: R1 changes default route (e.g., reachability of ISP link)
  → Measure time until R4 sees new default route
```

---

## 3. Configuration

Same Day 26 ASBR config, with aggressive timers:

```cisco
! R1
router ospf 1
 router-id 1.1.1.1
 network 10.0.12.0 0.0.0.3 area 0
 network 10.0.13.0 0.0.0.3 area 0
 passive-interface loopback0
 default-information originate
 timers throttle lsa 100 100 5000
 ! Explanation: Faster LSA generation/throttling for rapid default-route updates
 ! (default is 100/5000/5000 ms; tighter bound accelerates convergence)
 !
 timers throttle spf 100 100 5000
 ! Explanation: SPF calculation throttled less aggressively; faster OSPF convergence
 ! under stress
```

---

## 4. Verification Steps

### 5.1 Baseline (No Stress)
```
1. Verify R1 ASBR status:
   R1# show ip ospf database asbr-summary

2. Verify R4 sees default route:
   R4# show ip route 0.0.0.0
   Record: Latency, convergence time (should be <5s without stress)
```

### 5.2 Apply Stress
```
3. GNS3: Add 20ms latency + 5% loss to all links

4. Measure convergence under stress:
   R1# ping 10.0.34.2 (should show ~20ms latency)
```

### 5.3 Simulate Default-Route Change
```
5. On R1, shut down ISP interface (simulates ISP link loss during geomagnetic event)

6. Monitor time until R4's default route expires:
   R4# watch -n 1 'show ip route 0.0.0.0'

   Record: T_failure (R1 loses ISP), T_ospf_detects (R1 withdraws default LSA),
           T_convergence (R4 no longer sees default route)

Proof obligation PASS: Convergence time < 60 seconds
Proof obligation FAIL: Convergence time >= 60 seconds
```

---

## 5. Expected Output

Same as Day 26 base lab, but with timestamps showing convergence.

---

## 6. Common Mistakes

1. Not applying stress uniformly across all links
2. Measuring convergence from "show run" instead of "show route" actual removal
3. LSA timers too aggressive -> SPF calculation overloaded

---

## 7. Troubleshooting

Same pattern as Day 25 Field 2: check hello delivery, timers, neighbor status.

---

## 8. Design Analysis

Geomagnetic stress impacts OSPF's convergence for default-route distribution. By proving <60s under stress, we validate P38's default-gateway election can complete within acceptable MTTR windows.

---

## 9. Real-World Parallel: Haiti Deployment

P38 gateways must maintain reachability during geomagnetic events. This lab proves OSPF ASBR default-route injection is resilient.

---

## 10-12. [Stretch Goals, Self-Assessment, References]

[Similar to Day 25 Field 2 pattern]

Target: BSL-2 to BSL-3
