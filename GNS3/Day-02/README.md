# GNS3 Lab Build Instructions: Day 02 — Basic Routing & Static Routes

---

## 0. Overview

This README documents the GNS3 build for **Day 02: Basic Routing & Static Routes**, featuring:
- **Base Lab:** Three-branch topology (NY, Tokyo, Singapore)
- **7 Field Variants:** Alternative routing topologies and scaling scenarios

---

## 1. Prerequisite Images

Same as Day 01:
- VyOS 1.5.x routers
- Open vSwitch switches
- pfSense 2.7.x firewalls
- Alpine Linux end devices

---

## 2. Base Lab Topology

### 2.1 Node List (15 total nodes)

| Node ID | Name | Type | Interfaces | RAM | Notes |
|---------|------|------|-----------|-----|-------|
| 1–4 | PC0, PC1, SRV1, SRV2 | Alpine | eth0 | 128 MB | NY/Tokyo end devices |
| 5–7 | SGP1, SGP2, ATTACKER | Alpine | eth0 | 128 MB | Singapore/Internet end devices |
| 8–10 | SW1, SW2, SW3 | OVS | Gi0/1, Fa0/2–3 | 256 MB | Layer 2 switches |
| 11–13 | R1-NY, R2-TKY, R3-SGP | VyOS | eth0, eth1 | 512 MB | Branch routers |
| 14 | ISP-RTR | VyOS | eth0–2 | 512 MB | ISP backbone (3 WAN links) |
| 15 | (Optional) | — | — | — | FW3-SGP (if using separate VM) |

### 2.2 Key Modifications from Day 01

**New Nodes:**
- R3-SGP (router)
- SW3 (switch)
- SGP1, SGP2 (end devices)
- FW3-SGP (firewall)

**Modified Nodes:**
- ISP-RTR: Now has 3 Ethernet interfaces (eth0, eth1, eth2) instead of 2

**New Links:**
- R3-SGP eth0 ↔ SW3 Gi0/1 (trunk)
- R3-SGP eth1 ↔ FW3-SGP em0 (transit)
- FW3-SGP em1 ↔ ISP-RTR eth2 (WAN)
- ISP-RTR eth2 ↔ ATTACKER eth0 (internet access)
- SGP1, SGP2 ↔ SW3 access ports

### 2.3 Total Topology Statistics

**Nodes:** 15  
**Links:** 14 (11 from Day 01 + 3 new)  
**RAM:** ~7 GB  
**Key IP Subnets:** 9 (3 LANs + 3 transit + 3 WAN segments)

---

## 3. Build Instructions

### 3.1 Topology Build Workflow

**Step 1:** Import Day-01 base topology from GNS3

```bash
gns3 import-project --input day01-base.gns3
```

**Step 2:** Add new nodes to existing project

- Right-click canvas → **Add Node**
- Add R3-SGP (VyOS router)
- Add SW3 (OVS switch)
- Add SGP1, SGP2 (Alpine Linux)
- Add FW3-SGP (pfSense)

**Step 3:** Connect new links (see node/link summary below)

**Step 4:** Configure devices (see Day-02-Lab-Manual.md for CLI commands)

**Step 5:** Export updated project

```bash
gns3 export-project --project-id [ID] --output day02-base.gns3
```

---

## 4. Field Variant Topologies

### Field-1: Hub-and-Spoke (Centralized Routing)

**Concept:** All inter-site traffic flows through a central hub (NY acts as hub).

**Topology Change:**
- Remove direct ISP links from Tokyo and Singapore
- All traffic from Tokyo/Singapore → NY → ISP
- New segment: R2-TKY ↔ R1-NY direct link (192.168.50.0/30)
- New segment: R3-SGP ↔ R1-NY direct link (192.168.60.0/30)

**Nodes/Links:** 15 nodes, 15 links  
**Pros:** Centralized control, simplified ISP billing  
**Cons:** NY becomes bottleneck; if NY down, no inter-site communication

**Related Lab:** Day-02-Field-1-Lab.md (not documented yet)

---

### Field-2: Mesh Topology (Full Redundancy)

**Concept:** Every branch connects to every other branch directly.

**Topology Change:**
- Add direct links: R1-NY ↔ R2-TKY (192.168.50.0/30)
- Add direct links: R2-TKY ↔ R3-SGP (192.168.60.0/30)
- Add direct links: R3-SGP ↔ R1-NY (192.168.70.0/30)
- Keep ISP links (redundancy)

**Nodes/Links:** 15 nodes, 17 links  
**Pros:** Maximum redundancy; any single link failure is survived  
**Cons:** 9 static routes per router; complex troubleshooting

**Related Lab:** Day-02-Field-2-Lab.md (not documented yet)

---

### Field-3: Dual-ISP Failover

**Concept:** Primary and backup ISP links for high availability.

**Topology Change:**
- Add ISP-RTR-2 (secondary ISP)
- Add FW links to both ISPs: NY (dual), Tokyo (dual), Singapore (dual)
- Add backup WAN segments: 203.0.113.12/30, 203.0.113.16/30, 203.0.113.20/30

**Nodes/Links:** 16 nodes (added ISP-RTR-2), 20 links  
**Pros:** Automatic ISP failover if primary goes down  
**Cons:** Requires additional config (WAN failover rules, monitoring)

**Related Lab:** Day-02-Field-3-Lab.md (not documented yet)

---

### Field-4: Route Summarization (Aggregation)

**Concept:** Combine multiple subnets into fewer route entries.

**Example:**
- Instead of: `S 192.168.10.0/24`, `S 192.168.20.0/24`, `S 192.168.30.0/24`
- Use: `S 192.168.0.0/16` (summarizes all three)

**Network Change:**
- No node changes; only routing table entries
- Route summarization configured on ISP-RTR and firewalls
- Reduces memory usage and convergence time

**Nodes/Links:** 15 nodes, 14 links (unchanged)  
**Pros:** Smaller routing tables; faster convergence  
**Cons:** Less granular control; can't differentiate between subnets

**Related Lab:** Day-02-Field-4-Lab.md (not documented yet)

---

### Field-5: Asymmetric Routing (Testing Failure)

**Concept:** Intentional misconfiguration to test troubleshooting skills.

**Changes:**
- R3-SGP has route to NY (192.168.10.0/24) but NOT to Tokyo
- SGP1 → SRV1 (Tokyo): Fails
- SRV1 → SGP1: Succeeds (asymmetric)

**Lab Exercise:** Diagnose the missing route; fix it.

**Nodes/Links:** 15 nodes, 14 links (unchanged)  
**Purpose:** Reinforce understanding of return paths

**Related Lab:** Day-02-Field-5-Lab.md (not documented yet)

---

### Field-6: Dynamic Routing Preview (OSPF)

**Concept:** Replace static routes with OSPF; routers auto-discover routes.

**Changes:**
- Remove `ip route` commands from all routers
- Add `router ospf 1` configuration
- Advertise subnets via OSPF
- Routers automatically learn each other's routes

**Nodes/Links:** 15 nodes, 14 links (unchanged)  
**Pros:** Automatic failover; scales to 100+ branches  
**Cons:** More CPU; OSPF protocol traffic on links

**Configuration Example:**
```
[edit]
vyos@vyos# set protocols ospf area 0 network 192.168.10.0/24
vyos@vyos# set protocols ospf area 0 network 192.168.100.0/30
vyos@vyos# commit
```

**Related Lab:** Day-02-Field-6-Lab.md (preview of Day 07 OSPF)

---

### Field-7: Scaling Test (5 Branches)

**Concept:** Add two more branches (London, Sydney) and test static routing at scale.

**Additions:**
- R4-LDN (London): 192.168.40.0/24 LAN, 192.168.400.0/30 transit
- R5-SYD (Sydney): 192.168.50.0/24 LAN, 192.168.500.0/30 transit
- FW4-LDN, FW5-SYD (firewalls)
- SW4, SW5 (switches)
- 4 more end devices (LDN1, LDN2, SYD1, SYD2)

**Scaling Impact:**
- Each router now needs 5 static routes (instead of 3)
- ISP-RTR needs 5 destination routes
- Total: 25 route entries across 5 routers
- Configuration time: 30+ minutes

**Nodes/Links:** 23 nodes, 22 links  
**Lesson:** Why OSPF is necessary beyond 5 branches

**Related Lab:** Day-02-Field-7-Lab.md (stretch goal)

---

## 5. Node/Link Summary

### Base Topology Links

| Link ID | Source | Dest | Type | New? |
|---------|--------|------|------|------|
| L1–L10 | (Day 01 links) | — | — | No |
| **L11** | R3-SGP eth0 | SW3 Gi0/1 | Trunk | **Yes** |
| **L12** | R3-SGP eth1 | FW3-SGP em0 | Transit | **Yes** |
| **L13** | FW3-SGP em1 | ISP-RTR eth2 | WAN | **Yes** |
| **L14** | SGP1 eth0 | SW3 Fa0/2 | Access | **Yes** |
| **L15** | SGP2 eth0 | SW3 Fa0/3 | Access | **Yes** |

**Total:** 14 links (11 inherited + 3 new)

---

## 6. Build Script Reference

### 6.1 Quick Build (CLI)

```bash
#!/bin/bash
# build-day02.sh

# Start with Day-01 base
gns3 import-project --input day01-base.gns3

# Get project ID
PROJECT_ID=$(gns3 list-projects | grep "Day-01" | awk '{print $1}')

# Add R3-SGP node
gns3 add-node --project-id $PROJECT_ID \
  --name R3-SGP \
  --node-type qemu \
  --image vyos-equuleus-1.5.0-generic-amd64.iso \
  --ram 512

# Add SW3 node
gns3 add-node --project-id $PROJECT_ID \
  --name SW3 \
  --node-type ovs \
  --ram 256

# Add end devices
gns3 add-node --project-id $PROJECT_ID --name SGP1 --node-type qemu --image alpine-virt-3.19.1-x86_64.iso
gns3 add-node --project-id $PROJECT_ID --name SGP2 --node-type qemu --image alpine-virt-3.19.1-x86_64.iso

# Add FW3-SGP
gns3 add-node --project-id $PROJECT_ID --name FW3-SGP --node-type qemu --image pfsense-2.7.1.iso --ram 1024

# Create links (requires manual L11–L15 in GUI or API calls)
# ... (Link creation via API is complex; use GUI instead)

# Export updated project
gns3 export-project --project-id $PROJECT_ID --output day02-base.gns3

echo "Day-02 base topology built successfully!"
```

### 6.2 Manual GNS3 GUI Build

1. **Open Day-01 project**
2. **Drag nodes:**
   - R3-SGP (VyOS)
   - SW3 (OVS)
   - SGP1, SGP2 (Alpine)
   - FW3-SGP (pfSense)
3. **Connect links L11–L15** (see table above)
4. **Configure devices** (see Day-02-Lab-Manual.md)
5. **Export:** File > Export Project as .gns3 file

---

## 7. Configuration Verification

After topology build, verify:

- [ ] All 15 nodes present and named correctly
- [ ] All 14 links connected (green indicators in GNS3)
- [ ] ISP-RTR has 3 Ethernet interfaces (eth0, eth1, eth2)
- [ ] R3-SGP configured with 2 interfaces (eth0 LAN, eth1 transit)
- [ ] Routing tables on all routers include Singapore routes
- [ ] Three-way ping succeeds (NY ↔ Tokyo ↔ Singapore)
- [ ] Traceroute shows full paths across all three branches

---

## 8. Troubleshooting Guide

### Issue: Link Between R3-SGP and SW3 Shows Red

**Cause:** Interface mismatch or link not created in GNS3

**Fix:**
1. Right-click link → **Delete**
2. Right-click R3-SGP → **Manage Interfaces** → Verify eth0 exists
3. Right-click SW3 → **Manage Interfaces** → Verify Gi0/1 exists
4. Reconnect link by dragging R3-SGP eth0 to SW3 Gi0/1

---

### Issue: SGP1 Cannot Ping PC0

**Possible Causes:**
1. Route missing on R1-NY or R3-SGP
2. Firewall rule blocks traffic
3. ISP-RTR doesn't know about Singapore

**Diagnosis:**
```
R1-NY# show ip route | grep 192.168.30
! If no output, route is missing

R3-SGP# show ip route | grep 192.168.10
! If no output, return route is missing

ISP-RTR# show ip route | grep 192.168.30
! If no output, ISP backbone doesn't know about Singapore
```

**Fix:** Add missing routes (see Day-02-Lab-Manual.md)

---

## 9. Next Steps

- **Day-03:** Switch Fundamentals (VLAN configuration on all three SW nodes)
- **Day-04:** Device Security (SSH, enable secret on all routers)
- **Day-05:** Port Security (MAC limiting on access ports)
- **Day-06:** Access Control Lists (standard/extended ACLs on routers)
- **Day-07:** VLAN Basics (inter-VLAN routing concepts)
- **Day-08:** Spanning Tree Protocol (STP on multi-switch topology)

---

## 10. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-30 | Initial release: Day-02 base + 7 field variants |

---

**README Version:** 1.0  
**Last Updated:** 2026-08-30  
**Status:** Complete  
**Lab Focus:** Day 02 — Basic Routing & Static Routes
