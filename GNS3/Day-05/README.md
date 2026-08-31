# Day 05: Port Security & Storm Control

**Topology:** Same as Day 02–04 (3 branches, 3 switches, 3 routers)

## Configuration

**Port Security (all access ports):**
```
interface FastEthernet0/2
 switchport port-security
 switchport port-security maximum 1
 switchport port-security mac-address sticky
 switchport port-security violation shutdown
 storm-control broadcast level 50
 storm-control multicast level 50
```

## Field Variants

1. **DHCP Snooping:** Only trusted DHCP servers respond
2. **Dynamic ARP Inspection:** Validates ARP frames
3. **Access Control Lists on Port Security:** Combine ACLs + port security
4. **Violation Restrict Mode:** Auto-recovery after timeout
5. **Per-Port MAC Limit:** Different limits per port (e.g., access = 1, trunk = 100)
6. **MAC Address Notification:** SNMP alerts on violations
7. **Port Security Aging:** Automatically clear sticky MACs after timeout

## Verification

```bash
show port-security dynamic
show storm-control
show interface status
```

**Next Day:** Day 06 — Access Control Lists (ACLs)

---

**README Version:** 1.0
