# Day 08 — Spanning Tree Protocol

## Lab Manual: STP Basics, BPDU, Root Bridge, Convergence

---

## 0. Metadata

| Field | Value |
|---|---|
| **Lab Title** | Spanning Tree Protocol (STP) |
| **Day** | Day 08 (Redundancy & Loop Prevention) |
| **Topic Focus** | STP concepts, root bridge election, port roles, BPDU frames, convergence time |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Intermediate to Advanced |
| **Prerequisites** | Day 01–07 (especially switching fundamentals) |
| **Lab Scope** | Create redundant links between switches; STP prevents loops; verify convergence |
| **Standards Referenced** | IEEE 802.1D (Spanning Tree Protocol), RFC 3720 (iSCSI Protocol over TCP/IP) |
| **Expected Outcome** | Redundant topology with no loops; failover transparent to end devices; convergence in ~30–50 seconds |

---

## 1. Overview

**Problem:** Redundant links improve availability but create **switching loops**.

**Example Loop:**
```
PC0 ↔ SW1 ↔ SW2
      ↕    ↕  (double link for redundancy)

Frame forwarding cycle:
1. Frame from PC0 arrives on SW1
2. SW1 floods to all ports (unknown dest)
3. Frame reaches SW2 on both links
4. SW2 floods back to SW1
5. SW1 receives frame again, re-floods
6. Loop: Frame circulates infinitely
7. Network saturated (DoS)
```

**Solution: Spanning Tree Protocol (STP)**
- Disables redundant links (blocks one)
- Monitors link failures
- Re-enables blocked link if active link fails
- Transparent to end devices

---

## 2. STP Concepts

### 2.1 Root Bridge

**Definition:** The "center" of the spanning tree; all other switches build paths to root

**Election Process:**
1. All switches broadcast BPDU (Bridge Protocol Data Unit) frames
2. Each BPDU contains bridge priority (lower = higher priority)
3. Default priority: 32768 (can be 0–61440 in 4096 increments)
4. **Lowest priority wins; if tie, lowest MAC address wins**

**Example:**
```
SW1: Priority 32768, MAC aa:bb:cc:00:00:01
SW2: Priority 32768, MAC aa:bb:cc:00:00:02
SW3: Priority 32768, MAC aa:bb:cc:00:00:03

Result: SW1 becomes root (lowest MAC)

! To make SW1 root explicitly:
SW1(config)# spanning-tree vlan 1 priority 4096
! Now SW1 has lowest priority; guaranteed root
```

### 2.2 Port Roles

| Role | Function | Link Status |
|------|----------|------------|
| **Root Port** | Port on non-root switch closest to root (lowest cost) | **FORWARDING** (active) |
| **Designated Port** | Port on segment closest to root (lowest cost) | **FORWARDING** (active) |
| **Blocked Port** | Redundant port (not on path to root) | **BLOCKING** (disabled) |
| **Disabled Port** | Manually shut down | **DISABLED** |

### 2.3 Port States

| State | Duration | Purpose |
|-------|----------|---------|
| **BLOCKING** | Indefinite | Receives BPDUs only; no data forwarding |
| **LISTENING** | 15 seconds | Sends/receives BPDUs; preparing to forward |
| **LEARNING** | 15 seconds | Learns MAC addresses; doesn't forward data yet |
| **FORWARDING** | Indefinite | Full data forwarding |
| **DISABLED** | Indefinite | Administratively down |

**Total convergence time:** 30–50 seconds (2 × 15-second delays)

---

## 3. Topology with Redundancy

### 3.1 Redundant Topology

```
     SW1 (Root)
      /    \
     /      \
   SW2      SW3
    |        |
   PC0      SRV1
   
Links:
- SW1 ↔ SW2 (Link 1)
- SW1 ↔ SW3 (Link 2)
- SW2 ↔ SW3 (Link 3) ← Redundant; one will be blocked

STP decides:
- SW1 is root (lowest priority/MAC)
- SW2 root port: link to SW1 (designated)
- SW3 root port: link to SW1 (designated)
- SW2↔SW3 link: Blocked on one end (SW3 side)
```

### 3.2 Network Diagram

```
     SW1 (Root)
      ⬤---Gi0/2 to SW3
      |
    Gi0/1 to SW2
      |
      ⬤---Gi0/1---⬤ SW3
      SW2         /
      |          / (Blocked)
   Gi0/2---Gi0/1 (SW3 blocks this port)
```

---

## 4. STP Configuration

### 4.1 Enable STP (Default)

**STP is enabled by default on Cisco switches**

```
Switch# show spanning-tree

VLAN0001
  Spanning tree enabled protocol ieee
  Root ID    Priority    32768
             Address     aabb.cc00.0001
             This bridge is the root
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec

  Bridge ID  Priority    32768  (priority 32768 sys-id-ext 0)
             Address     aabb.cc00.0001
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec
             Aging Time  300 sec

Interface           Role Sts Cost      Prio.Nbr Type
-------------- --------- --- --------- -------- ----
Gi0/1          Desg FWD  4    128.1    P2p
Gi0/2          Desg FWD  4    128.2    P2p
```

### 4.2 Set Root Priority

**Force SW1 to be root:**
```
SW1(config)# spanning-tree vlan 1 priority 4096
! Priority 4096 < 32768; SW1 becomes root
```

**Force SW2 to be secondary root (backup):**
```
SW2(config)# spanning-tree vlan 1 priority 8192
! Priority 8192 < 32768; SW2 becomes secondary
```

### 4.3 Verify STP Topology

**On SW1 (root):**
```
SW1# show spanning-tree

VLAN0001
  Spanning tree enabled protocol ieee
  Root ID    Priority    4096
             Address     aabb.cc00.0001
             This bridge is the root
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec

Interface           Role Sts Cost      Prio.Nbr Type
-------------- --------- --- --------- -------- ----
Gi0/1          Desg FWD  4    128.1    P2p
Gi0/2          Desg FWD  4    128.2    P2p
! All ports are forwarding (root has no root port)
```

**On SW2 (non-root):**
```
SW2# show spanning-tree

VLAN0001
  Spanning tree enabled protocol ieee
  Root ID    Priority    4096
             Address     aabb.cc00.0001
             Root Port   Gi0/1, Cost 8
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec

Interface           Role Sts Cost      Prio.Nbr Type
-------------- --------- --- --------- -------- ----
Gi0/1          Root FWD  4    128.1    P2p     ! Root port (to SW1)
Gi0/2          Desg FWD  4    128.2    P2p     ! Designated port (to SW3)
! SW2 has root port (Gi0/1) and designated port (Gi0/2)
```

**On SW3 (non-root):**
```
SW3# show spanning-tree

VLAN0001
  Spanning tree enabled protocol ieee
  Root ID    Priority    4096
             Address     aabb.cc00.0001
             Root Port   Gi0/1, Cost 8
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec

Interface           Role Sts Cost      Prio.Nbr Type
-------------- --------- --- --------- -------- ----
Gi0/1          Root FWD  4    128.1    P2p     ! Root port (to SW1)
Gi0/2          Altn BLK  4    128.2    P2p     ! Alternate/Blocked port
! SW3 blocks Gi0/2 (redundant link to SW2)
```

---

## 5. Failover Testing

### 5.1 Simulate Link Failure

**Disconnect SW1↔SW3 link (Gi0/2 on SW1):**

```
SW1(config)# interface Gi0/2
SW1(config-if)# shutdown
! Link is down

! Wait 30–50 seconds (STP convergence)

! Verify new topology:
SW3# show spanning-tree

Interface           Role Sts Cost      Prio.Nbr Type
-------------- --------- --- --------- -------- ----
Gi0/1          Root FWD  4    128.1    P2p
Gi0/2          Desg FWD  4    128.2    P2p     ! NOW FORWARDING (was blocked)
! SW3 unblocks Gi0/2 to reach root via SW2 path
```

**Path change:** SW3 now reaches root via:
- Old: SW3 → SW1 (direct, 2 hops)
- New: SW3 → SW2 → SW1 (3 hops, but only available path)

### 5.2 Verify Connectivity

**PC0 still reaches SRV1 (via new path):**
```
PC0# ping 192.168.20.10
! Succeeds (failover transparent; no manual intervention)
```

---

## 6. Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| **STP disabled** | Multiple loops; network saturates | Ensure `spanning-tree vlan 1` is enabled |
| **Wrong root priority** | Expected switch is not root | Set lowest priority on desired root |
| **Blocked port shows "forwarding"** | No redundancy; both links active | Check `show spanning-tree` for port roles |
| **High convergence time** | Failover takes >60 seconds | Tune STP timers (advanced) |

---

## 7. Verification Checklist

- [ ] STP enabled on all switches
- [ ] Root bridge elected correctly (lowest priority/MAC)
- [ ] Root ports identified on non-root switches
- [ ] One link is blocked (redundant port in BLK state)
- [ ] All forwarding ports show "FWD" status
- [ ] Convergence completes in <60 seconds
- [ ] Failover transparent to end devices (pings continue)
- [ ] Blocked port re-activates on link failure
- [ ] `show spanning-tree` output matches topology

---

## 8. Advanced STP (Stretch Goals)

1. **RSTP (Rapid Spanning Tree):** Convergence in seconds (not 30–50 seconds)
2. **MSTP (Multiple Spanning Tree):** Multiple spanning trees per VLAN
3. **BPDUGuard:** Prevent unauthorized switches from joining

---

## 9. Conclusion

Day 08 introduced **redundancy without loops** using STP. Switches can now have:
- Multiple links for fault tolerance
- Automatic failover (transparent to users)
- No broadcast storms or packet loops

**This completes the CCNA Foundation Week (Days 01–08):**
- **Days 01–02:** Routing & multi-site connectivity
- **Days 03:** Switching & VLAN segmentation
- **Days 04–06:** Security (SSH, port security, ACLs)
- **Days 07–08:** Advanced switching (inter-VLAN routing, redundancy)

---

**Lab Documentation Version:** 1.0  
**Last Updated:** 2026-08-30  
**Status:** Complete
