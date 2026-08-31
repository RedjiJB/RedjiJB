# Day 02 — Basic Routing & Static Routes

## Practice Lab: Three-Branch Network Build & Configuration

---

## 1. Introduction

This practice lab builds on Day 01 by adding a **third branch (Singapore)** to the two-branch topology. You'll learn hands-on:

- How to add routes to a new site on all existing routers
- How to configure the new Singapore router (R3-SGP) with reverse routes
- How to verify connectivity across three continents
- How to troubleshoot asymmetric routing (one-way connectivity)

**Time:** 2–3 hours  
**Format:** Step-by-step configuration + verification

---

## 2. Topology Extension

**From Day 01:** You have NY and Tokyo branches working.

**Today's Addition:** Singapore branch (192.168.30.0/24) with:
- Router R3-SGP (192.168.30.1)
- Switch SW3 (VLAN 30)
- End devices SGP1 (192.168.30.50) and SGP2 (192.168.30.51)
- Firewall FW3-SGP (192.168.300.1 inside, 203.0.113.10 outside)

---

## 3. Configuration Walkthrough

### 3.1 Step 1: Update R1-NY with Singapore Route

**Current state:** R1-NY only knows about Tokyo (192.168.20.0/24).

**Task:** Add a route to Singapore.

**On R1-NY:**
```
vyos@vyos:~$ configure
[edit]
vyos@vyos# set protocols static route 192.168.30.0/24 next-hop 192.168.100.1

! This tells R1-NY: "If you see a packet destined for 192.168.30.x, send it to 192.168.100.1 (FW1-NYC)"

vyos@vyos# commit
vyos@vyos# save
vyos@vyos# exit

vyos@vyos:~$ show ip route | grep 192.168.30
S   192.168.30.0/24 [210/0] via 192.168.100.1, eth1

! Verify: Route is installed and points to FW1-NYC
```

**Explanation:** R1-NY trusts FW1-NYC to know how to reach Singapore. FW1-NYC will forward the packet to ISP-RTR, which forwards to FW3-SGP.

---

### 3.2 Step 2: Update R2-TKY with Singapore Route

**On R2-TKY:**
```
vyos@vyos:~$ configure
[edit]
vyos@vyos# set protocols static route 192.168.30.0/24 next-hop 192.168.200.1

! This tells R2-TKY: "If you see a packet destined for 192.168.30.x, send it to 192.168.200.1 (FW2-TKY)"

vyos@vyos# commit
vyos@vyos# exit

vyos@vyos:~$ show ip route | grep 192.168.30
S   192.168.30.0/24 [210/0] via 192.168.200.1, eth1
```

---

### 3.3 Step 3: Configure R3-SGP (New Singapore Router)

**On R3-SGP (new node, first time):**

```
vyos@vyos:~$ configure
[edit]

! Configure LAN interface (to SW3)
vyos@vyos# set interfaces ethernet eth0 description "Singapore-LAN-to-SW3"
vyos@vyos# set interfaces ethernet eth0 address 192.168.30.1/24

! Configure transit interface (to FW3-SGP)
vyos@vyos# set interfaces ethernet eth1 description "Singapore-Transit-to-FW3"
vyos@vyos# set interfaces ethernet eth1 address 192.168.300.2/30

! Route to NY (via FW3-SGP)
vyos@vyos# set protocols static route 192.168.10.0/24 next-hop 192.168.300.1

! Route to Tokyo (via FW3-SGP)
vyos@vyos# set protocols static route 192.168.20.0/24 next-hop 192.168.300.1

! Default route (for internet access)
vyos@vyos# set protocols static route 0.0.0.0/0 next-hop 192.168.300.1

vyos@vyos# commit
vyos@vyos# save
vyos@vyos# exit

! Verify all routes are installed
vyos@vyos:~$ show ip route
S   0.0.0.0/0 [210/0] via 192.168.300.1, eth1
S   192.168.10.0/24 [210/0] via 192.168.300.1, eth1
S   192.168.20.0/24 [210/0] via 192.168.300.1, eth1
C>* 192.168.30.0/24 [0/0] via 192.168.30.1, eth0
C>* 192.168.300.0/30 [0/0] via 192.168.300.2, eth1
```

**Critical Point:** R3-SGP has **reverse routes** to both NY and Tokyo. This is essential for return traffic.

---

### 3.4 Step 4: Update ISP-RTR with Singapore Route

**On ISP-RTR:**

```
vyos@vyos:~$ configure
[edit]

! Add third Ethernet interface (to FW3-SGP)
vyos@vyos# set interfaces ethernet eth2 description "ISP-to-FW3-SGP"
vyos@vyos# set interfaces ethernet eth2 address 203.0.113.9/30

! Route to Singapore (via FW3-SGP)
vyos@vyos# set protocols static route 192.168.30.0/24 next-hop 203.0.113.10

vyos@vyos# commit
vyos@vyos# exit

vyos@vyos:~$ show ip route
S   192.168.10.0/24 [210/0] via 203.0.113.2, eth0
S   192.168.20.0/24 [210/0] via 203.0.113.6, eth1
S   192.168.30.0/24 [210/0] via 203.0.113.10, eth2
C>* 203.0.113.0/30 [0/0] via 203.0.113.1, eth0
C>* 203.0.113.4/30 [0/0] via 203.0.113.5, eth1
C>* 203.0.113.8/30 [0/0] via 203.0.113.9, eth2
```

**Explanation:** ISP-RTR now has three WAN segments (eth0, eth1, eth2) and three destination routes (NY, Tokyo, Singapore).

---

### 3.5 Step 5: Configure SW3 (Singapore Switch)

**On SW3:**

```
Switch> enable
Switch# configure terminal

! Create VLAN 30 for Singapore
Switch(config)# vlan 30
Switch(config-vlan)# name Singapore-LAN
Switch(config-vlan)# exit

! Configure SVI for VLAN 30 (switch's IP on LAN)
Switch(config)# interface vlan 30
Switch(config-if)# ip address 192.168.30.2 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Configure trunk to R3-SGP
Switch(config)# interface GigabitEthernet0/1
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk allowed vlan 1,30
Switch(config-if)# switchport trunk native vlan 1
Switch(config-if)# description Uplink-to-R3-SGP
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Configure access port for SGP1
Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 30
Switch(config-if)# description SGP1-Access
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Configure access port for SGP2
Switch(config)# interface FastEthernet0/3
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 30
Switch(config-if)# description SGP2-Access
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Default gateway for switch management
Switch(config)# ip default-gateway 192.168.30.1
Switch(config)# exit

! Verify
Switch# show vlan brief | grep Singapore
30   Singapore-LAN                    active    Fa0/2, Fa0/3, Gi0/1(t)
```

---

### 3.6 Step 6: Configure FW3-SGP (Singapore Firewall)

**On FW3-SGP (pfSense web UI):**

1. **Go to Interfaces > Assignments**
   - Click to assign em0 as LAN
   - Click to assign em1 as WAN

2. **Go to Interfaces > LAN**
   - IPv4 Address: `192.168.300.1`
   - IPv4 Subnet: `30`
   - Click **Save & Apply**

3. **Go to Interfaces > WAN**
   - IPv4 Address: `203.0.113.10`
   - IPv4 Subnet: `30`
   - IPv4 Gateway: `203.0.113.9`
   - Click **Save & Apply**

4. **Go to Firewall > NAT > Outbound**
   - Mode: `Automatic (Hybrid Outbound NAT rule generation)`
   - Click **Save**

5. **Go to Firewall > Rules > LAN**
   - Add rule:
     - **Action:** Pass
     - **Interface:** LAN
     - **Source:** 192.168.30.0/24
     - **Destination:** Any
     - **Description:** "Allow all LAN outbound"
   - Add rule:
     - **Action:** Pass
     - **Interface:** LAN
     - **Source:** 192.168.10.0/24
     - **Destination:** 192.168.30.0/24
     - **Description:** "Allow NY to Singapore"
   - Add rule:
     - **Action:** Pass
     - **Interface:** LAN
     - **Source:** 192.168.20.0/24
     - **Destination:** 192.168.30.0/24
     - **Description:** "Allow Tokyo to Singapore"
   - Click **Save & Apply**

6. **Verify:**
   - Go to **Diagnostics > Ping**
   - Ping `203.0.113.9` (should reply; that's the ISP side)
   - Ping `192.168.300.1` (should reply; that's itself)

---

### 3.7 Step 7: Configure SGP1 & SGP2 (Singapore End Devices)

**On SGP1 (Alpine Linux):**

```
localhost:~# ip address add 192.168.30.50/24 dev eth0
localhost:~# ip link set eth0 up
localhost:~# ip route add default via 192.168.30.1

! Persist configuration
localhost:~# cat > /etc/network/interfaces << EOF
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet static
    address 192.168.30.50
    netmask 255.255.255.0
    gateway 192.168.30.1
EOF

localhost:~# service networking restart
```

**On SGP2:**

```
localhost:~# ip address add 192.168.30.51/24 dev eth0
localhost:~# ip link set eth0 up
localhost:~# ip route add default via 192.168.30.1

! Persist
localhost:~# cat > /etc/network/interfaces << EOF
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet static
    address 192.168.30.51
    netmask 255.255.255.0
    gateway 192.168.30.1
EOF

localhost:~# service networking restart
```

---

## 4. Verification Phase

### 4.1 Phase 1: Local Connectivity (Singapore Only)

**Test 1: SGP1 → SGP2 (same LAN)**
```
SGP1# ping -c 4 192.168.30.51
PING 192.168.30.51 (192.168.30.51) 56(84) bytes of data.
64 bytes from 192.168.30.51: icmp_seq=1 ttl=64 time=2.123 ms
64 bytes from 192.168.30.51: icmp_seq=2 ttl=64 time=1.987 ms
64 bytes from 192.168.30.51: icmp_seq=3 ttl=64 time=2.045 ms
64 bytes from 192.168.30.51: icmp_seq=4 ttl=64 time=2.034 ms
--- 192.168.30.51 statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3003ms
```

**Expected:** ✓ Local LAN ping succeeds

**Test 2: SGP1 → R3-SGP (gateway)**
```
SGP1# ping -c 4 192.168.30.1
PING 192.168.30.1 (192.168.30.1) 56(84) bytes of data.
64 bytes from 192.168.30.1: icmp_seq=1 ttl=64 time=1.234 ms
...
```

**Expected:** ✓ Gateway reachable

---

### 4.2 Phase 2: Inter-Site Connectivity (Singapore ↔ NY)

**Test 1: SGP1 → PC0 (New York)**
```
SGP1# ping -c 4 192.168.10.50
PING 192.168.10.50 (192.168.10.50) 56(84) bytes of data.
64 bytes from 192.168.10.50: icmp_seq=1 ttl=57 time=15.234 ms
64 bytes from 192.168.10.50: icmp_seq=2 ttl=57 time=14.876 ms
64 bytes from 192.168.10.50: icmp_seq=3 ttl=57 time=15.123 ms
64 bytes from 192.168.10.50: icmp_seq=4 ttl=57 time=14.999 ms
--- 192.168.10.50 statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/stddev = 14.876/15.058/15.234/0.129 ms
```

**Expected:** ✓ Inter-site ping succeeds (high latency is normal for WAN)

**Test 2: PC0 → SGP1 (Return Path)**
```
PC0# ping -c 4 192.168.30.50
PING 192.168.30.50 (192.168.30.50) 56(84) bytes of data.
64 bytes from 192.168.30.50: icmp_seq=1 ttl=57 time=15.345 ms
...
```

**Expected:** ✓ Return path also succeeds (symmetric routing)

---

### 4.3 Phase 3: Three-Way Connectivity (NY ↔ Tokyo ↔ Singapore)

**Test 1: Tokyo → Singapore**
```
SRV1# ping -c 4 192.168.30.10
PING 192.168.30.10 (192.168.30.10) 56(84) bytes of data.
64 bytes from 192.168.30.10: icmp_seq=1 ttl=57 time=20.123 ms
...
```

**Expected:** ✓ Tokyo can reach Singapore (via R2 → FW2 → ISP → FW3 → R3)

**Test 2: Traceroute (NY → Singapore)**
```
PC0# traceroute -m 15 192.168.30.50
traceroute to 192.168.30.50 (192.168.30.50), 15 hops max, 60 byte packets
 1  192.168.10.1 (192.168.10.1)  2.345 ms       # R1-NY
 2  192.168.100.1 (192.168.100.1)  3.456 ms     # FW1-NYC inside
 3  203.0.113.1 (203.0.113.1)  5.678 ms         # ISP-RTR
 4  203.0.113.9 (203.0.113.9)  7.890 ms         # FW3-SGP outside
 5  192.168.300.1 (192.168.300.1)  8.901 ms     # FW3-SGP inside
 6  192.168.30.1 (192.168.30.1)  9.234 ms       # R3-SGP
 7  192.168.30.50 (192.168.30.50)  10.567 ms    # SGP1
```

**Expected:** ✓ Full path visible; all hops reachable

---

## 5. Troubleshooting Scenarios

### Scenario 1: SGP1 Cannot Reach PC0 (Asymmetric Routing)

**Symptoms:**
- SGP1 → PC0: Timeout (no response)
- PC0 → SGP1: Succeeds

**Diagnosis (Check R1-NY):**
```
R1-NY# show ip route | grep 192.168.30
! No output = R1-NY doesn't know about Singapore!
```

**Root Cause:** You forgot to add the route to Singapore on R1-NY (Step 1).

**Fix:**
```
R1-NY# configure
[edit]
R1-NY# set protocols static route 192.168.30.0/24 next-hop 192.168.100.1
R1-NY# commit
```

**Verify:**
```
SGP1# ping -c 4 192.168.10.50
! Now succeeds
```

---

### Scenario 2: SGP1 → PC0 Fails; PC0 → SGP1 Succeeds (Classic Asymmetry)

**Symptoms:**
- PC0# ping 192.168.30.50 → ✓ Works
- SGP1# ping 192.168.10.50 → ✗ Timeout

**Diagnosis (Check R3-SGP):**
```
R3-SGP# show ip route | grep 192.168.10
S   192.168.10.0/24 [210/0] via 192.168.300.1, eth1
! Route exists, so that's not it
```

**Check ISP-RTR:**
```
ISP-RTR# show ip route | grep 192.168.30
S   192.168.30.0/24 [210/0] via 203.0.113.10, eth2
! Route exists here too
```

**Check FW3-SGP firewall rules:**
```
pfSense (FW3-SGP) → Firewall > Rules > LAN
! Look for rule allowing 192.168.10.0/24 → 192.168.30.0/24
```

**Root Cause:** FW3-SGP blocks return traffic (missing firewall rule).

**Fix:**
1. Go to FW3-SGP web UI
2. **Firewall > Rules > LAN**
3. Add rule:
   - **Source:** 192.168.10.0/24
   - **Destination:** 192.168.30.0/24
   - **Action:** Pass

**Verify:**
```
SGP1# ping -c 4 192.168.10.50
! Now succeeds
```

---

## 6. Self-Check Checklist

After completing this practice lab:

- [ ] I added routes to Singapore on R1-NY and R2-TKY
- [ ] I configured R3-SGP with reverse routes to NY and Tokyo
- [ ] I updated ISP-RTR with Singapore route
- [ ] I configured SW3 with VLAN 30 and trunk/access ports
- [ ] I configured FW3-SGP with inside/outside interfaces and NAT
- [ ] I assigned IPs to SGP1 and SGP2
- [ ] I verified local Singapore connectivity (SGP1 ↔ SGP2)
- [ ] I verified inter-site connectivity (NY ↔ Singapore ↔ Tokyo)
- [ ] I traced the full path from NY to Singapore
- [ ] I diagnosed and fixed at least one asymmetric routing issue
- [ ] All three branches can reach all other branches

**Score:** 11+ = Mastered; 9–10 = Proficient; 7–8 = Competent; <7 = Review

---

## 7. Conclusion

This practice lab reinforced that **static routing requires explicit configuration on every router**. Adding Singapore meant updating routes on:
- R1-NY (add route to 192.168.30.0/24)
- R2-TKY (add route to 192.168.30.0/24)
- R3-SGP (add routes to 192.168.10.0/24 and 192.168.20.0/24)
- ISP-RTR (add route to 192.168.30.0/24)

This is manageable for 3 branches, but imagine 10 branches—every time you add a new site, you update 10 routers. **Day 07 will introduce OSPF**, where routers automatically discover routes. No manual configuration needed!

---

**Practice Lab Documentation Version:** 1.0  
**Last Updated:** 2026-08-30  
**Time to Complete:** 2–3 hours
