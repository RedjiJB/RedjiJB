# Day 07 — VLAN Basics & Inter-VLAN Routing

## Lab Manual: VLAN Communication & Router-on-a-Stick

---

## 0. Metadata

| Field | Value |
|---|---|
| **Lab Title** | VLAN Basics & Inter-VLAN Routing |
| **Day** | Day 07 (VLAN Routing) |
| **Topic Focus** | Inter-VLAN routing, router-on-a-stick, sub-interfaces, SVI routing |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Intermediate |
| **Prerequisites** | Day 01–06 (especially Day 03 VLAN basics) |
| **Lab Scope** | Enable PC0 (VLAN 10) to communicate with SRV1 (VLAN 20) via router; configure sub-interfaces |
| **Standards Referenced** | RFC 2544 (Benchmarking), IEEE 802.1Q (VLAN Tagging) |
| **Expected Outcome** | Different VLANs can communicate via router; no direct Layer 2 path exists |

---

## 1. Overview

**Day 03 Problem:** PC0 (VLAN 10) couldn't reach SRV1 (VLAN 20) because they're on different VLANs. Switches don't route; they only forward within a VLAN.

**Solution:** Use a **router as inter-VLAN gateway**. The router:
1. Receives VLAN-tagged frames from trunk port
2. Examines VLAN ID and IP destination
3. Routes between VLANs based on IP routing table
4. Sends response back (tagged appropriately)

**Implementation:** Two methods:
- **Router-on-a-Stick:** Single uplink; multiple sub-interfaces (one per VLAN)
- **SVI (Switch Virtual Interface):** Switch has SVIs for each VLAN; routes internally

---

## 2. Router-on-a-Stick Configuration

### 2.1 Physical Topology

```
PC0 (VLAN 10) → SW1 trunk → R1-NY (single physical link Gi0/0)
                                ↓
                    Sub-interface Gi0/0.10 (192.168.10.1)
                    Sub-interface Gi0/0.20 (192.168.20.1)
                                ↓
                            IP Routing
                                ↓
SRV1 (VLAN 20) → SW2 trunk → [receives routed packet on Gi0/0.20]
```

### 2.2 Configuration (R1-NY, VyOS)

**Step 1: Configure sub-interfaces**

```
set interfaces ethernet eth0 vlan 10 address 192.168.10.1/24
set interfaces ethernet eth0 vlan 20 address 192.168.20.1/24

! eth0 is the physical uplink to SW1 trunk
! eth0.10 = VLAN 10 sub-interface (192.168.10.1)
! eth0.20 = VLAN 20 sub-interface (192.168.20.1)

commit
```

**Step 2: Verify**

```
show interfaces
show ip route

! You should see:
! C 192.168.10.0/24 via eth0.10
! C 192.168.20.0/24 via eth0.20
```

### 2.3 Configuration (Cisco IOS)

```
interface GigabitEthernet0/0
 description Trunk-to-SW1
 no shutdown
!
interface GigabitEthernet0/0.10
 encapsulation dot1q 10
 ip address 192.168.10.1 255.255.255.0
 description VLAN-10-SVI
!
interface GigabitEthernet0/0.20
 encapsulation dot1q 20
 ip address 192.168.20.1 255.255.255.0
 description VLAN-20-SVI
!
```

---

## 3. SVI (Switch Virtual Interface) Routing

### 3.1 Alternative: Routing on Switch

**If using a Layer 3 switch (SW1 is L3-capable):**

```
! Already configured in Day 03:
interface vlan 10
 ip address 192.168.10.2 255.255.255.0

interface vlan 20
 ip address 192.168.20.2 255.255.255.0

! Enable IP routing on switch
ip routing

! Now switch routes between VLANs
! Packets from PC0 → SW1 (routes to VLAN 20) → SRV1
```

**Advantages over Router-on-a-Stick:**
- No bandwidth wasted on physical trunk (frames stay local)
- Lower latency (no router delay)
- Simpler topology

**Disadvantages:**
- Requires Layer 3 switch (expensive)
- CPU-intensive on switch

---

## 4. Testing & Verification

### 4.1 Connectivity Test

**PC0 → SRV1 (should now succeed):**

```
PC0# ping -c 4 192.168.20.10
PING 192.168.20.10 (192.168.20.10) 56(84) bytes of data.
64 bytes from 192.168.20.10: icmp_seq=1 ttl=63 time=5.234 ms
64 bytes from 192.168.20.10: icmp_seq=2 ttl=63 time=5.123 ms
64 bytes from 192.168.20.10: icmp_seq=3 ttl=63 time=5.345 ms
64 bytes from 192.168.20.10: icmp_seq=4 ttl=63 time=5.456 ms

! Success! PC0 can now reach SRV1
```

**TTL Analysis:**
- Original TTL: 64 (default Linux)
- After crossing 1 router: TTL = 63
- Each hop decrements TTL by 1

### 4.2 Routing Verification

**On R1-NY:**

```
R1-NY# show ip route

C   192.168.10.0/24 is directly connected, GigabitEthernet0/0.10
C   192.168.20.0/24 is directly connected, GigabitEthernet0/0.20

! Direct routes to both VLANs (via sub-interfaces)
```

### 4.3 Traceroute Analysis

**From PC0 to SRV1:**

```
PC0# traceroute 192.168.20.10
traceroute to 192.168.20.10 (192.168.20.10), 30 hops max, 60 byte packets
 1  192.168.10.1 (192.168.10.1)  2.345 ms      # R1-NY VLAN 10 gateway
 2  192.168.20.10 (192.168.20.10)  5.234 ms    # SRV1 (destination)

! Only 2 hops (router is in the middle)
! Contrast with Day 02 (NY → Tokyo): 7 hops (crosses ISP)
```

---

## 5. Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| **Forgot dot1q encapsulation** | Sub-interface doesn't work | Add `encapsulation dot1q 10` |
| **Physical interface down** | Sub-interfaces don't work | Ensure `no shutdown` on physical interface |
| **IP routing not enabled** | Devices can't reach other VLANs | Enable `ip routing` (if switch) or configure sub-interfaces (if router) |
| **Wrong VLAN ID on sub-interface** | VLAN mismatch; frames dropped | Verify `encapsulation dot1q [correct-vlan-id]` |
| **SVI not created** | Can't reach VLAN gateway | Create `interface vlan 10` with IP address |

---

## 6. Verification Checklist

- [ ] Sub-interfaces created on R1-NY (Gi0/0.10, Gi0/0.20)
- [ ] Each sub-interface has correct VLAN encapsulation
- [ ] Each sub-interface has gateway IP (192.168.10.1, 192.168.20.1)
- [ ] Physical interface is up (`no shutdown`)
- [ ] Routing table shows direct routes to both VLANs
- [ ] PC0 → SRV1 ping succeeds (cross-VLAN)
- [ ] TTL decreases by 1 (confirms router hop)
- [ ] Traceroute shows 2-hop path (PC0 → R1 → SRV1)

---

## 7. Comparison: Router-on-a-Stick vs. SVI vs. Inter-VLAN (Firewall)

| Feature | Router-on-Stick | SVI (L3 Switch) | Firewall |
|---------|-----------------|-----------------|----------|
| **Setup** | Configure sub-interfaces | Enable `ip routing` | Already done (Day 01) |
| **Throughput** | Limited by single uplink | Full LAN bandwidth | Limited by firewall |
| **Latency** | Higher (router processing) | Lower (switch internal) | Higher (firewall inspection) |
| **Cost** | Cheap (existing router) | Expensive (L3 switch) | Already owned |
| **Scalability** | Good for 2–5 VLANs | Good for many VLANs | Good for security |
| **Security** | No inspection | No inspection | Full inspection |

---

## 8. Stretch Goals

1. **VLAN Routing on SW2/SW3:** Enable L3 routing on all switches (if capable)
2. **Dynamic Routing (OSPF):** Use OSPF to advertise VLAN subnets
3. **VLAN ACLs (VACLs):** Filter traffic between VLANs at Layer 2

---

## 9. Conclusion

Day 07 enabled **inter-VLAN communication** using a router as a gateway. PC0 (VLAN 10) can now reach SRV1 (VLAN 20) and other branches via routing.

**Next:** Day 08 covers **Spanning Tree Protocol (STP)**, which prevents switching loops in redundant topologies.

---

**Lab Documentation Version:** 1.0  
**Last Updated:** 2026-08-30  
**Status:** Complete
