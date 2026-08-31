# Day 07: VLAN Basics & Inter-VLAN Routing

**Focus:** Router-on-a-stick, sub-interfaces, inter-VLAN routing

**Key Change:** R1-NY now has sub-interfaces for routing between VLANs

## Configuration

**VyOS Sub-Interfaces (R1-NY):**
```
set interfaces ethernet eth0 vlan 10 address 192.168.10.1/24
set interfaces ethernet eth0 vlan 20 address 192.168.20.1/24
set interfaces ethernet eth0 vlan 30 address 192.168.30.1/24
commit
```

**Cisco IOS (if available):**
```
interface Gi0/0
 no shutdown
interface Gi0/0.10
 encapsulation dot1q 10
 ip address 192.168.10.1 255.255.255.0
interface Gi0/0.20
 encapsulation dot1q 20
 ip address 192.168.20.1 255.255.255.0
```

## Field Variants

1. **L3 Switch Routing:** Enable `ip routing` on SW1 (if L3-capable)
2. **Multiple Routers:** Sub-interfaces on R2-TKY, R3-SGP
3. **OSPF on Sub-Interfaces:** Advertise VLAN routes dynamically
4. **VLAN ACLs:** Filter between VLANs
5. **QoS per VLAN:** Different QoS policies for each VLAN
6. **VLAN Authentication:** 802.1X per VLAN
7. **Routed Port:** Sub-interface on routed port (Layer 3)

## Verification

```
show ip route
show interfaces | grep VLAN
ping [other-vlan-host]
traceroute [other-vlan-host]
```

---

**README Version:** 1.0
