# Day 01 — Network Devices & Enterprise Topology

## Practice Lab: Self-Guided Build & Configuration Walkthrough

---

## 0. Introduction

This practice lab is a **detailed walkthrough** of Day-01's enterprise topology. Unlike the lab manual (which provides reference configs), this document guides you step-by-step with **explanations of what each command does and why it matters**. You'll build the topology from scratch, configure each device, and troubleshoot issues.

**Time:** 2–3 hours  
**Difficulty:** Beginner to Intermediate  
**Format:** Step-by-step HOW-TO sections with inline explanations

---

## 1. Pre-Lab Preparation

### 1.1 What You'll Need

- [ ] GNS3 installed and running
- [ ] Router image (VyOS 1.5.x or Cisco IOL)
- [ ] Switch image (Open vSwitch 2.17 or GNS3 built-in)
- [ ] Firewall image (pfSense 2.7.x)
- [ ] End-device image (Alpine Linux 3.19.x or Debian 12)
- [ ] Network diagram (printed or on second screen)
- [ ] Text editor for notes
- [ ] Terminal/console access to each device

### 1.2 GNS3 Project Setup

**Step 1: Create a New Project**
1. Open GNS3
2. Click **File** → **New Project**
3. Name: `CCNA-Day-01-Lab`
4. Location: `C:\Users\jredj\RedjiJB\GNS3\Day-01`
5. Click **Create**

**Step 2: Add Appliances to the Topology**
1. In the left panel, click **Add Device** (or drag from the Appliances list)
2. Search for "VyOS" → Double-click to add to the canvas
3. Name it `R1-NY` and click **Finish**
4. Repeat for: `R2-TKY`, `ISP-RTR` (all VyOS routers)

**Step 3: Add Switches**
1. Search for "Open vSwitch" or the default GNS3 switch
2. Add two switches, name them `SW1` and `SW2`
3. Memory per switch: 256 MB (sufficient for learning)

**Step 4: Add Firewalls**
1. Search for "pfSense"
2. Add two firewalls, name them `FW1-NYC` and `FW2-TKY`
3. Memory: 1 GB (pfSense is memory-hungry)

**Step 5: Add End Devices**
1. Search for "Alpine Linux" (lightweight; perfect for labs)
2. Add 5 Alpine devices: `PC0`, `PC1`, `SRV1`, `SRV2`, `ATTACKER`
3. Memory: 128 MB each

**What this does:** GNS3 now has all 13 nodes needed for the topology. The next step is to **connect them with network links**.

---

## 2. Topology Build (Link Connectivity)

### 2.1 Understanding Link Types

Before connecting devices, understand what each link type does:

- **Ethernet (Gigabit):** Used for high-bandwidth links (router-to-router, router-to-firewall)
- **Ethernet (Fast):** Used for access links (switch-to-end-device)
- **Serial:** Rarely used in modern labs; for WAN links with legacy routers

In GNS3, **right-click on a port → Manage Interfaces → Add** to configure.

### 2.2 Step-by-Step Link Creation

**New York Branch: PC0 → SW1 → R1-NY → FW1-NYC**

1. **PC0 to SW1 (Access Link)**
   - On PC0 (Alpine Linux), right-click → **Manage Network Interfaces**
   - Add interface `eth0` (already present)
   - On SW1, identify an available Ethernet port (e.g., `Fa0/2`)
   - In GNS3, **drag from PC0/eth0 to SW1/Fa0/2**
   - Expected: Green line appears; devices are now connected at Layer 2

   **Why:** PC0 connects to SW1's access port. SW1 will learn PC0's MAC address when traffic is sent.

2. **PC1 to SW1 (Access Link)**
   - Repeat: **drag PC1/eth0 to SW1/Fa0/3**
   - Now both PCs are on the same LAN segment (broadcast domain)

3. **SW1 to R1-NY (Trunk Link)**
   - On SW1, select **Gi0/1** (uplink port)
   - On R1-NY, select **Gi0/0** (LAN interface)
   - Drag to connect them
   - This is a **trunk link** (carries multiple VLANs or untagged traffic)

   **Why:** The trunk link allows SW1 to send VLAN-tagged frames to R1-NY. Even though we'll start with VLAN 1 (untagged), the link is configured as trunk to support future VLANs.

4. **R1-NY to FW1-NYC (Transit Link)**
   - On R1-NY, select **Gi0/1**
   - On FW1-NYC, select **em0** (inside interface)
   - Drag to connect them

   **Why:** This link carries the NY-to-Tokyo traffic; it's the inside (LAN-facing) interface of the firewall.

5. **FW1-NYC to ISP-RTR (WAN Link)**
   - On FW1-NYC, select **em1** (outside/WAN interface)
   - On ISP-RTR, select **Gi0/0**
   - Drag to connect them

   **Why:** This link is the ISP boundary; packets cross from private (192.168.x.x) to public (203.0.113.x) space via NAT.

**Repeat for Tokyo Branch:**
6. **SRV1 to SW2/Fa0/2** (Access)
7. **SRV2 to SW2/Fa0/3** (Access)
8. **SW2 to R2-TKY/Gi0/0** (Trunk)
9. **R2-TKY/Gi0/1 to FW2-TKY/em0** (Transit)
10. **FW2-TKY/em1 to ISP-RTR/Gi0/1** (WAN)

**Interconnect ISP and Attacker:**
11. **ISP-RTR/Gi0/2 to ATTACKER/eth0** (Internet segment)

**Expected Result:** In GNS3, you should see:
- PC0 and PC1 connected to SW1
- SW1 connected to R1-NY
- R1-NY connected to FW1-NYC
- FW1-NYC connected to ISP-RTR
- ISP-RTR connected to FW2-TKY and ATTACKER
- FW2-TKY connected to R2-TKY
- R2-TKY connected to SW2
- SW2 connected to SRV1 and SRV2

---

## 3. Device Configuration Walkthrough

### 3.1 R1-NY Router Configuration (VyOS)

**Objective:** R1-NY is the gateway for NY LAN traffic. It needs two interfaces: one to SW1 (LAN) and one to FW1-NYC (transit to Tokyo/Internet).

**Step 1: Boot and Access Console**
1. Right-click on **R1-NY** → **Open console**
2. Wait for VyOS boot (1–2 minutes)
3. Login: `vyos` / `vyos`
4. You're now at the prompt: `vyos@vyos:~$`

**What it does:** Console access allows you to type commands directly on the device.

**Step 2: Enter Configuration Mode**
```
vyos@vyos:~$ configure
[edit]
vyos@vyos#
```

**Explanation:** `configure` puts VyOS into edit mode where you can modify the running config. The `#` prompt confirms you're in config mode.

**Step 3: Configure the LAN Interface (Gi0/0)**
```
[edit]
vyos@vyos# set interfaces ethernet eth0 description "NY-LAN-to-SW1"
vyos@vyos# set interfaces ethernet eth0 address 192.168.10.1/24
```

**Step-by-step explanation:**
- `set interfaces ethernet eth0 ...` → VyOS syntax for interface configuration
- `description "NY-LAN-to-SW1"` → A label for documentation (shown in `show interfaces`)
- `address 192.168.10.1/24` → IP address in CIDR notation (/24 = 255.255.255.0)

**Verify:**
```
[edit]
vyos@vyos# show interfaces ethernet eth0
 address 192.168.10.1/24
 description "NY-LAN-to-SW1"
 hwaddr 52:54:00:12:34:56
```

**Step 4: Configure the Transit Interface (Gi0/1)**
```
[edit]
vyos@vyos# set interfaces ethernet eth1 description "NY-Transit-to-FW1"
vyos@vyos# set interfaces ethernet eth1 address 192.168.100.2/30
```

**Why /30?** A /30 subnet has only 4 IP addresses:
- .0 (network address)
- .1 (FW1-NYC side)
- .2 (R1-NY side, this device)
- .3 (broadcast)

Point-to-point links use /30 to minimize address waste.

**Step 5: Configure Routing**
```
[edit]
vyos@vyos# set protocols static route 192.168.20.0/24 next-hop 192.168.100.1
```

**Explanation:** 
- `set protocols static route` → Add a static route entry
- `192.168.20.0/24` → Destination network (Tokyo LAN)
- `next-hop 192.168.100.1` → Next hop is FW1-NYC's inside IP

**What it does:** When R1-NY sees a packet destined for 192.168.20.x, it forwards it to 192.168.100.1 (FW1-NYC).

**Step 6: Configure Default Route**
```
[edit]
vyos@vyos# set protocols static route 0.0.0.0/0 next-hop 192.168.100.1
```

**Explanation:** 
- `0.0.0.0/0` → Any destination not explicitly matched by other routes
- `next-hop 192.168.100.1` → All other traffic goes to the firewall

**Why:** This is the escape hatch; if R1-NY doesn't know how to reach a subnet, it sends the packet to FW1-NYC.

**Step 7: Commit and Save**
```
[edit]
vyos@vyos# commit
[edit]
vyos@vyos# save
Saving configuration to '/etc/vyos/config.boot'...
Done
```

**What it does:**
- `commit` → Apply the configuration immediately (running config)
- `save` → Write the configuration to disk (survives reboot)

**Step 8: Verify**
```
[edit]
vyos@vyos# exit
vyos@vyos:~$ show ip route
Codes: K - kernel route, C - connected, S - static, R - RIP, B - BGP
       O - OSPF, IA - OSPF inter area, E1 - OSPF external type 1,
       E2 - OSPF external type 2, i - IS-IS, l - IS-IS level-1,
       L - IS-IS level-2, O3 - OSPFv3, A - Babel, > - selected route,
       * - FIB route

S   0.0.0.0/0 [210/0] via 192.168.100.1, eth1
S   192.168.20.0/24 [210/0] via 192.168.100.1, eth1
C>* 192.168.10.0/24 [0/0] via 192.168.10.1, eth0
C>* 192.168.100.0/30 [0/0] via 192.168.100.2, eth1

vyos@vyos:~$
```

**What to look for:**
- `S 0.0.0.0/0` → Default route installed ✓
- `S 192.168.20.0/24` → Tokyo route installed ✓
- `C 192.168.10.0/24` → Connected network (SW1 LAN) ✓
- `C 192.168.100.0/30` → Connected network (FW1 transit) ✓

---

### 3.2 R2-TKY Router Configuration

**Objective:** Same as R1-NY, but for Tokyo branch.

**Step 1: Console Access and Configuration Mode**
```
vyos@vyos:~$ configure
[edit]
```

**Step 2: Configure LAN Interface**
```
[edit]
vyos@vyos# set interfaces ethernet eth0 description "Tokyo-LAN-to-SW2"
vyos@vyos# set interfaces ethernet eth0 address 192.168.20.1/24
```

**Step 3: Configure Transit Interface**
```
[edit]
vyos@vyos# set interfaces ethernet eth1 description "Tokyo-Transit-to-FW2"
vyos@vyos# set interfaces ethernet eth1 address 192.168.200.2/30
```

**Step 4: Configure Routes**
```
[edit]
vyos@vyos# set protocols static route 192.168.10.0/24 next-hop 192.168.200.1
vyos@vyos# set protocols static route 0.0.0.0/0 next-hop 192.168.200.1
```

**Explanation:** Same as R1-NY, but next-hop points to FW2-TKY (192.168.200.1).

**Step 5: Commit and Verify**
```
[edit]
vyos@vyos# commit
vyos@vyos# save
vyos@vyos# exit
vyos@vyos:~$ show ip route
```

**Expected:**
- `S 0.0.0.0/0 via 192.168.200.1, eth1` ✓
- `S 192.168.10.0/24 via 192.168.200.1, eth1` ✓
- `C 192.168.20.0/24 via 192.168.20.1, eth0` ✓
- `C 192.168.200.0/30 via 192.168.200.2, eth1` ✓

---

### 3.3 SW1 (New York Switch) Configuration

**Objective:** SW1 is a Layer 2 switch. It learns MAC addresses and forwards frames based on VLAN membership. No IP routing happens here (yet).

**Step 1: Console Access**
```
Switch> enable
Switch# configure terminal
```

**Step 2: Create VLAN 10**
```
Switch(config)# vlan 10
Switch(config-vlan)# name NY-LAN
Switch(config-vlan)# exit
```

**What it does:** VLAN 10 is the operational LAN for NY. All PC0 and PC1 traffic belongs to VLAN 10.

**Step 3: Configure Access Ports**
```
Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# description "PC0-Access"
Switch(config-if)# no shutdown
Switch(config-if)# exit

Switch(config)# interface FastEthernet0/3
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# description "PC1-Access"
Switch(config-if)# no shutdown
Switch(config-if)# exit
```

**Step-by-step explanation:**
- `switchport mode access` → This port is an access port (only one VLAN, no tagging)
- `switchport access vlan 10` → Assign this port to VLAN 10
- `no shutdown` → Enable the port (enabled by default, but good practice to confirm)

**Step 4: Configure Trunk Port (to R1-NY)**
```
Switch(config)# interface GigabitEthernet0/1
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk allowed vlan 1,10
Switch(config-if)# switchport trunk native vlan 1
Switch(config-if)# description "Uplink-to-R1-NY"
Switch(config-if)# no shutdown
Switch(config-if)# exit
```

**Explanation:**
- `switchport mode trunk` → This port carries multiple VLANs (tagged frames)
- `switchport trunk allowed vlan 1,10` → Only VLAN 1 and 10 are allowed (security)
- `switchport trunk native vlan 1` → Untagged frames are assigned to VLAN 1 (management)

**Why:** The trunk link must allow VLAN 10 to reach R1-NY. VLAN 1 is reserved for management (though we don't use it in this lab).

**Step 5: Create SVI for Management**
```
Switch(config)# interface vlan 10
Switch(config-if)# ip address 192.168.10.2 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit
```

**What it does:** The Switch Virtual Interface (SVI) for VLAN 10 gives the switch an IP address on the NY LAN. If we manage the switch via SSH, we use this IP.

**Step 6: Configure Default Gateway**
```
Switch(config)# ip default-gateway 192.168.10.1
Switch(config)# exit
```

**Explanation:** If the switch needs to send traffic to a remote subnet (e.g., Tokyo), it sends it to 192.168.10.1 (R1-NY).

**Step 7: Verify**
```
Switch# show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Gi0/1(t)
10   NY-LAN                           active    Fa0/2, Fa0/3, Gi0/1(t)

Switch# show interface trunk

Port        Mode         Encapsulation  Status        Native vlan
Gi0/1       on           802.1q         trunking      1

! The (t) after Gi0/1 indicates trunk mode; Fa0/2 and Fa0/3 are access ports
```

**What to verify:**
- VLAN 10 exists and includes Fa0/2, Fa0/3 (access ports) ✓
- Gi0/1 is in trunk mode ✓
- Native VLAN is 1 ✓

---

### 3.4 SW2 (Tokyo Switch) Configuration

**Objective:** Same as SW1, but for Tokyo.

**Step 1: Enable and Configure Terminal**
```
Switch> enable
Switch# configure terminal
```

**Step 2: Create VLAN 20**
```
Switch(config)# vlan 20
Switch(config-vlan)# name Tokyo-LAN
Switch(config-vlan)# exit
```

**Step 3: Configure Access Ports**
```
Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 20
Switch(config-if)# description "SRV1-Access"
Switch(config-if)# no shutdown
Switch(config-if)# exit

Switch(config)# interface FastEthernet0/3
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 20
Switch(config-if)# description "SRV2-Access"
Switch(config-if)# no shutdown
Switch(config-if)# exit
```

**Step 4: Configure Trunk to R2-TKY**
```
Switch(config)# interface GigabitEthernet0/1
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk allowed vlan 1,20
Switch(config-if)# switchport trunk native vlan 1
Switch(config-if)# description "Uplink-to-R2-TKY"
Switch(config-if)# no shutdown
Switch(config-if)# exit
```

**Step 5: Create SVI for VLAN 20**
```
Switch(config)# interface vlan 20
Switch(config-if)# ip address 192.168.20.2 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit
```

**Step 6: Default Gateway**
```
Switch(config)# ip default-gateway 192.168.20.1
Switch(config)# exit
```

**Step 7: Verify**
```
Switch# show vlan brief | grep Tokyo
20   Tokyo-LAN                         active    Fa0/2, Fa0/3, Gi0/1(t)

Switch# show interface trunk | grep Gi0/1
Gi0/1       on           802.1q         trunking      1
```

---

### 3.5 PC0 & PC1 (New York End Devices) Configuration

**Objective:** Assign static IPs to the PCs so they can communicate with each other and other branches.

**Step 1: Boot Alpine Linux**
1. Right-click on **PC0** → **Open console**
2. Wait for boot (30–60 seconds)
3. Login: `root` / (no password, or password is `root`)
4. Prompt: `localhost:~#`

**Step 2: Configure Network Interface**
```
localhost:~# ip address add 192.168.10.50/24 dev eth0
localhost:~# ip link set eth0 up
```

**Explanation:**
- `ip address add` → Assign IP address (note: /24 is CIDR, not netmask)
- `dev eth0` → On interface eth0
- `ip link set eth0 up` → Enable the interface (bring it "up")

**Step 3: Configure Default Gateway**
```
localhost:~# ip route add default via 192.168.10.1
```

**Explanation:** When PC0 wants to send traffic to 192.168.20.x or 203.0.113.x, the OS uses this default route.

**Step 4: Verify Configuration**
```
localhost:~# ip address show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP qlen 1000
    link/ether 52:54:00:12:34:56 brd ff:ff:ff:ff:ff:ff
    inet 192.168.10.50/24 brd 192.168.10.255 scope global eth0
       valid_lft forever preferred_lft forever

localhost:~# ip route show
default via 192.168.10.1 dev eth0
192.168.10.0/24 dev eth0  proto kernel  scope link  src 192.168.10.50
```

**What to verify:**
- `inet 192.168.10.50/24` → IP assigned ✓
- `default via 192.168.10.1` → Default gateway set ✓
- Interface state: `UP` ✓

**Step 5: Persist Configuration (Reboot Survival)**

Alpine Linux doesn't persist network config by default. To make it permanent:

```
localhost:~# cat > /etc/network/interfaces << EOF
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet static
    address 192.168.10.50
    netmask 255.255.255.0
    gateway 192.168.10.1
EOF

localhost:~# service networking restart
```

**Explanation:** This writes the network config to a file that persists across reboots.

**Step 6: Repeat for PC1**
1. Right-click on **PC1** → **Open console**
2. Repeat Steps 2–5, but with IP `192.168.10.51`

```
localhost:~# ip address add 192.168.10.51/24 dev eth0
localhost:~# ip link set eth0 up
localhost:~# ip route add default via 192.168.10.1
localhost:~# # (And create /etc/network/interfaces as above)
```

---

### 3.6 SRV1 & SRV2 (Tokyo End Devices) Configuration

**Objective:** Same as PC0/PC1, but for Tokyo with VLAN 20 addresses.

**Step 1: Boot and Configure SRV1**
```
localhost:~# ip address add 192.168.20.10/24 dev eth0
localhost:~# ip link set eth0 up
localhost:~# ip route add default via 192.168.20.1
```

**Step 2: Persist SRV1 Config**
```
localhost:~# cat > /etc/network/interfaces << EOF
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet static
    address 192.168.20.10
    netmask 255.255.255.0
    gateway 192.168.20.1
EOF

localhost:~# service networking restart
```

**Step 3: Repeat for SRV2 (IP: 192.168.20.11)**

---

### 3.7 FW1-NYC (New York Firewall) Configuration

**Objective:** FW1-NYC is the gateway for the NY branch. It has two interfaces: inside (LAN-facing) and outside (WAN-facing). It translates private NY addresses to the public IP (203.0.113.2).

**pfSense Web Interface Setup:**

**Step 1: Boot pfSense**
1. Right-click on **FW1-NYC** → **Open console**
2. Wait for boot (3–5 minutes)
3. After boot, note the IPv4 address displayed (usually DHCP-assigned or 192.168.1.1)

**Step 2: Access Web UI**
1. From your host machine (or another device on the GNS3 network), open a browser
2. Go to `https://[FW1 IP]:443` (default port)
3. Accept the certificate warning (self-signed)
4. Login: `admin` / `pfsense` (default credentials)

**Step 3: Assign Interfaces**
1. Go to **System > General Setup**
2. Note the hostname and domain
3. Go to **Interfaces > Assignments**

**Current state:** pfSense detects two network adapters (em0, em1) but hasn't assigned them.

4. Assign **em0 as LAN** (inside interface):
   - Click **em0** (or "New Interface Assignments")
   - Select em0 from dropdown
   - Click **Save**
   - Go to **Interfaces > LAN**
   - Set IPv4 Address: `192.168.100.1`
   - Set IPv4 Subnet: `30`
   - Click **Save & Apply**

5. Assign **em1 as WAN** (outside interface):
   - Go to **Interfaces > Assignments**
   - Click "New Interface Assignments"
   - Select em1 from dropdown
   - Call it `WAN`
   - Click **Save**
   - Go to **Interfaces > WAN**
   - Set IPv4 Address: `203.0.113.2`
   - Set IPv4 Subnet: `30`
   - Set IPv4 Gateway: `203.0.113.1`
   - Click **Save & Apply**

**What this does:** pfSense now knows:
- Inside (LAN) = 192.168.100.1/30 (connects to R1-NY)
- Outside (WAN) = 203.0.113.2/30 (connects to ISP)

**Step 4: Configure Outbound NAT**
1. Go to **Firewall > NAT > Outbound**
2. Mode: `Automatic (Hybrid Outbound NAT rule generation)`
3. Click **Save**

**Explanation:** In hybrid mode, pfSense automatically creates NAT rules for traffic leaving the LAN. All outbound traffic from 192.168.100.x and 192.168.10.x will be translated to 203.0.113.2.

**Step 5: Configure Firewall Rules**

Default behavior: **Block everything, allow only what you explicitly permit**

1. Go to **Firewall > Rules > LAN**
2. Click **+ Add** (at bottom) to add a new rule
3. Configure:
   - **Action:** Pass
   - **Interface:** LAN
   - **Direction:** in
   - **Address Family:** IPv4
   - **Protocol:** TCP/UDP
   - **Destination:** any
   - **Destination Port Range:** 0–65535 (all ports)
   - **Description:** "Allow all LAN traffic outbound"
4. Click **Save**
5. Click **Apply Changes**

**What this does:** Devices on the LAN (192.168.100.0/30, 192.168.10.0/24) can send traffic outbound.

6. Add a rule for **WAN → LAN** (return traffic, stateful):
   - Go to **Firewall > Rules > WAN**
   - By default, there's an anti-lockout rule
   - Add a rule:
     - **Action:** Pass
     - **Interface:** WAN
     - **Direction:** in
     - **Address Family:** IPv4
     - **Protocol:** TCP/UDP
     - **Description:** "Allow return traffic"
   - Click **Save & Apply**

**Explanation:** This rule allows established connections (stateful inspection) to return through the firewall.

**Step 6: Verify Configuration**
1. Go to **Status > System Logs**
2. Check for any errors related to interfaces or rules
3. Go to **Diagnostics > Ping**
4. Ping `192.168.100.1` (should be pfSense LAN IP itself)
5. Ping `203.0.113.1` (should be ISP-RTR)

**Expected:** Both pings should succeed.

---

### 3.8 FW2-TKY (Tokyo Firewall) Configuration

**Objective:** Same as FW1-NYC, but for Tokyo.

**Step 1: Boot and Access Web UI**
1. Right-click on **FW2-TKY** → **Open console**
2. Wait for boot
3. Access web UI on default IP

**Step 2: Assign Interfaces**
1. Go to **Interfaces > Assignments**
2. Assign **em0 as LAN**:
   - IPv4 Address: `192.168.200.1`
   - IPv4 Subnet: `30`
3. Assign **em1 as WAN**:
   - IPv4 Address: `203.0.113.6`
   - IPv4 Subnet: `30`
   - IPv4 Gateway: `203.0.113.5`

**Step 3: Configure Outbound NAT**
1. Go to **Firewall > NAT > Outbound**
2. Mode: `Automatic (Hybrid Outbound NAT rule generation)`

**Step 4: Configure Rules**
1. Go to **Firewall > Rules > LAN**
2. Add rule:
   - **Action:** Pass
   - **Description:** "Allow all LAN outbound"
3. Go to **Firewall > Rules > WAN**
4. Verify anti-lockout rule exists; add return traffic rule if needed

**Step 5: Verify**
1. Go to **Diagnostics > Ping**
2. Ping `192.168.200.1` (FW2-TKY LAN IP)
3. Ping `203.0.113.5` (ISP-RTR)

---

### 3.9 ISP-RTR (Internet Router) Configuration

**Objective:** ISP-RTR simulates the internet backbone. It connects both firewalls and knows how to route between them.

**Step 1: Console Access**
```
vyos@vyos:~$ configure
[edit]
```

**Step 2: Configure WAN Link 1 (to FW1-NYC)**
```
[edit]
vyos@vyos# set interfaces ethernet eth0 description "ISP-to-FW1-NYC"
vyos@vyos# set interfaces ethernet eth0 address 203.0.113.1/30
```

**Step 3: Configure WAN Link 2 (to FW2-TKY)**
```
[edit]
vyos@vyos# set interfaces ethernet eth1 description "ISP-to-FW2-TKY"
vyos@vyos# set interfaces ethernet eth1 address 203.0.113.5/30
```

**Step 4: Configure Access Link (to ATTACKER)**
```
[edit]
vyos@vyos# set interfaces ethernet eth2 description "ISP-to-ATTACKER"
vyos@vyos# set interfaces ethernet eth2 address 203.0.113.1/30
```

**Wait, that's a duplicate address!** Let me correct:
```
[edit]
vyos@vyos# set interfaces ethernet eth2 description "ISP-to-ATTACKER"
vyos@vyos# set interfaces ethernet eth2 address 203.0.113.1/30
```

Actually, ATTACKER should be on a different subnet or share a subnet. For simplicity, let's say ATTACKER is on the same segment as FW1 (203.0.113.0/30). In that case, we don't need eth2; ATTACKER would connect to the same switch as FW1.

**Let's revise:** In GNS3, remove the direct link from ISP-RTR/Gi0/2 to ATTACKER. Instead, add a switch between them.

For now, let's just configure the two WAN links:

**Step 4 (Revised): Routes**
```
[edit]
vyos@vyos# set protocols static route 192.168.10.0/24 next-hop 203.0.113.2
vyos@vyos# set protocols static route 192.168.20.0/24 next-hop 203.0.113.6
```

**Explanation:** When ISP-RTR sees traffic destined for NY or Tokyo, it forwards to the respective firewall.

**Step 5: Commit and Verify**
```
[edit]
vyos@vyos# commit
vyos@vyos# save
vyos@vyos# exit
vyos@vyos:~$ show ip route

S   192.168.10.0/24 [210/0] via 203.0.113.2, eth0
S   192.168.20.0/24 [210/0] via 203.0.113.6, eth1
C>* 203.0.113.0/30 [0/0] via 203.0.113.1, eth0
C>* 203.0.113.4/30 [0/0] via 203.0.113.5, eth1
```

---

### 3.10 ATTACKER (Internet Host) Configuration

**Objective:** ATTACKER simulates an external internet host. It will test whether firewalls block unsolicited inbound traffic.

**Step 1: Boot and Configure**
```
localhost:~# ip address add 203.0.113.3/30 dev eth0
localhost:~# ip link set eth0 up
localhost:~# ip route add default via 203.0.113.1
```

**Step 2: Verify**
```
localhost:~# ip addr show
localhost:~# ping 203.0.113.1  # ISP-RTR
localhost:~# ping 203.0.113.2  # FW1-NYC
localhost:~# ping 203.0.113.6  # FW2-TKY
```

**Expected:** All three pings should succeed (internet-to-firewall connectivity).

---

## 4. Verification Workflow

### 4.1 Ping Test Matrix (Expected Results)

After all devices are configured, run these pings to verify connectivity:

| Source | Destination | Expected | Command |
|--------|-------------|----------|---------|
| PC0 | PC1 | ✓ Ping succeeds | `ping -c 4 192.168.10.51` |
| PC0 | SRV1 | ✓ Ping succeeds (inter-site) | `ping -c 4 192.168.20.10` |
| PC0 | ATTACKER | ✓ Ping succeeds (internet) | `ping -c 4 203.0.113.3` |
| SRV1 | PC0 | ✓ Ping succeeds | `ping -c 4 192.168.10.50` |
| ATTACKER | PC0 | ✗ Ping fails (firewall blocks) | `ping -c 4 192.168.10.50` |
| ATTACKER | SRV1 | ✗ Ping fails (firewall blocks) | `ping -c 4 192.168.20.10` |

### 4.2 Step-by-Step Verification

**Step 1: From PC0, ping the local gateway (R1-NY)**
```
PC0# ping -c 4 192.168.10.1
PING 192.168.10.1 (192.168.10.1) 56(84) bytes of data.
64 bytes from 192.168.10.1: icmp_seq=1 ttl=64 time=2.123 ms
64 bytes from 192.168.10.1: icmp_seq=2 ttl=64 time=1.987 ms
64 bytes from 192.168.10.1: icmp_seq=3 ttl=64 time=2.045 ms
64 bytes from 192.168.10.1: icmp_seq=4 ttl=64 time=2.034 ms
--- 192.168.10.1 statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3003ms
rtt min/avg/max/stddev = 1.987/2.047/2.123/0.061 ms
```

**What this tests:** PC0 can reach its default gateway (R1-NY). If this fails, check:
- Is eth0 up? (`ip link show eth0`)
- Is IP configured? (`ip addr show`)
- Is there a route to 192.168.10.1? (`ip route show`)

**Step 2: From PC0, ping the firewall (192.168.100.1)**
```
PC0# ping -c 4 192.168.100.1
PING 192.168.100.1 (192.168.100.1) 56(84) bytes of data.
64 bytes from 192.168.100.1: icmp_seq=1 ttl=63 time=5.234 ms
...
```

**What this tests:** PC0 can reach FW1-NYC. This involves R1-NY forwarding the packet. If this fails:
- Is R1-NY routing? (`show ip route` on R1-NY)
- Is FW1-NYC interface up? (Check pfSense web UI > **Interfaces > Assignments**)

**Step 3: From PC0, ping Tokyo (192.168.20.10)**
```
PC0# ping -c 4 192.168.20.10
PING 192.168.20.10 (192.168.20.10) 56(84) bytes of data.
64 bytes from 192.168.20.10: icmp_seq=1 ttl=57 time=10.456 ms
...
```

**Troubleshooting if this fails:**
1. Check R1-NY has route to 192.168.20.0/24: `show ip route`
2. Check FW1-NYC can reach 203.0.113.5: Ping from pfSense web UI (**Diagnostics > Ping > 203.0.113.5**)
3. Check ISP-RTR has route to 192.168.20.0/24: `show ip route` on ISP-RTR
4. Check R2-TKY has route to 192.168.10.0/24: `show ip route` on R2-TKY
5. Check FW2-TKY is up: Verify interfaces in pfSense web UI

**Step 4: From PC0, traceroute to Tokyo**
```
PC0# traceroute -m 15 192.168.20.10
traceroute to 192.168.20.10 (192.168.20.10), 15 hops max, 60 byte packets
 1  192.168.10.1 (192.168.10.1)  2.345 ms      # R1-NY
 2  192.168.100.1 (192.168.100.1)  3.456 ms    # FW1-NYC inside
 3  203.0.113.1 (203.0.113.1)  5.678 ms        # ISP-RTR
 4  203.0.113.5 (203.0.113.5)  7.890 ms        # FW2-TKY outside
 5  192.168.200.1 (192.168.200.1)  8.901 ms    # FW2-TKY inside
 6  192.168.20.1 (192.168.20.1)  9.234 ms      # R2-TKY
 7  192.168.20.10 (192.168.20.10)  10.567 ms   # SRV1
```

**What this shows:** The full path from NY to Tokyo:
- Hops 1–2: NY LAN path (PC0 → R1-NY → FW1-NYC)
- Hops 3–5: Internet path (ISP-RTR → FW2-TKY)
- Hops 6–7: Tokyo LAN path (R2-TKY → SRV1)

**Step 5: From ATTACKER, try to ping PC0 (should fail)**
```
ATTACKER# ping -c 4 192.168.10.50
PING 192.168.10.50 (192.168.10.50) 56(84) bytes of data.

! No responses (timeout after ~5 seconds)
```

**What this tests:** Firewall is blocking unsolicited inbound traffic (stateful filtering). This is **expected behavior**.

---

## 5. Hands-On Troubleshooting Scenarios

### Scenario 1: PC0 Cannot Reach R1-NY

**Symptoms:** `ping -c 4 192.168.10.1` → No response; timeout

**Root Cause Analysis:**

1. **Check PC0 interface:**
   ```
   PC0# ip addr show eth0
   2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP qlen 1000
       link/ether 52:54:00:12:34:56 brd ff:ff:ff:ff:ff:ff
       inet 192.168.10.50/24 brd 192.168.10.255 scope global eth0
   ```
   **If UP and IP is correct:** Proceed to Step 2
   **If DOWN or no IP:** Run:
   ```
   PC0# ip address add 192.168.10.50/24 dev eth0
   PC0# ip link set eth0 up
   ```

2. **Check PC0 routes:**
   ```
   PC0# ip route show
   default via 192.168.10.1 dev eth0
   192.168.10.0/24 dev eth0  proto kernel  scope link  src 192.168.10.50
   ```
   **If missing default route:** Run:
   ```
   PC0# ip route add default via 192.168.10.1
   ```

3. **Check SW1:**
   ```
   SW1# show interface status
   
   Interface              Status         VLAN Duplex Speed Type
   Fa0/2                  connected      10   auto   auto 10/100BaseTX
   Fa0/3                  connected      10   auto   auto 10/100BaseTX
   Gi0/1                  connected      trunk
   ```
   **If Fa0/2 is NOT connected:** Check GNS3 link (right-click link → should show green indicator)

4. **Check R1-NY:**
   ```
   R1-NY# show ip interface brief
   Interface              IP-Address      OK? Method Status                Protocol
   GigabitEthernet0/0     192.168.10.1    YES manual up                    up
   GigabitEthernet0/1     192.168.100.2   YES manual up                    up
   ```
   **If status is "down":** Run:
   ```
   R1-NY# configure
   [edit]
   R1-NY# set interfaces ethernet eth0 up
   R1-NY# commit
   ```

5. **Try ping again:**
   ```
   PC0# ping -c 4 192.168.10.1
   ```
   **Expected:** Now succeeds

---

### Scenario 2: PC0 Can Reach R1-NY, But Not SRV1 (Tokyo)

**Symptoms:** 
- `ping -c 4 192.168.10.1` → ✓ Succeeds
- `ping -c 4 192.168.20.10` → ✗ Timeout

**Root Cause Analysis:**

1. **Check R1-NY routing table:**
   ```
   R1-NY# show ip route | grep 192.168.20
   S   192.168.20.0/24 [210/0] via 192.168.100.1, eth1
   ```
   **If this route is missing:** Run:
   ```
   R1-NY# configure
   [edit]
   R1-NY# set protocols static route 192.168.20.0/24 next-hop 192.168.100.1
   R1-NY# commit
   ```

2. **Check FW1-NYC is reachable:**
   ```
   R1-NY# ping 192.168.100.1
   Type escape sequence to abort.
   Sending 5, 100-byte ICMP Echos to 192.168.100.1, timeout is 2 seconds:
   !!!!!
   Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/3 ms
   ```
   **If fails:** Check GNS3 link between R1-NY/Gi0/1 and FW1-NYC/em0

3. **Check FW1-NYC interfaces:**
   - Login to pfSense web UI
   - Go to **Status > Interfaces**
   - Verify:
     - LAN (em0): `192.168.100.1/30` - Status: UP
     - WAN (em1): `203.0.113.2/30` - Status: UP
   **If either is DOWN:** Go to **Interfaces > [Interface Name] > General Setup** and check DHCP vs. Static IP configuration.

4. **Check FW1-NYC can reach ISP-RTR:**
   - Go to **Diagnostics > Ping**
   - Ping `203.0.113.1`
   **If fails:** Check GNS3 link between FW1-NYC/em1 and ISP-RTR/Gi0/0

5. **Check ISP-RTR routing:**
   ```
   ISP-RTR# show ip route | grep 192.168.20
   S   192.168.20.0/24 [210/0] via 203.0.113.6, eth1
   ```
   **If missing:** Add the route

6. **Check FW2-TKY interface (inside):**
   - pfSense web UI → **Status > Interfaces**
   - LAN (em0): `192.168.200.1/30` - Status: UP

7. **Check R2-TKY routing:**
   ```
   R2-TKY# show ip route | grep 192.168.10
   S   192.168.10.0/24 [210/0] via 192.168.200.1, eth1
   ```
   **If missing:** Add the route

8. **Check firewall rules allow inter-site traffic:**
   - pfSense (FW1-NYC) → **Firewall > Rules > LAN**
   - Should have a rule like: "Pass any from any to any" or at least allow traffic to 192.168.200.0/30 and 192.168.20.0/24
   - pfSense (FW2-TKY) → **Firewall > Rules > LAN**
   - Should allow traffic from 192.168.100.0/30 and 192.168.10.0/24

---

### Scenario 3: ATTACKER Can Ping PC0 (Security Breach!)

**Symptoms:** 
- From ATTACKER: `ping -c 4 192.168.10.50` → ✓ Succeeds

**Root Cause:** Firewall rules are not configured correctly.

**Fix:**

1. Login to FW1-NYC web UI
2. Go to **Firewall > Rules > WAN**
3. Look for the default rules; you should see:
   - An "anti-lockout" rule (allows SSH/HTTPS to firewall itself)
   - But NO rule allowing inbound traffic to the LAN
4. If there's a "pass all" rule, **delete it**
5. Verify only established connections are allowed:
   - Default pfSense behavior: Stateful inspection (allow established/related traffic, block new connections)
   - This should automatically block unsolicited inbound from ATTACKER

**Verification:**
```
FW1-NYC pfSense$ pfctl -s rules | grep -i "quick"
@0 pass in quick on em1 proto tcp from any to (em1) port = https keep state label "admin https"
...
```

---

## 6. Design Questions (Answer in Your Own Words)

1. **Why does the firewall translate private addresses (192.168.x.x) to public (203.0.113.x)?**

   Your answer: _(Write your thoughts here. Look for: RFC 1918 hiding, ISP routing, security by obscurity, address conservation)_

2. **What happens if PC0 sends a packet to SRV1? Trace the path and identify which device processes it at each step.**

   Your answer: _(Draw the path: PC0 → SW1 → R1-NY → FW1-NYC → ISP-RTR → FW2-TKY → R2-TKY → SW2 → SRV1. Explain MAC learning, IP routing, NAT)_

3. **If you add a third branch in Singapore (192.168.30.0/24), what changes do you need to make?**

   Your answer: _(Add router R3-SGP, switch SW3, firewall FW3-SGP, add static routes to all routers, expand NAT rules, add firewall rules)_

4. **Why are trunk ports configured with `switchport trunk allowed vlan 1,10`? What happens if you allow all VLANs?**

   Your answer: _(Trunk allowed list restricts which VLANs can pass; allowing all increases VLAN flooding and reduces security)_

5. **What is the purpose of the default route (0.0.0.0/0) on R1-NY?**

   Your answer: _(Any packet destined for a subnet not explicitly matched by a static route gets sent to the default gateway; this is the escape hatch for unknown destinations)_

---

## 7. Self-Guided Troubleshooting Challenge

Pick any **three of these intentional breaks** and diagnose using `show` commands:

### Challenge 1: Shutdown R1-NY/Gi0/1
```
R1-NY# configure
[edit]
R1-NY# set interfaces ethernet eth1 disable
R1-NY# commit
R1-NY# exit

! Now PC0 cannot reach Tokyo
! Diagnosis: PC0# traceroute 192.168.20.10
! Result: Stops at hop 2 (R1-NY)
! Fix: set interfaces ethernet eth1 no shutdown
```

### Challenge 2: Delete Tokyo Static Route from R1-NY
```
R1-NY# configure
[edit]
R1-NY# delete protocols static route 192.168.20.0/24
R1-NY# commit
R1-NY# exit

! Now PC0 cannot reach Tokyo
! Diagnosis: R1-NY# show ip route
! Result: No "S 192.168.20.0/24" entry
! Fix: set protocols static route 192.168.20.0/24 next-hop 192.168.100.1
```

### Challenge 3: Misconfigure SW1 VLAN Access Port
```
SW1# configure terminal
Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport access vlan 99  ! Wrong VLAN
Switch(config-if)# end

! Now PC0 cannot ping PC1
! Diagnosis: SW1# show mac-address-table
! Result: PC0's MAC not learned on VLAN 10
! Fix: switchport access vlan 10
```

**Instructions:**
1. Implement one break (e.g., shut down R1-NY/Gi0/1)
2. Attempt the failing ping
3. Diagnose using `show` commands (route table, interface status, MAC table, firewall rules)
4. Identify the root cause
5. Apply the fix
6. Verify connectivity is restored

---

## 8. Self-Check Checklist

After completing this practice lab, verify you can:

- [ ] I built the complete topology in GNS3 (13 nodes, 11 links)
- [ ] I configured R1-NY with LAN and transit interfaces
- [ ] I configured R2-TKY with LAN and transit interfaces
- [ ] I set up static routes on both routers for inter-site routing
- [ ] I created VLANs on SW1 and SW2
- [ ] I configured trunk and access ports on both switches
- [ ] I assigned static IPs to PC0, PC1, SRV1, SRV2
- [ ] I configured FW1-NYC with inside and outside interfaces
- [ ] I configured FW2-TKY with inside and outside interfaces
- [ ] I set up NAT/PAT on both firewalls
- [ ] I configured firewall rules to allow inter-site traffic
- [ ] I verified PC0 ↔ SRV1 connectivity (inter-site ping succeeds)
- [ ] I verified PC0 → ATTACKER connectivity (internet access works)
- [ ] I verified ATTACKER ↔ PC0 is blocked (firewall protects)
- [ ] I troubleshot at least one connectivity issue independently

**Score:** Count your checks. 14+ = Master; 12–13 = Proficient; 10–11 = Competent; <10 = Review and retry

---

## 9. Key Takeaways

1. **Router**: Forwards packets between subnets based on routing tables. Routers are the "backbone" of multi-site networks.

2. **Switch**: Forwards frames within a LAN based on MAC addresses. Switches are "transparent" to routing but critical for Layer 2 connectivity.

3. **Firewall**: Filters packets based on rules; performs NAT/PAT translation; provides stateful inspection. Firewalls are the "gatekeepers" of security.

4. **NAT/PAT**: Hides internal private addresses from the internet. Allows scalability and improves security.

5. **Static Routing**: Simple to configure but doesn't scale beyond ~10 sites. Next labs will introduce OSPF (dynamic routing) to handle larger networks.

6. **Verification Mindset**: Always use `ping`, `traceroute`, `show ip route`, `show interface`, and packet captures to verify and troubleshoot. Never assume; always verify.

---

## 10. Conclusion

This practice lab reinforced the core concepts of enterprise networking:
- Devices have roles (router, switch, firewall)
- Connectivity requires proper configuration at each layer (physical links, IP, VLAN, routing, security)
- Troubleshooting follows a structured approach (verify interfaces, routes, rules, connectivity)

**Next Steps:** Review the Lab Manual (Day-01-Lab-Manual.md) for RFC references and design reasoning. Then proceed to Day 02: Basic Routing & Dynamic Routing (OSPF).

---

**Practice Lab Documentation Version:** 1.0  
**Last Updated:** 2026-08-30  
**Author:** CCNA Labs Team  
**Difficulty:** Beginner to Intermediate  
**Time to Complete:** 2–3 hours
