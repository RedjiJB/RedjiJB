# Day 26 Field 3 Lab — Distributed OSPF ASBR Election (Multi-ASBR Mesh)

**Field Focus:**      Field 3: Distributed Systems (DePIN)
**Core Proof Obligation:** Multiple ASBRs inject default routes; no single point of failure; Byzantine ASBR detection
**Haiti Deployment Phase:** P38 pilot (distributed gateway election, no single ISP exit point)
**Estimated Time:**   120 minutes
**Difficulty:**       Advanced
**Relationship to Base Lab:** Same OSPF ASBR protocol; topology adds second ASBR and measures E1 vs E2 metric selection under Byzantine conditions

---

## 1. Business Context (Field-Specific Framing)

The Day 26 base lab has a single ASBR (R1) that injects the default route. If R1 fails, the entire domain loses Internet reachability — a critical single point of failure. This variant adds a second ASBR (R5) connected via an alternate ISP link, creating redundant default-route injection. Additionally, we test Byzantine tolerance: if one ASBR advertises misleading default-route metrics, the domain must detect and deprioritize it. This proves distributed default-gateway election without central authority.

---

## 2. Topology Diagram

```
[FIELD-3 VARIANT: Multi-ASBR Distributed Election]

ISP-A -- R1 (ASBR #1, E1 metrics)
             /   \
           R2     R3
             \   /
              R4 -- SW1 -- PC1
                     |
                   R5 (ASBR #2, E2 metrics) -- ISP-B
                   [BYZANTINE: drops 5% of E2 LSAs]

Two ASBRs compete for default-route authority:
- R1 (E1): closer to R2, R3 (better path weight)
- R5 (E2): farther (E2 ignores internal distance)
- Routers vote on which ASBR's default is preferred
```

---

## 3. Configuration

```cisco
! R1 (Primary ASBR, E1 metrics)
router ospf 1
 router-id 1.1.1.1
 ...
 default-information originate metric-type 1
 ! Explanation: E1 metrics include internal path cost; more accurate in multi-ASBR scenarios

! R5 (Secondary ASBR, E2 metrics, Byzantine)
router ospf 1
 router-id 5.5.5.5
 ...
 default-information originate metric-type 2
 ! Explanation: E2 metrics ignore internal distance (backward-compatible, less accurate)
 ! Add this to the R5-R4 link in GNS3: 5% loss (simulates Byzantine LSA dropping)
```

---

## 4. Verification Steps

```
1. Verify both ASBRs exist:
   R2# show ip ospf database asbr-summary
   Expected: Both 1.1.1.1 and 5.5.5.5 shown as ASBRs

2. Verify E1 vs E2 metrics:
   R2# show ip ospf database external 0.0.0.0
   Expected: Two external LSAs (one E1 from R1, one E2 from R5)

3. Verify path selection (routers vote for lower cost):
   R2# show ip route 0.0.0.0
   Expected: E1 route preferred (lower total cost)

4. With Byzantine interference (R5 dropping 5% of LSAs):
   Repeat step 2-3 after GNS3 applies 5% loss to R5-R4 link
   Expected: R5's E2 LSA still seen, but convergence slower due to loss
```

---

## 5. Common Mistakes

1. Configuring both ASBRs with same metric type (E1 or E2) -> no differentiation
2. Not adding ISP links for R5 -> can't justify second ASBR
3. Forgetting to configure R5 as ASBR -> only R1 injects default

---

## 6. Design Analysis

Multiple ASBRs provide default-route redundancy. E1 vs E2 metric selection ensures routers prefer the most-accurate (E1) exit point, but can still failover to E2 if E1 is unavailable. Byzantine tolerance is tested: R5's degraded links (5% loss) don't completely remove it; routers just prefer R1's cleaner path.

---

## 7-12. [Remaining sections follow Day 25 Field 3 pattern]

Target: BSL-2 to BSL-3
