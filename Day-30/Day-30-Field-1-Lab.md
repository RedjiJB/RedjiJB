# Day 30 Field 1 Lab — HSRP Offline Gateway Redundancy

**Field Focus:**      Field 1: Black Start Systems
**Core Proof Obligation:** HSRP virtual IP persists offline; gateway failover works without external config servers
**Estimated Time:**   90 minutes
**Difficulty:**       Intermediate

---

## 1. Business Context

HSRP configuration (virtual IP, priority, preemption) must persist across power cycles. This variant confirms cold-start recovery: after total site power loss, HSRP routers boot with identical priority and virtual IP, re-elect active/standby automatically, and hosts' connectivity via the virtual IP is restored without manual intervention.

---

## 2. Configuration

```cisco
! R1 (Active HSRP, priority 120)
interface g0/0
 standby version 2
 standby 1 ip 10.0.1.254
 standby 1 priority 120
 standby 1 preempt
end
copy run start

! R2 (Standby HSRP, priority 50)
interface g0/0
 standby version 2
 standby 1 ip 10.0.1.254
 standby 1 priority 50
 ! No preempt
end
copy run start
```

---

## 3. Verification

```
1. Before cold-start: Record active/standby state, VIP ownership

2. Power-cycle both R1 and R2 simultaneously

3. After boot: Verify R1 became active again (higher priority),
   VIP is owned by R1, hosts' ARP resolves to R1's MAC

Proof obligation PASS: HSRP state and VIP assignment restored after power cycle
```

---

## 4. [Remaining sections follow Day 25 Field 1 pattern]

Target: BSL-2 to BSL-3
