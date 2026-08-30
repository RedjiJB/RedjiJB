# Day 27 Field 3 Lab — Distributed OSPF Cost Consensus (Multi-Area)

**Field Focus:**      Field 3: Distributed Systems (DePIN)
**Core Proof Obligation:** Multiple OSPF areas with different reference-bandwidths still converge; Byzantine area detection
**Estimated Time:**   120 minutes
**Difficulty:**       Advanced

---

## 1. Business Context

In a distributed DePIN network, different communities might use different reference-bandwidth settings. This variant tests whether OSPF can tolerate inconsistent reference-bandwidth (Byzantine area) without losing consensus on reachability.

---

## 2. Configuration

```cisco
! Area 0 (Main domain): reference-bandwidth 10000
router ospf 1
 area 0
 auto-cost reference-bandwidth 10000

! Area 1 (Distributed area, Byzantine): reference-bandwidth 1000
router ospf 1
 area 1
 auto-cost reference-bandwidth 1000  ! Different from main domain
```

---

## 3. Verification

```
1. Verify OSPF converges despite different reference-bandwidths

2. Check that Area Border Router (ABR) correctly translates between areas

3. Confirm reachability across areas is maintained

Proof obligation PASS: OSPF converges despite inconsistent reference-bandwidth
```

---

## 4. [Remaining sections follow Day 25 Field 3 pattern]

Target: BSL-2 to BSL-3
