# Day 07 — VLAN Basics & Inter-VLAN Routing

## Practice Lab: Router-on-a-Stick Configuration

---

## 1. Configure Sub-Interfaces

**On R1-NY (VyOS):**
```
vyos@vyos:~$ configure
[edit]

! VLAN 10 sub-interface
vyos@vyos# set interfaces ethernet eth0 vlan 10 address 192.168.10.1/24

! VLAN 20 sub-interface
vyos@vyos# set interfaces ethernet eth0 vlan 20 address 192.168.20.1/24

! VLAN 30 sub-interface (for Singapore)
vyos@vyos# set interfaces ethernet eth0 vlan 30 address 192.168.30.1/24

vyos@vyos# commit
vyos@vyos# exit

! Verify
vyos@vyos:~$ show interfaces
vyos@vyos:~$ show ip route
```

---

## 2. Test Inter-VLAN Communication

**From PC0 (VLAN 10):**
```
PC0# ping -c 4 192.168.20.10  # SRV1 on VLAN 20
PING 192.168.20.10 (192.168.20.10) 56(84) bytes of data.
64 bytes from 192.168.20.10: icmp_seq=1 ttl=63 time=5.234 ms
64 bytes from 192.168.20.10: icmp_seq=2 ttl=63 time=5.123 ms
64 bytes from 192.168.20.10: icmp_seq=3 ttl=63 time=5.345 ms
64 bytes from 192.168.20.10: icmp_seq=4 ttl=63 time=5.456 ms

! Success! Different VLANs can now communicate
```

**Traceroute from PC0 to SRV1:**
```
PC0# traceroute 192.168.20.10
traceroute to 192.168.20.10 (192.168.20.10), 30 hops max, 60 byte packets
 1  192.168.10.1 (192.168.10.1)  2.345 ms      # R1-NY (gateway)
 2  192.168.20.10 (192.168.20.10)  5.234 ms    # SRV1 (destination)

! Verify: 2 hops only (local routing between VLANs)
```

---

## 3. Verification

**On R1-NY:**
```
R1-NY# show ip route

C   192.168.10.0/24 via eth0.10
C   192.168.20.0/24 via eth0.20
C   192.168.30.0/24 via eth0.30

! Direct connected routes to all 3 VLANs
```

---

## 4. Checklist

- [ ] Sub-interfaces created (eth0.10, eth0.20, eth0.30)
- [ ] Each sub-interface has correct IP (192.168.10.1, etc.)
- [ ] Physical interface (eth0) is UP
- [ ] Routing table shows all 3 VLAN routes
- [ ] PC0 → SRV1 ping succeeds
- [ ] PC0 → SGP1 ping succeeds
- [ ] Traceroute shows 2-hop path (local routing)

---

**Practice Lab Version:** 1.0
