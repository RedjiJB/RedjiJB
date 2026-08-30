# Day 30 Field 3 Lab — Distributed HSRP Election (Multi-Group, Byzantine Tolerance)

**Field Focus:**      Field 3: Distributed Systems (DePIN)
**Core Proof Obligation:** Multiple HSRP groups converge without single point of failure; Byzantine gateway detection
**Haiti Phase:**      P38 pilot (distributed gateway election across multiple LAN segments)
**Estimated Time:**   120 minutes
**Difficulty:**       Advanced

---

## 1. Business Context

A single LAN with 10+ routers might require multiple HSRP groups (one per subnet). Different routers might be active for different groups (load-balanced gateway redundancy). Additionally, one gateway might be Byzantine (drops 5% of ARP requests). This tests distributed gateway election without central authority.

---

## 2. Configuration

Multiple HSRP groups:

```cisco
! HSRP Group 1 (subnet 10.0.1.0/24): R1 active, R2 standby
! HSRP Group 2 (subnet 10.0.2.0/24): R2 active, R1 standby
! HSRP Group 3 (subnet 10.0.3.0/24): R3 active (Byzantine, 5% ARP loss)

interface g0/0
 standby version 2
 standby 1 ip 10.0.1.254
 standby 1 priority 120  (R1)

 standby 2 ip 10.0.2.254
 standby 2 priority 50   (R1 is standby for group 2)

 standby 3 ip 10.0.3.254
 standby 3 priority 50   (R1 is standby for group 3)
```

---

## 3. Verification

```
1. Verify all 3 groups converge:
   R1# show standby all

2. Verify different routers are active for different groups:
   Group 1: R1 active
   Group 2: R2 active
   Group 3: R3 active (Byzantine)

3. Test Byzantine tolerance (R3 drops 5% of ARP):
   Host in subnet 3 attempts gateway communication
   Expected: Most requests succeed (95%), some fail (5%)
   HSRP should NOT failover (doesn't detect 5% loss as critical)

4. Escalate Byzantine behavior (R3 drops 50% of ARP):
   Expected: HSRP detects R3's degradation, R4 becomes active
   Proof obligation: Distributed election works; Byzantine node removed when threshold exceeded
```

---

## 4. [Remaining sections follow Day 25 Field 3 pattern]

Target: BSL-2 to BSL-3
