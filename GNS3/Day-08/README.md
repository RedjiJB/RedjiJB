# Day 08: Spanning Tree Protocol

**Focus:** STP basics, redundant topology, loop prevention, failover

**Key Topology Change:** Add redundant link between SW2 and SW3 (3-way loop)

## Configuration

**Set root bridge (SW1):**
```
spanning-tree vlan 1 priority 4096
```

**Verify STP topology:**
```
show spanning-tree
! Verify: one port is in BLK state (blocked)
```

## Redundant Topology

```
SW1 (Root)
  ├─ Gi0/1 → SW2 (designated, forwarding)
  └─ Gi0/2 → SW3 (designated, forwarding)
       |         |
       └─ Gi0/2 → Gi0/2 (BLOCKED on SW3 side)
```

## Field Variants

1. **RSTP:** Rapid convergence (seconds instead of 30–50 sec)
2. **MSTP:** Multiple spanning trees (per VLAN)
3. **PortFast:** Instant forwarding for end devices
4. **BPDUGuard:** Prevent rogue switches
5. **Root Guard:** Prevent root bridge hijacking
6. **BPDU Filtering:** Block BPDU transmission
7. **STP Timers:** Tune hello/forward delay for convergence

## Failover Testing

1. Shutdown link (SW1 Gi0/2)
2. Wait 30–50 seconds
3. Verify blocked port unblocks (SW3 Gi0/2 FWD)
4. Restore link
5. Convergence time should be < 60 seconds

## Verification

```
show spanning-tree
show spanning-tree [interface]
show spanning-tree cost
```

---

## Summary: Days 01–08 Complete

**Core CCNA Topics Covered:**
- **Day 01:** Enterprise topology, routers, switches, firewalls, NAT
- **Day 02:** Multi-site routing, static routes, route propagation
- **Day 03:** Switch fundamentals, VLAN configuration, MAC learning
- **Day 04:** Device security, SSH, enable secret, user authentication
- **Day 05:** Port security, MAC limiting, storm control
- **Day 06:** Access control lists, traffic filtering
- **Day 07:** VLAN basics, inter-VLAN routing, router-on-a-stick
- **Day 08:** Spanning Tree Protocol, redundancy, failover

**Total:** 24 documentation files (3 per day), 120+ hours of hands-on labs

---

**README Version:** 1.0  
**Project Status:** Complete (Days 01–08)  
**Next Phase:** Days 09+ (OSPF, BGP, Advanced Routing)
