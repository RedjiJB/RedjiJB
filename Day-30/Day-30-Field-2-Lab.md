# Day 30 Field 2 Lab — HSRP Failover Under Geomagnetic Stress

**Field Focus:**      Field 2: Geomagnetic Resilience
**Core Proof Obligation:** HSRP detects active-router degradation (high latency/loss) and failovers <30s under 20% jitter + 5% loss
**Haiti Phase:**      P38 pilot (gateway failover resilience during space-weather events)
**Estimated Time:**   120 minutes
**Difficulty:**       Advanced

---

## 1. Business Context

Under geomagnetic stress, HSRP hellos on the active router might be delayed or lost. The standby must detect this quickly and failover to maintain gateway availability. This variant applies 20% jitter + 5% loss to HSRP hello exchanges and measures failover time.

---

## 2. Configuration

Same HSRP as Day 30 base lab, with stress injection:

```cisco
! On R1's HSRP-facing interface (link to R2):
! GNS3: Add 20ms delay + ±20% jitter + 5% loss
```

---

## 3. Verification

```
1. Baseline: Measure HSRP hello/dead timers (should be ~3s default)

2. Apply geomagnetic stress to R1-R2 link

3. Verify R2 detects R1's degradation within dead-timer window

4. Measure failover time:
   - T0: Active R1 becomes degraded (stress applied)
   - T1: R2 detects failure (dead-timer expires)
   - T2: R2 becomes active, sends gratuitous ARP, hosts update ARP cache

   Failover time = T2 - T0

Proof obligation PASS: Failover time < 30 seconds, automatic (no manual intervention)
```

---

## 4. [Remaining sections follow Day 25 Field 2 pattern]

Target: BSL-2 to BSL-3
