# Day 06 — Access Control Lists

## Lab Manual: Standard & Extended ACLs for Traffic Filtering

---

## 0. Metadata

| Field | Value |
|---|---|
| **Lab Title** | Access Control Lists (ACLs) |
| **Day** | Day 06 (Traffic Filtering) |
| **Topic Focus** | Standard ACLs, extended ACLs, named ACLs, ACL placement strategy |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Intermediate to Advanced |
| **Prerequisites** | Day 01–05 |
| **Lab Scope** | Configure standard/extended ACLs on routers; filter traffic by protocol, port, source, destination |
| **Standards Referenced** | RFC 3021 (Dynamic Routing Protocol Suitability), RFC 5735 (Special-Use IPv4 Addresses) |
| **Expected Outcome** | Traffic filtered by ACL rules; inter-site communication restricted by policy; internet access controlled |

---

## 1. Overview

**Problem:** Firewalls are coarse-grained (allow/deny entire subnets). Need finer control:
- Block specific protocols (e.g., allow HTTP but not SSH from internet)
- Allow specific ports (e.g., port 80 but not 443)
- Deny specific hosts while allowing subnet

**Solution: Access Control Lists (ACLs)**
- List of conditions; packets evaluated top-to-bottom
- First match wins; implicit deny at end
- Applied inbound or outbound on interfaces

---

## 2. ACL Types

### 2.1 Standard ACLs (Source IP Only)

**Purpose:** Filter based on source IP address only

**Example:** Block PC0 (192.168.10.50) from accessing Tokyo

```
access-list 1 deny host 192.168.10.50
access-list 1 permit 192.168.10.0 0.0.0.255
! Syntax: access-list [number] [permit|deny] [source] [wildcard]
! Wildcard: 0 = must match; 1 = don't care
! Wildcard 0.0.0.255 = match network; ignore host
```

**Limitations:** Can't match destination, protocol, port

### 2.2 Extended ACLs (Source, Destination, Protocol, Port)

**Purpose:** Granular traffic filtering

**Example:** Allow PC0 to browse web (port 80) to Tokyo, but not SSH (port 22)

```
access-list 100 permit tcp 192.168.10.50 0.0.0.0 192.168.20.0 0.0.0.255 eq 80
! Allow: TCP from PC0 to Tokyo subnet, port 80 (HTTP)

access-list 100 deny tcp 192.168.10.50 0.0.0.0 192.168.20.0 0.0.0.255 eq 22
! Deny: TCP from PC0 to Tokyo subnet, port 22 (SSH)

access-list 100 permit ip any any
! Allow all other traffic (implied permit)
```

### 2.3 Named ACLs (More Readable)

**Standard Named:**
```
ip access-list standard Block-PC0
 deny host 192.168.10.50
 permit 192.168.10.0 0.0.0.255
```

**Extended Named:**
```
ip access-list extended Allow-Web
 permit tcp 192.168.10.0 0.0.0.255 any eq 80
 permit tcp 192.168.10.0 0.0.0.255 any eq 443
 deny ip any any
```

---

## 3. ACL Placement Strategy

**Rule:** Place ACLs **as close to source as possible**

**Example 1: Block PC0 from accessing Tokyo**
- Place ACL on **R1-NY outbound** (interface to FW1)
- Filter at source; doesn't waste WAN bandwidth

**Example 2: Block Tokyo from accessing internet**
- Place ACL on **R2-TKY outbound** (interface to FW2)
- Filter at source (Tokyo); avoids ISP bandwidth waste

**Counter-Example (Wrong Placement):**
- Place ACL on ISP-RTR inbound (from FW2)
- Wastes WAN bandwidth; wrong direction

---

## 4. Configuration Examples

### 4.1 Standard ACL: Block PC0 from Tokyo

**On R1-NY (outbound toward FW1):**
```
R1-NY(config)# access-list 1 deny host 192.168.10.50
R1-NY(config)# access-list 1 permit any

R1-NY(config)# interface GigabitEthernet0/1
R1-NY(config-if)# ip access-group 1 out
! Apply ACL to outbound traffic on Gi0/1
! Packets from PC0 destined for Tokyo are blocked
```

**Verification:**
```
R1-NY# show access-lists

Standard IP access list 1
    deny   host 192.168.10.50
    permit any
```

### 4.2 Extended ACL: Allow HTTP Only

**On R1-NY (block all except web traffic to Tokyo):**
```
R1-NY(config)# ip access-list extended Allow-Web
R1-NY(config-ext-acl)# permit tcp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 eq 80
R1-NY(config-ext-acl)# permit tcp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 eq 443
R1-NY(config-ext-acl)# deny ip any any

R1-NY(config)# interface GigabitEthernet0/1
R1-NY(config-if)# ip access-group Allow-Web out
```

### 4.3 Block Internet Access from Specific Host

**On R1-NY (PC0 cannot access internet):**
```
R1-NY(config)# ip access-list extended Block-Internet
R1-NY(config-ext-acl)# deny ip host 192.168.10.50 0.0.0.0 203.0.113.0 0.0.0.3
! Deny PC0 from reaching ISP network

R1-NY(config-ext-acl)# permit ip any any
! Allow all others

R1-NY(config)# interface GigabitEthernet0/1
R1-NY(config-if)# ip access-group Block-Internet out
```

---

## 5. Testing & Verification

**Test 1: Verify ACL is applied**
```
R1-NY# show ip interface GigabitEthernet0/1 | include access list

Outgoing access list is Allow-Web
```

**Test 2: Check ACL statistics**
```
R1-NY# show access-lists Allow-Web

Extended IP access list Allow-Web
    10 permit tcp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 eq 80 (13 matches)
    20 permit tcp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 eq 443 (0 matches)
    30 deny ip any any (5 matches)
    ! Shows how many packets matched each rule
```

**Test 3: Ping test (should fail if ACL blocks ICMP)**
```
PC0# ping 192.168.20.10
PING 192.168.20.10 (192.168.20.10) 56(84) bytes of data.

! Timeout (no response; ICMP blocked by ACL)
```

---

## 6. Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| **ACL applied inbound instead of outbound** | Traffic blocked in wrong direction | Check `show ip int [interface] \| include access` |
| **Forgot implicit deny** | All traffic allowed (ACL not filtering) | Add `deny ip any any` at end |
| **Wrong wildcard mask** | Unintended IPs blocked/allowed | Verify wildcard: 0 = match, 1 = wildcard |
| **ACL placed on wrong interface** | Traffic not filtered at source | Move ACL per placement strategy |
| **ACL number conflicts** | New ACL overwrites old one | Use named ACLs to avoid conflicts |

---

## 7. Verification Checklist

- [ ] Standard ACL created and applied to R1-NY
- [ ] Extended ACL created (HTTP/HTTPS filtering)
- [ ] Named ACL for web access
- [ ] ACL statistics show packet matches
- [ ] `show access-lists` shows all ACLs
- [ ] `show ip interface [int]` shows ACL application
- [ ] PC0 → Tokyo: Filtered by standard ACL
- [ ] Web traffic (port 80): Allowed by extended ACL
- [ ] SSH traffic (port 22): Denied by extended ACL

---

## 8. Stretch Goals

1. **Dynamic ACLs:** Time-based ACLs (allow access only 9am–5pm)
2. **Reflexive ACLs:** Automatically allow return traffic
3. **Distributed ACLs:** Apply same ACL to multiple interfaces
4. **ACL Optimization:** Merge overlapping rules for efficiency

---

## 9. Conclusion

Day 06 introduced **granular traffic filtering using ACLs**. You can now:
- Filter by source/destination IP
- Filter by protocol (TCP, UDP, ICMP)
- Filter by port (HTTP, HTTPS, SSH)
- Apply ACLs strategically on router interfaces

**Next:** Day 07 covers **VLAN Basics & Inter-VLAN Routing** (enabling communication between VLANs via router).

---

**Lab Documentation Version:** 1.0  
**Last Updated:** 2026-08-30  
**Status:** Complete
