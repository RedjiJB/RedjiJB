# Day 29 Field 3 Lab — Distributed OSPF DR/BDR Election (Full Mesh, Byzantine)

**Field Focus:**      Field 3: Distributed Systems (DePIN)
**Core Proof Obligation:** Full-mesh OSPF network elects DRs per multi-access segment; multi-ASBR E1 vs E2 consensus achieved without central authority
**Estimated Time:**   120 minutes
**Difficulty:**       Advanced

---

## 1. Business Context

In a full-mesh distributed network, multiple multi-access segments might exist (e.g., shared Ethernet segment with 5+ routers). Each segment independently elects a DR/BDR. Multiple ASBRs (with different metric types) must still achieve consensus on best default-route path. This tests distributed election and Byzantine tolerance.

---

## 2. Configuration

Multiple multi-access segments (via shared Ethernet or broadcast subnets) with priority tuning:
- Segment 1: R1 DR (priority 120), R2 BDR (priority 100)
- Segment 2: R5 DR (priority 120), R3 BDR (priority 100)
- R1 ASBR (E1), R5 ASBR (E2 Byzantine)

---

## 3. Verification

```
1. Verify correct DR/BDR election per segment:
   (Show output for each multi-access segment)

2. Verify E1 path selection consensus:
   All routers agree on E1 path being preferred

3. With Byzantine interference (R5 dropping 5% of E2 LSAs):
   Confirm E1 path still chosen despite R5's E2 availability

Proof obligation PASS: Distributed election works; E1 consensus maintained
```

---

## 4. [Remaining sections follow Day 25 Field 3 pattern]

Target: BSL-2 to BSL-3
