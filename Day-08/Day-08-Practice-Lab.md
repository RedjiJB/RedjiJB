# Day 08 — Spanning Tree Protocol

## Practice Lab: STP Configuration & Failover Testing

---

## 1. Verify STP is Enabled

**On all switches (SW1, SW2, SW3):**
```
Switch# show spanning-tree

VLAN0001
  Spanning tree enabled protocol ieee
  Root ID    Priority    32768
             Address     aabb.cc00.0001
  ...
```

**Expected:** All switches show STP enabled (default)

---

## 2. Set Root Bridge

**On SW1 (desired root):**
```
SW1(config)# spanning-tree vlan 1 priority 4096
! Priority 4096 is lowest; SW1 becomes root

SW1# write memory
```

**Verify root election:**
```
SW1# show spanning-tree | grep "Root ID"
Root ID    Priority    4096
           Address     aabb.cc00.0001
           This bridge is the root

SW2# show spanning-tree | grep "Root ID"
Root ID    Priority    4096
           Address     aabb.cc00.0001
           Root Port   Gi0/1
! SW2 recognizes SW1 as root; root port is Gi0/1
```

---

## 3. Identify Blocked Port

**On SW3:**
```
SW3# show spanning-tree

Interface           Role Sts Cost      Prio.Nbr Type
-------------- --------- --- --------- -------- ----
Gi0/1          Root FWD  4    128.1    P2p     ! Forward
Gi0/2          Altn BLK  4    128.2    P2p     ! Blocked (redundant)
```

**Expected:** One port is BLK (Alternate/Blocked); redundant link is disabled

---

## 4. Failover Testing

**Simulate link failure (on SW1):**
```
SW1(config)# interface Gi0/2
SW1(config-if)# shutdown
! Link to SW3 is down

! Wait 30–50 seconds (STP convergence)

SW3# show spanning-tree

Interface           Role Sts Cost      Prio.Nbr Type
-------------- --------- --- --------- -------- ----
Gi0/1          Root FWD  4    128.1    P2p
Gi0/2          Desg FWD  4    128.2    P2p     ! NOW FORWARDING!
! Blocked port automatically unblocks
```

**Verify connectivity (no service interruption):**
```
PC0# ping -c 20 192.168.20.10
! Pings continue through the failover
! Expect 2–3 lost packets during 30–50 second convergence window
```

**Restore link:**
```
SW1(config)# interface Gi0/2
SW1(config-if)# no shutdown
! Link restored; STP re-converges
```

---

## 5. Checklist

- [ ] STP enabled on all 3 switches
- [ ] SW1 is root (priority 4096)
- [ ] SW2, SW3 show root port (forwarding)
- [ ] One link is blocked (BLK state)
- [ ] Failover causes blocked port to unblock (FWD)
- [ ] Connectivity survives failover (transparent)
- [ ] Convergence time < 60 seconds

---

**Practice Lab Version:** 1.0
