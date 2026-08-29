# Day 52 Field-1 Variant — STP + HSRP Sync (Black Start Resilience)

## 0. Metadata

```
Field Focus:         Field 1: Black Start Resilience
Core Proof Obligation: STP root election and HSRP active gateway remain synchronized during power loss and recovery cycles; no external coordination required.
Haiti Deployment Phase: P45 (expansion phase) — redundant gateways must auto-align after island-wide power events.
Estimated Time:      2.5 hours
Difficulty:          Advanced
Relationship to Base Lab: Same STP + HSRP protocol; added persistent storage, power-loss recovery, and cold-boot alignment verification.
Prerequisite:        Complete Day 52 Lab Manual first; familiarity with VLANs and HSRP basics.
```

---

## 1. Business Context (Field-1 Framing)

In the Haiti P45 expansion, two distribution switches must remain coordinated through island-wide power events — brownouts, rolling blackouts, and full system shutdowns where external DNS, NTP, and management systems are unavailable. 

**The problem:** HSRP and STP election algorithms depend on exchanging state information (HSRP hello packets, STP BPDUs). If both switches lose power simultaneously, they reboot in an undefined order. Without NVRAM-backed configuration, they may reboot into misaligned states: DSW1 might be HSRP-standby (but STP root) for VLAN 10, and DSW2 might be HSRP-active (but not STP root), contradicting the intentional design and creating suboptimal traffic paths until one fails and convergence forces alignment.

**This variant proves:** STP root bridge placement and HSRP active router placement remain synchronized across cold-boot cycles through persistent configuration — no manual intervention, no external coordination, just re-running configuration from NVRAM.

---

## 2. Topology Diagram (Field-1 Variant)

```
[FIELD-1 VARIANT]

DSW1 (Local Config Storage)
├─ NVRAM-backed config snapshot (STP root + HSRP priority)
├─ Local NTP (time-synced to system clock, no external NTP)
└─ Power-loss recovery script (validates STP/HSRP alignment on boot)

            DSW1 ────── trunk ────── DSW2
            (Power-backed config)    (Power-backed config)
             │                        │
        Access switches & VLANs 10, 20

DSW2 (Local Config Storage)
├─ NVRAM-backed config snapshot (STP root + HSRP priority)
├─ Local NTP (mirrors DSW1's clock)
└─ Power-loss recovery script (validates STP/HSRP alignment on boot)

[POWER EVENT SIMULATION]
1. Save configs to NVRAM (startup-config)
2. Power off both switches simultaneously
3. Reboot in random order (DSW1 first, then DSW2, or vice versa)
4. Verify HSRP/STP roles remain aligned despite arbitrary reboot order
```

---

## 3. IP Addressing Plan (Field-1 Annotations)

Same as base Day-52 lab, with annotations:

| VLAN | Network | DSW1 SVI | DSW2 SVI | HSRP VIP |
|---|---|---|---|---|
| VLAN 10 | 10.0.10.0/24 | 10.0.10.252 | 10.0.10.253 | 10.0.10.254 |
| VLAN 20 | 10.0.20.0/24 | 10.0.20.252 | 10.0.20.253 | 10.0.20.254 |

**Field-1 Annotations:**
- SVI addresses must survive power loss → stored in startup-config, not learned dynamically
- HSRP priorities must be explicit and persistent → no auto-negotiation from external config server
- VLAN interface IPs used for recovery verification (ping each SVI from local CLI after reboot)

---

## 4. Configuration (Field-1 Optimizations)

### 4.1 VLAN 10 HSRP (DSW1 as Active) — with persistence

```text
DSW1(config)#interface vlan 10
DSW1(config-if)#ip address 10.0.10.252 255.255.255.0
DSW1(config-if)#standby 10 ip 10.0.10.254
DSW1(config-if)#standby 10 priority 150
DSW1(config-if)#standby 10 preempt
DSW1(config-if)#exit
```

**Explanation for Field-1:**
- `standby 10 priority 150`: Higher priority guarantees DSW1 becomes active for VLAN 10 even after a random reboot order (lower priority values on DSW2 will defer to this).
- `standby 10 preempt`: After reboot, DSW1 automatically reclaims its active role if DSW2 (which was active during outage) is still running. This ensures automatic recovery of intended state after power event.
- **Black Start proof obligation:** These settings must be in `startup-config` (not dynamic). Verify with `show startup-config | include standby`.

### 4.2 VLAN 20 HSRP (DSW2 as Active) — with persistence

```text
DSW2(config)#interface vlan 20
DSW2(config-if)#ip address 10.0.20.253 255.255.255.0
DSW2(config-if)#standby 20 ip 10.0.20.254
DSW2(config-if)#standby 20 priority 150
DSW2(config-if)#standby 20 preempt
DSW2(config-if)#exit
```

**Explanation:** DSW2 owns VLAN 20's active role; opposite priority applied on DSW1 below.

### 4.3 VLAN 10 STP Root (DSW1 Primary) — with priority backup

```text
DSW1(config)#spanning-tree vlan 10 root primary
! Sets DSW1's priority to 24576 for VLAN 10 (lowest wins STP election)

DSW2(config)#spanning-tree vlan 10 root secondary
! Sets DSW2's priority to 28672 for VLAN 10 (standby priority)
```

**Explanation for Field-1:**
- `root primary` on DSW1 explicitly makes it the root for VLAN 10 by setting lowest-wins priority (24576 < 28672 on DSW2).
- Both values are stored in NVRAM and survive power loss.
- STP convergence after reboot is fast because priorities are pre-set consistently.

### 4.4 VLAN 20 STP Root (DSW2 Primary) — with priority backup

```text
DSW2(config)#spanning-tree vlan 20 root primary
DSW1(config)#spanning-tree vlan 20 root secondary
```

### 4.5 Save Configuration to Persistent Storage

```text
DSW1(config)#exit
DSW1#write memory
! OR: DSW1# copy running-config startup-config

DSW2(config)#exit
DSW2#write memory
```

**Critical for Field-1:** Without this step, the HSRP priorities and STP root settings are in `running-config` only. If power is lost, a reboot reads `startup-config`, which may lack these settings entirely, causing misalignment.

---

## 5. Field-1 Verification Steps

### 5.1 Pre-Power-Loss Alignment

Before simulating a power event, verify that both protocols agree on roles:

```text
DSW1#show standby vlan 10
Standby Group 10 - State is Active
  Virtual IP address is 10.0.10.254
  Active virtual mac address is 0000.0c07.ac0a
  Active router is local (DSW1)
  
DSW1#show spanning-tree vlan 10
VLAN0010
  Spanning tree enabled protocol rstp
  Root ID    Priority  24576
             Address   aabb.cc00.1000
             This bridge is the root
```

**Expected:** DSW1 shows "Active" for HSRP VLAN 10 and "This bridge is the root" for STP VLAN 10. Both lines point to DSW1.

### 5.2 Simulate Power Loss

```text
DSW1# (power off or reload without saving)
DSW2# (power off or reload without saving)

[Wait ~5 seconds, then reboot in this order:]
DSW1# (reboot first)
[Wait for DSW1 to fully boot: HSRP and STP are re-running configuration from startup-config]

DSW2# (reboot second, ~30 seconds after DSW1 boot)
[Wait for DSW2 to fully boot and join the topology]
```

### 5.3 Post-Reboot Alignment Verification

Once both switches are up, verify roles are *still* synchronized:

```text
DSW1#show standby vlan 10 brief
Group  Interface   Ip Address      State   Active router
10     Vlan10      10.0.10.254     Active  local

DSW1#show spanning-tree vlan 10 root
                                       Root Hello Max Fwd
Vlan             Root ID    Cost     Port  Time Age Dly
VLAN0010     24576 aabb.cc00.1000 0        This bridge is the root

DSW2#show standby vlan 20 brief
Group  Interface   Ip Address      State   Active router
20     Vlan20      10.0.20.254     Active  local

DSW2#show spanning-tree vlan 20 root
                                       Root Hello Max Fwd
Vlan             Root ID    Cost     Age  Age Dly
VLAN0020     24576 aabb.cc00.2000 0        This bridge is the root
```

**PROOF OBLIGATION PASS:** After reboot in any order, DSW1 is HSRP-active AND STP-root for VLAN 10; DSW2 is HSRP-active AND STP-root for VLAN 20. Roles remain aligned without external intervention.

### 5.4 Verify Configuration Persistence

```text
DSW1#show startup-config | include standby
 standby 10 priority 150
 standby 10 preempt
 
DSW1#show startup-config | include "spanning-tree vlan 10"
 spanning-tree vlan 10 root primary
```

**Field-1 Requirement:** Both HSRP and STP settings appear in `startup-config`, proving they survive power loss.

---

## 6. Expected Output Gallery (Field-1 Scenarios)

### After Cold Boot (DSW1 first, DSW2 second)

```
[DSW1 boots first]
DSW1#show standby vlan 10
Standby Group 10 - State is Active
  This router is active (preempt enabled, will regain role when DSW2 boots)

[DSW2 boots ~30 seconds later]
DSW2#show standby vlan 10
Standby Group 10 - State is Standby
  Active router is 10.0.10.252 (DSW1)
  
DSW1#show standby brief
P = configured to preempt, p = preempting with delay, * = none

Interface   Grp Prio P State    Active          Standby         Virtual IP
Vlan10      10  150  P Active   local           10.0.10.253     10.0.10.254
Vlan20      20  100  P Standby  10.0.20.253     local           10.0.20.254

DSW2#show standby brief
P = configured to preempt, p = preempting with delay, * = none

Interface   Grp Prio P State    Active          Standby         Virtual IP
Vlan10      10  100  P Standby  10.0.10.252     local           10.0.10.254
Vlan20      20  150  P Active   local           10.0.20.252     10.0.20.254
```

**Interpretation:** Even though reboot order was arbitrary (DSW1 first), both switches quickly converge to their designed roles: DSW1 active for VLAN 10, DSW2 active for VLAN 20. Preemption ensures DSW1 reclaims VLAN 10 once fully online.

---

## 7. Common Field-1 Mistakes

1. **Forgetting `write memory` after configuration** → Settings in running-config only; power loss wipes them. Next reboot uses default STP priorities (random election) and HSRP fails to start (no configured priority). Symptoms: Post-reboot output shows random/unwanted active/root assignments.
   - **Fix:** Always `copy running-config startup-config` (or `write memory`) before testing power loss.

2. **Configuring HSRP but not STP (or vice versa)** → One protocol aligns but the other doesn't. DSW1 might be HSRP-active but not STP-root, causing traffic to take suboptimal inter-switch paths even after reboot.
   - **Fix:** Verify both `show standby` and `show spanning-tree` output for every VLAN after reboot; they must *both* show the intended primary switch.

3. **Opposite priority directions** → Setting HSRP priority to 100 on DSW1 and 100 on DSW2 (same value) causes neither to be reliably active. Or setting HSRP priority higher on the standby switch by accident.
   - **Fix:** For VLAN 10 with DSW1 as primary, use `priority 150` on DSW1 and default (100) on DSW2. Double-check `show standby vlan 10` shows "Active" on DSW1 *before* simulating power loss.

4. **Testing reboot order bias** → Only testing "DSW1 reboots first" but not "DSW2 reboots first" means you miss the preemption logic. Preemption allows DSW1 to reclaim its active role even if DSW2 was active during the outage.
   - **Fix:** Repeat power-loss simulation at least twice with different reboot orders (DSW1 first, then DSW1 second). Both should converge to the intended state.

---

## 8. Troubleshooting by Field-1 (Diagnostic Method)

**Symptom: "After reboot, HSRP active/standby are correct, but STP root is wrong"**

```text
Step 1: Is the spanning-tree configuration in startup-config?
  show startup-config | include "spanning-tree vlan 10"
  → If absent, only running-config has it; power loss loses it. Reconfigure and `write memory`.

Step 2: What is each switch's bridge priority for VLAN 10?
  show spanning-tree vlan 10 | include "This bridge"
  → If DSW2 shows a lower priority than DSW1, DSW2 became root (incorrect). 
    Verify `spanning-tree vlan 10 root primary` is on DSW1, not DSW2.

Step 3: Did STP converge after reboot?
  show spanning-tree vlan 10 | include "Port state"
  → If any port is in "blocking" state and shouldn't be, STP is still converging. 
    Wait ~30 seconds, then re-check. Bridge priorities may need adjustment.

Step 4: Are timers consistent across both switches?
  show spanning-tree vlan 10 | include "Hello"
  → If DSW1 shows Hello=2, DSW2 shows Hello=4, they disagreed during reboot. 
    Likely cause: startup-config was cleared on one switch (e.g., accidental `default` command). 
    Reconfigure STP root on both and save.
```

**Symptom: "After reboot, HSRP is correct, but the switches don't see each other (no hello packets)"**

```text
Step 1: Is the HSRP VLAN interface up?
  show ip interface brief | include vlan 10
  → If status is "down", the SVI is not active. Verify VLAN 10 exists and is on the trunk.

Step 2: Can each switch ping its own SVI?
  ping 10.0.10.252 (from DSW1)
  ping 10.0.10.253 (from DSW2)
  → If this fails, the SVI is misconfigured or the VLAN interface isn't active.

Step 3: Are SVIs configured in startup-config?
  show startup-config | include "interface vlan"
  → If missing, the SVI won't come up after reboot. Reconfigure and save.

Step 4: Is the trunk link up between DSW1 and DSW2?
  show interfaces trunk | include "on trunking"
  → If the trunk is down, HSRP hellos don't cross; each switch thinks it's the only one (both active). 
    Verify trunk configuration and link status.
```

---

## 9. Design Analysis: Field-1 Reasoning

**Why does this field-specific topology matter for Black Start?**

Traditional HSRP and STP assume continuous operation with dynamic learning. HSRP neighbors exchange hellos every 3 seconds by default; if a switch boots during a power outage, it joins the topology fresh and learns the active/standby roles through these hellos. However, in a scenario where both switches lose power, there's a "blind window" where neither can communicate — they reboot independently, loading configuration from persistent storage (startup-config), and then reconnect.

If HSRP priorities and STP root designations are not *explicitly* stored in startup-config, each switch reverts to defaults:
- HSRP defaults to priority 100 (both switches equal — role is random/timing-based)
- STP defaults to priority 32768 (highest numeric value — arbitrary root election)

This Field-1 variant proves that **explicit persistence + preemption = automatic alignment after arbitrary power loss**. No external coordinator, no manual intervention — just "save your configuration, trust the design, reboot." This is essential for Haiti P45, where island-wide power events are predictable and acceptable, but the network must auto-stabilize afterward.

---

## 10. Real-World Parallel: Haiti Deployment Phase

**P45 Expansion — Multi-Site Redundancy**

In the P45 pilot (50–200 node islands across multiple zones), each zone has two distribution switches mirroring this topology. During a geomagnetic storm, grid power fails across the entire zone simultaneously. UPS systems provide 10–15 minutes of continued operation; generators kick in but need time to stabilize.

During this window:
1. Both distribution switches are powered (UPS active) but cannot communicate with external systems (grid down, internet offline).
2. One or both switches may reboot (UPS battery drained, or deliberate ordered shutdown).
3. When power is restored, generators come online, and the switches reboot in an indeterminate order.

This lab proves the distribution-layer topology can recover to its intended state (both switches correctly paired for their VLANs) within 5 minutes of power restoration, without any manual CLI intervention. The configuration must survive the full power-loss window: startup-config must contain everything needed to re-establish HSRP active/standby and STP root/secondary roles.

---

## 11. Stretch Goals: Advanced Proof Obligations

1. **Formal proof of convergence:** Using TLA+ or Alloy, model the HSRP/STP state machine and prove that regardless of reboot order, the network converges to the intended state (DSW1 active+root for VLAN 10, DSW2 for VLAN 20) within 120 seconds.

2. **Byzantine node testing:** Simulate DSW1 sending forged STP BPDUs claiming to be the root for VLAN 20 (which it shouldn't be). Verify that DSW2's persistent STP `root secondary` configuration and the base design correctly reject this and maintain the actual root.

3. **NVRAM corruption scenario:** Simulate accidental `default` command on one switch's HSRP configuration, corrupting startup-config. Measure how long until the misaligned state is detected (via monitoring `show standby brief` polls) and corrected (manual reload of backup config or re-entry of commands).

4. **Failover timing under power constraints:** With UPS providing only 30 seconds of runtime, measure HSRP failover time during a scheduled shutdown sequence where both switches lose power within 2 seconds of each other. Verify reboot order doesn't matter for final state alignment.

---

## 12. Self-Assessment (Field-1 BSL)

```
BSL-0 AWARENESS      - You've read this lab once. You couldn't replicate it without the manual open.
BSL-1 LAB CAPABLE    - You completed this lab with the manual open; power-loss test worked.
BSL-2 OFFLINE        - You could repeat this lab with the manual, no internet. You remember to `write memory`.
BSL-3 RECOVERABLE    - You could rebuild this lab from the topology diagram only; given power-loss scenarios, 
                        you'd know exactly what to test (preemption, startup-config persistence).
BSL-4 MAINTAINABLE   - You could modify this lab for a 3-switch scenario (3 VLANs, load-balanced across all 3)
                        and still ensure post-reboot alignment without external coordination.
BSL-5 TEACHABLE      - You could teach why HSRP priority direction is opposite to STP priority, 
                        and why both must be persistent in startup-config for Black Start resilience.

Target BSL for this lab: 3–4
```

---

**Push this file via Python payload JSON to RedjiJB-Labs/Day-52-Field-1-Lab.md**
