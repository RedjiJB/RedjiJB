# Day 52 Field-3 Variant — STP + HSRP Sync (Distributed Consensus)

## 0. Metadata

```
Field Focus:         Field 3: Distributed Consensus (DePIN)
Core Proof Obligation: 3-switch distributed STP and HSRP remain synchronized via consensus; Byzantine faults in one switch don't break quorum.
Haiti Deployment Phase: P52+ (scale phase) — mesh networks with 10+ hotspots per zone must tolerate a single compromised node without losing network coordination.
Estimated Time:      3 hours
Difficulty:          Advanced+
Relationship to Base Lab: Extends from 2 switches to 3 in full-mesh topology; adds Byzantine fault detection via quorum-based voting.
Prerequisite:        Complete Day 52 Lab Manual first; understand multi-switch topology and basic Byzantine concepts.
```

---

## 1. Business Context (Field-3 Framing)

In a P52+ distributed mesh (50–1000 nodes across Haiti), no central management server controls gateway election. Each zone's 3+ distribution switches must achieve consensus on which switch is active for each VLAN and which is the STP root — **without talking to a central authority**.

**The problem:** Naive approaches (e.g., "always switch 1 is the root") fail if switch 1 is compromised, offline, or behaving incorrectly. A Byzantine-resilient approach requires consensus: a switch only becomes active for a VLAN if *at least 2 out of 3* of its peers agree (quorum voting) that it should be. If one switch sends contradictory hellos or BPDUs (Byzantine behavior), the other two reject it.

**This variant proves:** A 3-switch mesh with consensus-based election ensures that even if one switch is offline or Byzantine, the other two achieve deterministic leader election and STP root selection within 60 seconds.

---

## 2. Topology Diagram (Field-3 Variant)

```
[FIELD-3 VARIANT — Distributed Consensus]

         DSW1
        /    \
       /      \
     DSW2 --- DSW3

Full-mesh topology: every switch is directly connected to every other switch.
No hub-and-spoke; no single point of failure.

Voting mechanism:
- HSRP Group 100 (VLAN 10) uses 3-way voting:
  * DSW1 proposes: "I am active" (priority 150)
  * DSW2 proposes: "DSW1 is active" (priority 100)
  * DSW3 proposes: "DSW1 is active" (priority 100)
  → Quorum (2/3 = DSW2 + DSW3) agrees; DSW1 elected active.

- STP root election also consensus-based:
  * Each switch proposes a bridge priority
  * Quorum consensus selects the lowest priority as root
  * If one switch sends a fake "I'm the root" BPDU, the other two reject it (minority opinion)

Byzantine fault tolerance:
- If DSW1 goes offline or reboots, DSW2 and DSW3 can still elect a new active/root
- If DSW1 sends contradictory BPDUs (Byzantine), DSW2/DSW3 reject its proposal and elect from themselves
```

---

## 3. IP Addressing Plan (Field-3 Annotations)

| VLAN | Network | DSW1 SVI | DSW2 SVI | DSW3 SVI | HSRP VIP | Quorum |
|---|---|---|---|---|---|---|
| VLAN 10 | 10.0.10.0/24 | .252 | .253 | .254 | .1 | 2 out of 3 |
| VLAN 20 | 10.0.20.0/24 | .252 | .253 | .254 | .1 | 2 out of 3 |

**Field-3 Annotations:**
- Each switch has a unique SVI (not a virtual pair like Field-1/2)
- HSRP virtual IP is a single consensus point (all three switches advertise the same VIP via consensus)
- Quorum = 2 out of 3 switches; if one fails or is Byzantine, quorum still exists

---

## 4. Configuration (Field-3 Optimizations)

### 4.1 DSW1: Propose High Priority (Intended Active for VLAN 10)

```text
DSW1(config)#interface vlan 10
DSW1(config-if)#ip address 10.0.10.252 255.255.255.0
DSW1(config-if)#standby 10 ip 10.0.10.1
DSW1(config-if)#standby 10 priority 150
DSW1(config-if)#standby 10 preempt
DSW1(config-if)#exit
```

### 4.2 DSW2: Secondary Priority (Propose DSW1 as Active if Healthy)

```text
DSW2(config)#interface vlan 10
DSW2(config-if)#ip address 10.0.10.253 255.255.255.0
DSW2(config-if)#standby 10 ip 10.0.10.1
DSW2(config-if)#standby 10 priority 100
DSW2(config-if)#standby 10 track ip 10.0.10.252 decrement 30
! If DSW1's SVI goes down, decrement DSW2's priority by 30 (100-30=70, loses to DSW3)
DSW2(config-if)#exit
```

### 4.3 DSW3: Backup Priority (Propose Itself if Both DSW1 and DSW2 Fail)

```text
DSW3(config)#interface vlan 10
DSW3(config-if)#ip address 10.0.10.254 255.255.255.0
DSW3(config-if)#standby 10 ip 10.0.10.1
DSW3(config-if)#standby 10 priority 100
DSW3(config-if)#standby 10 track ip 10.0.10.252 decrement 30
DSW3(config-if)#exit
```

### 4.4 STP Root: Consensus Selection

```text
DSW1(config)#spanning-tree vlan 10 root primary
! DSW1 proposes itself as root (priority 24576)

DSW2(config)#spanning-tree vlan 10 priority 24576
DSW3(config)#spanning-tree vlan 10 priority 24576
! DSW2 and DSW3 accept DSW1 as root via consensus (same priority, but DSW1's MAC wins tiebreaker)

[Alternative Byzantine-resistant STP for Field-3:]
DSW1(config)#spanning-tree vlan 10 priority 20480
DSW2(config)#spanning-tree vlan 10 priority 20480
DSW3(config)#spanning-tree vlan 10 priority 20480
! All three propose same priority; STP elects by lowest MAC address (deterministic)
```

### 4.5 Mesh Links Configuration

Enable trunk between all three switches:

```text
DSW1(config)#interface GigabitEthernet1/0
DSW1(config-if)#switchport trunk encapsulation dot1q
DSW1(config-if)#switchport mode trunk
DSW1(config-if)#exit

DSW1(config)#interface GigabitEthernet1/1
DSW1(config-if)#switchport trunk encapsulation dot1q
DSW1(config-if)#switchport mode trunk
DSW1(config-if)#exit

! Repeat similar config on DSW2 and DSW3 for their mesh links
```

---

## 5. Field-3 Verification Steps

### 5.1 Verify Quorum Formation (All Three Online)

```text
DSW1#show standby vlan 10 brief
Group  Interface   Ip Address      State   Active router
10     Vlan10      10.0.10.1       Active  local

DSW2#show standby vlan 10 brief
Group  Interface   Ip Address      State   Active router
10     Vlan10      10.0.10.1       Standby 10.0.10.252

DSW3#show standby vlan 10 brief
Group  Interface   Ip Address      State   Active router
10     Vlan10      10.0.10.1       Standby 10.0.10.252
```

**Expected:** DSW1 is active (2 out of 3 agree: DSW1 itself + tie-break). DSW2 and DSW3 are standby.

### 5.2 Verify STP Root via Consensus

```text
DSW1#show spanning-tree vlan 10 root
                                       Root Hello Max Fwd
Vlan             Root ID    Cost     Port  Time Age Dly
VLAN0010     24576 aabb.cc00.1000 0        This bridge is the root

DSW2#show spanning-tree vlan 10 root
                                       Root Hello Max Fwd
Vlan             Root ID    Cost     Age  Age Dly
VLAN0010     24576 aabb.cc00.1000 0        Gi1/0

DSW3#show spanning-tree vlan 10 root
                                       Root Hello Max Fwd
Vlan             Root ID    Cost     Age  Age Dly
VLAN0010     24576 aabb.cc00.1000 0        Gi1/0
```

**Expected:** All three recognize DSW1 as root via consensus (they all received and agreed on DSW1's BPDU).

### 5.3 Simulate Byzantine Fault (DSW1 Offline)

```text
DSW1# reload
[DSW1 reboots; DSW2 and DSW3 remain online]
```

Wait 10 seconds for convergence.

### 5.4 Verify Failover via Quorum

```text
DSW2#show standby vlan 10 brief
Group  Interface   Ip Address      State   Active router
10     Vlan10      10.0.10.1       Active  local (DSW1 detected down; quorum elected DSW2 or DSW3)

DSW3#show standby vlan 10 brief
Group  Interface   Ip Address      State   Active router
10     Vlan10      10.0.10.1       Standby 10.0.10.253 or 10.0.10.254 (depends on priority)
```

**Expected:** DSW2 or DSW3 becomes active (2 out of 3: itself + the other survivor).

### 5.5 STP Root Consensus After Fault

```text
DSW2#show spanning-tree vlan 10 root
                                       Root Hello Max Fwd
Vlan             Root ID    Cost     Age  Age Dly
VLAN0010     24576 aabb.cc00.2000 0        This bridge is the root (elected via quorum)
```

**Expected:** STP re-elects a new root from the 2 surviving switches.

### 5.6 Recovery and Re-Alignment

```text
DSW1# (reboot complete)
[Wait 5 seconds]

DSW1#show standby vlan 10 brief
Group  Interface   Ip Address      State   Active router
10     Vlan10      10.0.10.1       Active  local (preempt allows reclamation)

DSW2#show standby vlan 10 brief
Group  Interface   Ip Address      State   Active router
10     Vlan10      10.0.10.1       Standby 10.0.10.252 (quorum re-elected DSW1)
```

**Expected:** Quorum consensus re-elects DSW1 as active (3 out of 3 now agree on original design intent).

---

## 6. Expected Output Gallery (Field-3 Scenarios)

### Full Quorum (All 3 Online)

```
[show ip route summary from each switch]
DSW1#show standby brief
P = configured to preempt, p = preempting with delay, * = none

Interface   Grp Prio P State    Active          Standby         Virtual IP
Vlan10      10  150  P Active   local           10.0.10.253     10.0.10.1
Vlan20      20  100  P Standby  10.0.20.252     local           10.0.20.1

DSW2#show standby brief
P = configured to preempt, p = preempting with delay, * = none

Interface   Grp Prio P State    Active          Standby         Virtual IP
Vlan10      10  100  P Standby  10.0.10.252     10.0.10.254     10.0.10.1
Vlan20      20  150  P Active   local           10.0.20.253     10.0.20.1

DSW3#show standby brief
P = configured to preempt, p = preempting with delay, * = none

Interface   Grp Prio P State    Active          Standby         Virtual IP
Vlan10      10  100  P Standby  10.0.10.252     10.0.10.253     10.0.10.1
Vlan20      20  100  P Standby  10.0.20.252     local           10.0.20.1
```

### After DSW1 Offline (Byzantine Scenario: Quorum = 2/3)

```
DSW2#show standby brief
P = configured to preempt, p = preempting with delay, * = none

Interface   Grp Prio P State    Active          Standby         Virtual IP
Vlan10      10  70   P Active   local           10.0.10.254     10.0.10.1
            (priority decremented from 100 to 70 due to DSW1 tracked IP being down)
Vlan20      20  150  P Active   local           10.0.10.254     10.0.20.1

DSW3#show standby brief
P = configured to preempt, p = preempting with delay, * = none

Interface   Grp Prio P State    Active          Standby         Virtual IP
Vlan10      10  100  P Standby  10.0.10.253     N/A             10.0.10.1
Vlan20      20  100  P Standby  10.0.20.253     N/A             10.0.20.1
```

---

## 7. Common Field-3 Mistakes

1. **Creating a hub-and-spoke instead of full mesh** → One switch becomes a bottleneck; loses the Byzantine-resilience benefit. If the hub fails, the other two are isolated.
   - **Fix:** Every switch must have a direct link to every other switch (3 switches = 3 trunk links).

2. **Configuring HSRP tracking incorrectly** → If DSW2 tracks DSW1's SVI but DSW1 goes offline, DSW2's priority decreases, making it lose to DSW3. This breaks the intended hierarchy.
   - **Fix:** Use `track ip <svi-ip> decrement <amount>` on backup switches to trigger priority reductions when the primary's SVI fails.

3. **Not verifying quorum before declaring pass** → Test with 2 switches up, then claim Byzantine resilience. That's not Byzantine resilience; that's just failover.
   - **Fix:** Test with all 3 online first (prove quorum decision-making), then take one offline (prove 2/3 quorum still works).

4. **Misunderstanding STP consensus** → Thinking STP automatically forms consensus because all switches have the same priority. STP elects by MAC address if priorities tie; make sure this is deterministic and documented.
   - **Fix:** Document which switch's MAC wins the tiebreaker; verify this is the intended root.

---

## 8. Troubleshooting by Field-3 (Diagnostic Method)

**Symptom: "Two switches online, but HSRP is flapping or not converging to a single active"**

```text
Step 1: Check priorities on both switches
  show standby vlan 10 | include "priority"
  → If both have priority 150, neither will yield. Or if priorities are equal and neither is preempting, 
    the active switch is random.

Step 2: Is the tracking decrement working?
  show standby vlan 10 | include "tracked" or "tracking"
  → If DSW2 tracks DSW1 and DSW1 is down, DSW2's priority should be decremented. 
    Verify: `show ip track brief` and confirm the tracked object is "down".

Step 3: Are HSRP hellos reaching both switches?
  debug standby (limited to 10 seconds on both)
  → On DSW2 and DSW3, should see hellos from each other. If only one direction sees hellos, 
    the mesh link is asymmetric or down.

Step 4: Verify mesh link connectivity
  ping 10.0.10.253 (from DSW1)   [should reach DSW2]
  ping 10.0.10.254 (from DSW1)   [should reach DSW3]
  → If ping fails, the mesh link is down. Check trunk status.
```

**Symptom: "All three switches online, but quorum elected the wrong active (not DSW1)"**

```text
Step 1: Compare all three priorities
  show standby vlan 10 | include "Local priority" (from each switch)
  → DSW1 should show 150, DSW2 should show 100, DSW3 should show 100. 
    If DSW1 shows 100 (configured wrong), it loses to DSW2/DSW3 random tiebreaker.

Step 2: Is DSW1's preempt enabled?
  show standby vlan 10 | include "Preempt"
  → If preempt is disabled on DSW1, it won't reclaim active after DSW2 becomes active first.

Step 3: Did DSW1 initialize after DSW2 and DSW3?
  show log | include "HSRP" (check timestamps)
  → If DSW1 is still booting or recovering, it may not have sent its priority yet. 
    Wait 30 seconds for convergence.

Step 4: Check STP root consistency
  show spanning-tree vlan 10 root (from all three switches)
  → If STP root is different from HSRP active, quorum didn't align properly. 
    Verify all three switches received DSW1's STP BPDU.
```

---

## 9. Design Analysis: Field-3 Reasoning

**Why does this field-specific topology matter for distributed consensus?**

In P52+ (scale phase), Haiti's mesh has grown to 50–1000+ hotspots across multiple islands and zones. A single management server or central gateway is no longer feasible — it becomes a bottleneck and a SPOF (single point of failure). Instead, each zone operates autonomously with consensus-based leader election.

This variant proves that a simple consensus model (HSRP + STP priorities + Byzantine tracking) can tolerate one failed or compromised node while the other two maintain quorum. The proof obligations are:
1. **Quorum decision-making:** With all 3 online, the network elects the intended leader
2. **Fault tolerance:** With 1 offline, the remaining 2 elect a new leader deterministically
3. **Recovery:** When the offline node comes back, quorum re-elects the original leader (if intended by priority)
4. **Byzantine detection:** If a node sends contradictory signals (offline but still sending hellos), the quorum ignores it

---

## 10. Real-World Parallel: Haiti Deployment Phase

**P52+ Scale Phase — Autonomous Mesh**

In P52+ (1000+ hotspots, 100+ zones across Haiti), each zone is fully autonomous. No central NMS (network management server) in Port-au-Prince controls gateway election for a Jérémie zone hotspot mesh. Instead:
- Each zone has 3 distribution switches per hotspot cluster
- HSRP and STP achieve consensus locally
- A compromised or failing distribution switch doesn't break the zone (quorum survives)
- Recovery is automatic; no manual intervention needed

This lab validates the architectural assumption: **"A 3-switch mesh with consensus-based election is Byzantine-fault-tolerant enough for a 100+ node zone."** Before P52 scaling, this proof must be replicated at scale (multiple zones running in parallel).

---

## 11. Stretch Goals: Advanced Proof Obligations

1. **Formal Byzantine fault tolerance proof:** Using PBFT (Practical Byzantine Fault Tolerance) model, prove that DSW2 and DSW3 can reach consensus on a leader even if DSW1 sends contradictory HSRP priority announcements.

2. **Scale to 5 switches:** Extend this lab to 5 switches in a full mesh (quorum = 3 out of 5). Prove that with 2 switches offline or Byzantine, the remaining 3 still elect a leader deterministically.

3. **Network partition recovery:** Simulate a network partition where {DSW1, DSW2} are isolated from {DSW3}. Verify that both partitions elect a leader from their own partition, then measure time-to-recovery when partition heals.

4. **Byzantine BPDU injection:** Manually craft a forged STP BPDU claiming DSW3 is the root (with false priority). Verify that DSW1 and DSW2 reject it and maintain DSW1 as root (quorum consensus overrides Byzantine input).

---

## 12. Self-Assessment (Field-3 BSL)

```
BSL-0 AWARENESS      - You've read this lab once. You couldn't replicate it.
BSL-1 LAB CAPABLE    - You completed this lab with the manual open; 3-switch topology worked.
BSL-2 OFFLINE        - You could repeat this lab with the manual, no internet.
BSL-3 RECOVERABLE    - You could rebuild this lab from the topology diagram; given Byzantine fault scenarios, 
                        you'd know to test quorum decision-making and fault tolerance.
BSL-4 MAINTAINABLE   - You could extend this to 5 switches (3/5 quorum) and still ensure Byzantine 
                        fault tolerance without losing determinism.
BSL-5 TEACHABLE      - You could explain why consensus-based leader election is better than hub-and-spoke 
                        for distributed autonomous zones, using this lab as proof.

Target BSL for this lab: 3–4
```

---

**Push this file via Python payload JSON to RedjiJB-Labs/Day-52-Field-3-Lab.md**
