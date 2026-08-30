# Day 29 Field 2 Lab — OSPF DR/BDR and Multi-ASBR Metric Selection Under Stress

**Field Focus:**      Field 2: Geomagnetic Resilience
**Core Proof Obligation:** DR/BDR election remains stable and E1 metrics maintain path selection priority <60s under stress
**Estimated Time:**   120 minutes
**Difficulty:**       Advanced

---

## 1. Business Context

Under geomagnetic jitter, DR/BDR election flaps and multi-ASBR path selection becomes unstable. This variant applies stress and measures DR stability + E1 path preference under 20% jitter + 5% loss.

---

## 2. Verification

```
1. Stress all LAN-facing links (multi-access segment where DR election happens)

2. Monitor DR stability (should not flap):
   R1# show ip ospf interface | include Designated

3. Monitor E1 path selection (should prefer E1 ASBR):
   R2# show ip route 0.0.0.0 (should show E1 route)

Proof obligation PASS: DR stable, E1 route preferred despite stress
```

---

## 4. [Remaining sections follow Day 25 Field 2 pattern]

Target: BSL-2 to BSL-3
