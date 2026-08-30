# Day 01 — Network Devices & Enterprise Topology

## Lab Manual: Building a Two-Branch Enterprise Network with NAT, Firewalls, and Routing

---

## 0. Metadata

| Field | Value |
|---|---|
| **Lab Title** | Network Devices & Enterprise Topology |
| **Day** | Day 01 (CCNA Foundation Week) |
| **Topic Focus** | Enterprise architecture using routers, switches, firewalls, NAT/PAT, and basic routing |
| **Estimated Time** | 3–4 hours (topology build, configuration, verification) |
| **Difficulty** | Beginner to Intermediate |
| **Prerequisites** | GNS3 installed; familiarity with CLI; understanding of IP subnetting (RFC 1918) |
| **Lab Scope** | Two-branch enterprise network (New York, Tokyo); NAT/PAT on firewalls; internet-facing firewall; internal firewall; routing between branches |
| **Skills Practiced** | Router configuration, firewall placement, NAT/PAT, static routing, device naming, basic security posture |
| **Standards Referenced** | RFC 1918 (Private Address Space), RFC 3927 (Link-Local Addressing), RFC 2328 (OSPF Routing), RFC 5226 (Special-Use Addresses) |
| **Expected Outcome** | Two-branch topology with working inter-branch communication, NAT translation on WAN links, and firewall filtering |

---

## 1. Overview

This lab introduces the foundational architecture of a multi-site enterprise network. You will build a two-branch topology spanning New York and Tokyo, connected through an ISP backbone. The lab emphasizes:

- **Device Roles:** Routers forward traffic; switches provide LAN connectivity; firewalls enforce security policies
- **NAT/PAT:** Public-facing firewalls translate private RFC 1918 addresses to global routable space (RFC 5226, 203.0.113.0/24 test-net-3)
- **Firewall Placement:** External firewall (FW1) protects the New York branch; internal firewall (FW2) protects Tokyo
- **Routing:** Static routes define how traffic flows between branches and to the internet

By the end of this lab, you will have hands-on experience deploying a network that closely mirrors real enterprise architectures, where security and routing intersect.

---

## 2. Business Context

### 2.1 Scenario

Your company, **DataFlow Solutions**, operates two global offices:

1. **New York (HQ):** 50 employees, mission-critical services (sales, billing, web hosting)
2. **Tokyo (Remote):** 20 employees, content delivery and customer support

Both offices need:
- **Internal LAN connectivity:** Devices within each office communicate locally
- **Inter-office communication:** Tokyo staff query NY servers; NY sends billing data to Tokyo
- **Internet access:** Both offices browse the web, receive email
- **Security:** Firewalls block unauthorized traffic while allowing legitimate business flows

### 2.2 Challenges

1. **Topology Complexity:** Connecting three network types (routers, switches, firewalls) requires understanding device roles
2. **Security Posture:** Which firewall goes where? External firewalls protect from the internet; internal firewalls isolate branches
3. **Address Translation:** NAT/PAT converts private addresses to public ones for internet-facing traffic
4. **Routing Logic:** How does Tokyo know how to reach New York? Static routes define paths

This lab answers all four questions through hands-on configuration.

---

## 3. Network Topology

**Base Lab Topology Diagram:**

![Day-01-Enterprise-Topology](https://github.com/TushanDorsey/Network-Engineering-Labs-CCNA-2026/blob/main/Lab-Photos/Day-01-Enterprise-Topology.png)

### 3.1 Topology Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           INTERNET (ISP)                            │
│                         203.0.113.0/24 (Public)                     │
└──────────────┬────────────────────────────────────┬──────────────────┘
               │                                    │
         [ISP Firewall]                      [ISP Firewall]
               │                                    │
      203.0.113.1/30 - 203.0.113.5/30

┌─ NEW YORK BRANCH ─────────────────────┬──── TOKYO BRANCH ──────────────┐
│                                       │                                │
│  PC0 (192.168.10.50)                  │  SRV1 (192.168.20.10)          │
│  PC1 (192.168.10.51) ──┐              │  SRV2 (192.168.20.11) ──┐      │
│                         │              │                        │      │
│                        SW1             │                       SW2     │
│              (VLANs 1, 10, 20)        │            (VLANs 1, 20)      │
│                         │              │                        │      │
│                       R1-NY           │                        R2-TKY  │
│              (192.168.10.1)            │              (192.168.20.1)   │
│              (192.168.100.2/30)        │              (192.168.200.2/30)│
│                         │              │                        │      │
│                       FW1-NYC         │                      FW2-TKY   │
│  (Inside: 192.168.100.1/30)          │  (Inside: 192.168.200.1/30)   │
│  (Outside: 203.0.113.2/30)           │  (Outside: 203.0.113.6/30)    │
│                         │              │                        │      │
└─────────────────────────┼──────────────┼────────────────────────┼──────┘
                          │              │                        │
                    ┌─────┴──────────────┴────────────────────────┘
                    │
              [ISP ROUTER]
           203.0.113.1/30 summary
           203.0.113.5/30 summary
                    │
            [Internet Core]
                    │
              [Attacker/ISP Clients]
```

### 3.2 Device Inventory

| Device | Type | Role | Interfaces |
|--------|------|------|-----------|
| **PC0, PC1** | Workstation | End devices (NY LAN) | Static IPs or DHCP-capable |
| **SRV1, SRV2** | Server | End devices (Tokyo LAN) | Static IPs |
| **SW1** | Switch | Layer 2 (NY branch) | 1 uplink to R1, 2 access ports for PCs |
| **SW2** | Switch | Layer 2 (Tokyo branch) | 1 uplink to R2, 2 access ports for servers |
| **R1-NY** | Router | Core routing (NY) | Inside (to FW1), LAN (to SW1) |
| **R2-TKY** | Router | Core routing (Tokyo) | Inside (to FW2), LAN (to SW2) |
| **FW1-NYC** | Firewall | Perimeter security (NY) | Outside (ISP), Inside (NY-R1) |
| **FW2-TKY** | Firewall | Internal isolation (Tokyo) | Outside (ISP), Inside (Tokyo-R2) |
| **ISP-RTR** | Router | Internet backbone | 203.0.113.1, 203.0.113.5 (WAN links) |
| **ATTACKER** | Host | Threat source | 203.0.113.3 (simulates internet attacker) |

---

## 4. IP Addressing Plan

### 4.1 Subnetting & RFC 1918 Compliance

All private addresses use RFC 1918 (Private Address Space): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.
Public/WAN addresses use 203.0.113.0/24 (RFC 5226, TEST-NET-3, safe for documentation labs).

| Segment | Network | Prefix | Usable Hosts | Allocation |
|---------|---------|--------|--------------|-----------|
| **NY LAN** | 192.168.10.0/24 | /24 | 254 | R1-NY: .1, SW1: .2, PC0: .50, PC1: .51, DHCP: .100–.150 |
| **Tokyo LAN** | 192.168.20.0/24 | /24 | 254 | R2-TKY: .1, SW2: .2, SRV1: .10, SRV2: .11 |
| **NY-R1 ↔ FW1 Transit** | 192.168.100.0/30 | /30 | 2 | R1: .2, FW1-Inside: .1 |
| **Tokyo-R2 ↔ FW2 Transit** | 192.168.200.0/30 | /30 | 2 | R2: .2, FW2-Inside: .1 |
| **FW1-NYC ↔ ISP-RTR (WAN)** | 203.0.113.0/30 | /30 | 2 | FW1-Outside: .2, ISP-RTR: .1 |
| **FW2-TKY ↔ ISP-RTR (WAN)** | 203.0.113.4/30 | /30 | 2 | FW2-Outside: .6, ISP-RTR: .5 |

### 4.2 Detailed IP Table

| Device | Interface | IP Address | Mask | Gateway | VLAN |
|--------|-----------|-----------|------|---------|------|
| **R1-NY** | Gi0/0 (to SW1) | 192.168.10.1 | 255.255.255.0 | N/A | 10 |
| | Gi0/1 (to FW1-Inside) | 192.168.100.2 | 255.255.255.252 | N/A | N/A |
| **SW1** | VLAN 10 SVI | 192.168.10.2 | 255.255.255.0 | 192.168.10.1 | 10 |
| | Gi0/1 (to R1) | trunk | - | - | - |
| | Fa0/2, Fa0/3 | access | 192.168.10.x | - | 10 |
| **PC0** | Ethernet | 192.168.10.50 | 255.255.255.0 | 192.168.10.1 | 10 |
| **PC1** | Ethernet | 192.168.10.51 | 255.255.255.0 | 192.168.10.1 | 10 |
| **FW1-NYC** | Inside (e0) | 192.168.100.1 | 255.255.255.252 | N/A | N/A |
| | Outside (e1) | 203.0.113.2 | 255.255.255.252 | 203.0.113.1 | N/A |
| **FW2-TKY** | Inside (e0) | 192.168.200.1 | 255.255.255.252 | N/A | N/A |
| | Outside (e1) | 203.0.113.6 | 255.255.255.252 | 203.0.113.5 | N/A |
| **R2-TKY** | Gi0/0 (to SW2) | 192.168.20.1 | 255.255.255.0 | N/A | 20 |
| | Gi0/1 (to FW2-Inside) | 192.168.200.2 | 255.255.255.252 | N/A | N/A |
| **SW2** | VLAN 20 SVI | 192.168.20.2 | 255.255.255.0 | 192.168.20.1 | 20 |
| | Gi0/1 (to R2) | trunk | - | - | - |
| | Fa0/2, Fa0/3 | access | 192.168.20.x | - | 20 |
| **SRV1** | Ethernet | 192.168.20.10 | 255.255.255.0 | 192.168.20.1 | 20 |
| **SRV2** | Ethernet | 192.168.20.11 | 255.255.255.0 | 192.168.20.1 | 20 |
| **ISP-RTR** | Gi0/0 (to FW1) | 203.0.113.1 | 255.255.255.252 | N/A | N/A |
| | Gi0/1 (to FW2) | 203.0.113.5 | 255.255.255.252 | N/A | N/A |
| **ATTACKER** | Ethernet | 203.0.113.3 | 255.255.255.252 | 203.0.113.1 | N/A |

---

## 5. Pre-Lab Checklist

Before starting the lab, confirm you have:

- [ ] GNS3 running on your workstation
- [ ] VyOS or Cisco IOU router images available
- [ ] Open vSwitch or GNS3 built-in switch images
- [ ] pfSense firewall image (or Linux-based firewall with iptables)
- [ ] Alpine Linux or Debian for end devices (PC0, PC1, SRV1, SRV2)
- [ ] Lab topology diagram printed or displayed
- [ ] IP addressing plan accessible
- [ ] Text editor ready for configuration notes
- [ ] Network diagram tool (draw.io, Visio) open for topology verification

---

## 6. Configuration by Device

### 6.1 R1-NY (New York Router)

**Objective:** Route traffic between NY LAN (192.168.10.0/24) and the inside of FW1.

```
!========================================
! R1-NY CONFIGURATION
!========================================

hostname R1-NY
!
! Interface to switch (LAN side)
interface GigabitEthernet0/0
  description NY-LAN-to-SW1
  ip address 192.168.10.1 255.255.255.0
  no shutdown
!
! Interface to firewall (WAN transit)
interface GigabitEthernet0/1
  description NY-Transit-to-FW1-Inside
  ip address 192.168.100.2 255.255.255.252
  no shutdown
!
! Static route: Tokyo LAN via FW1's inside interface
ip route 192.168.20.0 255.255.255.0 192.168.100.1
!
! Default route to ISP (via FW1)
ip route 0.0.0.0 0.0.0.0 192.168.100.1
!
! Enable logging for troubleshooting
logging enable
logging buffered 16000
!
end

! VERIFICATION COMMANDS:
! show ip route
! show ip interface brief
! ping 192.168.100.1
! ping 192.168.20.1
```

**Explanation:**
- The router's primary role is to connect the LAN (SW1) to the firewall.
- Two static routes are defined: one for Tokyo's LAN (192.168.20.0/24) and one default route to the internet (0.0.0.0/0).
- All return traffic from Tokyo or the internet must pass back through FW1 (192.168.100.1).

---

### 6.2 SW1 (New York Switch)

**Objective:** Provide Layer 2 switching for NY LAN; forward uplink traffic to R1.

```
!========================================
! SW1 CONFIGURATION (New York Switch)
!========================================

hostname SW1
!
! Create VLAN 10 (NY LAN)
vlan 10
  name NY-LAN
!
! Create VLAN 1 (Default, Management)
vlan 1
  name Management
!
! Interface VLAN 10 (SVI for NY LAN)
interface VLAN 10
  description NY-LAN-Gateway
  ip address 192.168.10.2 255.255.255.0
  no shutdown
!
! Uplink to R1 (trunk all VLANs)
interface GigabitEthernet0/1
  description Uplink-to-R1-NY
  switchport mode trunk
  switchport trunk allowed vlan 1,10
  switchport trunk native vlan 1
  no shutdown
!
! Access port for PC0
interface FastEthernet0/2
  description PC0-Access
  switchport mode access
  switchport access vlan 10
  no shutdown
!
! Access port for PC1
interface FastEthernet0/3
  description PC1-Access
  switchport mode access
  switchport access vlan 10
  no shutdown
!
end

! VERIFICATION COMMANDS:
! show vlan brief
! show interface trunk
! show mac-address-table
```

**Explanation:**
- VLAN 10 is the operational network; VLAN 1 is the default management VLAN.
- The trunk link to R1 carries both VLANs; the access ports connect to end devices.
- The switch learns and forwards MAC addresses; it's transparent to routing (Layer 2 only).

---

### 6.3 PC0 & PC1 (New York End Devices)

**Configuration (Debian/Alpine Linux):**

```
# PC0 Configuration
interface eth0
  ip address 192.168.10.50 255.255.255.0
  gateway 192.168.10.1
  dns-nameserver 8.8.8.8

# Persistent configuration in /etc/network/interfaces
auto eth0
iface eth0 inet static
  address 192.168.10.50
  netmask 255.255.255.0
  gateway 192.168.10.1

# PC1 Configuration
auto eth0
iface eth0 inet static
  address 192.168.10.51
  netmask 255.255.255.0
  gateway 192.168.10.1

# Verify connectivity
ping 192.168.10.1  # Should reply
ping 192.168.20.1  # Should reply (inter-site)
ping 203.0.113.3   # Should reply (internet via FW1)
```

---

### 6.4 FW1-NYC (New York Firewall - Perimeter)

**Objective:** Protect NY branch from internet threats; translate private addresses to public (NAT/PAT).

**pfSense Configuration (Web UI steps):**

1. **System > General Setup**
   - Hostname: FW1-NYC
   - Domain: lab.local
   - Primary DNS: 8.8.8.8

2. **Interfaces > Assignments**
   - em0 (Inside): 192.168.100.1/30, Description: "Inside-to-R1-NY"
   - em1 (Outside/WAN): 203.0.113.2/30, Description: "Outside-to-ISP"

3. **Interfaces > em1 (WAN)**
   - IPv4 Address: 203.0.113.2
   - IPv4 Subnet: 30
   - IPv4 Gateway: 203.0.113.1

4. **Firewall > NAT > Outbound**
   - Rule: Source 192.168.10.0/24 → Translated to 203.0.113.2 (WAN IP)
   - Rule: Source 192.168.100.0/30 → Translated to 203.0.113.2 (WAN IP)

5. **Firewall > Rules > WAN**
   ```
   Allow Rule: Any → Inside Interface (192.168.100.0/30)
   Allow Rule: Any → NY-LAN (192.168.10.0/24) on port 80, 443
   Deny Rule: Any → Any (default deny)
   ```

6. **Firewall > Rules > Inside (LAN)**
   ```
   Allow Rule: 192.168.10.0/24 → Any (permit all outbound)
   Allow Rule: 192.168.10.0/24 → 192.168.20.0/24 (permit to Tokyo)
   Allow Rule: 192.168.20.0/24 → 192.168.10.0/24 (permit from Tokyo)
   Deny Rule: Any → Any (default deny)
   ```

**CLI Configuration (SSH):**

```
pfSense(em0): 192.168.100.1
pfSense(em1): 203.0.113.2

! Verify NAT outbound rule
pfSense$ show nat outbound

! Verify firewall rules
pfSense$ show firewall rules

! Test connectivity
pfSense$ ping 203.0.113.1  # ISP gateway
pfSense$ ping 192.168.100.2  # R1-NY inside
```

---

### 6.5 R2-TKY (Tokyo Router)

**Objective:** Route traffic between Tokyo LAN and the inside of FW2.

```
!========================================
! R2-TKY CONFIGURATION
!========================================

hostname R2-TKY
!
interface GigabitEthernet0/0
  description Tokyo-LAN-to-SW2
  ip address 192.168.20.1 255.255.255.0
  no shutdown
!
interface GigabitEthernet0/1
  description Tokyo-Transit-to-FW2-Inside
  ip address 192.168.200.2 255.255.255.252
  no shutdown
!
! Static route: NY LAN via FW2
ip route 192.168.10.0 255.255.255.0 192.168.200.1
!
! Default route to ISP
ip route 0.0.0.0 0.0.0.0 192.168.200.1
!
end

! VERIFICATION:
! show ip route
! ping 192.168.200.1
! ping 192.168.10.1
```

---

### 6.6 SW2 (Tokyo Switch)

**Objective:** Provide Layer 2 switching for Tokyo LAN.

```
!========================================
! SW2 CONFIGURATION (Tokyo Switch)
!========================================

hostname SW2
!
vlan 20
  name Tokyo-LAN
!
vlan 1
  name Management
!
interface VLAN 20
  description Tokyo-LAN-Gateway
  ip address 192.168.20.2 255.255.255.0
  no shutdown
!
interface GigabitEthernet0/1
  description Uplink-to-R2-TKY
  switchport mode trunk
  switchport trunk allowed vlan 1,20
  switchport trunk native vlan 1
  no shutdown
!
interface FastEthernet0/2
  description SRV1-Access
  switchport mode access
  switchport access vlan 20
  no shutdown
!
interface FastEthernet0/3
  description SRV2-Access
  switchport mode access
  switchport access vlan 20
  no shutdown
!
end
```

---

### 6.7 SRV1 & SRV2 (Tokyo End Devices)

**Configuration:**

```
# SRV1
auto eth0
iface eth0 inet static
  address 192.168.20.10
  netmask 255.255.255.0
  gateway 192.168.20.1

# SRV2
auto eth0
iface eth0 inet static
  address 192.168.20.11
  netmask 255.255.255.0
  gateway 192.168.20.1

# Verification
ping 192.168.20.1  # Gateway
ping 192.168.10.50  # PC0 (inter-site)
```

---

### 6.8 FW2-TKY (Tokyo Firewall - Internal/Secondary)

**Objective:** Protect Tokyo branch; handle inter-site traffic; NAT for WAN.

**pfSense Configuration:**

1. **Interfaces > Assignments**
   - em0 (Inside): 192.168.200.1/30
   - em1 (Outside/WAN): 203.0.113.6/30

2. **Firewall > NAT > Outbound**
   - Source 192.168.20.0/24 → 203.0.113.6

3. **Firewall > Rules > Inside**
   ```
   Allow: 192.168.20.0/24 → 192.168.10.0/24 (to NY)
   Allow: 192.168.20.0/24 → Any (outbound)
   Allow: 192.168.10.0/24 → 192.168.20.0/24 (from NY)
   Deny: Any → Any
   ```

---

### 6.9 ISP-RTR (Internet Service Provider Router)

**Objective:** Simulate ISP backbone; route between NY and Tokyo firewalls.

```
!========================================
! ISP-RTR CONFIGURATION
!========================================

hostname ISP-RTR
!
interface GigabitEthernet0/0
  description ISP-to-FW1-NYC
  ip address 203.0.113.1 255.255.255.252
  no shutdown
!
interface GigabitEthernet0/1
  description ISP-to-FW2-TKY
  ip address 203.0.113.5 255.255.255.252
  no shutdown
!
! Static routing for branches (learned via firewall NAT)
ip route 192.168.10.0 255.255.255.0 203.0.113.2
ip route 192.168.20.0 255.255.255.0 203.0.113.6
!
end
```

---

## 7. Expected Output & Verification

### 7.1 Connectivity Matrix

After configuration, you should be able to:

| Source | Destination | Expected Outcome |
|--------|-------------|-----------------|
| PC0 (192.168.10.50) | PC1 (192.168.10.51) | ✓ Direct LAN ping |
| PC0 | SRV1 (192.168.20.10) | ✓ Inter-site ping (via R1 → FW1 → ISP → FW2 → R2) |
| PC0 | ATTACKER (203.0.113.3) | ✓ Internet access (NAT translation: 192.168.10.50 → 203.0.113.2) |
| SRV1 | PC0 | ✓ Return path established |
| SRV1 | 8.8.8.8 | ✓ Internet access (via FW2 NAT) |
| ATTACKER | PC0 | ✗ Firewall blocks unsolicited inbound (stateful) |
| ATTACKER | SRV1 | ✗ Firewall blocks unsolicited inbound |

### 7.2 Show Command Outputs

**R1-NY Route Table:**
```
R1-NY# show ip route
Codes: C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2
       i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2
       ia - IS-IS inter area, * - candidate default, U - per-user static route
       o - ODR, P - periodic downloaded static route, H - nssa-external, l - lisp
       + - replicated route, % - next hop override

Gateway of last resort is 192.168.100.1 to network 0.0.0.0

S*   0.0.0.0/0 [1/0] via 192.168.100.1
     192.168.10.0/24 is directly connected, GigabitEthernet0/0
     192.168.20.0/24 [1/0] via 192.168.100.1
     192.168.100.0/30 is directly connected, GigabitEthernet0/1
```

**SW1 MAC Address Table:**
```
SW1# show mac-address-table
          Mac Address Table
-------------------------------------------

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
  10    000d.67d3.2e50    DYNAMIC     Fa0/2
  10    000d.67d3.2e51    DYNAMIC     Fa0/3
  10    000d.67d3.2e52    DYNAMIC     Gi0/1
```

**FW1-NYC NAT Translation:**
```
pfSense$ pfctl -s nat
@0 pass in quick proto tcp from any to (em1) port = http keep state label "pass HTTP"
@1 pass out quick proto { tcp udp } from 192.168.10.0/24 to any nat-to 203.0.113.2
```

**ISP-RTR Route Table:**
```
ISP-RTR# show ip route
S     192.168.10.0 [1/0] via 203.0.113.2
S     192.168.20.0 [1/0] via 203.0.113.6
C     203.0.113.0/30 is directly connected, GigabitEthernet0/0
C     203.0.113.4/30 is directly connected, GigabitEthernet0/1
```

---

## 8. Common Mistakes & Troubleshooting

### 8.1 Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| **Wrong subnet mask** | Devices on same subnet can't ping | Verify all /24 nets use 255.255.255.0; /30 nets use 255.255.255.252 |
| **Firewall blocks return traffic** | One-way ping (forward works, return fails) | Check firewall rules for stateful filtering; allow return traffic |
| **NAT overlap conflict** | Local addresses conflict with ISP addresses | Use RFC 1918 for all local nets; never use 203.0.113.x/24 internally |
| **Trunk misconfiguration** | Switch doesn't forward inter-VLAN traffic | Verify trunk link is in "switchport mode trunk"; check VLAN allowed list |
| **Default route pointing wrong way** | Traffic destined for internet doesn't flow | Ensure default route (0.0.0.0/0) points to firewall or ISP, not local subnet |
| **Interface shutdown** | No connectivity from device | Run "no shutdown" on all interfaces |

### 8.2 Troubleshooting Workflow

**Step 1: Verify Interface Status**
```
R1-NY# show ip interface brief
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     192.168.10.1    YES manual up                    up
GigabitEthernet0/1     192.168.100.2   YES manual up                    up

! All interfaces should show "up" and "up"
```

**Step 2: Check Routing Table**
```
R1-NY# show ip route
! Verify:
! - Local subnets (C) are listed
! - Static routes (S) are correct
! - Default route (S*) points to firewall
```

**Step 3: Test Connectivity (Ping)**
```
R1-NY# ping 192.168.100.1  # Firewall inside
R1-NY# ping 192.168.20.1   # Tokyo router (via static route)
R1-NY# ping 203.0.113.1    # ISP (via firewall NAT)
```

**Step 4: Verify MAC Learning (Switch)**
```
SW1# show mac-address-table
! Should see dynamic entries for PC0, PC1, R1
! If MAC not learned, check access port VLAN assignment
```

**Step 5: Check Firewall Rules**
```
pfSense$ pfctl -s rules | grep -i "pass\|block"
! Ensure inbound/outbound rules are active
! Verify NAT rules translate 192.168.x.x to 203.0.113.x
```

**Step 6: Test with Traceroute**
```
PC0# traceroute 192.168.20.10
traceroute to 192.168.20.10 (192.168.20.10), 30 hops max, 60 byte packets
 1  192.168.10.1 (192.168.10.1)  2.345 ms
 2  192.168.100.1 (192.168.100.1)  3.456 ms  [FW1-NYC]
 3  203.0.113.1 (203.0.113.1)  5.678 ms  [ISP-RTR]
 4  203.0.113.5 (203.0.113.5)  7.890 ms  [FW2-TKY outside]
 5  192.168.200.1 (192.168.200.1)  8.901 ms  [FW2-TKY inside]
 6  192.168.20.1 (192.168.20.1)  9.234 ms  [R2-TKY]
 7  192.168.20.10 (192.168.20.10)  10.567 ms  [SRV1]
```

---

## 9. Design Analysis

### 9.1 Why This Topology?

**Multi-site connectivity:** Companies rarely operate from a single location. This two-branch topology mirrors real-world deployments.

**Firewall placement:** 
- FW1 (perimeter) blocks internet threats before reaching NY infrastructure
- FW2 (internal) provides defense-in-depth; even if one firewall fails, the other provides protection

**NAT/PAT strategy:**
- Private addressing (RFC 1918) is hidden from the internet (security by obscurity)
- Public NAT address (203.0.113.2/6) is exposed only on WAN links
- If the ISP sees a request from 203.0.113.2, it doesn't know which internal device sent it

**Static routing:**
- At 2 sites, static routes are simpler than dynamic routing protocols (OSPF/BGP)
- Easier to troubleshoot (you explicitly define all paths)
- No routing protocol overhead

### 9.2 Real-World Parallels

**Scenario:** DataFlow Solutions is preparing for 50-employee office growth.

- **Current:** 2 sites, 2 firewalls, 2 routers (this lab)
- **Future:** 5 sites, hub-and-spoke ISP links, OSPF for automatic failover
- **Scaling step:** Add a third site (Singapore); test if static routing still works or OSPF is needed
- **Lesson:** This lab is the foundation for all multi-site architectures

---

## 10. Stretch Goals (Optional)

1. **Add a third branch (Singapore):** 
   - New subnet: 192.168.30.0/24
   - New firewall FW3-SGP: 192.168.300.0/30 (inside), 203.0.113.10/30 (outside)
   - Add static routes to all routers
   - Test inter-site connectivity (NY ↔ Tokyo ↔ Singapore)

2. **Implement OSPF instead of static routes:**
   - Remove `ip route` commands
   - Configure OSPF on R1, R2, ISP-RTR
   - Routers automatically learn remote subnets
   - Test network resilience (disable a link; traffic re-routes)

3. **Add an Access Control List (ACL):**
   - Block PC0 from accessing SRV2 (but allow SRV1)
   - Configure extended ACL on R1 or FW1
   - Test: `ping -c 1 192.168.20.10` (succeeds), `ping -c 1 192.168.20.11` (fails)

4. **Implement DHCP on SW1:**
   - Enable DHCP on R1-NY for 192.168.10.0/24
   - Reconfigure PC0/PC1 to use DHCP instead of static IPs
   - Verify IP assignment from DHCP pool (e.g., 192.168.10.100–.150)

5. **Add an IDS/IPS:**
   - Deploy Suricata or Snort on FW1
   - Configure rules to detect port scans or suspicious payloads
   - Test: Run `nmap` from ATTACKER; IDS logs the scan

---

## 11. Self-Assessment Checklist

After completing the lab, answer these questions:

- [ ] I can explain why each device (router, switch, firewall) is necessary in an enterprise network
- [ ] I understand the difference between RFC 1918 private addresses and RFC 5226 public test addresses
- [ ] I can configure static routes on a router and predict the path traffic takes
- [ ] I can explain what NAT/PAT does and why firewalls use it
- [ ] I can verify connectivity using ping, traceroute, and show commands
- [ ] I can diagnose a connectivity failure using a structured troubleshooting approach
- [ ] I understand why firewall rules must allow return traffic (stateful inspection)
- [ ] I can design a new subnetting scheme for a third branch and integrate it into the topology

If you answered "yes" to fewer than 6 checkboxes, review the sections covering those topics.

---

## 12. Key Concepts

### 12.1 Network Layering (OSI Model)

| Layer | Device | Function | Lab Example |
|-------|--------|----------|------------|
| **7–5: Application** | Host | Web, SSH, DNS | PC0 runs a web browser; SRV1 runs a web server |
| **4: Transport** | Router/Firewall | TCP/UDP flow management | FW1 stateful inspection of TCP connections |
| **3: Network** | Router | IP routing, forwarding | R1-NY routes 192.168.10.0/24 ↔ 192.168.100.0/30 |
| **2: Data Link** | Switch | MAC learning, VLAN isolation | SW1 learns MAC of PC0, forwards frames to VLAN 10 |
| **1: Physical** | Cable/Transceiver | Electrical signals | Gigabit Ethernet links between routers and firewalls |

### 12.2 Key Standards

- **RFC 1918:** Private Address Space (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- **RFC 2328:** OSPF Routing Protocol (future labs will use this)
- **RFC 3927:** Link-Local Addressing (169.254.0.0/16, used if DHCP fails)
- **RFC 5226:** Special-Use Addresses (203.0.113.0/24 is designated for documentation labs)
- **RFC 3022:** Traditional IP Network Address Translator (Basics of NAT/PAT)

### 12.3 Design Patterns

**Firewall Placement:**
- **Perimeter Firewall (DMZ):** Between the internet and internal networks (FW1-NYC)
- **Internal Firewall:** Between different security zones (FW2-TKY on Tokyo's segment)
- **Host-Based Firewall:** On individual servers (not in this lab, but used in production)

**Routing Patterns:**
- **Default Route:** 0.0.0.0/0 points to ISP/firewall for unknown destinations
- **Static Route:** Explicitly define paths for known subnets
- **Dynamic Routing:** OSPF/BGP automatically adjust paths on link failures

---

## 13. What I Learned

At the end of this lab, you should be able to answer:

1. **How does a two-site network topology differ from a single-site LAN?**
   - Answer: Multi-site networks require routers to interconnect subnets, firewalls to isolate branches, and static/dynamic routes to define paths. Single-site LANs use only switches (Layer 2).

2. **Why do firewalls translate private addresses to public ones (NAT/PAT)?**
   - Answer: NAT hides internal addressing from the internet, reducing attack surface. It also allows companies to use RFC 1918 addresses (which ISPs don't route) and connect multiple internal networks without address conflicts.

3. **How does a packet travel from PC0 (NY) to SRV1 (Tokyo)?**
   - Answer: PC0 → SW1 (Layer 2 switch, adds MAC header) → R1-NY (routing decision: 192.168.20.0/24 via 192.168.100.1) → FW1-NYC (NAT translation: source 192.168.10.50 → 203.0.113.2) → ISP-RTR (forwarding) → FW2-TKY (reverse NAT if applicable) → R2-TKY (local routing decision) → SW2 (MAC forwarding) → SRV1.

4. **What would happen if the NY-to-FW1 link failed?**
   - Answer: R1-NY would have no route to 192.168.100.1, so all outbound traffic would fail. Traffic from the internet to NY would also fail. A redundant link (backup firewall) would be needed for high availability (not in this lab, but a real enterprise would implement this).

5. **How do you verify that NAT is working correctly?**
   - Answer: On the firewall, check the NAT translation table (pfctl -s nat on pfSense). Capture packets on the WAN link (tcpdump on ISP-RTR) to verify source address is 203.0.113.2, not 192.168.10.x.

---

## 14. Skills Practiced

This lab builds the following CCNA-level skills:

| Skill | Evidence |
|-------|----------|
| **Router Configuration** | Configured R1, R2 with interfaces, static routes, and logging |
| **Switch VLAN Management** | Created VLAN 10/20, configured trunk/access ports |
| **Firewall Deployment** | Placed FW1 (perimeter) and FW2 (internal); configured NAT/PAT and rules |
| **IP Routing** | Verified route tables; traced packet paths across branches |
| **Network Troubleshooting** | Used ping, traceroute, show commands to diagnose connectivity |
| **Security Posture** | Understood firewall rules, stateful inspection, and defense-in-depth |
| **Device Naming/Documentation** | Used consistent naming (R1-NY, FW1-NYC) and maintained IP addressing table |
| **RFC Compliance** | Used RFC 1918 for private addresses, RFC 5226 for test addresses |

---

## 15. GNS3 Lab Build Instructions

### 15.1 Network Appliances Required

| Appliance | Image | Nodes | Purpose |
|-----------|-------|-------|---------|
| **VyOS Router** | vyos-equuleus-1.5.0-generic-amd64.iso | R1-NY, R2-TKY, ISP-RTR | Core routing |
| **Open vSwitch** | openvswitch-2.17 | SW1, SW2 | Layer 2 switching |
| **pfSense Firewall** | pfSense-2.7.1-RELEASE-amd64.iso | FW1-NYC, FW2-TKY | Perimeter & internal security |
| **Alpine Linux** | alpine-virt-3.19.1-x86_64.iso | PC0, PC1, SRV1, SRV2, ATTACKER | End devices |

### 15.2 Node Configuration Template

**Each device requires:**
1. **Hostname** (matching lab naming)
2. **Memory:** 512 MB (router), 256 MB (switch), 1 GB (firewall), 128 MB (end device)
3. **Console:** VNC or telnet (for headless operation)
4. **Network Adapters:** As specified in IP addressing table

### 15.3 Link Definitions

| Source | Source Port | Destination | Dest Port | Link Type |
|--------|------------|-------------|-----------|-----------|
| R1-NY | Gi0/0 | SW1 | Gi0/1 | Ethernet (1 Gbps) |
| R1-NY | Gi0/1 | FW1-NYC | em0 | Ethernet (1 Gbps) |
| SW1 | Fa0/2 | PC0 | eth0 | Ethernet (100 Mbps) |
| SW1 | Fa0/3 | PC1 | eth0 | Ethernet (100 Mbps) |
| FW1-NYC | em1 | ISP-RTR | Gi0/0 | Ethernet (1 Gbps) |
| R2-TKY | Gi0/0 | SW2 | Gi0/1 | Ethernet (1 Gbps) |
| R2-TKY | Gi0/1 | FW2-TKY | em0 | Ethernet (1 Gbps) |
| SW2 | Fa0/2 | SRV1 | eth0 | Ethernet (100 Mbps) |
| SW2 | Fa0/3 | SRV2 | eth0 | Ethernet (100 Mbps) |
| FW2-TKY | em1 | ISP-RTR | Gi0/1 | Ethernet (1 Gbps) |
| ISP-RTR | Gi0/2 | ATTACKER | eth0 | Ethernet (100 Mbps) |

---

## 16. Verification Commands & Expected Output

### 16.1 From PC0 (Verify Inter-Site Connectivity)

```bash
PC0# ping -c 4 192.168.20.10  # SRV1
PING 192.168.20.10 (192.168.20.10) 56(84) bytes of data.
64 bytes from 192.168.20.10: icmp_seq=1 ttl=59 time=10.234 ms
64 bytes from 192.168.20.10: icmp_seq=2 ttl=59 time=9.876 ms
64 bytes from 192.168.20.10: icmp_seq=3 ttl=59 time=10.123 ms
64 bytes from 192.168.20.10: icmp_seq=4 ttl=59 time=9.999 ms
--- 192.168.20.10 statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/stddev = 9.876/10.058/10.234/0.129 ms

PC0# ping -c 4 203.0.113.3  # ATTACKER (Internet access)
PING 203.0.113.3 (203.0.113.3) 56(84) bytes of data.
64 bytes from 203.0.113.3: icmp_seq=1 ttl=59 time=15.432 ms
--- Confirms NAT translation works ---
```

### 16.2 From R1-NY (Verify Routing)

```
R1-NY# show ip route | include S

S*   0.0.0.0/0 [1/0] via 192.168.100.1
S    192.168.20.0/24 [1/0] via 192.168.100.1

! Confirms static routes are installed
```

### 16.3 From FW1-NYC (Verify NAT)

```
pfSense$ pfctl -s nat
@5 pass out quick proto { tcp udp icmp } from 192.168.10.0/24 to any nat-to 203.0.113.2 port 49152:65535

! Confirms outbound NAT rule is active
! All traffic from 192.168.10.x is translated to 203.0.113.2
```

### 16.4 From ATTACKER (Verify Firewall Blocks Inbound)

```
ATTACKER# ping -c 4 192.168.10.50  # PC0 (should timeout)
PING 192.168.10.50 (192.168.10.50) 56(84) bytes of data.

! No response (firewall blocks unsolicited inbound traffic)
! This is expected behavior (stateful firewall default-deny)
```

---

## 17. Post-Lab Reflection Questions

1. **Topology Evolution:** How would you modify this topology to support 10 branch offices? (Hint: Hub-and-spoke, MPLS, BGP)

2. **Failure Scenarios:** If FW1-NYC loses power, what happens to NY-to-Tokyo communication? How would you design redundancy?

3. **Scaling Routing:** At what number of branches would static routing become impractical? (Typical threshold: 5–10 sites; beyond that, dynamic routing is preferred)

4. **Security Analysis:** An attacker on the internet (203.0.113.3) wants to send a message to PC0 (192.168.10.50). Can the firewall block this? Why or why not? (Hint: Stateful inspection; firewall allows established connections but blocks unsolicited inbound traffic)

5. **Address Planning:** If DataFlow rents office space in Berlin (192.168.30.0/24), how would you integrate it into the topology? (Draw the subnets, firewalls, routes)

---

## 18. Appendix: RFC References

### RFC 1918 — Private Address Space
- **10.0.0.0/8** (10.0.0.0 – 10.255.255.255, 16,777,216 addresses)
- **172.16.0.0/12** (172.16.0.0 – 172.31.255.255, 1,048,576 addresses)
- **192.168.0.0/16** (192.168.0.0 – 192.168.255.255, 65,536 addresses)
- **Routing:** These addresses are never routed on the internet; ISPs discard them.
- **Usage:** Internal company networks, VPNs, private clouds.

### RFC 2328 — OSPF (Open Shortest Path First)
- **Purpose:** Dynamic routing protocol; routers automatically learn remote networks.
- **Advantage over static routes:** Automatic failover; converges within milliseconds on topology changes.
- **Use cases:** Multi-site networks (3+ branches); networks with redundant links.

### RFC 3927 — Link-Local Addressing (169.254.0.0/16)
- **Purpose:** When DHCP server is unavailable, devices auto-assign addresses in this range.
- **Lab usage:** If R1-NY loses its configured IP, it might auto-assign 169.254.x.x; this breaks connectivity.

### RFC 5226 — Special-Use Addresses
- **203.0.113.0/24:** Designated for documentation and examples (this lab uses it).
- **198.51.100.0/24, 198.19.0.0/15:** Also reserved for documentation.
- **Routing:** ISPs drop these if routed; safe for labs, never use in production.

### RFC 3022 — Traditional IP Network Address Translator (NAT/PAT Basics)
- **NAT (Network Address Translation):** Replaces source IP (e.g., 192.168.10.50 → 203.0.113.2).
- **PAT (Port Address Translation):** Also replaces port numbers (e.g., :49152 → :80).
- **Stateful Inspection:** Firewall tracks return traffic (allows replies to outbound connections).

---

## 19. Summary of Key Commands

### Routers
```
show ip route              # Display routing table
show ip interface brief    # Verify interface status
ping <ip>                  # Test connectivity
traceroute <ip>            # Trace packet path
```

### Switches
```
show vlan brief             # List all VLANs
show interface trunk        # Verify trunk status
show mac-address-table      # Display learned MACs
```

### Firewalls (pfSense)
```
pfctl -s nat                # Show active NAT rules
pfctl -s rules              # Show firewall rules
pfctl -s states             # Show connection states
```

### End Devices
```
ip addr show                # Display IP configuration
ip route show               # Display routing table
ping <ip>                   # Test connectivity
```

---

## 20. Conclusion

This Day 01 lab establishes the foundation for all future CCNA studies. You've learned how routers forward traffic, switches organize it at Layer 2, and firewalls enforce security policies. The two-branch topology is a simplified version of real-world deployments; the principles (routing, NAT, stateful filtering) scale to enterprise networks with thousands of devices.

**Next Steps:** Day 02 introduces dynamic routing (OSPF), allowing routers to automatically discover network topology without manual route configuration. This scales the two-branch topology to support 50+ sites.

**Key Takeaway:** Network design is about trade-offs—simplicity vs. scalability, security vs. usability, cost vs. redundancy. This lab demonstrates these trade-offs in a safe, controlled environment.

---

**Lab Documentation Version:** 1.0  
**Last Updated:** 2026-08-30  
**Author:** CCNA Labs Team  
**Status:** Complete & Ready for Deployment
