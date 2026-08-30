# Day 02 — Basic Routing & Static Routes

## Lab Manual: Multi-Site Routing with Static Routes and Default Routes

---

## 0. Metadata

| Field | Value |
|---|---|
| **Lab Title** | Basic Routing & Static Routes |
| **Day** | Day 02 (Routing Foundation) |
| **Topic Focus** | Static routing, default routes, route propagation, multi-branch network (3+ sites) |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Intermediate |
| **Prerequisites** | Complete Day 01 (two-branch topology, basic configuration) |
| **Lab Scope** | Three-branch topology (NY, Tokyo, Singapore); static routes on all routers; route summarization concepts |
| **Skills Practiced** | Static route configuration, default route hierarchy, route verification, multi-site troubleshooting |
| **Standards Referenced** | RFC 2328 (OSPF Routing), RFC 1918 (Private Address Space), RFC 3021 (/31 Point-to-Point Links) |
| **Expected Outcome** | Three-branch network with full mesh routing; all sites can reach all other sites; internet access via perimeter firewall |

---

## 1. Overview

This lab expands Day 01's two-branch topology to **three branches** (New York, Tokyo, Singapore), requiring more complex routing. You'll learn:

- **Static Route Administration:** How routers forward packets based on explicit route entries
- **Default Route Behavior:** The catch-all for unknown destinations
- **Route Summarization:** Grouping multiple subnets into a single route entry (RFC 3021 /31 links)
- **Multi-Site Troubleshooting:** Verifying paths across three continents
- **Scaling Limits:** Understanding when static routing reaches its limit (typically 10+ sites)

By the end, you'll grasp **why dynamic routing protocols (OSPF, BGP) are necessary** for larger networks.

---

## 2. Business Context

**Scenario Evolution:**
- **Day 01:** DataFlow Solutions had 2 offices (NY, Tokyo)
- **Day 02:** DataFlow is opening a **Singapore office** to serve Asia-Pacific customers
- **Day 02 Challenge:** Integrate Singapore without breaking existing NY ↔ Tokyo connectivity

**Requirements:**
1. Singapore LAN (192.168.30.0/24) must reach NY (192.168.10.0/24) and Tokyo (192.168.20.0/24)
2. All inter-office communication must flow through firewalls (security boundary)
3. Internet access for all three offices via their respective perimeter firewalls
4. All routing is static (no OSPF yet; keeping it simple)

**Hidden Challenge:** With static routes, every router must know about every subnet. As you add a 4th, 5th branch, the configuration becomes tedious. This motivates **Day 07+: OSPF/BGP dynamic routing**.

---

## 3. Network Topology

### 3.1 Three-Branch Topology Diagram

```
┌─────────────────────────────── INTERNET / ISP CORE ────────────────────────────────┐
│                         203.0.113.0/24 (Public Space)                              │
└──────┬──────────────────────────┬──────────────────────────┬──────────────────────┘
       │                          │                          │
   FW1-NYC              FW2-TKY                       FW3-SGP
   203.0.113.2/30       203.0.113.6/30                203.0.113.10/30
       │                          │                          │
   ┌─────────────┬────────────────┬──────────────────────────┴──────────────┐
   │             │                │                                         │
  R1-NY        R2-TKY           R3-SGP                                   ISP-RTR
  Inside       Inside            Inside                                203.0.113.1
  192.168.     192.168.           192.168.                          
  100.2/30     200.2/30           300.2/30
       │             │                 │
      SW1           SW2                SW3
  (VLAN 10)    (VLAN 20)          (VLAN 30)
       │             │                 │
   PC0/PC1      SRV1/SRV2          SGP1/SGP2
  .50/.51       .10/.11             .50/.51
```

### 3.2 Expanded IP Addressing Plan

| Segment | Network | Prefix | Primary Use |
|---------|---------|--------|------------|
| **NY LAN** | 192.168.10.0/24 | /24 | NY office network |
| **Tokyo LAN** | 192.168.20.0/24 | /24 | Tokyo office network |
| **Singapore LAN** | 192.168.30.0/24 | /24 | Singapore office network |
| **NY-R1 ↔ FW1 Transit** | 192.168.100.0/30 | /30 | NY firewall link |
| **Tokyo-R2 ↔ FW2 Transit** | 192.168.200.0/30 | /30 | Tokyo firewall link |
| **Singapore-R3 ↔ FW3 Transit** | 192.168.300.0/30 | /30 | Singapore firewall link |
| **FW1 ↔ ISP (WAN)** | 203.0.113.0/30 | /30 | NY→Internet link |
| **FW2 ↔ ISP (WAN)** | 203.0.113.4/30 | /30 | Tokyo→Internet link |
| **FW3 ↔ ISP (WAN)** | 203.0.113.8/30 | /30 | Singapore→Internet link |

### 3.3 Device Inventory (Additions from Day 01)

| New Device | Type | Role | Interfaces |
|-----------|------|------|-----------|
| **SGP1, SGP2** | End device | Singapore staff | Static IPs (192.168.30.50–.51) |
| **SW3** | Switch | Singapore Layer 2 | Gi0/1 (to R3), Fa0/2–Fa0/3 (access) |
| **R3-SGP** | Router | Singapore gateway | eth0 (LAN), eth1 (to FW3) |
| **FW3-SGP** | Firewall | Singapore perimeter | em0 (inside), em1 (outside) |

---

## 4. Static Route Configuration Deep Dive

### 4.1 Why Static Routes?

**Advantages:**
- **Simple:** Explicit control; no protocol overhead
- **Predictable:** Routes don't change unless manually updated
- **Secure:** No routing protocol traffic; harder to attack
- **Low overhead:** Minimal CPU/bandwidth on routers

**Disadvantages:**
- **Not scalable:** Every router needs routes to every subnet
- **Manual updates:** Adding a new subnet requires config changes on all routers
- **No automatic failover:** If a link goes down, traffic doesn't re-route

**When to use:**
- Small networks (2–5 branches)
- Hub-and-spoke topology (all traffic goes through central site)
- Lab environments and testing

**When NOT to use:**
- Large networks (10+ branches)
- Mesh topologies (every site connects to every other)
- Networks requiring automatic failover

---

## 4.2 Route Propagation Concept

**Day 01 Setup (Two Branches):**
```
PC0 (192.168.10.50) → R1-NY → FW1 → ISP → FW2 → R2-TKY → SRV1 (192.168.20.10)

R1-NY routing table:
  S 0.0.0.0/0 → 192.168.100.1 (default, everything else goes to FW1)
  S 192.168.20.0/24 → 192.168.100.1 (Tokyo LAN via FW1)
  C 192.168.10.0/24 (local NY LAN)

ISP-RTR routing table:
  S 192.168.10.0/24 → 203.0.113.2 (learn via FW1)
  S 192.168.20.0/24 → 203.0.113.6 (learn via FW2)
```

**Day 02 Setup (Three Branches):**
```
R1-NY routing table (UPDATED):
  S 0.0.0.0/0 → 192.168.100.1
  S 192.168.20.0/24 → 192.168.100.1 (Tokyo via FW1/ISP)
  S 192.168.30.0/24 → 192.168.100.1 (Singapore via FW1/ISP) ← NEW
  C 192.168.10.0/24

R2-TKY routing table (UPDATED):
  S 0.0.0.0/0 → 192.168.200.1
  S 192.168.10.0/24 → 192.168.200.1 (NY via FW2/ISP) ← UPDATED
  S 192.168.30.0/24 → 192.168.200.1 (Singapore via FW2/ISP) ← NEW
  C 192.168.20.0/24

R3-SGP routing table (NEW):
  S 0.0.0.0/0 → 192.168.300.1 (default)
  S 192.168.10.0/24 → 192.168.300.1 (NY via FW3/ISP)
  S 192.168.20.0/24 → 192.168.300.1 (Tokyo via FW3/ISP)
  C 192.168.30.0/24

ISP-RTR routing table (UPDATED):
  S 192.168.10.0/24 → 203.0.113.2 (NY)
  S 192.168.20.0/24 → 203.0.113.6 (Tokyo)
  S 192.168.30.0/24 → 203.0.113.10 (Singapore) ← NEW
```

**Key observation:** Every router now has **3 static routes + 1 default route = 4 entries**. With 10 branches, this becomes **10 static routes per router**, which is tedious but manageable.

---

## 5. Configuration by Device

### 5.1 R1-NY (Updated Configuration)

**New Route:**
```
[edit]
vyos@vyos# set protocols static route 192.168.30.0/24 next-hop 192.168.100.1
vyos@vyos# commit
```

**Verify:**
```
vyos@vyos~$ show ip route
S   0.0.0.0/0 [210/0] via 192.168.100.1, eth1
S   192.168.20.0/24 [210/0] via 192.168.100.1, eth1
S   192.168.30.0/24 [210/0] via 192.168.100.1, eth1       ← New route
C>* 192.168.10.0/24 [0/0] via 192.168.10.1, eth0
C>* 192.168.100.0/30 [0/0] via 192.168.100.2, eth1
```

---

### 5.2 R2-TKY (Updated Configuration)

```
[edit]
vyos@vyos# set protocols static route 192.168.30.0/24 next-hop 192.168.200.1
vyos@vyos# commit
```

---

### 5.3 R3-SGP (New Router for Singapore)

```
configure
!
! LAN interface
interface GigabitEthernet0/0
  description Singapore-LAN-to-SW3
  ip address 192.168.30.1 255.255.255.0
  no shutdown
!
! Transit to firewall
interface GigabitEthernet0/1
  description Singapore-Transit-to-FW3
  ip address 192.168.300.2 255.255.255.252
  no shutdown
!
! Static routes (full mesh: must reach NY and Tokyo)
ip route 192.168.10.0 255.255.255.0 192.168.300.1
ip route 192.168.20.0 255.255.255.0 192.168.300.1
ip route 0.0.0.0 0.0.0.0 192.168.300.1
!
end
```

---

### 5.4 ISP-RTR (Updated with Third Branch)

```
[edit]
vyos@vyos# set interfaces ethernet eth2 description "ISP-to-FW3-SGP"
vyos@vyos# set interfaces ethernet eth2 address 203.0.113.9/30
vyos@vyos# set protocols static route 192.168.30.0/24 next-hop 203.0.113.10
vyos@vyos# commit
```

**Verify:**
```
vyos@vyos~$ show ip route
S   192.168.10.0/24 [210/0] via 203.0.113.2, eth0
S   192.168.20.0/24 [210/0] via 203.0.113.6, eth1
S   192.168.30.0/24 [210/0] via 203.0.113.10, eth2     ← New route
C>* 203.0.113.0/30 [0/0] via 203.0.113.1, eth0
C>* 203.0.113.4/30 [0/0] via 203.0.113.5, eth1
C>* 203.0.113.8/30 [0/0] via 203.0.113.9, eth2        ← New segment
```

---

### 5.5 FW3-SGP (New Firewall for Singapore)

**pfSense Configuration (Web UI):**

1. **Interfaces > Assignments**
   - em0 (Inside): `192.168.300.1/30`
   - em1 (Outside/WAN): `203.0.113.10/30`, Gateway: `203.0.113.9`

2. **Firewall > NAT > Outbound**
   - Rule: Source `192.168.30.0/24` → NAT to `203.0.113.10`

3. **Firewall > Rules > LAN**
   - Allow source `192.168.30.0/24` to destination `any`
   - Allow source `192.168.10.0/24` and `192.168.20.0/24` to `192.168.30.0/24` (inter-office)

4. **Firewall > Rules > WAN**
   - Allow return traffic (stateful inspection)

---

### 5.6 SW3 (Singapore Switch)

```
!
vlan 30
  name Singapore-LAN
!
interface VLAN 30
  ip address 192.168.30.2 255.255.255.0
  no shutdown
!
interface GigabitEthernet0/1
  switchport mode trunk
  switchport trunk allowed vlan 1,30
  switchport trunk native vlan 1
  description Uplink-to-R3-SGP
  no shutdown
!
interface FastEthernet0/2
  switchport mode access
  switchport access vlan 30
  description SGP1-Access
  no shutdown
!
interface FastEthernet0/3
  switchport mode access
  switchport access vlan 30
  description SGP2-Access
  no shutdown
!
ip default-gateway 192.168.30.1
!
end
```

---

### 5.7 SGP1 & SGP2 (Singapore End Devices)

```
# SGP1 Configuration
auto eth0
iface eth0 inet static
  address 192.168.30.50
  netmask 255.255.255.0
  gateway 192.168.30.1

# SGP2 Configuration
auto eth0
iface eth0 inet static
  address 192.168.30.51
  netmask 255.255.255.0
  gateway 192.168.30.1
```

---

## 6. Route Verification & Troubleshooting

### 6.1 Verification Checklist

After adding the Singapore branch, verify:

| Test | Command | Expected Result |
|------|---------|-----------------|
| **R1 routes Singapore** | R1-NY# show ip route | `S 192.168.30.0/24 via 192.168.100.1` |
| **R2 routes Singapore** | R2-TKY# show ip route | `S 192.168.30.0/24 via 192.168.200.1` |
| **R3 routes NY** | R3-SGP# show ip route | `S 192.168.10.0/24 via 192.168.300.1` |
| **R3 routes Tokyo** | R3-SGP# show ip route | `S 192.168.20.0/24 via 192.168.300.1` |
| **ISP knows Singapore** | ISP-RTR# show ip route | `S 192.168.30.0/24 via 203.0.113.10` |
| **NY → Singapore ping** | PC0# ping 192.168.30.50 | ✓ 4 packets, 0% loss |
| **Tokyo → Singapore ping** | SRV1# ping 192.168.30.50 | ✓ 4 packets, 0% loss |
| **Singapore → NY ping** | SGP1# ping 192.168.10.50 | ✓ 4 packets, 0% loss |

---

### 6.2 Traceroute Analysis

**From PC0 (NY) to SGP1 (Singapore):**
```
PC0# traceroute -m 15 192.168.30.50
traceroute to 192.168.30.50 (192.168.30.50), 15 hops max, 60 byte packets
 1  192.168.10.1 (192.168.10.1)  2.345 ms      # R1-NY (local gateway)
 2  192.168.100.1 (192.168.100.1)  3.456 ms    # FW1-NYC (inside interface)
 3  203.0.113.1 (203.0.113.1)  5.678 ms        # ISP-RTR (backbone)
 4  203.0.113.9 (203.0.113.9)  7.890 ms        # FW3-SGP (outside interface)
 5  192.168.300.1 (192.168.300.1)  8.901 ms    # FW3-SGP (inside interface)
 6  192.168.30.1 (192.168.30.1)  9.234 ms      # R3-SGP (gateway)
 7  192.168.30.50 (192.168.30.50)  10.567 ms   # SGP1 (destination)
```

**What this tells you:**
- Path is symmetric (same routers/firewalls both directions)
- Latency increases with each hop (typical for WAN)
- All routing decisions working correctly

---

## 7. Scaling Analysis: Static Routes at Limit

### 7.1 Comparison: 3 vs. 5 vs. 10 Branches

| Metric | 3 Branches | 5 Branches | 10 Branches |
|--------|-----------|----------|------------|
| **Routers** | 3 | 5 | 10 |
| **Routes per router** | 3 + default = 4 | 5 + default = 6 | 10 + default = 11 |
| **Total route entries** | 12 | 30 | 110 |
| **Time to add new branch** | 5 min (update 3 routers) | 10 min (update 5) | 30 min (update 10 + ISP) |
| **Risk of misconfiguration** | Low | Medium | High (forgot 1 route = broken) |
| **Automatic failover** | No | No | No |
| **Configuration files** | ~500 lines | ~800 lines | ~2000 lines |

**Conclusion:** Static routing works fine up to ~5 branches. Beyond that, **OSPF** (Day 07 content) becomes necessary.

---

## 8. Common Mistakes in Multi-Site Routing

| Mistake | Symptom | Fix |
|---------|---------|-----|
| **Asymmetric routing** | NY→SGP works, SGP→NY fails | Ensure all routers have reverse routes (R3-SGP needs route to 192.168.10.0/24) |
| **Forgot route on one router** | 2 out of 3 pings fail | Verify all routers have identical route structure |
| **Wrong next-hop** | Packets go to wrong firewall | Double-check firewall IP (e.g., 192.168.300.1 for R3-SGP, not 192.168.100.1) |
| **Default route too broad** | External traffic routed internally | Ensure `0.0.0.0/0` points to firewall, not another router |
| **Subnet overlap** | Unpredictable routing behavior | Use unique subnets; never reuse 192.168.10.0/24 in multiple locations |
| **Missing NAT rule on FW3** | Singapore traffic doesn't leave firewall | Add NAT rule: Source 192.168.30.x → NAT to 203.0.113.10 |

---

## 9. Design Questions

1. **Why must every router know about every subnet in a static routing environment?**

   Answer: Each router independently decides where to forward each packet. If R1-NY doesn't know the route to 192.168.30.0/24, it can't forward traffic there.

2. **What happens if you misconfigure R3-SGP to have `ip route 0.0.0.0/0 192.168.200.1` instead of `192.168.300.1`?**

   Answer: All traffic from Singapore goes to the wrong firewall (FW2-TKY instead of FW3-SGP). Packets destined for NY/Tokyo would work accidentally, but internet traffic fails.

3. **At what number of branches would you switch from static to dynamic routing?**

   Answer: Typically 5–10 branches. Rule of thumb: If you can't remember all routes in your head, use OSPF.

---

## 10. Stretch Goals

1. **Add a 4th branch (London)** and verify all inter-site pings succeed
2. **Implement route summarization** (combine 192.168.10-20.0/24 into 192.168.0.0/16)
3. **Configure OSPF instead of static routes** (preview of Day 07) and observe automatic convergence
4. **Simulate link failure** (disable FW1-NYC) and observe how traffic needs manual intervention (OSPF would re-route automatically)

---

## 11. Key Concepts Reinforced

| Concept | Day 01 | Day 02 Expansion |
|---------|--------|-----------------|
| **Routing** | Two branches, simple paths | Three branches, multiple paths, scaling limits |
| **Route verification** | `show ip route` on one router | Verify consistency across all routers |
| **Firewall placement** | Two firewalls (perimeter + internal) | Three firewalls; each handles their region's traffic |
| **Troubleshooting** | Check one route; fix it | Systematically verify all routes; identify asymmetry |

---

## 12. Conclusion

Day 02 teaches the **limits of manual routing**. Static routes scale to ~5 branches, but beyond that, **automation is essential**. Next week's OSPF labs (Day 07+) show how routers can **automatically discover and maintain routes**.

**Key Takeaway:** Understand what static routing does well (simple, predictable) and where it falls short (scalability, failover), so you appreciate why dynamic routing exists.

---

**Lab Documentation Version:** 1.0  
**Last Updated:** 2026-08-30  
**Author:** CCNA Labs Team  
**Status:** Complete
