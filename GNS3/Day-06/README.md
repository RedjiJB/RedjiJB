# Day 06: Access Control Lists

**Focus:** Standard/extended ACLs, traffic filtering by protocol/port

**Topology:** Same as Day 02–05

## Configuration

**Standard ACL (block by source IP):**
```
access-list 1 deny host 192.168.10.50
access-list 1 permit any
interface Gi0/1
 ip access-group 1 out
```

**Extended ACL (filter by protocol/port):**
```
ip access-list extended Allow-Web
 permit tcp 192.168.10.0 0.0.0.255 any eq 80
 permit tcp 192.168.10.0 0.0.0.255 any eq 443
 deny ip any any
interface Gi0/1
 ip access-group Allow-Web out
```

## Field Variants

1. **Reflexive ACLs:** Auto-allow return traffic
2. **Time-Based ACLs:** Restrict access by time-of-day
3. **Dynamic ACLs:** Lock-and-key (dial-up access)
4. **ACL Logging:** Log denied packets
5. **Per-Port Limits:** Different ACLs per interface
6. **Distributed ACLs:** Apply to multiple routers
7. **ACL Optimization:** Merge overlapping rules

## Verification

```
show access-lists
show ip interface [int] | include access
show access-lists [name/number]
```

---

**README Version:** 1.0
