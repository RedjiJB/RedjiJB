# Day 29 Field 1 Lab — Offline OSPF DR/BDR Election and E1 vs E2 Metrics

**Field Focus:**      Field 1: Black Start Systems
**Core Proof Obligation:** DR/BDR election and E1 vs E2 metric selection persist offline; consistent defaults after power cycle
**Estimated Time:**   75 minutes
**Difficulty:**       Intermediate

---

## 1. Business Context

DR/BDR election depends on configured router priority; E1 vs E2 metric selection depends on configured metric type. Both are stored in NVRAM and persist across power cycles. This variant confirms offline persistence.

---

## 2. Configuration

```cisco
! R1 (intended DR, high priority)
router ospf 1
 area 0
 ip ospf priority 120  ! (on LAN interface)

! R5 (ASBR, E1 metrics)
router ospf 1
 default-information originate metric-type 1
end
copy run start
```

---

## 3. Verification

```
1. Record DR, BDR, metric types before power-cycle

2. Power-cycle all routers

3. After boot: Verify same DR/BDR elected, same E1/E2 types chosen

Proof obligation PASS: No manual re-election or metric retuning needed
```

---

## 4. [Remaining sections follow Day 25 Field 1 pattern]

Target: BSL-2 to BSL-3
