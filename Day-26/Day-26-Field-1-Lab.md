# Day 26 Field 1 Lab — OSPF ASBR with Offline-Safe Default Route Injection

**Field Focus:**      Field 1: Black Start Systems
**Core Proof Obligation:** OSPF ASBR default-route injection works offline; gateway remains accessible after power cycle
**Haiti Deployment Phase:** P38 pilot (offline-capable default gateway election)
**Estimated Time:**   90 minutes
**Difficulty:**       Intermediate
**Relationship to Base Lab:** Same OSPF ASBR protocol; topology removes external ISP dependency, uses local default route persistence

---

## 1. Business Context (Field-Specific Framing)

The Day 26 base lab configures R1 as an ASBR that injects an Internet default route via OSPF's `default-information originate` command. This assumes an external ISP circuit and external connectivity. This variant removes the external ISP entirely: the default route is statically configured on R1 and persisted to NVRAM, so even during site-wide power loss, R1 boots with the same default route and re-advertises it to the domain via OSPF. This proves the Black Start layer (BSL-3) for first-hop gateway design in isolated environments.

---

## 2. Topology Diagram

```
[FIELD-1 VARIANT: Offline OSPF ASBR]

        R1 (ASBR, offline-capable)
       /        \
      /          \
    R2            R3
      \        /
       \      /
        R4 -- SW1 -- PC1

Key differences:
- R1 does NOT connect to external ISP; default route is statically configured locally
- R1's default route is "ip route 0.0.0.0 0.0.0.0 <null0 or loopback>"
- OSPF ASBR status maintained via `default-information originate always` (even if default doesn't exist on line)
- On power-cycle, R1 boots with startup-config (includes static default + OSPF config)
- All other routers learn default route via OSPF E2 LSAs (external type 2)
```

---

## 3. IP Addressing Plan

Identical to Day 26 base lab (10.0.0.0/8 for internal, 192.168.4.0/24 for LAN). No external ISP network configured.

---

## 4. Configuration (Field-1 Specific)

```cisco
! R1 (ASBR with offline-safe default route)
hostname R1
interface g0/0
 ip address 10.0.12.1 255.255.255.252
 no shutdown
interface f1/0
 ip address 10.0.13.1 255.255.255.252
 no shutdown
interface loopback0
 ip address 1.1.1.1 255.255.255.255
 no shutdown
!
! CRITICAL FOR FIELD-1: Static default route (not dependent on ISP)
ip route 0.0.0.0 0.0.0.0 null0
! Explanation: Routes unknown traffic to /dev/null (discard). In real scenario,
! this would point to a local gateway or backup ISP connection. For this lab,
! serves to demonstrate OSPF ASBR can function without external connectivity.
!
router ospf 1
 router-id 1.1.1.1
 network 10.0.12.0 0.0.0.3 area 0
 network 10.0.13.0 0.0.0.3 area 0
 passive-interface loopback0
 default-information originate always
 ! Explanation: "always" keyword forces ASBR status even if static default
 ! is not actually connected (points to null0 in this offline scenario).
!
end
copy run start
! Save config to NVRAM; R1 will boot with same default route after power-cycle
```

---

## 5. Verification Steps

### 5.1 Before Power-Cycle
```
1. Verify OSPF converged:
   R1# show ip ospf neighbor

2. Verify R4 sees default route via OSPF:
   R4# show ip route 0.0.0.0
   Expected: O*E2 0.0.0.0/0 [110/...] via 10.0.34.1, ...

3. Save config to startup:
   R1# copy run start
```

### 5.2 Power-Cycle Test
```
4. Power off all routers; wait 30 seconds; power on

5. Wait 2 minutes for boot + OSPF convergence

6. Verify R1 still has default route:
   R1# show ip route 0.0.0.0
   ! Should show "ip route 0.0.0.0 0.0.0.0 null0" from startup-config

7. Verify R4 still sees default route via OSPF:
   R4# show ip route 0.0.0.0
   ! Should show E2 route, even though ISP is offline

Proof obligation PASS: Default route persists across power cycle
Proof obligation FAIL: Default route missing, requiring manual reconfiguration
```

---

## 6. Expected Output Gallery

```
R4# show ip route 0.0.0.0
Routing entry for 0.0.0.0/0, supernet
  Known via "ospf 1", distance 110, metric 20
  Type: E2, uptime 2d05h, connected via 10.0.34.1
    Redistributing via ospf 1
    OSPF external type 2, cost: 20 (2000 after rescaling BGP)
    Tag: 0, type: external type 2
  Last update from 10.0.34.1 on FastEthernet2/0, 00:00:05 ago
```

---

## 7. Common Mistakes

1. Forgetting `always` keyword in `default-information originate` -> ASBR loses status if default route is null0
2. Not saving config to NVRAM -> static default route lost after power-cycle
3. Configuring external ISP network -> defeats the "offline" proof obligation

---

## 8. Troubleshooting

**Problem: "R4 doesn't see the default route via OSPF after reboot"**

```
Step 1: Is R1 still ASBR?
  show ip ospf database asbr-summary
  -> Should show R1 (1.1.1.1) as ASBR

Step 2: Did R1 boot with config?
  show startup-config | include default-information
  -> Should show "default-information originate always"
  -> If missing, config wasn't saved to NVRAM

Step 3: Did OSPF converge?
  show ip ospf neighbor
  -> All neighbors should be FULL
```

---

## 9. Design Analysis

This topology proves default-gateway redundancy is achievable without external infrastructure. OSPF ASBR injection persists across power cycles, ensuring every router knows how to reach "the Internet" (null0 in this case, or real gateway in production) without external management plane.

---

## 10. Real-World Parallel: Haiti Deployment

P38 pilot must have offline-capable default gateways. This lab proves OSPF ASBR can bootstrap and converge without external ISP connectivity, validating that first-hop gateway redundancy survives site-wide power loss.

---

## 11. Stretch Goals

- Prove OSPF ASBR status survives multiple power cycles
- Measure convergence time after boot (OSPF database rebuild)

---

## 12. Self-Assessment (BSL Scale)

- **BSL-2 OFFLINE** — You could repeat this lab with manual, measuring cold-start recovery
- **BSL-3 RECOVERABLE** — You could rebuild this topology from diagram, knowing Field-1 requirements

Target: BSL-2 to BSL-3
