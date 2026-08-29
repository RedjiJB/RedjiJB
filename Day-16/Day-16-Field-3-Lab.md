# Day 16 Field-3 Lab — Distributed Inter-VLAN Routing Mesh with Byzantine Resilience

---

## 0. Metadata

| Field | Value |
|---|---|
| **Field Focus** | Field 3: Decentralized Platform Infrastructure (DePIN) — Distributed Routing Mesh |
| **Core Proof Obligation** | Inter-VLAN routing must work with no single authoritative gateway; traffic must reach the destination VLAN via at least two independent paths; if one router lies about a route (Byzantine), the mesh must converge on the correct path via quorum consensus. |
| **Haiti Deployment Phase** | P38 pilot (resilient mesh routing, no single point of failure) |
| **Estimated Time** | 2.5 – 4 hours (first attempt); 1.5 hours on repeat |
| **Difficulty** | Advanced (mesh routing with Byzantine failure detection) |
| **Relationship to Base Lab** | Base lab (Day-16) uses a single centralized router (R1) with one interface per VLAN. This variant removes the centralized router: instead, three routers (R1, R2, R3) form a mesh where every VLAN is reachable via multiple paths. Each router advertises routes to all VLANs (not just locally attached ones) via a distributed routing protocol; Byzantine faults are detected when a router's advertised path doesn't match its actual configuration. |
| **Prerequisite** | Complete Day-16-Lab-Manual.md; familiarity with routing protocol concepts (distance-vector, path advertisements, metric). |

---

## 1. Business Context (Field-3 Framing)

**Traditional centralized routing:** A single router holds the gateway IP for each VLAN (`.62`, `.126`, `.190`). All inter-VLAN traffic routes through that one interface. If that router or one of its interfaces fails, the entire VLAN becomes unreachable.

**Field-3 (DePIN) scenario:** In Haiti's distributed mesh, there is no "main office router." Instead, three community hotspots (Tèt-Mòn, Bèl-Vü, and Kòd-Yè) each run a router that know about the same VLANs (Community Services, Healthcare, Education). A packet destined for Healthcare can travel via any of three routers:
- Via Tèt-Mòn (shortest path)
- Via Bèl-Vü (alternate path, longer)
- Via Kòd-Yè (yet another path)

One of the routers (Kòd-Yè) is Byzantine: it claims to have a route to Healthcare (metric 1) but actually drops all Healthcare traffic. The mesh must detect this lie and automatically re-route Healthcare traffic through Tèt-Mòn or Bèl-Vü instead, without manual intervention.

This lab proves that distributed inter-VLAN routing (with Byzantine resilience) can work without a centralized gateway authority, unblocking P38 deployment in Haiti.

---

## 2. Topology Diagram (Field-3 Modifications)

**BASE LAB (one router, three VLANs on one switch):**
```
PC1, PC2 (VLAN10) --\
PC3, PC4 (VLAN20) ----  SW1 --- R1 (centralized gateway)
PC5, PC6 (VLAN30) --/
```

**FIELD-3 VARIANT (three routers, three VLANs, full mesh, Byzantine resilience):**
```
                           ┌─────────────┐
                           │ Tèt-Mòn (R1) │ (honest router)
                           │ VLAN10-30    │
                           │ Gi0/0(.62)   │
                           │ Gi0/1(.126)  │
                           │ Gi0/2(.190)  │
                           └──────┬──────┘
                                  │
                    ┌─────────────┼──────────────┐
                    │             │              │
              ┌─────┴──────┐  ┌───┴────────┐ ┌───┴────────┐
              │  SW1       │  │  SW2       │ │  SW3       │
              │ VLAN10-30  │  │ VLAN10-30  │ │ VLAN10-30  │
              └──────┬─────┘  └─┬──────┬───┘ └─┬──────┬───┘
                     │          │      │      │      │
            PC1, PC2 │      PC3,│PC4  PC5, PC6│
            (VLAN10) │      (VLAN│20)  (VLAN30)
                     │          │
                     │       Bèl-Vü (R2)      Kòd-Yè (R3) — BYZANTINE NODE
                     │       (honest)        (claims routes, drops traffic)
                     │
               Tèt-Mòn (R1) — central hub, connects to all three switches

Mesh routing protocol (simulated via static routes + route announcements):
- R1 announces: "I can reach VLAN10 (metric 1), VLAN20 (metric 1), VLAN30 (metric 1)"
- R2 announces: "I can reach VLAN10 (metric 2), VLAN20 (metric 2), VLAN30 (metric 2)"
  (Higher metrics because R2 reaches them via R1 with one extra hop)
- R3 announces: "I can reach VLAN10 (metric 1), VLAN20 (metric 1), VLAN30 (metric 1)"
  (BYZANTINE: R3 claims low metrics but actually drops VLAN20 traffic)

Switches connected to routers via P2P links (forming a mesh):
- R1 Gi0/0/0 ↔ R2 Gi0/0/0 (P2P link A)
- R1 Gi0/0/1 ↔ R3 Gi0/0/1 (P2P link B)
- R2 Gi0/0/1 ↔ R3 Gi0/0/0 (P2P link C)
(All three routers connected to each switch via standard LAN links)

Expected behavior:
- VLAN10 traffic from PC1 → any VLAN30 host: can route via R1 (primary), R2 (backup), or R3 (Byzantine)
- Router consensus algorithm detects R3's Byzantine behavior and excludes it
- Re-routing converges within 10 seconds
```

---

## 3. IP Addressing Plan (Field-3 Annotations)

**VLAN subnets (same as base lab, but now announced by all three routers):**

| VLAN | Subnet | Mask | Primary Source | Backup Sources |
|---|---|---|---|---|
| 10 (Engineering) | 10.0.0.0/26 | 255.255.255.192 | R1 Gi0/0 | R2, R3 |
| 20 (Healthcare) | 10.0.0.64/26 | 255.255.255.192 | R1 Gi0/1 | R2, R3 (R3 Byzantine) |
| 30 (Education) | 10.0.0.128/26 | 255.255.255.192 | R1 Gi0/2 | R2, R3 |

**Router-to-Router P2P Links (mesh backbone):**

| Link | Router A | Interface A | IP A | Router B | Interface B | IP B |
|---|---|---|---|---|---|---|
| A | R1 | Gi0/0/0 | 10.100.1.1/30 | R2 | Gi0/0/0 | 10.100.1.2/30 |
| B | R1 | Gi0/0/1 | 10.100.2.1/30 | R3 | Gi0/0/1 | 10.100.2.2/30 |
| C | R2 | Gi0/0/1 | 10.100.3.1/30 | R3 | Gi0/0/0 | 10.100.3.2/30 |

**Switch-to-Router Connections (each switch connects to all routers):**

| Switch | Router | S Interface | R Interface | IP (Router side) |
|---|---|---|---|---|
| SW1 | R1 | Fa0/23 | Gi0/0 | 10.0.0.62 (VLAN10 GW) |
| SW1 | R2 | Fa0/24 | Gi0/3 | 10.0.0.63 (VLAN10, backup) |
| SW1 | R3 | Fa0/25 | Gi0/4 | 10.0.0.64 (VLAN10, Byzantine) |
| SW2 | R1 | Fa0/23 | Gi0/1 | 10.0.0.126 (VLAN20 GW) |
| SW2 | R2 | Fa0/24 | Gi0/5 | 10.0.0.127 (VLAN20, backup) |
| SW2 | R3 | Fa0/25 | Gi0/6 | 10.0.0.128 (VLAN20, Byzantine) |
| SW3 | R1 | Fa0/23 | Gi0/2 | 10.0.0.190 (VLAN30 GW) |
| SW3 | R2 | Fa0/24 | Gi0/7 | 10.0.0.191 (VLAN30, backup) |
| SW3 | R3 | Fa0/25 | Gi0/8 | 10.0.0.192 (VLAN30, Byzantine) |

**Annotated:** Each VLAN has three advertised gateways (one per router), but only the primary (R1) is honestly configured. R2 is honest backup. R3 claims to be a valid gateway but is Byzantine — traffic sent to R3's VLAN20 interface will be dropped.

---

## 4. Configuration (Field-3 Optimizations)

### 4.1 — R1 Configuration (Honest Primary Router)

```text
Router>enable
Router#configure terminal
Router(config)#hostname R1

! VLAN10 gateway (primary, direct connection)
Router(config)#interface gigabitEthernet 0/0
Router(config-if)#description VLAN10-gateway (primary)
Router(config-if)#ip address 10.0.0.62 255.255.255.192
Router(config-if)#no shutdown
Router(config-if)#exit

! VLAN20 gateway (primary, direct connection)
Router(config)#interface gigabitEthernet 0/1
Router(config-if)#description VLAN20-gateway (primary)
Router(config-if)#ip address 10.0.0.126 255.255.255.192
Router(config-if)#no shutdown
Router(config-if)#exit

! VLAN30 gateway (primary, direct connection)
Router(config)#interface gigabitEthernet 0/2
Router(config-if)#description VLAN30-gateway (primary)
Router(config-if)#ip address 10.0.0.190 255.255.255.192
Router(config-if)#no shutdown
Router(config-if)#exit

! P2P link to R2 (mesh backbone)
Router(config)#interface gigabitEthernet 0/0/0
Router(config-if)#description P2P to R2 (mesh link A)
Router(config-if)#ip address 10.100.1.1 255.255.255.252
Router(config-if)#no shutdown
Router(config-if)#exit

! P2P link to R3 (mesh backbone)
Router(config)#interface gigabitEthernet 0/0/1
Router(config-if)#description P2P to R3 (mesh link B)
Router(config-if)#ip address 10.100.2.1 255.255.255.252
Router(config-if)#no shutdown
Router(config-if)#exit

! Distributed routing: static routes to remote VLANs via peers
! R2 and R3 can reach all VLANs; send traffic their way for load balancing and resilience
Router(config)#ip route 10.0.0.0 255.255.255.192 10.100.1.2  ! VLAN10 via R2 (backup route)
Router(config)#ip route 10.0.0.64 255.255.255.192 10.100.1.2 ! VLAN20 via R2 (backup route)
Router(config)#ip route 10.0.0.128 255.255.255.192 10.100.1.2 ! VLAN30 via R2 (backup route)
Router(config)#ip route 10.0.0.0 255.255.255.192 10.100.2.2  ! VLAN10 via R3 (Byzantine, lower priority)
Router(config)#ip route 10.0.0.64 255.255.255.192 10.100.2.2 ! VLAN20 via R3 (Byzantine, lower priority)
Router(config)#ip route 10.0.0.128 255.255.255.192 10.100.2.2 ! VLAN30 via R3 (Byzantine, lower priority)

! Enable route policy (for Byzantine detection via probe traffic)
Router(config)#router rip
Router(config-router)#version 2
Router(config-router)#network 10.0.0.0
Router(config-router)#network 10.100.0.0
Router(config-router)#passive-interface default
Router(config-router)#no passive-interface gigabitEthernet 0/0/0
Router(config-router)#no passive-interface gigabitEthernet 0/0/1
Router(config-router)#exit

! Logging for Byzantine detection
Router(config)#logging console
Router(config)#logging host 10.0.0.1  ! Log to PC1 (or any host with syslog capability)
Router(config)#service timestamps log datetime msec
Router(config)#exit
Router#copy running-config startup-config
```

**Explanation:** R1 announces all three VLAN gateways (as the primary, honest router). Static routes to the same VLANs via R2 and R3 create redundant paths. RIP advertisements periodically announce R1's metric (1 hop for directly connected VLANs, 2+ hops for remote), allowing other routers to detect Byzantine behavior (e.g., if R3 claims metric 1 for VLAN20 but actually drops it).

### 4.2 — R2 Configuration (Honest Backup Router)

```text
Router>enable
Router#configure terminal
Router(config)#hostname R2

! Secondary gateway for VLAN10 (reached via R1)
Router(config)#interface gigabitEthernet 0/3
Router(config-if)#description VLAN10-gateway (backup, via R1)
Router(config-if)#ip address 10.0.0.63 255.255.255.192
Router(config-if)#no shutdown
Router(config-if)#exit

! Secondary gateway for VLAN20 (reached via R1)
Router(config)#interface gigabitEthernet 0/5
Router(config-if)#description VLAN20-gateway (backup, via R1)
Router(config-if)#ip address 10.0.0.127 255.255.255.192
Router(config-if)#no shutdown
Router(config-if)#exit

! Secondary gateway for VLAN30 (reached via R1)
Router(config)#interface gigabitEthernet 0/7
Router(config-if)#description VLAN30-gateway (backup, via R1)
Router(config-if)#ip address 10.0.0.191 255.255.255.192
Router(config-if)#no shutdown
Router(config-if)#exit

! P2P link to R1 (mesh backbone)
Router(config)#interface gigabitEthernet 0/0/0
Router(config-if)#description P2P to R1 (mesh link A)
Router(config-if)#ip address 10.100.1.2 255.255.255.252
Router(config-if)#no shutdown
Router(config-if)#exit

! P2P link to R3 (mesh backbone)
Router(config)#interface gigabitEthernet 0/0/1
Router(config-if)#description P2P to R3 (mesh link C)
Router(config-if)#ip address 10.100.3.1 255.255.255.252
Router(config-if)#no shutdown
Router(config-if)#exit

! Static routes: reach primary VLANs via R1 (metric 2 = one hop to R1, then R1's metric)
Router(config)#ip route 10.0.0.0 255.255.255.192 10.100.1.1 2
Router(config)#ip route 10.0.0.64 255.255.255.192 10.100.1.1 2
Router(config)#ip route 10.0.0.128 255.255.255.192 10.100.1.1 2

! Also learn about R3's routes (for Byzantine detection comparison)
Router(config)#ip route 10.0.0.0 255.255.255.192 10.100.3.2 3
Router(config)#ip route 10.0.0.64 255.255.255.192 10.100.3.2 3
Router(config)#ip route 10.0.0.128 255.255.255.192 10.100.3.2 3

! Enable RIP for route announcements
Router(config)#router rip
Router(config-router)#version 2
Router(config-router)#network 10.0.0.0
Router(config-router)#network 10.100.0.0
Router(config-router)#passive-interface default
Router(config-router)#no passive-interface gigabitEthernet 0/0/0
Router(config-router)#no passive-interface gigabitEthernet 0/0/1
Router(config-router)#exit

Router(config)#logging console
Router(config)#logging host 10.0.0.1
Router(config)#service timestamps log datetime msec
Router(config)#exit
Router#copy running-config startup-config
```

### 4.3 — R3 Configuration (Byzantine Node: Claims Routes, Drops VLAN20 Traffic)

```text
Router>enable
Router#configure terminal
Router(config)#hostname R3

! Claims to be gateway for VLAN10 (honest)
Router(config)#interface gigabitEthernet 0/4
Router(config-if)#description VLAN10-gateway (Byzantine node)
Router(config-if)#ip address 10.0.0.65 255.255.255.192
Router(config-if)#no shutdown
Router(config-if)#exit

! Claims to be gateway for VLAN20 (BYZANTINE: will drop traffic on this interface)
! The interface exists and advertises a route, but traffic sent to it will be silently dropped.
Router(config)#interface gigabitEthernet 0/6
Router(config-if)#description VLAN20-gateway (Byzantine: DROP TRAFFIC)
Router(config-if)#ip address 10.0.0.129 255.255.255.192
Router(config-if)#no shutdown
! Apply an ACL that silently drops all traffic (implicit deny)
Router(config-if)#access-list 199 deny ip any any
Router(config-if)#ip access-group 199 in
Router(config-if)#exit

! Claims to be gateway for VLAN30 (honest)
Router(config)#interface gigabitEthernet 0/8
Router(config-if)#description VLAN30-gateway (Byzantine node)
Router(config-if)#ip address 10.0.0.193 255.255.255.192
Router(config-if)#no shutdown
Router(config-if)#exit

! P2P link to R1 (mesh backbone)
Router(config)#interface gigabitEthernet 0/0/1
Router(config-if)#description P2P to R1 (mesh link B)
Router(config-if)#ip address 10.100.2.2 255.255.255.252
Router(config-if)#no shutdown
Router(config-if)#exit

! P2P link to R2 (mesh backbone)
Router(config)#interface gigabitEthernet 0/0/0
Router(config-if)#description P2P to R2 (mesh link C)
Router(config-if)#ip address 10.100.3.2 255.255.255.252
Router(config-if)#no shutdown
Router(config-if)#exit

! Static routes (Byzantine: advertise low metrics but drop actual traffic on VLAN20)
Router(config)#ip route 10.0.0.0 255.255.255.192 10.100.2.1 1  ! VLAN10 via R1 (metric 1, honest)
Router(config)#ip route 10.0.0.64 255.255.255.192 10.100.2.1 1 ! VLAN20 via R1 (metric 1, BUT we drop it — BYZANTINE)
Router(config)#ip route 10.0.0.128 255.255.255.192 10.100.2.1 1 ! VLAN30 via R1 (metric 1, honest)

! Enable RIP to advertise these routes (other routers will trust our claims)
Router(config)#router rip
Router(config-router)#version 2
Router(config-router)#network 10.0.0.0
Router(config-router)#network 10.100.0.0
Router(config-router)#passive-interface default
Router(config-router)#no passive-interface gigabitEthernet 0/0/0
Router(config-router)#no passive-interface gigabitEthernet 0/0/1
Router(config-router)#exit

Router(config)#logging console
Router(config)#logging host 10.0.0.1
Router(config)#service timestamps log datetime msec
Router(config)#exit
Router#copy running-config startup-config
```

**Explanation:** R3 looks legitimate at the routing level: it claims to route all three VLANs with good metrics. But on VLAN20's interface, a deny ACL silently drops all incoming traffic. This is a Byzantine fault: the router advertises a path but doesn't actually deliver traffic. The proof obligation is that the mesh must detect this lie via traffic monitoring and converge to honest routes instead.

### 4.4 — Switch Configuration (SW1, SW2, SW3 — Identical to Base Lab)

```text
Switch>enable
Switch#configure terminal
Switch(config)#hostname SW1

! Create the three VLANs
Switch(config)#vlan 10
Switch(config-vlan)#name Engineering
Switch(config-vlan)#exit
Switch(config)#vlan 20
Switch(config-vlan)#name Healthcare
Switch(config-vlan)#exit
Switch(config)#vlan 30
Switch(config-vlan)#name Education
Switch(config-vlan)#exit

! Assign access ports to VLANs (PC facing)
Switch(config)#interface range fastEthernet 0/1 - 2
Switch(config-if-range)#switchport mode access
Switch(config-if-range)#switchport access vlan 10
Switch(config-if-range)#no shutdown
Switch(config-if-range)#exit

Switch(config)#interface range fastEthernet 0/3 - 4
Switch(config-if-range)#switchport mode access
Switch(config-if-range)#switchport access vlan 20
Switch(config-if-range)#no shutdown
Switch(config-if-range)#exit

Switch(config)#interface range fastEthernet 0/5 - 6
Switch(config-if-range)#switchport mode access
Switch(config-if-range)#switchport access vlan 30
Switch(config-if-range)#no shutdown
Switch(config-if-range)#exit

! Uplink ports to the three routers (each router connects to all VLANs on this switch)
! SW1's uplinks:
Switch(config)#interface fastEthernet 0/23
Switch(config-if)#description Uplink to R1 (primary)
Switch(config-if)#switchport mode access
Switch(config-if)#switchport access vlan 10
Switch(config-if)#no shutdown
Switch(config-if)#exit

Switch(config)#interface fastEthernet 0/24
Switch(config-if)#description Uplink to R2 (backup)
Switch(config-if)#switchport mode access
Switch(config-if)#switchport access vlan 10
Switch(config-if)#no shutdown
Switch(config-if)#exit

Switch(config)#interface fastEthernet 0/25
Switch(config-if)#description Uplink to R3 (Byzantine)
Switch(config-if)#switchport mode access
Switch(config-if)#switchport access vlan 10
Switch(config-if)#no shutdown
Switch(config-if)#exit

! (Repeat for VLAN20 on ports 0/22-20/24, and VLAN30 on ports 0/21-0/23, as per base Day-16 logic)
! (For brevity, the full config is elided; the pattern is the same for each VLAN and each router uplink)

Switch(config)#exit
Switch#copy running-config startup-config
```

### 4.5 — PC Addressing (Same as Base Lab)

```text
PC1–PC2: VLAN10, 10.0.0.1–2, gateway 10.0.0.62 (R1 primary)
PC3–PC4: VLAN20, 10.0.0.65–66, gateway 10.0.0.126 (R1 primary)
PC5–PC6: VLAN30, 10.0.0.129–130, gateway 10.0.0.190 (R1 primary)
```

---

## 5. Field-3 Verification Steps (Mesh Routing + Byzantine Resilience)

### 5.1 — Phase 1: Establish Mesh Connectivity

1. Verify all router interfaces are up and ping each other across the mesh:
   ```
   R1# ping 10.100.1.2  (R2's P2P interface)
   R1# ping 10.100.2.2  (R3's P2P interface)
   R2# ping 10.100.1.1  (R1's P2P interface)
   ```
   **Proof obligation:** All three routers can reach each other on the mesh backbone; mesh is connected.

2. Verify that each router knows routes to all three VLANs (via RIP announcements):
   ```
   R1# show ip route | include 10.0.0
   R2# show ip route | include 10.0.0
   R3# show ip route | include 10.0.0
   ```
   **Expected output:** Each router shows routes to 10.0.0.0/26, 10.0.0.64/26, 10.0.0.128/26 with varying metrics (R1: 1, R2: 2, R3: 1 for all — R3 claims but doesn't deliver).

### 5.2 — Phase 2: Test Honest (Non-Byzantine) Routes

3. From PC1 (VLAN10), ping PC3 (VLAN20) — should succeed via R1's honest VLAN20 gateway:
   ```
   PC1> ping 10.0.0.65  (PC3)
   ```
   **Proof obligation:** Inter-VLAN routing works on honest paths.

4. Measure the path taken (using traceroute or TTL analysis):
   ```
   PC1> tracert 10.0.0.65
   Expected: PC1 → R1 → PC3 (2 hops, via primary gateway)
   ```

### 5.3 — Phase 3: Detect Byzantine Fault (R3's VLAN20 Drop)

5. From PC3 (VLAN20), attempt to send traffic to R3's VLAN20 gateway (10.0.0.129 — the Byzantine interface):
   ```
   PC3> ping 10.0.0.129  (R3's VLAN20 interface)
   Expected: FAIL (no response) — R3's drop ACL blocks the ping
   ```
   **Proof obligation:** R3's Byzantine lie is detectable: it claims to have VLAN20 but drops traffic.

6. Enable logging on R1 to capture the failed route attempt:
   ```
   R1# show logging | include VLAN20
   Expected: [T+60s] Route to VLAN20 via R3 (10.100.2.2): unreachable after 3 attempts
   [T+65s] R3 marked as Byzantine: VLAN20 path failure
   ```
   **Proof obligation:** The mesh detects R3's Byzantine behavior and logs it.

### 5.4 — Phase 4: Consensus Convergence (Re-routing)

7. After Byzantine detection, verify that traffic re-converges to honest paths:
   ```
   R1# show ip route | include "10.0.0.64"
   Expected: Before convergence: multiple routes (via R2, R3)
             After convergence: R3's route marked as unreachable/down; only R2 and R1's direct route remain
   ```

8. Send traffic from PC3 again and confirm it now takes the honest path (via R1 or R2, not R3):
   ```
   PC3> tracert 10.0.0.1  (PC1, in VLAN10)
   Expected after convergence: PC3 → R1 (VLAN20) → R1 (Gi0/0, VLAN10) → PC1
                               OR: PC3 → R2 (backup) → R1 (via P2P) → PC1
                               NOT: PC3 → R3 (Byzantine)
   ```
   **Proof obligation:** Mesh converges on honest routes after detecting Byzantine fault.

### 5.5 — Phase 5: Convergence Time Measurement

9. Measure the time from Byzantine fault injection to convergence:
   ```
   T=0s: Enable drop ACL on R3's VLAN20 interface (inject Byzantine fault)
   Repeatedly measure: ping 10.0.0.65 from PC1
   Record: T when ping starts failing → T when ping succeeds again (via alternate path)
   Convergence time = T_success − T_failure
   ```
   **Expected:** Convergence < 30 seconds (Field-3 proof obligation for P38).
   **Proof obligation:** Mesh converges to non-Byzantine routes quickly enough for operational use.

---

## 6. Expected Output Gallery (Field-3 Scenarios)

### 6.1 — Mesh Connectivity Verification

```
R1# show ip route
...
     10.0.0.0/24 is variably subnetted, 9 subnets, 3 masks
C       10.0.0.0/26 is directly connected, GigabitEthernet0/0
C       10.0.0.64/26 is directly connected, GigabitEthernet0/1
C       10.0.0.128/26 is directly connected, GigabitEthernet0/2
S       10.0.0.0/26 [1/0] via 10.100.1.2 (R2 backup route)
S       10.0.0.0/26 [1/0] via 10.100.2.2 (R3 Byzantine claim)
     10.100.0.0/24 is variably subnetted, 3 subnets, 3 masks
C       10.100.1.0/30 is directly connected, GigabitEthernet0/0/0 (R1 ↔ R2)
C       10.100.2.0/30 is directly connected, GigabitEthernet0/0/1 (R1 ↔ R3)
R       10.100.3.0/30 [120/2] via 10.100.1.2 (learned via RIP: R2→R3 link)
```

### 6.2 — Byzantine Route Claim (Pre-Detection)

```
R3# show ip route | include "10.0."
     10.0.0.0/26 [1/0] via 10.100.2.1  (VLAN10 — claims metric 1, honest)
     10.0.0.64/26 [1/0] via 10.100.2.1 (VLAN20 — claims metric 1, BUT DROPS TRAFFIC)
     10.0.0.128/26 [1/0] via 10.100.2.1 (VLAN30 — claims metric 1, honest)
```

### 6.3 — Byzantine Fault Detection Log

```
R1# show logging

Nov 29 17:07:45.123 : Byzantine Route Validation: Checking R3's VLAN20 path
Nov 29 17:07:45.234 : Probe sent to R3 VLAN20 interface (10.0.0.129) via R3 gateway (10.100.2.2)
Nov 29 17:07:47.156 : No response from probe within 2s timeout
Nov 29 17:07:49.201 : Retrying probe (attempt 2/3)
Nov 29 17:07:51.089 : No response (attempt 3/3) — R3 VLAN20 marked UNREACHABLE
Nov 29 17:07:51.451 : Byzantine Fault Detected: R3 advertises VLAN20 (metric 1) but fails probe
Nov 29 17:07:51.623 : Action: Downgrade R3 VLAN20 route priority to 254 (lowest)
Nov 29 17:07:51.889 : Consensus log: R1 (honest VLAN20), R2 (honest VLAN20), R3 (Byzantine) → Quorum consensus = R1+R2 only
```

### 6.4 — Convergence After Byzantine Isolation

```
Before Byzantine Detection:
PC1> tracert 10.0.0.65
1: 10.0.0.1 (PC1) 0ms
2: 10.0.0.62 (R1 VLAN10) 1ms
3: 10.0.0.64 (R1 VLAN20) 2ms
4: 10.0.0.65 (PC3) 3ms

After Byzantine Detection (~10 seconds later):
PC1> tracert 10.0.0.65
1: 10.0.0.1 (PC1) 0ms
2: 10.0.0.62 (R1 VLAN10) 1ms
3: 10.0.0.64 (R1 VLAN20) 2ms     [SAME PATH — R1 is honest, stays primary]
4: 10.0.0.65 (PC3) 3ms

[If PC3 tries to use R3 as gateway during Byzantine window]
PC3> ping 10.0.0.129 (R3 VLAN20 interface)
Expected: FAIL (R3 drops it silently)

[After detection, R3 is excluded]
PC3> show ip route 10.0.0.129
Route not found (R3 gateway is no longer advertised by consensus)
```

---

## 7. Common Field-3 Mistakes

1. **Forgetting the P2P mesh links between routers** — if R1, R2, R3 are only connected to switches (not to each other), there's no mesh backbone for Byzantine detection or convergence signaling.

2. **Misconfiguring R3's drop ACL** — if you forget to apply the deny ACL to R3's VLAN20 interface, R3 won't be Byzantine, and the lab won't demonstrate Byzantine detection.

3. **Not enabling RIP or another routing protocol** — static routes alone don't allow the mesh to converge dynamically. RIP (or OSPF, BGP) is needed for routers to advertise routes and detect Byzantine claims.

4. **Measuring convergence time incorrectly** — convergence time should be measured from "Byzantine fault injected" to "traffic successfully re-routes via honest path," not from "fault detected in logs" (detection often happens after initial traffic loss).

5. **Confusing Byzantine resilience with Byzantine detection** — the lab tests that the mesh detects and recovers from Byzantine faults, not that it prevents them entirely (no system can). The recovery (re-routing) is the proof obligation.

6. **Not verifying that honest routes still work** — after adding Byzantine detection, ensure that VLAN10 and VLAN30 (which R3 claims honestly) still work. If they don't, you may have misconfigured R3's interface or a legitimate route was broken.

---

## 8. Troubleshooting by Field (Consensus-Based Diagnosis)

**Problem: R1 and R2 agree R3 is Byzantine, but R3's routes still appear in R1's routing table with high metric.**

```
Step 1: Check if R3's route is in "unreachable" state:
  R1# show ip route summary | include unreachable
  → If R3 routes appear with metric 254 (unreachable) or similar, they're isolated correctly.

Step 2: Verify RIP is actually routing-out R3's Byzantine status:
  R1# debug ip rip
  → Watch for RIP updates that exclude R3's routes or mark them with maximum metric (16).

Step 3: Check if the problem is just route visibility (acceptable) vs. traffic actually flowing through R3 (unacceptable):
  R1# show ip route 10.0.0.64
  → If the output shows R3 as a primary or secondary route, recheck R3's drop ACL.
  → If R3 is listed as "unreachable" or metric 254, the mesh has correctly isolated it.
```

**Problem: Byzantine detection logs appear, but traffic still fails to re-route to the honest path.**

```
Step 1: Verify R2's VLAN20 gateway is actually reachable:
  R1# ping 10.0.0.127 (R2's VLAN20 interface)
  → If ping fails, R2 might be down or misconfigured.

Step 2: Check if R2's route is in R1's routing table with a good metric:
  R1# show ip route | include "10.0.0.64"
  → Should show: S 10.0.0.64/26 [1/0] via 10.100.1.2 (R2) with metric 1 or 2 (depending on RIP update frequency)

Step 3: If R2 is reachable but traffic still fails, check switch-to-router uplinks:
  SW1# show vlan brief | include Healthcare
  → Verify ports connecting to R1 and R2 for VLAN20 are both active and in VLAN20.
```

---

## 9. Design Analysis (Field-3 Reasoning)

**Why a full mesh of routers (not a single centralized router)?**

The base lab's single router is a single point of failure: if R1 goes down, all inter-VLAN traffic stops. Field-3 removes that critical dependency. In Haiti's mesh, if one hotspot's router fails, traffic can still route through another community's router. This proves decentralized routing: no single trusted authority is required.

**Why Byzantine resilience specifically?**

Not all operators in Haiti's network are equally reliable or trustworthy. A Byzantine router might be misconfigured, compromised, or intentionally malicious. The mesh must detect and isolate Byzantine behavior automatically. This lab proves that consensus (quorum agreement among honest routers) can enforce routing integrity without a centralized authority to audit or punish Byzantine nodes.

**Why measure convergence time?**

A mesh can theoretically tolerate Byzantine faults, but if convergence takes 5 minutes, users experience 5 minutes of traffic loss or slow routing. The P38 proof obligation is < 30 seconds convergence, proving the mesh is operationally viable for real networks, not just theoretically sound.

---

## 10. Real-World Parallel: Haiti Deployment Phase

**Haiti Deployment Phase:** P38 pilot (50–100 nodes, mesh-connectivity module)
**Module:** distributed inter-VLAN routing (no centralized gateway)

**Linkage:** The P38 pilot deploys Community Services (VLAN10), Healthcare (VLAN20), and Education (VLAN30) across three hotspots. Each hotspot operator configures their router independently. One hotspot's router (Kòd-Yè) is either misconfigured or compromised: it claims to route Healthcare traffic but actually drops it, causing clinic staff to lose access to shared medical records.

This lab proves that:
1. The mesh can operate with three or more routers (no single point of failure).
2. Byzantine faults (lying routers) are detectable via traffic probes and consensus.
3. Convergence to honest paths is fast enough (< 30s) for users not to notice.

**Operational consequence:** If this lab's proof DOES NOT hold:
- P38 pilot must deploy with a centralized gateway server (less resilient, single point of failure).
- Haiti's distributed governance model (autonomous hotspot operators) conflicts with centralized routing control.
- Deployment blocked or requires extra monitoring and manual failover procedures.

**If this lab's proof DOES hold:**
- P38 pilot deploys fully distributed inter-VLAN routing with Byzantine resilience.
- No centralized gateway means no single operator controls traffic.
- Deployment proceeds with Haiti's intended governance model.

---

## 11. Stretch Goals

1. **Scale the Byzantine Test:** Add a fourth router (R4) and increase the number of Byzantine nodes to 2 (f=2). Verify that a 5-node network can tolerate 2 Byzantine nodes (requires quorum ≥ 2f+1 = 5, so at minimum capacity). Measure convergence time at this limit.

2. **Cryptographic Route Proofs:** Instead of simple traffic probes, implement HMAC-based route attestation: each router signs its route announcements with a shared key, and other routers verify the signature. Detects Byzantine lies more reliably than implicit probe-based detection.

3. **Convergence Time Optimization:** Reduce convergence time to < 10 seconds (Field-2 Geomagnetic stress test equivalent) by tuning RIP timers (hello interval, dead interval) and probe frequency. Measure the trade-off between fast convergence and overhead.

4. **Full Inter-VLAN Matrix Test:** For every pair of VLANs (VLAN10↔20, VLAN10↔30, VLAN20↔30), verify traffic can reach via at least two independent paths. Inject Byzantine faults on different VLANs simultaneously and verify quorum consensus still isolates all Byzantine nodes.

5. **Byzantine Recovery with Proof-of-Correction:** Simulate a Byzantine node that corrects its configuration (e.g., R3 removes the drop ACL from VLAN20). Verify the mesh re-accepts it back into quorum after a re-validation cycle, proving Byzantine recovery (not permanent punishment).

---

## 12. Self-Assessment (Field-3 BSL)

```
BSL-0 AWARENESS      - You've read this lab. You know "Byzantine" and "mesh routing" are involved.

BSL-1 LAB CAPABLE    - You completed this lab with the manual open: three routers configured,
                       Byzantine fault injected, traffic re-routed. Proof logged, convergence time recorded.

BSL-2 OFFLINE        - You could repeat this lab without the manual. You'd know to:
                       - Configure three routers as a mesh (P2P links + VLANs on each)
                       - Inject Byzantine fault (drop ACL on one VLAN)
                       - Measure convergence time
                       - Verify quorum isolation of Byzantine node

BSL-3 RECOVERABLE    - You could rebuild from the topology diagram. Given "prove distributed routing
                       mesh tolerates Byzantine faults with < 30s convergence," you'd know to:
                       - Create redundant paths (multiple routers per VLAN)
                       - Set up Byzantine node (claims routes, drops traffic)
                       - Test detection (probes fail, logs record it)
                       - Measure convergence (traffic re-routes to honest paths)

BSL-4 MAINTAINABLE   - You could modify this lab for different scenarios (4 routers, 2 Byzantine,
                       different VLAN count) and still prove the same obligation (Byzantine resilience).
                       You'd scale the quorum threshold (3-of-4, 3-of-5, etc.) appropriately.

BSL-5 TEACHABLE      - You could explain to someone else why distributed routing (no single gateway)
                       is necessary for Haiti's P38 mesh, and why Byzantine detection (not prevention)
                       is the operational guarantee. You'd correctly teach the convergence-time trade-off
                       (faster detection = higher overhead).

Target BSL for this lab: BSL-3 (recoverable) — distributed Byzantine-resilient routing is research-level;
                        BSL-3 is realistic for CCNA students working on applied research.
```

---

## 13. Key Concepts Demonstrated / What I Learned / Skills Practiced

**Key Concepts:**
- Full-mesh router topology (every router connected to every other).
- Distributed inter-VLAN gateways (no single authoritative router).
- Byzantine-fault detection via traffic probes and consensus voting.
- Convergence: automatic re-routing to honest paths after Byzantine isolation.
- Metrics and route prioritization (honest routes preferred over Byzantine).

**What I Learned:**
- Distributed routing requires explicit Byzantine detection; RIP/OSPF announce routes but don't verify they work.
- A mesh can tolerate Byzantine faults if quorum consensus isolates them quickly (< 30s for operational viability).
- Convergence time is measurable and critical: a theoretically sound design that takes 5 minutes to converge is operationally broken.
- Byzantine recovery (re-accepting corrected nodes) is important for humanitarian deployments (not permanent punishment).

**Skills Practiced:**
- Multi-router mesh topology design and configuration.
- Static and dynamic routing (RIP) in a mesh.
- Byzantine-fault injection (drop ACL) and detection (traffic probes).
- Convergence-time measurement and analysis.
- Quorum-based decision-making in distributed routing.
- Lab design for proving Byzantine resilience under realistic assumptions.

---

## References & Further Reading

- **IETF RFC 2453:** RIP Version 2 (routing-information protocol; used here for route announcements).
- **Castro & Liskov (1999):** "Practical Byzantine Fault Tolerance" (PBFT; formal Byzantine-resilience model).
- **Lamport et al. (1982):** "The Byzantine Generals Problem" (foundational Byzantine-fault theory).
- **Haiti D-Central Mesh Routing Design (Internal):** Specifies how routers reach consensus on valid inter-VLAN paths without centralized authority.

