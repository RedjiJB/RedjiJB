# GNS3 Lab Build Instructions: Day 01 — Network Devices & Enterprise Topology

---

## 0. Overview

This README documents the GNS3 build for **Day 01: Network Devices & Enterprise Topology**, including:
- **Base Lab:** Two-branch enterprise network (New York, Tokyo) with NAT, routing, and firewalls
- **7 Field Variants:** Alternative topologies for different operational scenarios and deployment contexts

---

## 1. Prerequisite Images & Appliances

### 1.1 Required Appliances

| Appliance | Role | Image File | Version | RAM | Disk |
|-----------|------|-----------|---------|-----|------|
| **VyOS Router** | Core routing (R1, R2, ISP) | vyos-equuleus-1.5.0-generic-amd64.iso | 1.5.x | 512 MB | 8 GB |
| **Open vSwitch** | Layer 2 switching (SW1, SW2) | OVS 2.17 or GNS3 built-in | 2.17+ | 256 MB | 2 GB |
| **pfSense Firewall** | NAT, filtering (FW1, FW2) | pfSense-2.7.1-RELEASE-amd64.iso | 2.7.x | 1 GB | 20 GB |
| **Alpine Linux** | End devices (PC0, SRV1, etc.) | alpine-virt-3.19.1-x86_64.iso | 3.19.x | 128 MB | 500 MB |
| **Debian Linux** | End devices (alt. to Alpine) | debian-12.7.0-amd64-netinst.iso | 12.7 | 256 MB | 5 GB |

### 1.2 Image Setup Instructions

**Step 1: Download Images**
```bash
# VyOS
wget https://cdn.vyos.io/releases/equuleus/vyos-equuleus-1.5.0-generic-amd64.iso

# pfSense
# Download from: https://www.pfsense.org/download/ (2.7.1 Community Edition, AMD64)
# Note: pfSense requires manual download; it's NOT in standard repositories

# Alpine Linux
wget https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/alpine-virt-3.19.1-x86_64.iso

# Debian
wget https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.7.0-amd64-netinst.iso
```

**Step 2: Add Images to GNS3**
1. Open GNS3
2. Go to **Edit > Preferences > GNS3 VM > Edit >** (if using GNS3 VM, configure there)
3. Navigate to **Qemu > Qemu VMs** (or your hypervisor)
4. Click **New** for each appliance:
   - Image path: `/path/to/vyos-equuleus-1.5.0-generic-amd64.iso`
   - Name: `VyOS-1.5.0`
   - Memory: 512 MB
   - vCPU: 2
5. Repeat for pfSense (1 GB RAM), Alpine Linux (128 MB), and Debian (256 MB)

**Step 3: Verify Images in GNS3**
- Go to **Edit > Preferences > Appliances**
- You should see:
  - VyOS Router
  - Open vSwitch
  - pfSense
  - Alpine Linux
  - (Debian Linux optional)

---

## 2. Base Lab Topology

### 2.1 Base Topology Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        INTERNET / ISP CORE                       │
│                    203.0.113.0/24 (Public Space)                 │
└──────────────┬───────────────────────────────────┬────────────────┘
               │                                   │
         FW1-NYC (outside)                    FW2-TKY (outside)
      203.0.113.2/30                         203.0.113.6/30
               │                                   │
         FW1-NYC (inside)                    FW2-TKY (inside)
      192.168.100.1/30                      192.168.200.1/30
               │                                   │
           R1-NY                                R2-TKY
      192.168.100.2/30                      192.168.200.2/30
               │                                   │
              SW1                                 SW2
      (VLAN 10 Gateway: .2)                (VLAN 20 Gateway: .2)
               │                                   │
       ┌───────┴────────┐                  ┌────────┴────────┐
       │                │                  │                 │
      PC0             PC1                SRV1              SRV2
   192.168.10.50  192.168.10.51     192.168.20.10   192.168.20.11
   
[ISP-RTR]
203.0.113.1
    │
[ATTACKER]
203.0.113.3
```

### 2.2 Base Topology Node List

| Node ID | Name | Type | Image | Interfaces | RAM | Notes |
|---------|------|------|-------|-----------|-----|-------|
| 1 | PC0 | Alpine | alpine-virt-3.19.1 | eth0 (192.168.10.50/24) | 128 MB | NY end device |
| 2 | PC1 | Alpine | alpine-virt-3.19.1 | eth0 (192.168.10.51/24) | 128 MB | NY end device |
| 3 | SRV1 | Alpine | alpine-virt-3.19.1 | eth0 (192.168.20.10/24) | 128 MB | Tokyo end device |
| 4 | SRV2 | Alpine | alpine-virt-3.19.1 | eth0 (192.168.20.11/24) | 128 MB | Tokyo end device |
| 5 | SW1 | Switch | OVS 2.17 | Fa0/2, Fa0/3, Gi0/1 (trunk) | 256 MB | NY Layer 2 |
| 6 | SW2 | Switch | OVS 2.17 | Fa0/2, Fa0/3, Gi0/1 (trunk) | 256 MB | Tokyo Layer 2 |
| 7 | R1-NY | Router | VyOS 1.5.0 | eth0 (LAN), eth1 (transit) | 512 MB | NY gateway |
| 8 | R2-TKY | Router | VyOS 1.5.0 | eth0 (LAN), eth1 (transit) | 512 MB | Tokyo gateway |
| 9 | FW1-NYC | Firewall | pfSense 2.7.1 | em0 (inside), em1 (outside) | 1 GB | NY perimeter |
| 10 | FW2-TKY | Firewall | pfSense 2.7.1 | em0 (inside), em1 (outside) | 1 GB | Tokyo firewall |
| 11 | ISP-RTR | Router | VyOS 1.5.0 | eth0 (to FW1), eth1 (to FW2), eth2 (to ATK) | 512 MB | ISP backbone |
| 12 | ATTACKER | Alpine | alpine-virt-3.19.1 | eth0 (203.0.113.3/30) | 128 MB | Internet threat |

**Total: 12 nodes | 11 links | ~5 GB RAM allocated**

### 2.3 Base Topology Link List

| Link ID | Source | Source Port | Destination | Dest Port | Link Type |
|---------|--------|-------------|-------------|-----------|-----------|
| L1 | PC0 | eth0 | SW1 | Fa0/2 | Access (100 Mbps) |
| L2 | PC1 | eth0 | SW1 | Fa0/3 | Access (100 Mbps) |
| L3 | SW1 | Gi0/1 | R1-NY | eth0 | Trunk (1 Gbps) |
| L4 | R1-NY | eth1 | FW1-NYC | em0 | Transit (1 Gbps) |
| L5 | FW1-NYC | em1 | ISP-RTR | eth0 | WAN (1 Gbps) |
| L6 | SRV1 | eth0 | SW2 | Fa0/2 | Access (100 Mbps) |
| L7 | SRV2 | eth0 | SW2 | Fa0/3 | Access (100 Mbps) |
| L8 | SW2 | Gi0/1 | R2-TKY | eth0 | Trunk (1 Gbps) |
| L9 | R2-TKY | eth1 | FW2-TKY | em0 | Transit (1 Gbps) |
| L10 | FW2-TKY | em1 | ISP-RTR | eth1 | WAN (1 Gbps) |
| L11 | ISP-RTR | eth2 | ATTACKER | eth0 | Access (100 Mbps) |

---

## 3. Build Script Reference

A GNS3 project file (`.gns3`) can be version-controlled and cloned. The following commands build the base topology programmatically:

### 3.1 GNS3 Project Initialization (CLI)

```bash
#!/bin/bash
# build-day01-base.sh

GNS3_DIR="/path/to/GNS3/projects/CCNA-Day-01-Lab"
PROJECT_NAME="Day-01-Enterprise-Topology"

# Create project directory
mkdir -p "$GNS3_DIR"
cd "$GNS3_DIR"

# Initialize GNS3 project (requires GNS3 API or GUI)
# For now, use GNS3 web API:

curl -X POST http://localhost:3080/v2/projects \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$PROJECT_NAME\",
    \"path\": \"$GNS3_DIR\"
  }"

# Add nodes (VyOS routers)
curl -X POST http://localhost:3080/v2/projects/$PROJECT_ID/nodes \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"R1-NY\",
    \"node_type\": \"qemu\",
    \"compute_id\": \"local\",
    \"properties\": {
      \"ram\": 512,
      \"hda_disk_size\": 8000,
      \"adapters\": 2,
      \"adapter_type\": \"e1000\"
    }
  }"

# (Repeat for all nodes and links)
```

**Note:** The full script is complex. Instead, use the **GNS3 GUI** to build the topology and then export it as JSON:

```bash
# Export project as JSON
gns3console export-project $PROJECT_ID > day01-base.gns3

# Import project from JSON
gns3console import-project day01-base.gns3
```

### 3.2 Manual GNS3 GUI Build Steps

**Simplified workflow:**

1. **Open GNS3 → File > New Project**
2. **Drag nodes:**
   - R1-NY (VyOS) from appliance list
   - SW1 (OVS) from appliance list
   - FW1-NYC (pfSense) from appliance list
   - PC0, PC1 (Alpine) from appliance list
   - (Repeat for Tokyo branch and ISP core)
3. **Connect nodes:** Drag between port pairs (see Link List above)
4. **Start project:** Click the play button
5. **Configure devices:** See Day-01-Lab-Manual.md and Day-01-Practice-Lab.md

---

## 4. Field Variant Topologies

Each field variant extends or modifies the base topology to simulate different operational scenarios:

### Field-1: Black Start (Offline Operation)

**Purpose:** Network operates fully offline without internet connectivity; local DNS/NTP.

**Modifications:**
- **Added Nodes:**
  - DNS-SRV (Alpine, runs dnsmasq): 192.168.10.100
  - NTP-SRV (Alpine, runs ntpd): 192.168.10.101
- **Modified Nodes:**
  - R1-NY: Runs DNS/NTP server roles; no internet default route
  - ISP-RTR: Still present but not used (for failover testing)
- **Deleted Nodes/Links:**
  - ATTACKER node (no internet threat model)
  - ISP-RTR ↔ ATTACKER link

**Node Modifications:**
```
R1-NY:
  + DNS port 53/UDP (listening on 192.168.10.1)
  + NTP port 123/UDP (listening on 192.168.10.1)
  - Internet default route (all traffic stays local)

SW1:
  + VLAN 100 (DNS/NTP services)

New Nodes:
  + DNS-SRV (192.168.10.100, listens on :53)
  + NTP-SRV (192.168.10.101, listens on :123)
```

**New Links:**
- DNS-SRV eth0 ↔ SW1 Fa0/4 (VLAN 100)
- NTP-SRV eth0 ↔ SW1 Fa0/5 (VLAN 100)

**Use Case:** Haiti pilot deployment (P38); internet outages common; must operate autonomously

**Related Lab:** Day-01-Field-1-Lab.md

---

### Field-2: High Availability (Redundant Links)

**Purpose:** Dual WAN links for failover; redundant routers and firewalls.

**Modifications:**
- **Added Nodes:**
  - R1B-NY (backup router): 192.168.10.254
  - FW1B-NYC (backup firewall): 192.168.101.1
  - ISP-RTR-2 (secondary ISP): 203.0.113.9/30
- **Modified Nodes:**
  - SW1: Add uplinks for redundancy
  - R1-NY: Change gateway to VLAN 10 .1; R1B is .254
- **New Links:**
  - R1B-NY eth0 ↔ SW1 Gi0/2 (second uplink)
  - R1B-NY eth1 ↔ FW1B-NYC em0
  - FW1B-NYC em1 ↔ ISP-RTR-2 eth0
  - ISP-RTR eth2 ↔ ISP-RTR-2 eth1 (backbone redundancy)

**Use Case:** Enterprise HQ with SLA requirements; failover on link loss

**Related Lab:** Day-01-Field-2-Lab.md (not documented yet; stretch goal)

---

### Field-3: Multi-Tenant Isolation

**Purpose:** Multiple independent customers on shared infrastructure; VLAN/VRF isolation.

**Modifications:**
- **Added VLANs:**
  - VLAN 30: Customer C1 (192.168.30.0/24)
  - VLAN 40: Customer C2 (192.168.40.0/24)
  - VLAN 99: Management (10.0.99.0/24)
- **Added Nodes:**
  - C1-PC1, C1-PC2: Customer 1 devices (VLAN 30)
  - C2-PC1, C2-PC2: Customer 2 devices (VLAN 40)
- **Modified Firewalls:**
  - FW1-NYC: Route-based VRF isolation (Customer 1 traffic separate from Customer 2)
  - NAT per customer (C1: 203.0.113.8/30, C2: 203.0.113.12/30)
- **Access Control:**
  - C1 cannot reach C2 (inter-VLAN routing blocked)
  - Each customer NATs to unique public IP

**Use Case:** MSP (Managed Service Provider) hosting multiple small businesses

**Related Lab:** Day-01-Field-3-Lab.md (exists; building on this)

---

### Field-4: Mobile Branch (Cellular Backup)

**Purpose:** Branch with primary broadband WAN, cellular (LTE/4G) as backup.

**Modifications:**
- **Added Nodes:**
  - MODEM-4G: Simulates cellular modem (203.0.113.16/30 secondary ISP)
  - FW1-SECONDARY: Firewall for secondary WAN (not actively used unless primary fails)
- **Modified Firewalls:**
  - FW1-NYC: Monitor primary WAN link; if down, failover to MODEM-4G
  - WAN failover rules (OSPF or BGP can be used)
- **Traffic Engineering:**
  - Primary route: ISP-RTR (current)
  - Secondary route: MODEM-4G (on demand)

**Configuration Notes:**
- OSPF dynamic routing required (not static routes)
- Link monitoring (BFD) to detect failover

**Use Case:** Small branch office with unreliable primary ISP

**Related Lab:** Day-01-Field-4-Lab.md (not documented yet; stretch goal)

---

### Field-5: Containerized Services (Docker)

**Purpose:** Services run in containers; cloud-like deployment model.

**Modifications:**
- **Replaced Nodes:**
  - PC0, PC1, SRV1, SRV2: Replaced with Docker containers
  - R1-NY, R2-TKY: Docker container running VyOS
- **Added Nodes:**
  - DOCKER-HOST (Linux with Docker): Hosts all services
  - REGISTRY (Docker registry): Central image repository
- **Network Model:**
  - Containers communicate via Docker bridge networks (192.168.50.0/24, etc.)
  - Firewall sees Docker host as single entity, not individual containers

**Use Case:** Modern infrastructure with microservices; IaC (Infrastructure as Code) deployment

**Related Lab:** Day-01-Field-5-Lab.md (not documented yet; stretch goal)

---

### Field-6: WAN Optimization

**Purpose:** WAN acceleration, deduplication, and compression for bandwidth savings.

**Modifications:**
- **Added Nodes:**
  - WAN-OPT-NY (WAN optimizer): 192.168.100.3/30 (between FW1-NYC and ISP)
  - WAN-OPT-TKY (WAN optimizer): 192.168.200.3/30 (between FW2-TKY and ISP)
- **Modified Links:**
  - L5: FW1-NYC em1 ↔ WAN-OPT-NY (insert optimizer)
  - FW1-NYC em1 ↔ ISP-RTR eth0 (original) removed
  - WAN-OPT-NY ↔ ISP-RTR eth0 (new path)
  - (Repeat for Tokyo)
- **WAN Optimizer Configuration:**
  - Compression: LZ4 or DEFLATE
  - Deduplication: Track data blocks; send only deltas
  - QoS: Prioritize critical traffic (VoIP, video)

**Use Case:** Enterprise with high WAN costs; lots of repetitive data (backups, video)

**Related Lab:** Day-01-Field-6-Lab.md (not documented yet; stretch goal)

---

### Field-7: Security Hardening (DMZ)

**Purpose:** Add demilitarized zone (DMZ) for web/mail servers; perimeter security.

**Modifications:**
- **Added Nodes:**
  - WEB-SRV (Debian, Apache): 192.168.15.10 (DMZ VLAN 15)
  - MAIL-SRV (Debian, Postfix): 192.168.15.11 (DMZ VLAN 15)
  - DMZ-SW: Switch for DMZ servers (VLAN 15)
- **Added VLANs:**
  - VLAN 15: DMZ (192.168.15.0/24)
- **Firewall Rules (FW1-NYC):**
  - Inside-to-DMZ: Permit (internal users can access web/mail)
  - DMZ-to-Inside: Deny (servers cannot initiate to internal network)
  - WAN-to-DMZ: Permit port 80, 443 (HTTP/HTTPS), port 25 (SMTP)
  - NAT: DMZ public IPs (203.0.113.10/32, 203.0.113.11/32) ↔ private
- **Network Model:**
  ```
  Internet → FW1-NYC (outside) → FW1-NYC (inside) → 
    ├─ DMZ (VLAN 15) ← WEB-SRV, MAIL-SRV
    └─ LAN (VLAN 10) ← PC0, PC1
  ```

**Use Case:** Enterprise hosting services accessed from internet; strict security posture

**Related Lab:** Day-01-Field-7-Lab.md (not documented yet; stretch goal)

---

## 5. Field Variant Node/Link Summary Table

| Variant | Added Nodes | Removed Nodes | Key Changes | Total Nodes |
|---------|------------|---------------|------------|------------|
| **Base** | — | — | Two-branch, NAT, routing | 12 |
| **Field-1** | DNS-SRV, NTP-SRV | ATTACKER | Local DNS/NTP, offline | 13 |
| **Field-2** | R1B, FW1B, ISP2 | — | Redundant links, HA | 15 |
| **Field-3** | C1-PC1, C1-PC2, C2-PC1, C2-PC2 | — | Multi-tenant VLANs | 16 |
| **Field-4** | MODEM-4G, FW1-SEC | — | Cellular backup, failover | 14 |
| **Field-5** | DOCKER-HOST, REGISTRY | PC0–SRV2, R1–R2 | Containerized services | 10 (fewer logical nodes) |
| **Field-6** | WAN-OPT-NY, WAN-OPT-TKY | — | WAN optimization | 14 |
| **Field-7** | WEB-SRV, MAIL-SRV, DMZ-SW | — | DMZ, web/mail servers | 15 |

---

## 6. GNS3 Project Import/Export

### 6.1 Export Base Topology as Reusable Template

After building the base topology in GNS3:

```bash
# Export the project
gns3 export-project --project-id [PROJECT_ID] --output day01-base.gns3

# Verify the file
file day01-base.gns3
# Output: day01-base.gns3: JSON data

# Upload to version control
git add GNS3/Day-01/day01-base.gns3
git commit -m "Day-01 base topology export"
```

### 6.2 Import for New Session

```bash
# Clone/open the project
gns3 import-project --input day01-base.gns3

# Or in GUI: File > Open > day01-base.gns3
```

### 6.3 Create Field Variant from Base

**Workflow:**
1. Import day01-base.gns3
2. Add new nodes (e.g., DNS-SRV, NTP-SRV for Field-1)
3. Connect new links
4. Configure new devices
5. Export as day01-field-1.gns3
6. Commit to version control: `GNS3/Day-01/day01-field-1.gns3`

---

## 7. Script Safety & Re-Run Considerations

### 7.1 Destructive Operations (Safe)

**These operations are safe to re-run:**
- `ip address add` (duplicate adds are ignored; idempotent)
- `ip link set up` (harmless if already up)
- `configure` mode on VyOS (non-destructive; only modifies running config until committed)
- GNS3 node creation (creates new node if not exists)

**Example idempotent script:**
```bash
#!/bin/bash
# configure-r1ny.sh (safe to re-run)

R1_IP="192.168.100.2"
FW1_IP="192.168.100.1"

# Connect to R1-NY console (assumes telnet/SSH running)
{
  echo "configure"
  echo "set interfaces ethernet eth0 address 192.168.10.1/24"
  echo "set interfaces ethernet eth1 address $R1_IP/30"
  echo "set protocols static route 192.168.20.0/24 next-hop $FW1_IP"
  echo "set protocols static route 0.0.0.0/0 next-hop $FW1_IP"
  echo "commit"
  echo "save"
  echo "exit"
} | telnet 192.168.10.1 23

# Running twice is fine; config doesn't change
```

### 7.2 Non-Idempotent Operations (Use Caution)

**These operations are NOT safe to re-run without checking:**
- `set interfaces ethernet eth0 disable` (destructive; brings down interface)
- `delete protocols static route` (removes routes; causes connectivity loss)
- GNS3 node **deletion** (irreversible in running project)
- Firewall rule **deletion** (can break security posture)

**Safer approach:**
```bash
#!/bin/bash
# configure-r1ny-safer.sh (checks before applying)

if ! (echo "show configuration" | telnet 192.168.10.1 23 | grep -q "192.168.20.0/24"); then
  echo "Route to 192.168.20.0/24 not found; adding..."
  {
    echo "configure"
    echo "set protocols static route 192.168.20.0/24 next-hop 192.168.100.1"
    echo "commit"
  } | telnet 192.168.10.1 23
else
  echo "Route already exists; skipping"
fi
```

### 7.3 Rollback Strategy

**If something breaks:**

1. **Snapshot-based Rollback (GNS3 GUI):**
   - Right-click project → **Snapshots**
   - Restore to pre-change state

2. **Configuration Rollback (Device CLI):**
   ```
   R1-NY# configure
   [edit]
   R1-NY# load config /path/to/previous-config.backup
   R1-NY# commit
   ```

3. **Full Topology Reset:**
   ```bash
   gns3 delete-project --project-id [ID]  # Deletes project
   gns3 import-project --input day01-base.gns3  # Restore from backup
   ```

---

## 8. pfSense Manual Download & Import

**IMPORTANT:** pfSense does NOT have an automated download link due to licensing. You must:

1. **Download manually from:** https://www.pfsense.org/download/
   - Select: **Community Edition**
   - Architecture: **AMD64 (64-bit)**
   - Installer: **ISO + Installer (Recommended)**
   - Version: **2.7.1 (latest stable)**
   - Size: ~600 MB

2. **Add to GNS3:**
   - Go to **Edit > Preferences > Qemu > Qemu VMs**
   - Click **New**
   - Select downloaded ISO file
   - Name: `pfSense-2.7.1`
   - RAM: 1 GB (minimum for firewall)
   - HDD: 20 GB (persistent storage)

3. **Use in projects:**
   - Drag pfSense appliance into topology
   - Boot; wait for installation (first boot is slow)
   - Access web UI on default IP (usually 192.168.1.1)

**Note:** First boot takes 3–5 minutes. Subsequent boots are faster (20–30 seconds).

---

## 9. Build Verification Checklist

After building the complete topology:

- [ ] All 12 nodes (or variant-specific count) are added to GNS3
- [ ] All links are connected (no dangling ports)
- [ ] All nodes have correct memory allocation (R: 512 MB, FW: 1 GB, End: 128 MB)
- [ ] All node names match lab documentation
- [ ] Topology starts without errors (Project → Play button)
- [ ] Console access works for each node
- [ ] IP addresses are configured (use `ping` and `ip addr show` to verify)
- [ ] Routing table populated on routers
- [ ] Firewall rules are active
- [ ] VLAN trunk ports configured on switches
- [ ] Connectivity matrix passes (see Day-01-Practice-Lab.md verification section)

**Total verification time:** 10–15 minutes per topology variant

---

## 10. Documentation Index

| File | Purpose |
|------|---------|
| **Day-01-Lab-Manual.md** | Comprehensive 20-section lab with RFC citations, design reasoning, expected outputs |
| **Day-01-Practice-Lab.md** | Step-by-step HOW-TO walkthrough with detailed explanations |
| **Day-01-Field-1-Lab.md** | Offline operation variant (black start, local DNS/NTP) |
| **Day-01-Field-3-Lab.md** | Multi-tenant isolation variant (VLANs, VRF) |
| **Day-01-Field-7-Lab.md** | Security hardening variant (DMZ, perimeter defense) |
| **GNS3/Day-01/README.md** | This file (build instructions and variant descriptions) |

---

## 11. Troubleshooting Guide

### Issue: Nodes Won't Start

**Symptoms:** Nodes show red "X" in GNS3 topology; console doesn't open

**Diagnosis:**
```bash
gns3 list-nodes --project-id [ID]  # Check node status
gns3 node-logs --node-id [ID]      # View error logs
```

**Fix:**
1. Verify appliance images exist: **Preferences > Qemu > Qemu VMs**
2. Check free disk space (GNS3 needs ~50 GB for all running nodes)
3. Increase GNS3 VM RAM/vCPU if using GNS3 VM
4. Restart GNS3 application

### Issue: Nodes Start But No Connectivity

**Symptoms:** Ping fails; traceroute stops at first hop

**Diagnosis:**
1. Check link is connected: In GNS3, verify green line between nodes
2. Check interface status: `show ip interface brief` on routers
3. Check IP configuration: `ip addr show` on end devices
4. Check routing: `show ip route` on routers

**Fix:**
- Reconnect broken links in GNS3
- Manually configure IP addresses on end devices
- Add missing routes

### Issue: Firewall Web UI Not Accessible

**Symptoms:** Cannot reach pfSense web UI on https://192.168.100.1

**Diagnosis:**
1. SSH into firewall console
2. Check interface status: `pfctl -s all | grep -i interface`
3. Check if web service is running: `service php-fpm status`

**Fix:**
1. Wait for firewall to fully boot (3–5 minutes)
2. Verify LAN interface is up: `ifconfig em0`
3. Restart web service: `service php-fpm restart`

---

## 12. Next Steps

After completing Day-01 base lab and field variants:

1. **Day-02:** Basic Routing & Static Routes (expand to 3+ branches)
2. **Day-03:** Switch Fundamentals (VLAN configuration, trunk management)
3. **Day-04:** Device Security (SSH, enable secret, basic ACLs)
4. **Day-05:** Port Security & Storm Control (MAC limiting, broadcast storms)
5. **Day-06:** Access Control Lists (standard, extended, named ACLs)
6. **Day-07:** VLAN Basics (VLAN creation, inter-VLAN routing, native VLAN)
7. **Day-08:** Spanning Tree Protocol (STP, BPDU, convergence)

Each day builds on previous labs; topology complexity increases progressively.

---

## 13. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-30 | Initial release: base topology + 7 field variants documented |
| — | — | (Future updates will be tracked here) |

---

## 14. Contact & Support

**Lab Documentation:** CCNA Labs Team  
**GNS3 Issues:** https://github.com/GNS3/gns3-server/issues  
**pfSense Support:** https://www.pfsense.org/support/  
**VyOS Community:** https://vyos.io/

---

**README Version:** 1.0  
**Last Updated:** 2026-08-30  
**Status:** Complete & Ready for Deployment  
**Lab Focus:** Day 01 — Network Devices & Enterprise Topology
