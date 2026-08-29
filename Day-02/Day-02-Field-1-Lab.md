# Day 02 — Field 1 (Black Start): Network Cabling for Offline Resilience

---

## 0. Metadata

| Field | Value |
|---|---|
| **Field Focus** | Field 1: Black Start Systems |
| **Core Proof Obligation** | Cabling design survives offline operation; redundant media paths ensure intra-site connectivity persists during power loss; no dependency on centralized fiber management systems. |
| **Haiti Deployment Phase** | P38 pilot and onwards |
| **Estimated Time** | 2–2.5 hours |
| **Difficulty** | Intermediate |
| **Relationship to Base Lab** | Same sites (A, B) and cable selection rules, but **adds redundancy**: each inter-router link has both primary (fiber) and backup (copper) paths. Configuration includes failover to the backup path if primary link detects optical loss. |
| **Prerequisite** | Complete Day-02-Lab-Manual first. |

---

## 1. Business Context (Field-Specific Framing)

The base Day-02 topology assumes steady-state operation: each link is single-threaded (one fiber from R1 to R3, one copper from R3 to R4). But in a blackout scenario (power loss, then recovery), what if the fiber transceivers take time to re-sync? A backup copper path ensures intra-site connectivity doesn't blink even if fiber is slow to recover.

This variant proves: **redundant media ensure the network survives media-layer disruptions during cold-start recovery.**

---

## 2. Topology Diagram (Field-Specific Modifications)

**BASE TOPOLOGY (Day-02-Lab-Manual):**
```
R1 ← [Fiber 3km] ← R3
     [Copper 50m] (within Site A only)
```

**FIELD-1 VARIANT: Redundant Media**
```
R1 ← [Primary: Fiber 3km] ← R3
  ← [Backup: Copper 3km (degraded range, but survives power cycle)] ←
     
R3 ← [Primary: Multi-mode Fiber 250m] ← R4
  ← [Backup: Copper 250m (exceeds normal range, but used during cold recovery)] ←
```

**Key differences:**
- Each inter-site link has two physical paths: primary (preferred medium) and backup (copper)
- Routers use IP SLA or link-state tracking to detect primary link loss and failover to backup
- After power restores, fiber transceivers sync; traffic returns to primary
- Backup copper links are over-distance to the copper-rated 100m, but acceptable as failover-only

---

## 3. IP Addressing Plan (Field-Specific Annotations)

**Same as base Day-02, but with secondary IP addresses on backup copper links:**

| Link | Primary IP | Backup IP | Annotation |
|---|---|---|---|
| R1–R3 Fiber (primary) | 10.0.20.1 / 10.0.20.2 | (via primary) | Long-haul, preferred in steady state |
| R1–R3 Copper (backup) | (secondary) | 10.0.20.5 / 10.0.20.6 | Used only if fiber is down; /30 for failover subnet |
| R3–R4 Fiber (primary) | 10.0.8.1 / 10.0.8.2 | (via primary) | Medium-haul, preferred in steady state |
| R3–R4 Copper (backup) | (secondary) | 10.0.8.5 / 10.0.8.6 | Used only if fiber is down |

---

## 4. Configuration (Field-Specific Optimizations)

### 4.1 R1: Redundant Link Configuration

```text
! ===== PRIMARY FIBER INTERFACE =====
R1(config)#interface gigabitEthernet 0/1
R1(config-if)#description PRIMARY: Fiber to R3 (3 km, steady-state preferred)
R1(config-if)#ip address 10.0.20.1 255.255.255.252
R1(config-if)#no shutdown
R1(config-if)#exit

! ===== BACKUP COPPER INTERFACE =====
R1(config)#interface gigabitEthernet 0/2
R1(config-if)#description BACKUP: Copper to R3 (over-range, failover only)
R1(config-if)#ip address 10.0.20.5 255.255.255.252
R1(config-if)#no shutdown
R1(config-if)#exit

! ===== ROUTING: PRIMARY PREFERRED, BACKUP FALLBACK =====
R1(config)#ip route 192.168.2.0 255.255.255.0 10.0.20.2 1
! Primary route via fiber (administrative distance 1)

R1(config)#ip route 192.168.2.0 255.255.255.0 10.0.20.6 100
! Backup route via copper (administrative distance 100) — only used if primary fails
```

**Justification:** The lower administrative distance (1 vs. 100) makes the fiber route preferred during normal operation. If fiber detects loss (link down), Cisco IOS removes the primary route and the backup route becomes active.

### 4.2 R3: Redundant Configuration (Mirror R1)

```text
! ===== PRIMARY FIBER (to R1) =====
R3(config)#interface gigabitEthernet 0/1
R3(config-if)#description PRIMARY: Fiber to R1 (3 km)
R3(config-if)#ip address 10.0.20.2 255.255.255.252
R3(config-if)#no shutdown
R3(config-if)#exit

! ===== BACKUP COPPER (to R1) =====
R3(config)#interface gigabitEthernet 0/2
R3(config-if)#description BACKUP: Copper to R1 (failover)
R3(config-if)#ip address 10.0.20.6 255.255.255.252
R3(config-if)#no shutdown
R3(config-if)#exit

! ===== PRIMARY FIBER (to R4) =====
R3(config)#interface gigabitEthernet 0/3
R3(config-if)#description PRIMARY: MMF to R4 (250 m)
R3(config-if)#ip address 10.0.8.1 255.255.255.252
R3(config-if)#no shutdown
R3(config-if)#exit

! ===== BACKUP COPPER (to R4) =====
R3(config)#interface gigabitEthernet 0/4
R3(config-if)#description BACKUP: Copper to R4 (failover)
R3(config-if)#ip address 10.0.8.5 255.255.255.252
R3(config-if)#no shutdown
R3(config-if)#exit

! ===== ROUTING =====
R3(config)#ip route 192.168.1.0 255.255.255.0 10.0.20.1 1
R3(config)#ip route 192.168.1.0 255.255.255.0 10.0.20.5 100
R3(config)#ip route 192.168.2.0 255.255.255.0 10.0.8.2 1
R3(config)#ip route 192.168.2.0 255.255.255.0 10.0.8.6 100
```

---

## 5. Field-Specific Verification Steps

### Scenario 1: Steady-State Operation (Fiber Primary)

```text
Step 1: Power on all routers; verify fiber links come up first
  R1#show ip interface brief
  Expected: Fiber (Gi0/1) shows "up/up" before copper (Gi0/2)

Step 2: Check primary routes are active
  R1#show ip route 192.168.2.0
  Expected: Route via 10.0.20.2 (fiber) with distance 1 is listed
  
Step 3: Ping across sites uses fiber path
  PC1#ping 192.168.2.11
  Expected: Latency ~3-5 ms (fiber's 3 km path)
```

### Scenario 2: Primary Link Failure (Failover to Copper)

```text
Step 1: Simulate fiber link failure
  R1#configure terminal
  R1(config)#interface gigabitEthernet 0/1
  R1(config-if)#shutdown

Step 2: Verify failover occurs (within ~10 seconds)
  R1#show ip route 192.168.2.0
  Expected: Route now via 10.0.20.6 (copper) with distance 100 is active

Step 3: Ping should still work (degraded path)
  PC1#ping 192.168.2.11
  Expected: Replies still received (copper backup link active)
  Note: Latency may be higher due to over-distance copper, and packet loss possible

Step 4: Traffic continues despite fiber loss — PROOF OBJECTIVE MET
```

### Scenario 3: Cold-Start Recovery (Power Loss, Then Restore)

```text
Step 1: Simulate power loss by reloading all routers
  R1#reload
  R3#reload
  R4#reload

Step 2: Wait ~1 minute for all devices to boot
  ! During boot:
  ! - Copper links come up first (faster transceiver sync)
  ! - Fiber links syncing (may take 30+ seconds)
  ! - Backup routes active until fiber stabilizes

Step 3: Check link status during recovery
  R1#show ip interface brief
  Expected: Copper (Gi0/2) shows "up/up" before fiber (Gi0/1)

Step 4: Test inter-site connectivity during recovery
  PC1#ping 192.168.2.11
  Expected: Pings reply via copper backup while fiber syncs

Step 5: Once fiber stabilizes, verify traffic returns to primary
  ! Wait 1–2 minutes, then:
  R1#show ip route 192.168.2.0
  Expected: Primary route via 10.0.20.2 (fiber, distance 1) is back
  
  PC1#ping 192.168.2.11
  Expected: Latency returns to ~3-5 ms (fiber path)

PROOF OBJECTIVE MET: Redundant media enables cold-start recovery; backup copper ensures connectivity during fiber re-sync.
```

---

## 6. Expected Output Gallery

### 6.1 Routing Table (Steady State, Fiber Primary)

```text
R1#show ip route
Gateway of last resort is not set

     192.168.1.0/24 is directly connected, GigabitEthernet0/0
     192.168.2.0/24 [1/0] via 10.0.20.2, GigabitEthernet0/1  ← Fiber, primary
     10.0.20.0/30 is directly connected, GigabitEthernet0/1
     10.0.20.4/30 is directly connected, GigabitEthernet0/2
     203.0.113.0/30 [100/0] via 10.0.20.6                    ← Copper, backup (higher distance)
```

### 6.2 Routing Table (Fiber Down, Copper Active)

```text
R1#show ip route
Gateway of last resort is not set

     192.168.1.0/24 is directly connected, GigabitEthernet0/0
     192.168.2.0/24 [100/0] via 10.0.20.6, GigabitEthernet0/2  ← Copper, now active!
     10.0.20.0/30 [down/down] - link is down
     10.0.20.4/30 is directly connected, GigabitEthernet0/2
```

---

## 7. Common Field-Specific Mistakes

### Mistake 1: Not Assigning Secondary IPs to Backup Links

**What breaks:** Backup copper links are physically connected but traffic doesn't failover because the copper interfaces have no IP address.

**Fix:** Always assign a secondary IP subnet to each backup link (e.g., 10.0.20.4/30 for backup).

### Mistake 2: Using Same Subnet for Primary and Backup

**What breaks:** Both primary and backup links have the same IP subnet (e.g., 10.0.20.0/30). When primary fails, backup is activated, but routing table confusion occurs because Cisco tries to use the same next-hop for both.

**Fix:** Use different subnets for primary and backup (e.g., 10.0.20.0/30 for fiber, 10.0.20.4/30 for copper).

### Mistake 3: Forgetting to Enable `no shutdown` on Backup Interfaces

**What breaks:** Backup interfaces are administratively down by default; failover can't occur because the copper links are shut down.

**Fix:** Explicitly `no shutdown` every interface, including backup ones.

---

## 8. Troubleshooting by Field (Diagnostic Method)

### Problem: "Fiber Link is Down, But Traffic Doesn't Failover to Copper"

```text
Step 1: Verify copper interfaces are actually up
  R1#show ip interface brief | grep Gi0/2
  Expected: "Gi0/2 ... up up"
  If "down down": Run "no shutdown" on that interface

Step 2: Verify secondary routes are in the routing table
  R1#show ip route | grep 192.168.2.0
  Expected: Two routes listed (one via fiber distance 1, one via copper distance 100)
  If only one: Secondary route config is missing; add it

Step 3: Verify backup route has higher administrative distance
  R1#show ip route 192.168.2.0
  Expected: Copper route shows distance 100 (or higher)
  If distance < 50: Copper route might be preferred even with fiber up; increase distance

Step 4: Force failover test
  R1#configure terminal
  R1(config)#interface Gi0/1
  R1(config-if)#shutdown
  ! Wait 5 seconds
  R1#show ip route 192.168.2.0
  Expected: Copper route is now active (distance 100)
  If still showing fiber route: Cisco hasn't converged yet; wait 10 more seconds

Step 5: Test connectivity
  PC1#ping 192.168.2.11
  Expected: Replies via copper backup
  If timeout: Backup link is not functional; check cabling and IPs
```

---

## 9. Design Analysis: Field-Specific Reasoning

**Why does redundant media matter for Black Start?**

In the base Day-02 topology, a single fiber failure (broken transceiver, cut fiber, misaligned connector) severs inter-site connectivity entirely. In a blackout recovery scenario (where technicians may be physically present fixing power, not monitoring network status), a silent fiber failure could be undetected for hours.

Backup copper provides **graceful degradation**: when fiber fails, traffic automatically reroutes to copper, which keeps sites connected even if at reduced performance. When power is restored and fiber re-syncs, traffic returns to the primary path automatically.

This design ensures the network is **continuously operational during blackout recovery**, not silent-down until someone manually intervenes.

---

## 10. Real-World Parallel: Haiti Deployment Phase

**D-Central Module:** `mesh-connectivity` (Proof-of-Coverage + redundant mesh)

**Haiti Phase:** P38+ (redundancy becomes critical as scale grows)

**Linkage:** In P38 actual, hotspots rely on mesh links to reach each other. A single fiber cut (via construction damage, weather, vandalism) should not partition the mesh. Redundant copper links (or, in real P38, redundant RF links) ensure diversity. This lab proves the principle at 2-node scale.

---

## 11. Stretch Goals

- Implement IP SLA monitoring to measure active link availability and trigger failover faster
- Add a third path (e.g., satellite or LTE backup) alongside fiber and copper
- Simulate the exact timing of fiber transceiver re-sync after power loss vs. copper link availability

---

## 12. Self-Assessment (Field-Specific BSL)

```
BSL-3 RECOVERABLE
  - You can rebuild this topology with primary + backup links
  - You understand why backup subnet IPs differ from primary
  
BSL-4 MAINTAINABLE
  - You can adjust administrative distances to change failover timing
  - You can add a third backup link (RF, satellite) to the design
```

---

## End of Day-02-Field-1-Lab.md
