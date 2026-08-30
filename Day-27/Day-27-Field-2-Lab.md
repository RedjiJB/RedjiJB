# Day 27 Field 2 Lab — OSPF Cost Tuning Under Geomagnetic Stress

**Field Focus:**      Field 2: Geomagnetic Resilience
**Core Proof Obligation:** OSPF uses correct reference-bandwidth to choose optimal paths under 20% jitter + 5% loss
**Estimated Time:**   120 minutes
**Difficulty:**       Advanced

---

## 1. Business Context

With default reference-bandwidth (100 Mbps), Gigabit and Fast Ethernet links get the same cost (cost 1). Under geomagnetic stress, OSPF might pick a suboptimal path if cost calculation can't distinguish link speeds. This variant applies stress and measures convergence to ensure reference-bandwidth tuning is used correctly even when latency varies ±20%.

---

## 2. Configuration

Same as Day 27 base lab (auto-cost reference-bandwidth 10000), with stress injection.

---

## 3. Verification

```
1. Baseline path selection (no stress):
   R1# show ip route | include 192.168.4.0
   Record: Which link carries traffic (should be high-speed link)

2. Apply geomagnetic stress (20ms + ±20% jitter + 5% loss on Fast Ethernet)

3. Verify path selection unchanged (still uses high-speed link):
   R1# show ip route | include 192.168.4.0

Proof obligation PASS: Reference-bandwidth tuning forces optimal path selection despite stress
```

---

## 4. [Remaining sections follow Day 25 Field 2 pattern]

Target: BSL-2 to BSL-3
