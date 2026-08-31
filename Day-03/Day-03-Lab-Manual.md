# Day 03 — Switch Fundamentals

## Lab Manual: MAC Learning, VLAN Basics, and Switch Configuration

---

## 0. Metadata

| Field | Value |
|---|---|
| **Lab Title** | Switch Fundamentals |
| **Day** | Day 03 (Layer 2 Switching) |
| **Topic Focus** | MAC address learning, VLAN configuration, trunk/access ports, SVI (Switch Virtual Interfaces) |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Intermediate |
| **Prerequisites** | Complete Day 01–02 (understand routing basics) |
| **Lab Scope** | Three switches (SW1, SW2, SW3); VLANs 1, 10, 20, 30; trunk/access port configuration; MAC address table management |
| **Skills Practiced** | VLAN creation, port assignment, trunk configuration, MAC learning verification, spanning tree basics |
| **Standards Referenced** | RFC 2544 (Benchmarking Methodology), 802.1Q (VLAN Tagging), 802.1D (Bridge/Switch Standards) |
| **Expected Outcome** | All three switches properly segment traffic by VLAN; MAC address table populated correctly; inter-VLAN routing blocked by default (Layer 2 only) |

---

## 1. Overview

This lab shifts focus from **Layer 3 (Routing)** to **Layer 2 (Switching)**. You'll learn:

- **MAC Address Learning:** How switches build MAC address tables by observing source addresses
- **VLAN (Virtual LAN):** How to segment a physical switch into isolated broadcast domains
- **Trunk Ports:** How trunk links carry multiple VLANs using 802.1Q tagging
- **Access Ports:** How access ports assign traffic to a single VLAN
- **SVI (Switch Virtual Interface):** How switches get IP addresses for inter-VLAN routing

By the end, you'll understand why switches are called **Layer 2 devices**—they forward frames (L2) based on MAC addresses, not IP addresses (L3).

---

## 2. Business Context

**Scenario:** DataFlow Solutions has three office switches (SW1, SW2, SW3). Currently, all devices are on VLAN 1 (the default). This means:
- **Problem:** All devices can reach each other via broadcast; security risk
- **Solution:** Segment traffic into VLANs (VLAN 10 for NY staff, VLAN 20 for Tokyo, VLAN 30 for Singapore)

**Challenge:** After VLANs, devices on different VLANs can't communicate. **Solution:** Inter-VLAN routing (requires a router). This will be covered in Day 07.

---

## 3. Network Topology (Same as Day 02, but Focusing on Layer 2)

Three switches (SW1, SW2, SW3) with:
- **SW1 (NY):** VLAN 10 (NY staff)
- **SW2 (Tokyo):** VLAN 20 (Tokyo staff)
- **SW3 (Singapore):** VLAN 30 (Singapore staff)
- **VLAN 1 (Mgmt):** All switches (for remote management)

---

## 4. Understanding MAC Address Learning

### 4.1 What is a MAC Address?

- **Length:** 48 bits (6 octets), written as `00:11:22:33:44:55`
- **Format:** First 3 octets = OUI (Organizationally Unique Identifier, vendor code)
- **Example:** `00:50:56:xx:xx:xx` = VMware (OUI prefix)
- **Scope:** Local-link only (not routed across the internet, unlike IP addresses)

### 4.2 How Switches Learn MAC Addresses

**Scenario:** PC0 (MAC address `00:11:22:33:44:01`) is connected to SW1 port Fa0/2.

1. **PC0 sends a frame** (e.g., DHCP request broadcast)
   - Source MAC: `00:11:22:33:44:01`
   - Destination: `ff:ff:ff:ff:ff:ff` (broadcast)

2. **SW1 receives frame on Fa0/2**
   - Examines source MAC
   - Checks MAC address table for entry
   - **Not found:** Adds entry: `00:11:22:33:44:01 → Fa0/2`

3. **Future frames from PC0**
   - SW1 knows PC0 is on Fa0/2
   - **Unicast frames** (specific destination) → Forward directly to Fa0/2
   - **Broadcast frames** → Forward to all ports except Fa0/2 (flooding)

**Key Point:** Switches learn MAC addresses **from source addresses**, not destinations.

### 4.3 MAC Address Table Aging

- **Default TTL:** 300 seconds (5 minutes)
- **Reason:** Devices move; old entries become stale
- **Example:** If PC0 unplugged and reconnected to Fa0/3, old entry expires; new entry learned

---

## 5. VLAN Basics

### 5.1 What is a VLAN?

A **VLAN** is a logical grouping of ports on a switch that creates isolated **broadcast domains**.

**Without VLANs:** All ports on a switch are in one broadcast domain. Broadcast frames flood to all ports.

**With VLANs:** Each VLAN is a separate broadcast domain. Broadcast frames only flood within the VLAN.

### 5.2 VLAN Types

| VLAN | Range | Purpose | Example |
|------|-------|---------|---------|
| **VLAN 1** | 1–1005 | Default; management | Used by switches for remote management (SSH, Telnet) |
| **Extended** | 1006–4094 | Extended range VLANs | Enterprise deployments with many VLANs |
| **Reserved** | 1002–1005 | Legacy (FDDI, Token Ring) | Deprecated; avoid |

### 5.3 VLAN Configuration Steps

**Example: Create VLAN 10 on SW1**

```
Switch(config)# vlan 10
Switch(config-vlan)# name NY-Staff
Switch(config-vlan)# exit

Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# exit
```

**What this does:**
1. Creates VLAN 10 with name "NY-Staff"
2. Assigns port Fa0/2 to VLAN 10
3. Fa0/2 is now an **access port** (single VLAN, no tagging)

---

## 6. Trunk Ports vs. Access Ports

### 6.1 Access Ports (Single VLAN)

**Purpose:** End devices (PCs, servers) connect here.

**Behavior:**
- Accepts untagged frames
- Assigns frames to a single VLAN (access VLAN)
- Sends frames out untagged (receiving device doesn't see VLAN tag)

**Configuration:**
```
Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
```

### 6.2 Trunk Ports (Multiple VLANs)

**Purpose:** Switch-to-switch or switch-to-router links.

**Behavior:**
- Carries multiple VLANs using **802.1Q tagging** (adds 4-byte header with VLAN ID)
- Receives tagged frames; processes VLAN ID
- Forwards frames to all other trunk ports (flooding for that VLAN) or to access ports in that VLAN

**Configuration:**
```
Switch(config)# interface GigabitEthernet0/1
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk allowed vlan 1,10,20
Switch(config-if)# switchport trunk native vlan 1
```

**Explanation:**
- `switchport mode trunk`: This port is a trunk
- `switchport trunk allowed vlan 1,10,20`: Only these VLANs traverse this trunk (security; prevents flooding to unwanted VLANs)
- `switchport trunk native vlan 1`: Untagged frames are assigned to VLAN 1

### 6.3 Native VLAN Concept

**Definition:** The VLAN assigned to untagged frames arriving on a trunk port.

**Default:** VLAN 1 (should be changed for security)

**Example:**
- Untagged frame arrives on trunk port with native VLAN 1
- Switch processes it as a VLAN 1 frame
- Forwards it to all VLAN 1 ports (access + trunk)

**Security Issue:** If attacker sends untagged frames, they're assigned to native VLAN. Changing native VLAN from 1 to an unused VLAN (e.g., 999) prevents this.

---

## 7. SVI (Switch Virtual Interface)

### 7.1 What is an SVI?

An **SVI** is a virtual interface that gives the switch an IP address on a VLAN.

**Purpose:** Remote management (SSH, Telnet, SNMP) and inter-VLAN routing.

**Example: SW1 VLAN 10 SVI**

```
Switch(config)# interface vlan 10
Switch(config-if)# ip address 192.168.10.2 255.255.255.0
Switch(config-if)# no shutdown
```

**What this does:**
- Creates an interface named "Vlan10"
- Assigns IP `192.168.10.2` to this interface
- Now you can SSH to `192.168.10.2` to manage SW1

**Note:** The SVI IP is on the VLAN network (192.168.10.0/24), not on a specific port. Traffic destined for 192.168.10.2 is routed to the SVI (inside the switch).

---

## 8. Configuration by Device

### 8.1 SW1 (New York Switch) - Complete Configuration

```
Switch(config)# vlan 1
Switch(config-vlan)# name Management
Switch(config-vlan)# exit

Switch(config)# vlan 10
Switch(config-vlan)# name NY-Staff
Switch(config-vlan)# exit

! Create SVI for VLAN 1 (management)
Switch(config)# interface vlan 1
Switch(config-if)# ip address 192.168.10.254 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Create SVI for VLAN 10 (staff)
Switch(config)# interface vlan 10
Switch(config-if)# ip address 192.168.10.2 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Access port for PC0 (VLAN 10)
Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# description PC0-Access
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Access port for PC1 (VLAN 10)
Switch(config)# interface FastEthernet0/3
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# description PC1-Access
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Trunk port to R1-NY (carries VLAN 1, 10)
Switch(config)# interface GigabitEthernet0/1
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk native vlan 1
Switch(config-if)# switchport trunk allowed vlan 1,10
Switch(config-if)# description Uplink-to-R1-NY
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Set default gateway (for management)
Switch(config)# ip default-gateway 192.168.10.1
Switch(config)# exit
```

**Verification:**
```
Switch# show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    Management                       active    Gi0/1(t)
10   NY-Staff                         active    Fa0/2, Fa0/3, Gi0/1(t)

! Gi0/1(t) = trunk port; Fa0/x = access ports
```

---

### 8.2 SW2 (Tokyo Switch) - Configuration

```
Switch(config)# vlan 1
Switch(config-vlan)# name Management
Switch(config-vlan)# exit

Switch(config)# vlan 20
Switch(config-vlan)# name Tokyo-Staff
Switch(config-vlan)# exit

! SVI for management
Switch(config)# interface vlan 1
Switch(config-if)# ip address 192.168.20.254 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

! SVI for staff
Switch(config)# interface vlan 20
Switch(config-if)# ip address 192.168.20.2 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Access ports for SRV1, SRV2
Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 20
Switch(config-if)# no shutdown
Switch(config-if)# exit

Switch(config)# interface FastEthernet0/3
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 20
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Trunk to R2-TKY
Switch(config)# interface GigabitEthernet0/1
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk native vlan 1
Switch(config-if)# switchport trunk allowed vlan 1,20
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Default gateway
Switch(config)# ip default-gateway 192.168.20.1
```

---

### 8.3 SW3 (Singapore Switch) - Configuration

```
! Same pattern as SW2, but VLAN 30 instead of 20
Switch(config)# vlan 1
Switch(config-vlan)# name Management
Switch(config-vlan)# exit

Switch(config)# vlan 30
Switch(config-vlan)# name Singapore-Staff
Switch(config-vlan)# exit

Switch(config)# interface vlan 1
Switch(config-if)# ip address 192.168.30.254 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

Switch(config)# interface vlan 30
Switch(config-if)# ip address 192.168.30.2 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 30
Switch(config-if)# no shutdown
Switch(config-if)# exit

Switch(config)# interface FastEthernet0/3
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 30
Switch(config-if)# no shutdown
Switch(config-if)# exit

Switch(config)# interface GigabitEthernet0/1
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk native vlan 1
Switch(config-if)# switchport trunk allowed vlan 1,30
Switch(config-if)# no shutdown
Switch(config-if)# exit

Switch(config)# ip default-gateway 192.168.30.1
```

---

## 9. MAC Address Table Verification

### 9.1 View MAC Address Table

```
Switch# show mac-address-table

          Mac Address Table
-------------------------------------------

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
   1    0050.56ab.cdef    DYNAMIC     Gi0/1
  10    0011.2233.4455    DYNAMIC     Fa0/2
  10    0011.2233.4456    DYNAMIC     Fa0/3
  10    0050.56ab.ce00    DYNAMIC     Gi0/1
```

**Explanation:**
- **Vlan 1:** Management MAC learned on trunk (Gi0/1)
- **Vlan 10:** PC0 (.4455) and PC1 (.4456) on access ports; R1-NY (.ce00) on trunk
- **Type:** DYNAMIC = learned via source addresses; STATIC = manually configured

### 9.2 MAC Address Aging

```
Switch# show mac-address-table aging-time

Current MAC address aging time: 300

! Entries are removed after 300 seconds (5 minutes) if not refreshed
```

---

## 10. Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| **Wrong native VLAN** | Untagged traffic goes to wrong VLAN | Set `switchport trunk native vlan 1` correctly on both sides of trunk |
| **Forgot to allow VLAN on trunk** | Traffic for VLAN doesn't cross trunk | Add VLAN to `switchport trunk allowed vlan` list |
| **Access port with wrong VLAN** | Device can't reach others on same VLAN | Verify `switchport access vlan 10` (correct VLAN number) |
| **SVI not created** | Can't SSH to switch | Create `interface vlan 10` with IP address |
| **No default gateway on switch** | Switch can't route to remote networks | Set `ip default-gateway` to router IP |

---

## 11. Verification Checklist

After configuring all three switches:

- [ ] All VLANs created (VLAN 1, 10, 20, 30)
- [ ] All access ports assigned to correct VLAN
- [ ] All trunk ports configured with `switchport mode trunk`
- [ ] Native VLAN set to 1 on all trunks
- [ ] Allowed VLANs on trunks match actual VLANs
- [ ] All SVIs created with correct IP addresses
- [ ] Default gateway set on all switches
- [ ] `show vlan brief` shows all VLANs and ports
- [ ] `show mac-address-table` shows learned MACs
- [ ] PC0 and PC1 can ping each other (same VLAN)
- [ ] PC0 cannot ping SRV1 (different VLAN, no inter-VLAN routing yet)

---

## 12. Conclusion

Day 03 introduced **Layer 2 switching concepts**. You now understand:
- How switches learn MAC addresses and forward frames
- How VLANs segment broadcast domains
- The difference between access and trunk ports
- How 802.1Q tagging allows multiple VLANs on one physical link

**Next:** Day 07 will show how to route **between** VLANs (inter-VLAN routing), requiring a router in the VLAN routing path.

---

**Lab Documentation Version:** 1.0  
**Last Updated:** 2026-08-30  
**Status:** Complete
