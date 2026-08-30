# GNS3 Lab Build Instructions: Day 03 — Switch Fundamentals

---

## 0. Overview

Day 03 focuses on **Layer 2 switching concepts** using the same topology from Days 01–02, but with emphasis on VLAN configuration, MAC learning, and trunk/access port setup.

---

## 1. Base Lab Topology

**Nodes:** 15 (same as Day 02)  
**Focus:** Three switches (SW1, SW2, SW3) with VLAN configuration  
**Key Difference:** Emphasis on VLAN segmentation and MAC address table management

### 1.1 Switch Configuration Summary

| Switch | Node | LAN VLAN | VLAN Ports | Trunk Ports | SVI IP |
|--------|------|----------|-----------|------------|--------|
| **SW1** | SW1 | VLAN 10 | Fa0/2–3 (PC0, PC1) | Gi0/1 (to R1) | 192.168.10.2 |
| **SW2** | SW2 | VLAN 20 | Fa0/2–3 (SRV1, SRV2) | Gi0/1 (to R2) | 192.168.20.2 |
| **SW3** | SW3 | VLAN 30 | Fa0/2–3 (SGP1, SGP2) | Gi0/1 (to R3) | 192.168.30.2 |

---

## 2. Field Variant Topologies

### Field-1: VLAN Hopping Attack Simulation

**Concept:** Demonstrate trunk port security vulnerability.

**Changes:**
- Configure trunk port with VLAN 1 as native VLAN
- Intentionally send untagged frames from attacker
- Untagged frames land in VLAN 1 (security breach)

**Lab Exercise:** Detect and mitigate VLAN hopping by:
1. Changing native VLAN to unused VLAN (999)
2. Disabling unused trunk ports
3. Verifying attack is blocked

**Related Lab:** Day-03-Field-1-Lab.md

---

### Field-2: VLAN Trunking Protocol (VTP)

**Concept:** Automate VLAN propagation across switches using VTP.

**Changes:**
- SW1: VTP server (distributes VLAN configs)
- SW2, SW3: VTP clients (receive VLAN configs)
- Add new VLAN (VLAN 100) on SW1 server
- VLAN 100 automatically appears on SW2, SW3

**Configuration Example:**
```
Switch# configure terminal
Switch(config)# vlan 100
Switch(config-vlan)# name Shared-Services
Switch(config-vlan)# exit

! Server mode: VLAN 100 sent to clients
! Clients automatically learn VLAN 100
```

**Related Lab:** Day-03-Field-2-Lab.md

---

### Field-3: Private VLAN (Isolated Access)

**Concept:** Create isolated VLANs where devices can't communicate with each other (multicast only).

**Changes:**
- Primary VLAN: VLAN 100
- Isolated VLAN: VLAN 101 (can only reach gateway)
- Community VLAN: VLAN 102 (can reach other community members + gateway)

**Use Case:** Multi-tenant environment; tenants can't sniff each other's traffic.

**Related Lab:** Day-03-Field-3-Lab.md

---

### Field-4: MAC Address Filtering

**Concept:** Limit which MAC addresses can connect to a switch port.

**Configuration:**
```
Switch(config)# interface Fa0/2
Switch(config-if)# switchport port-security
Switch(config-if)# switchport port-security mac-address 00:11:22:33:44:55
Switch(config-if)# switchport port-security violation shutdown
```

**Effect:** If a different MAC connects, port shuts down (DoS protection).

**Related Lab:** Day-03-Field-4-Lab.md (extends Day 05 Port Security)

---

### Field-5: VLAN Routing (Inter-VLAN Communication)

**Concept:** Configure router as VLAN gateway; enable PC0 (VLAN 10) ↔ SRV1 (VLAN 20) communication.

**Changes:**
- R1-NY receives tagged VLAN frames from SW1 trunk
- R1-NY routes between VLAN 10 (192.168.10.0/24) and VLAN 20 (192.168.20.0/24)
- Sub-interfaces on R1: Gi0/0.10, Gi0/0.20 (one per VLAN)

**Configuration Example:**
```
! On R1-NY (VyOS)
set interfaces ethernet eth0 vlan 10 address 192.168.10.1/24
set interfaces ethernet eth0 vlan 20 address 192.168.20.1/24
set interfaces ethernet eth0 address 192.168.10.1/24

! Now R1 can route between VLANs
```

**Related Lab:** Day-03-Field-5-Lab.md (preview of Day 07 inter-VLAN routing)

---

### Field-6: VLAN Spanning Multiple Switches

**Concept:** Same VLAN (e.g., VLAN 10) exists on both SW1 and SW2 (unusual, but possible for migration).

**Topology Change:**
- Create VLAN 10 on SW2 (in addition to VLAN 20)
- Configure trunk between SW1 and SW2 to carry VLAN 10
- PC0 on SW1 can communicate with a PC on SW2 both in VLAN 10 (via trunk)

**Use Case:** Network migration; temporarily run same VLAN on multiple switches.

**Related Lab:** Day-03-Field-6-Lab.md

---

### Field-7: Switch Stack Simulation

**Concept:** Simulate multiple switches acting as one (switch stacking).

**Topology Change:**
- Add direct link: SW1 ↔ SW2 (GigabitEthernet link)
- Add direct link: SW2 ↔ SW3 (GigabitEthernet link)
- Configure all links as trunk ports
- All three switches appear as a single logical switch

**Purpose:** Redundancy; if one switch fails, others still forward traffic.

**Related Lab:** Day-03-Field-7-Lab.md (preview of Day 08 Spanning Tree Protocol)

---

## 3. Build Instructions

### 3.1 Topology Extension

**Step 1:** Import Day-02 topology (already has 3 switches, 3 routers)

```bash
gns3 import-project --input day02-base.gns3
```

**Step 2:** Configure switches with VLANs

Use CLI commands from Day-03-Lab-Manual.md to configure:
- SW1: VLAN 10, access ports Fa0/2–3, trunk Gi0/1
- SW2: VLAN 20, access ports Fa0/2–3, trunk Gi0/1
- SW3: VLAN 30, access ports Fa0/2–3, trunk Gi0/1

**Step 3:** Verify MAC learning

```
SW1# show mac-address-table
SW2# show mac-address-table
SW3# show mac-address-table
```

**Step 4:** Test connectivity

- **Same VLAN:** PC0 ↔ PC1 (should succeed)
- **Different VLAN:** PC0 ↔ SRV1 (should fail)

**Step 5:** Export project

```bash
gns3 export-project --project-id [ID] --output day03-base.gns3
```

---

## 4. Verification Checklist

- [ ] All 3 switches have VLAN 1 (management) + operational VLAN (10, 20, 30)
- [ ] All access ports configured (Fa0/2–3 on each switch)
- [ ] All trunk ports configured (Gi0/1 on each switch)
- [ ] Native VLAN set to 1 on all trunks
- [ ] SVIs created with correct IP addresses (192.168.10.2, .20.2, .30.2)
- [ ] `show vlan brief` output correct on all switches
- [ ] MAC address tables show learned MACs on correct ports
- [ ] Same-VLAN ping succeeds (PC0 ↔ PC1)
- [ ] Different-VLAN ping fails (PC0 ↔ SRV1)

---

## 5. Next Steps

- **Day-04:** Device Security (SSH on switches, enable secret, ACLs)
- **Day-05:** Port Security & Storm Control (MAC limiting, broadcast storm prevention)
- **Day-06:** Access Control Lists (standard/extended ACLs for traffic filtering)
- **Day-07:** VLAN Basics & Inter-VLAN Routing (enable PC0 ↔ SRV1 communication via router)
- **Day-08:** Spanning Tree Protocol (redundancy, loop prevention)

---

**README Version:** 1.0  
**Last Updated:** 2026-08-30  
**Status:** Complete
