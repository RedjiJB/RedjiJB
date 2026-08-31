# Day 18 Lab Manual — Dynamic Routing Introduction: OSPF Basics and Neighbor Adjacency

---

## 0. Metadata

| Field | Value |
|---|---|
| **Objective** | Master OSPF fundamentals by configuring a three-branch network where routers automatically discover topology and calculate optimal paths. |
| **Exam Relevance** | CCNA 200-301 Domain 3; CCNP Route 300-101 OSPF Concepts |
| **RFC Reference** | **RFC 2328** — OSPF Version 2 Protocol Specification |
| **Prerequisites** | Days 01-17 (static routing, IOS CLI, subnetting) |
| **Time Estimate** | 4-5 hours (first); 1.5-2 hours (repeat) |
| **Difficulty** | ⭐⭐⭐☆☆ (Intermediate) |
| **Lab Scope** | Three-branch topology; single-area OSPF (Area 0); no firewalls; focus on routing only |
| **Expected Outcome** | Full mesh OSPF routing; automatic path calculation; sub-10-second convergence on link failure |

---

## 1. Lab Overview

**Static Routing (Days 01-17):** You manually type every route. Adding a new branch requires updating routes on all existing routers.

**Dynamic Routing (Today):** Routers discover each other automatically and calculate paths. Adding a new branch requires zero changes to existing routers.

**OSPF (Open Shortest Path First):**
- **Open** — Standardized in RFC 2328 (vendor-independent)
- **Shortest Path First** — Uses Dijkstra's SPF algorithm for mathematically optimal paths
- **Link-State** — Routers exchange full topology data (who connects to whom + link costs)

**Why Bother?**
- Static routing: 100 routers = 10,000+ manual routes
- OSPF: 100 routers = 0 manual routes (all automatic)
- Link fails? OSPF converges in seconds; static routes require manual intervention

---

## 2. Business Context

DataFlow Solutions now operates three branch offices (NY, Tokyo, Singapore). With static routing, adding a 4th branch requires manual route updates on 3 existing routers. With OSPF, adding a 4th branch requires ZERO changes to existing routers — the new branch announces itself and routes propagate automatically.

**Success Criteria:**
- All branches reach all other branches automatically
- Convergence time: < 10 seconds after link failure  
- No manual route provisioning needed

---

## 3. Topology

```
R1-NY (192.168.10.1)
    │ Gi0/0 LAN
    ├─ SW1 → PC0, PC1
    │ Gi0/1 Transit 192.168.100.1/30
    │
    ├──────192.168.100.0/30──────┐
                                  │
                            R2-TKY (192.168.20.1)
                                  │ Gi0/0 Transit 192.168.100.2/30
                                  │ Gi0/1 LAN
                                  ├─ SW2 → SRV1, SRV2
                                  │ Gi0/2 Transit 192.168.200.1/30
                                  │
                                  ├──────192.168.200.0/30──────┐
                                                                │
                                                          R3-SGP (192.168.30.1)
                                                                │ Gi0/0 Transit
                                                                │ Gi0/1 LAN
                                                                ├─ SW3 → SGP1, SGP2
```

All routers in OSPF Area 0 (single-area design)

---

## 4. IP Addressing Plan

| Segment | Network | Prefix | Purpose |
|---------|---------|--------|---------|
| NY LAN | 192.168.10.0 | /24 | 254 hosts (office growth) |
| Tokyo LAN | 192.168.20.0 | /24 | 254 hosts |
| Singapore LAN | 192.168.30.0 | /24 | 254 hosts |
| R1-R2 Transit | 192.168.100.0 | /30 | 2 hosts (exact fit for point-to-point) |
| R2-R3 Transit | 192.168.200.0 | /30 | 2 hosts |

**Device IP Table:**

| Device | Interface | IP | Mask | Connects To |
|--------|-----------|---|------|-------------|
| R1-NY | Gi0/0 | 192.168.10.1 | /24 | SW1 |
| R1-NY | Gi0/1 | 192.168.100.1 | /30 | R2-TKY Gi0/0 |
| R2-TKY | Gi0/0 | 192.168.100.2 | /30 | R1-NY Gi0/1 |
| R2-TKY | Gi0/1 | 192.168.20.1 | /24 | SW2 |
| R2-TKY | Gi0/2 | 192.168.200.1 | /30 | R3-SGP Gi0/0 |
| R3-SGP | Gi0/0 | 192.168.200.2 | /30 | R2-TKY Gi0/2 |
| R3-SGP | Gi0/1 | 192.168.30.1 | /24 | SW3 |
| PC0 | NIC | 192.168.10.50 | /24 | GW: 192.168.10.1 |
| PC1 | NIC | 192.168.10.51 | /24 | GW: 192.168.10.1 |
| SRV1 | NIC | 192.168.20.10 | /24 | GW: 192.168.20.1 |
| SRV2 | NIC | 192.168.20.11 | /24 | GW: 192.168.20.1 |
| SGP1 | NIC | 192.168.30.50 | /24 | GW: 192.168.30.1 |
| SGP2 | NIC | 192.168.30.51 | /24 | GW: 192.168.30.1 |

---

## 5. Configuration: R1-NY

```bash
# Basic setup
Router>enable
Router#conf t
Router(config)#hostname R1-NY
R1-NY(config)#no ip domain-lookup
R1-NY(config)#enable secret class
R1-NY(config)#service password-encryption
R1-NY(config)#banner motd #
AUTHORIZED USE ONLY - R1-NY
#

# Interfaces
R1-NY(config)#interface Gi0/0
R1-NY(config-if)#description LAN to SW1
R1-NY(config-if)#ip address 192.168.10.1 255.255.255.0
R1-NY(config-if)#no shutdown
R1-NY(config-if)#exit
R1-NY(config)#interface Gi0/1
R1-NY(config-if)#description Transit to R2-TKY
R1-NY(config-if)#ip address 192.168.100.1 255.255.255.252
R1-NY(config-if)#no shutdown
R1-NY(config-if)#exit

# OSPF Configuration
R1-NY(config)#router ospf 1
R1-NY(config-router)#network 192.168.10.0 0.0.0.255 area 0
R1-NY(config-router)#network 192.168.100.0 0.0.0.3 area 0
R1-NY(config-router)#end

# Save
R1-NY#copy running-config startup-config
```

**Key Points:**
- `network 192.168.10.0 0.0.0.255` uses WILDCARD mask (inverse of subnet: /24 = 255.255.255.0 → wildcard 0.0.0.255)
- `area 0` is the backbone area (mandatory)
- Routers send OSPF Hello packets automatically; neighbors form within seconds

---

## 6. Configuration: R2-TKY

```bash
Router>enable
Router#conf t
Router(config)#hostname R2-TKY
R2-TKY(config)#no ip domain-lookup
R2-TKY(config)#enable secret class
R2-TKY(config)#service password-encryption
R2-TKY(config)#banner motd #
AUTHORIZED USE ONLY - R2-TKY
#

R2-TKY(config)#interface Gi0/0
R2-TKY(config-if)#description Transit to R1-NY
R2-TKY(config-if)#ip address 192.168.100.2 255.255.255.252
R2-TKY(config-if)#no shutdown
R2-TKY(config-if)#exit
R2-TKY(config)#interface Gi0/1
R2-TKY(config-if)#description LAN to SW2
R2-TKY(config-if)#ip address 192.168.20.1 255.255.255.0
R2-TKY(config-if)#no shutdown
R2-TKY(config-if)#exit
R2-TKY(config)#interface Gi0/2
R2-TKY(config-if)#description Transit to R3-SGP
R2-TKY(config-if)#ip address 192.168.200.1 255.255.255.252
R2-TKY(config-if)#no shutdown
R2-TKY(config-if)#exit

R2-TKY(config)#router ospf 1
R2-TKY(config-router)#network 192.168.100.0 0.0.0.3 area 0
R2-TKY(config-router)#network 192.168.20.0 0.0.0.255 area 0
R2-TKY(config-router)#network 192.168.200.0 0.0.0.3 area 0
R2-TKY(config-router)#end

R2-TKY#copy running-config startup-config
```

**R2 has THREE network statements** (middle router, three interfaces)

---

## 7. Configuration: R3-SGP

```bash
Router>enable
Router#conf t
Router(config)#hostname R3-SGP
R3-SGP(config)#no ip domain-lookup
R3-SGP(config)#enable secret class
R3-SGP(config)#service password-encryption
R3-SGP(config)#banner motd #
AUTHORIZED USE ONLY - R3-SGP
#

R3-SGP(config)#interface Gi0/0
R3-SGP(config-if)#description Transit to R2-TKY
R3-SGP(config-if)#ip address 192.168.200.2 255.255.255.252
R3-SGP(config-if)#no shutdown
R3-SGP(config-if)#exit
R3-SGP(config)#interface Gi0/1
R3-SGP(config-if)#description LAN to SW3
R3-SGP(config-if)#ip address 192.168.30.1 255.255.255.0
R3-SGP(config-if)#no shutdown
R3-SGP(config-if)#exit

R3-SGP(config)#router ospf 1
R3-SGP(config-router)#network 192.168.200.0 0.0.0.3 area 0
R3-SGP(config-router)#network 192.168.30.0 0.0.0.255 area 0
R3-SGP(config-router)#end

R3-SGP#copy running-config startup-config
```

---

## 8. Verification

### Show Neighbors

```bash
R1-NY#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
192.168.100.2   128   FULL/BDR        00:00:38    192.168.100.2   Gi0/1
```

**Expected:** One neighbor (R2). State = FULL. Takes 30 seconds max to appear.

**From R2 (middle router):**

```bash
R2-TKY#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
192.168.10.1    128   FULL/DR         00:00:35    192.168.100.1   Gi0/0
192.168.30.1    128   FULL/BDR        00:00:38    192.168.200.2   Gi0/2
```

**Expected:** Two neighbors (R1 and R3).

### Show Routing Table

```bash
R1-NY#show ip route
O     192.168.10.0/24 is directly connected, GigabitEthernet0/0
O     192.168.20.0/24 via 192.168.100.2, 00:00:15, GigabitEthernet0/1
O     192.168.30.0/24 via 192.168.100.2, 00:00:15, GigabitEthernet0/1
O     192.168.100.0/30 is directly connected, GigabitEthernet0/1
O     192.168.200.0/30 via 192.168.100.2, 00:00:15, GigabitEthernet0/1
```

**Key observation:** R1 automatically learned Tokyo (192.168.20.0) and Singapore (192.168.30.0) routes WITHOUT manually typing them. This is OSPF's power!

### Test Connectivity

```bash
PC0>ping 192.168.30.50
Reply from 192.168.30.50: bytes=32 time=1ms TTL=125
Reply from 192.168.30.50: bytes=32 time=1ms TTL=125
Reply from 192.168.30.50: bytes=32 time=1ms TTL=125
Reply from 192.168.30.50: bytes=32 time=1ms TTL=125

Ping statistics for 192.168.30.50:
    Packets sent = 4, Received = 4, Lost = 0%
```

**Proof:** End-to-end connectivity across all three branches works!

---

## 9. Common Mistakes

1. **Wildcard mask typo** — Used subnet mask instead of wildcard in `network` statement
   - Wrong: `network 192.168.10.0 255.255.255.0 area 0`
   - Right: `network 192.168.10.0 0.0.0.255 area 0`
   - Symptom: OSPF runs but doesn't advertise networks

2. **Forgot `no shutdown`** — Interface stays administratively down
   - Symptom: Neighbors never form
   - Fix: `interface Gi0/0` → `no shutdown`

3. **Typo in network statement** — Wrong subnet advertised
   - Example: `network 192.168.101.0` instead of `192.168.100.0`
   - Symptom: Interface doesn't run OSPF
   - Fix: Verify `show ip ospf interface` lists expected interfaces

4. **Neighbors stuck in EXSTART/LOADING** — Stalled state machine
   - Likely: Link down or mismatched timers
   - Wait 30 seconds; if still stuck, check link with `show ip interface brief`

5. **No routes in table** — OSPF configured but not working
   - Check: `show ip ospf neighbor` (must show FULL state)
   - Check: `show ip ospf interface` (lists interfaces running OSPF)

---

## 10. Design Analysis

**Why OSPF over static routes?**

| Criterion | Static | OSPF |
|---|---|---|
| **5 routers** | Tedious | Easy |
| **50 routers** | Impractical | Standard practice |
| **Link fails** | Manual fix | Auto-reroute (5 sec) |
| **Add new site** | 5+ manual changes | 0 changes to existing routers |
| **Vendor-lock** | Sometimes Cisco-only features | RFC 2328 (multi-vendor) |

For any network > 5 routers, OSPF (or BGP) is mandatory.

---

## 11. Real-World Parallel

**You'd see this when:**
- Network grows from 2 branches to 10 → static routing becomes unmaintainable → migrate to OSPF
- Link fails at 2 AM → OSPF converges in 10 seconds → customer doesn't even notice
- New branch office opens → plug in router, configure OSPF, instant global connectivity

---

## 12. Stretch Goals

1. Add 4th branch (London) without changing R1, R2, R3
2. Observe convergence time when R1-R2 link fails (should be ~40 seconds)
3. Lower OSPF timers to speed up convergence (advanced; Day 19)

---

## 13. Skills Practiced

- OSPF configuration from scratch
- Neighbor adjacency verification
- Routing table interpretation (identifying learned vs. direct routes)
- Multi-site network convergence
- Basic OSPF troubleshooting

---

**Next: Day 19 — OSPF Single-Area Configuration & Metrics**