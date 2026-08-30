# Day 27 Field 1 Lab — Offline OSPF Cost Calculation

**Field Focus:**      Field 1: Black Start Systems
**Core Proof Obligation:** OSPF reference-bandwidth tuning persists offline; routers calculate consistent costs after power cycle
**Estimated Time:**   75 minutes
**Difficulty:**       Intermediate

---

## 1. Business Context

Reference-bandwidth tuning (default 100 Mbps) is a domain-wide config that must be consistent across all routers. This variant tests offline persistence: after power-cycle, all routers boot with the same reference-bandwidth and calculate identical costs without external configuration servers.

---

## 2. Configuration (Field-1 Specific)

```cisco
! All routers: Save reference-bandwidth to NVRAM
router ospf 1
 auto-cost reference-bandwidth 10000
end
copy run start
! After power-cycle, all routers boot with reference-bandwidth 10000
```

---

## 3. Verification

```
1. Before power-cycle: Record reference-bandwidth and calculated costs
   R1# show ip ospf | include reference

2. Power-cycle all routers

3. After boot: Verify reference-bandwidth and costs unchanged
   R1# show ip ospf | include reference
   R1# show ip route (check cost values)

Proof obligation PASS: Costs match pre-cycle values
```

---

## 4. [Remaining sections follow Day 25 Field 1 pattern]

Target: BSL-2 to BSL-3
