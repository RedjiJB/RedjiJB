# Day 17 — RSTP: Root Bridge Behavior and Link Types
## Field-2 Variant: Geomagnetic Resilience & Fast Convergence Under Stress

---

## 0. Metadata

**Field Focus:**      Field 2:

**Core Proof Obligation:** RSTP P2p-link convergence remains < 5 seconds even under simulated geomagnetic stress (20% latency jitter, 5% packet loss).

**Haiti Deployment Phase:** P38 pilot (mesh-convergence module); geomagnetic-stress validation required before deployment.

**Estimated Time:** 60–90 minutes

**Difficulty:** Intermediate/Advanced

**Relationship to Base Lab:** Same RSTP protocol and link-type classification; different topology (4 branches instead of 2) and stress-injection points for realistic geomagnetic failure simulation.

**Prerequisite:** Complete Day-17-Lab-Manual (base RSTP lab) first. Familiarity with GNS3 stress-injection tools (Linux `tc` command) or equivalent.

---

## 1. Business Context (Field-Specific Framing)

The base Day-17 lab proves RSTP converges correctly under ideal conditions. But production networks don't experience ideal conditions. Geomagnetic storms cause measurable jitter (±20% latency variance) and packet loss (5%) on long-distance RF links. Haiti's P38 mesh will operate across 15+ hotspots distributed across terrain with varying atmospheric and geomagnetic conditions. This lab proves that RSTP's fast-convergence benefits (sub-second P2p recovery) survive geomagnetic stress, unblocking deployment of time-critical mesh topology updates.

**Success criteria:**
- RSTP detects link failure within 10 seconds under 20% jitter + 5% loss
- P2p links re-converge to Forwarding within 5 seconds after failure recovery
- Convergence time variance < 2 seconds (proof that jitter doesn't destabilize convergence)

---

## 2. Topology Diagram (Field-2 Stress Topology)

```
                        [GEOMAGNETIC STRESS INJECTOR]
                         (20% latency jitter, 5% loss)
                                    |
                                    v
        ┌─────────────┐      ┌─────────────┐
        │  NY-Switch  │◄────►│ Tokyo-Switch│
        │  (Root)     │  P2p │  (Alternate)│
        └─────────────┘      └─────────────┘
              │                      │
              │ P2p edge             │ P2p edge
              │                      │
        ┌─────────────┐      ┌─────────────┐
        │ Mumbai-SW   │      │ Sydney-SW   │
        │ (Alternate) │      │ (Alternate) │
        └─────────────┘      └─────────────┘
              │                      │
         [10 PCs]                [10 PCs]

[FIELD-2 MODIFICATIONS from base Day-17:]
- 4 switches instead of 2 (NY, Tokyo, Mumbai, Sydney) to test multi-branch convergence
- NYC ↔ Tokyo link: jitter injector active (simulates geomagnetic-induced packet loss)
- NYC ↔ Mumbai link: jitter injector active (alternative failover path)
- Tokyo ↔ Sydney link: jitter injector active (mesh closure)
- All three links start active; when NYC ↔ Tokyo fails, mesh should re-converge via
  alternate paths (NYC→Mumbai→Tokyo or NYC→Mumbai→Sydney→Tokyo)
- Each "JITTER INJECTOR" point uses Linux tc (traffic control) to add:
  * 20% latency variance (base 10ms becomes 8-12ms with ±20% jitter)
  * 5% random packet loss
  * 1% duplication (to test packet-loss handling in BPDU transmission)
```

---

## 3. IP Addressing Plan (Field-2 Annotations)

```
Switched VLANs (Layer 2, loop-prevention focus):
VLAN 1 (default): All switches, for RSTP/STP BPDUs
  └─ No IP addressing needed; RSTP operates at Layer 2
  └─ Annotation: RSTP convergence must work before L3 routing; no OSPF timers mask slow L2 convergence

PC-to-Switch Links:
NYC:     Fa0/1–0/10 (PCs 1–10)        [Edge ports, Portfast enabled]
Tokyo:   Fa0/1–0/10 (PCs 11–20)       [Edge ports, Portfast enabled]
Mumbai:  Fa0/1–0/10 (PCs 21–30)       [Edge ports, Portfast enabled]
Sydney:  Fa0/1–0/10 (PCs 31–40)       [Edge ports, Portfast enabled]

Switch-to-Switch P2p Links:
NYC ↔ Tokyo:      Gi0/1–0/1  [P2p, explicit link-type, STRESS-INJECTED]
  └─ Annotation: Primary mesh path; geomagnetic stress impacts this link hardest;
     convergence time measured here
NYC ↔ Mumbai:     Gi0/2–0/2  [P2p, explicit link-type, STRESS-INJECTED]
  └─ Annotation: Secondary mesh path; stress-injection validates failover still converges fast
Tokyo ↔ Sydney:   Gi0/1–0/1  [P2p, explicit link-type, STRESS-INJECTED]
  └─ Annotation: Mesh closure; three-way convergence complexity; all links stressed
```

---

## 4. Configuration (Field-2 Stress Optimizations)

### 4.1 RSTP Core Configuration (All Switches)

```
! Rapid Spanning Tree Protocol (RSTP 802.1w)
spanning-tree mode rapid-pvst

! Set priority for root election (NY is root; 4096 < others at 32768)
spanning-tree vlan 1 priority 4096

! Enable Rapid PVST on all VLANs
spanning-tree rapid-pvst vlan 1

! Global timers: tighter than base to handle jitter
! Geomagnetic stress increases BPDU loss; aggressive timers ensure faster detection
spanning-tree pathcost method short

! Set forward delay to 15 sec (default) to allow for stress-induced delays
spanning-tree vlan 1 forward-time 15
```

**Explanation:** Rapid PVST with aggressive timers (not extended timers) allows BPDU loss up to ~5% without missing convergence windows. If timers were too loose (40+ second dead interval), a 5% loss rate could cause missed BPDUs and delayed convergence under stress.

### 4.2 P2p Link Configuration (Switch Interfaces)

#### NYC Switch
```
! Gi0/1: P2p link to Tokyo (PRIMARY STRESS-TESTED PATH)
interface Gi0/1
 description P2p to Tokyo-Switch
 spanning-tree link-type point-to-point
 spanning-tree port priority 128
 ! BPDU Guard NOT enabled (we're testing convergence, not edge security)
 no shutdown

! Gi0/2: P2p link to Mumbai (SECONDARY FAILOVER PATH)
interface Gi0/2
 description P2p to Mumbai-Switch
 spanning-tree link-type point-to-point
 spanning-tree port priority 128
 no shutdown

! Fa0/1–0/10: PC-facing edge ports
interface range Fa0/1 – 0/10
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
```

**Explanation (Field-2 specific):** Link-type must be explicit (P2p) so RSTP can use proposal/agreement fast-convergence, not timer-based delay. If link type were Shared (or auto-detected as Shr due to loss-induced state confusion), RSTP would fall back to 30-second Forward Delay — defeating the purpose of the Field-2 stress test.

#### Tokyo, Mumbai, Sydney Switches
```
! Similar configuration to NYC, but with local peer interfaces and port priorities
! Shared port priority across branches ensures consistent Designated/Alternate role
! assignment even under jitter (no role thrashing due to transient metric changes)
```

### 4.3 Stress Injection (Linux tc on Management Network)

**On the GNS3 host, inject latency/loss on NYC→Tokyo vswitch pair:**

```bash
#!/bin/bash
# Field-2 stress injection script
# Simulates geomagnetic-induced jitter and loss

TC=/sbin/tc
IFACE_NYC="veth-nyc"      # Virtual interface to NYC switch in GNS3
IFACE_TOKYO="veth-tokyo"  # Virtual interface to Tokyo switch

# Clear any existing qdisc
$TC qdisc del dev $IFACE_NYC root 2>/dev/null
$TC qdisc del dev $IFACE_TOKYO root 2>/dev/null

# Add qdisc with geomagnetic-stress parameters:
# - base latency 10ms (typical WAN link)
# - jitter ±20% of base (2ms jitter range)
# - loss 5% (geomagnetic-induced packet drops)
# - duplication 1% (multipath effects under ionospheric disturbance)

$TC qdisc add dev $IFACE_NYC root netem \
  delay 10ms 2ms distribution normal \
  loss 5% \
  duplicate 1%

$TC qdisc add dev $IFACE_TOKYO root netem \
  delay 10ms 2ms distribution normal \
  loss 5% \
  duplicate 1%

echo "Geomagnetic stress injection active:"
$TC qdisc show dev $IFACE_NYC
$TC qdisc show dev $IFACE_TOKYO
```

**Explanation (Field-2):** The 5ms jitter (±2ms on a 10ms base) mirrors real geomagnetic storm conditions observed during NOAA space-weather events. The 5% loss rate is conservative (actual geomagnetic storms can cause 10% loss); this proves RSTP works even under half the worst-case. Duplication (1%) adds to the stress by forcing RSTP to handle out-of-order/duplicate BPDUs.

---

## 5. Field-Specific Verification Steps

### Step 1: Establish Baseline Convergence (No Stress)

```
1.1  Power up all four switches in order: NYC (root), Tokyo, Mumbai, Sydney
1.2  Wait 60 seconds for RSTP election to complete
1.3  Verify root bridge (should be NYC):
     NYC# show spanning-tree
       → Root ID: 4096.aaaa.bbbb.cccc (THIS SWITCH)
     Tokyo# show spanning-tree
       → Root ID: 4096.aaaa.bbbb.cccc (NYC's MAC)
1.4  Record port roles on Tokyo (should have Designated on NYC link, Alternate on Mumbai link):
     Tokyo# show spanning-tree interface
       → Gi0/2 (to NYC): Role: Designated, State: Forwarding
       → Gi0/1 (to Mumbai): Role: Alternate, State: Blocking
1.5  Note convergence time in startup console log (from reboot to first FULL neighbor state)
     Baseline convergence time: ~20–30 seconds (no stress)
```

### Step 2: Activate Geomagnetic Stress Injection

```
2.1  On the GNS3 host, run the stress injection script (from Section 4.3)
     $ sudo bash field2_stress.sh
     Verify output shows netem qdisc active on both NYC and Tokyo interfaces
2.2  Wait 10 seconds for kernel to apply stress parameters
2.3  Verify stress is active (should see latency, loss, duplication in tc output):
     $ tc -s qdisc show dev veth-nyc
       Sent N bytes, N packets (dropped N, overlimits N requeues N)
     → Verify "dropped" count increases (confirms loss is being injected)
```

### Step 3: Induce Primary Link Failure (Under Stress)

```
3.1  On NYC switch, shut down the stressed primary link:
     NYC(config)# interface Gi0/1
     NYC(config-if)# shutdown
     ! Record timestamp T_failure = NOW

3.2  Monitor convergence on both sides:
     NYC(config)# show spanning-tree interface Gi0/2
       → Watch port transition from Alternate (Blocking) to Designated (Forwarding)
         Should take < 5 seconds under Field-2 stress
       → Record timestamp T_alternate_forwarding when Gi0/2 enters Forwarding
       → ΔT_convergence_NYC = T_alternate_forwarding - T_failure
         PASS if < 5s, FAIL if ≥ 5s

     Tokyo(config)# show spanning-tree
       → Watch neighbor state change (should show Root port changing)
       → Record timestamp T_tokyo_converged when Tokyo shows new shortest path
         PASS if < 5s, FAIL if ≥ 5s

3.3  Verify connectivity via alternative path:
     NYC# ping 10.0.2.1  (Mumbai)
     → Should succeed after convergence completes
     Tokyo# ping 10.0.1.1  (NYC via Mumbai)
     → Should succeed after convergence completes

3.4  Allow 30 seconds stabilization; verify no role thrashing:
     NYC# show spanning-tree interface | grep -i transition
     → Should show 0 or 1 transition events (not 3+, which would indicate thrashing)
```

### Step 4: Link Recovery (Critical Proof for Geomagnetic)

```
4.1  Re-enable the primary link (which has now recovered):
     NYC(config-if)# no shutdown
     ! Record timestamp T_recovery = NOW

4.2  Monitor re-convergence under stress:
     NYC(config)# show spanning-tree interface Gi0/1
       → Gi0/1 should return to Designated, Gi0/2 should return to Alternate
       → Record timestamp T_primary_returned when Gi0/1 shows Forwarding again
       → ΔT_recovery = T_primary_returned - T_recovery
         PASS if < 5 seconds (proves fast re-convergence even under stress)

4.3  Verify no transient forwarding loops:
     Use tcpdump on a management PC or Wireshark to capture BPDUs during recovery
     → Should see BPDU rate increase (more frequent hellos during transition)
     → Should NOT see conflicting BPDUs (e.g., Designated port claiming Root from two sources)

4.4  Run convergence test 5 times total:
     Repeat Steps 3 & 4 five times, recording ΔT_convergence and ΔT_recovery each time.
     Record min, max, average:
       Min convergence: _____ (should be 2–3 seconds)
       Max convergence: _____ (should be < 5 seconds even at worst case)
       Avg convergence: _____ (should be 3.5–4 seconds)
```

### Step 5: Mesh Complexity Test (Three-Way Convergence)

```
5.1  Fail two of three primary mesh links (NYC↔Tokyo, Tokyo↔Mumbai):
     NYC(config)# int Gi0/1
     NYC(config-if)# shutdown
     ! (This severs NYC from Tokyo directly)

     NYC(config)# int Gi0/2
     NYC(config-if)# shutdown
     ! (This severs NYC from Mumbai directly)

5.2  Verify all four switches still converge:
     Tokyo# show spanning-tree
       → Should find NYC via Sydney→Mumbai→NYC or Sydney→NYC (if Sydney↔NYC link exists)
       → Record convergence time

5.3  Under stress, with both links down, convergence may take up to 10 seconds (2–3 hops).
     This is acceptable for Field-2; documents the tradeoff: "mesh resilience costs time at scale."
```

---

## 6. Expected Output Gallery (Field-2 Stress Scenarios)

### 6.1 Baseline Topology State (No Stress, All Links Active)

```
NYC# show spanning-tree
VLAN0001
  Spanning tree enabled protocol rstp
  Root ID Priority 4096 Address aaaa.bbbb.cccc
  This bridge is the root
  Hello time 2, Forward delay 15, Max age 20

Interface           Role PortPri.Nbr Type       Edge Root Guard LoopGuard
 ─────────────────────────────────────────────────────────────────────────
 Gi0/1               Desig 128.1    P2p        -    -    -      -
 Gi0/2               Desig 128.2    P2p        -    -    -      -
 Fa0/1–0/10         Edge  128.3–12  P2p Edge   Yes  -    -      -

[Interpretation (Field-2): NYC is Root. Both Gi0/1 and Gi0/2 are Designated (NYC sends
 BPDUs to Tokyo and Mumbai). All PC-facing ports are Edge (immediate forwarding on link-up).]

Tokyo# show spanning-tree
VLAN0001
  Spanning tree enabled protocol rstp
  Root ID Priority 4096 Address aaaa.bbbb.cccc [NYC]
  Root port is Gi0/2 (cost 4)
  Hello time 2, Forward delay 15, Max age 20

Interface           Role PortPri.Nbr Type       Edge Root Guard LoopGuard
 ─────────────────────────────────────────────────────────────────────────
 Gi0/2               Root 128.2    P2p        -    -    -      -
 Gi0/1               Altn 128.1    P2p        -    -    -      -
 Fa0/1–0/10         Edge  128.3–12  P2p Edge   Yes  -    -      -

[Interpretation (Field-2): Tokyo has Gi0/2 as Root port (toward NYC). Gi0/1 (toward
 Mumbai) is Alternate/Blocked — it's a loop-back path that RSTP blocks. All PCs are Edge.]

Mumbai# show spanning-tree
[Similar to Tokyo: Root port to NYC, Alternate block on Sydney]

Sydney# show spanning-tree
[Periphery: all links are either Alternate (blocked) or Designated (edge)]
```

### 6.2 During Link Failure Under Geomagnetic Stress

```
[T_failure + 2 seconds]
NYC# show spanning-tree interface Gi0/1
Gi0/1 is down
 [RSTP detects link down; propagates topology change BPDU]

[T_failure + 3.5 seconds]
NYC# show spanning-tree interface Gi0/2
Gi0/2                Desig 128.2    P2p        -    -    -      -
 [Gi0/2 transitions from Alternate to Designated/Forwarding: convergence complete]

Tokyo# show spanning-tree interface Gi0/2
Gi0/2                Root 128.2    P2p        -    -    -      -
 [Tokyo still sees NYC as root; link is still forwarding]

Tokyo# show spanning-tree interface Gi0/1
Gi0/1 is down (temporary, until recovery)

[Interpretation (Field-2): Convergence completed in ~3.5 seconds under 20% jitter + 5% loss.
 PASS: < 5 seconds]
```

### 6.3 Link Recovery Under Stress (Re-Convergence)

```
[T_recovery + 0.5 seconds]
NYC(config-if)# no shutdown
[Gi0/1 comes up; RSTP negotiates with Tokyo]

[T_recovery + 1.0 second]
NYC# show spanning-tree interface Gi0/1
Gi0/1 is down, line protocol is up(config)
 [Link physical state OK, but STP is still initializing]

[T_recovery + 2.5 seconds]
NYC# show spanning-tree interface Gi0/1
Gi0/1                Desig 128.1    P2p        -    -    -      -
 [RSTP elected Gi0/1 as Designated again; Tokyo should have Root port re-pointing here]

[T_recovery + 3.0 seconds]
Tokyo# show spanning-tree interface Gi0/2
Gi0/2                Root 128.2    P2p        -    -    -      -
 [Root port back on Gi0/2; Gi0/1 back to Alternate]

[Interpretation (Field-2): Link recovered and re-converged in 2.5–3.0 seconds under stress.
 PASS: < 5 seconds. Proves geomagnetic glitches (link drop + recovery) don't destabilize mesh.]
```

---

## 7. Common Field-2 Mistakes

1. **Timers too aggressive (hello 1 sec, dead 4 sec):** Under 5% packet loss, 1-in-20 hellos are lost. Aggressive timers mean every ~20 hellos, one is lost; this can trigger false-positive topology changes. Use 2 sec hello / 6 sec dead (Cisco defaults) or 5 sec hello / 15 sec dead for lossy links.

2. **Forgetting to configure link-type P2p explicitly:** If link-type is auto-detected as "Shared" due to jitter-induced confusion, RSTP falls back to 30-second timer-based convergence, making the stress test fail. Always explicitly set `spanning-tree link-type point-to-point`.

3. **Stress injection too aggressive (50% loss):** Field-2 targets 5% loss, not 50%. Too much stress causes cascading BPDU failures and topology thrashing (role changes every second). Dial stress to match real geomagnetic events (5–20% loss range).

4. **Not accounting for multi-hop delay:** In a 3-hop mesh (NYC→Mumbai→Tokyo), convergence takes longer. Field-2 tests two-hop (NYC↔Tokyo via Mumbai); allow up to 10 seconds for 3+ hops. Don't expect < 5 seconds on distant leaf nodes.

5. **Forgetting to re-enable stress injection between test runs:** After each iteration, the stress script may time out. Re-run the tc commands to re-activate loss injection before the next test cycle.

---

## 8. Troubleshooting by Field (Diagnostic Method)

### Problem: Convergence takes > 5 seconds even without jitter

```
Step 1: Is the primary link actually P2p?
  NYC# show spanning-tree interface Gi0/1
  → Type should be "P2p", not "Shr" (Shared)
  → If "Shr", RSTP uses 30-second timer-based convergence (not fast proposal/agreement)
  FIX: spanning-tree link-type point-to-point

Step 2: Are BPDUs actually reaching the far-end switch under stress?
  Activate debug: NYC# debug spanning-tree events
  → Should see BPDU transmit/receive logs
  → If receiving 5% fewer BPDUs (due to loss injection), this is expected
  → If receiving 0 BPDUs on the primary link, link-layer connectivity is broken
  FIX: Check link physical status (show interface Gi0/1)

Step 3: Are hello timers appropriate for the jitter level?
  NYC# show spanning-tree interface Gi0/1
  → "Hello" time should be ≥ 2 seconds (default)
  → If hello = 1 second, loss of 1 in 20 hellos means topology thrash
  FIX: Set timers to: spanning-tree vlan 1 hello-time 2

Step 4: Is the alternative path even available?
  Show all interfaces: show spanning-tree
  → If Gi0/2 is not in the output, it's not configured
  FIX: Configure Gi0/2 as P2p: spanning-tree link-type point-to-point
```

### Problem: Convergence succeeds 4/5 times, fails 1/5 times (intermittent)

```
Step 1: Is the stress injection parameter set correctly?
  On GNS3 host: tc -s qdisc show dev veth-nyc
  → Check "dropped" counter is incrementing (loss is active)
  → If counter static, stress is not active; re-run field2_stress.sh
  FIX: $ sudo bash field2_stress.sh

Step 2: Is jitter distribution appropriate?
  netem with distribution normal ±20% should create variance, not just flat loss.
  If convergence time ranges from 2–8 seconds (high variance), jitter may be too aggressive.
  FIX: Reduce jitter to ±10%: delay 10ms 1ms distribution normal

Step 3: Is stress being injected on both ends of the link?
  Remember: stress should be symmetrical (both directions)
  One-way stress (NYC→Tokyo) won't catch asymmetric convergence issues.
  FIX: Apply netem qdisc to both interfaces (NYC and Tokyo sides)
```

### Problem: RSTP roles keep changing (thrashing)

```
Step 1: Are multiple topology change BPDUs arriving out of order?
  Enable debug: show spanning-tree events
  → If you see "role change" logs more than 3 times per 30 seconds, thrashing is happening
  FIX: Increase hello interval: spanning-tree vlan 1 hello-time 5

Step 2: Is there a loop or transient forwarding in the topology?
  Use tcpdump to capture BPDUs; check if one switch sends conflicting BPDUs
  FIX: Verify manual link-type configuration (no auto-detection during stress)

Step 3: Is the stress injection rate changing mid-test?
  If tc script times out or restarts, loss rate may spike temporarily
  FIX: Wrap stress script in a loop to restart it every 30 seconds
```

---

## 9. Design Analysis: Field-2 Reasoning

Traditional RSTP deployments assume jitter ≤ 5% and packet loss ≤ 1%. This design explicitly tests convergence under doubled stress (20% jitter, 5% loss), representing realistic geomagnetic-storm conditions on RF links. Why does this matter?

Haiti's P38 mesh operates across distributed hotspots connected by RF (WiFi, LoRa, radio). Geomagnetic storms (which occur monthly, intensifying at solar maximum) degrade RF link quality: latency becomes bursty, packet loss increases, and jitter spikes. Traditional convergence timing assumptions (15–30 seconds) were designed for wired links with << 1% loss. This lab proves RSTP can achieve sub-5-second convergence even when loss is 5x higher.

The topology choice (4 switches instead of 2) forces RSTP to calculate port roles across a mesh, not a simple star. When the primary NYC↔Tokyo link fails, RSTP must immediately consider the alternative path via Mumbai. This tests whether RSTP's proposal/agreement mechanism (which requires bidirectional synchronization) survives transient loss of sync BPDUs. If it does, deployment can proceed confident that geomagnetic glitches won't cascade into network partition.

---

## 10. Real-World Parallel: Haiti P38 Mesh Deployment

In P38 (Q4 2026), Haiti's core mesh will operate with 15+ hotspots across mountainous terrain. Each link has an estimated failure rate of 5–10 per month (mostly geomagnetic or atmospheric). The mesh must detect and re-converge within 5 seconds, or users experience > 3-second latency perception.

This lab variant feeds directly into the P38 design: RSTP convergence benchmarks (< 5 seconds under geomagnetic stress) validate that when a link fails and recovers, the mesh automatically adapts without manual intervention. Without this proof, operators would over-provision backup links or require constant manual topology management. With this proof, P38 deployment can proceed with a single primary + one hot-standby link per branch, saving cost and complexity.

**P38 Integration Point:** mesh-convergence module, link-failure detection task
**Validation Gate:** Day-17-Field-2 proof complete before P38 routing design is frozen (Q3 2026)

---

## 11. Stretch Goals: Advanced Proof Obligations

1. **Formal model check RSTP convergence logic against geomagnetic-jitter model:**
   - Use TLA+ to model BPDU transmission, loss, and reordering
   - Prove that no sequence of packet losses ≤ 5% can cause RSTP to fail to converge
   - Prove convergence time is bounded by max(2 × hello interval, 10s)

2. **Run convergence-time benchmarks against ESA Swarm geomagnetic-field model:**
   - Map real geomagnetic disturbances (from NOAA SWPC) to latency/loss parameters
   - Simulate this lab with realistic geomagnetic-storm parameters
   - Quantify: "During a Kp=7 geomagnetic storm, RSTP converges in X seconds"

3. **Prove Byzantine resilience:**
   - Introduce a Byzantine switch that sends conflicting BPDUs (claiming to be root)
   - Verify that RSTP quorum (3/4 switches) can detect and isolate the Byzantine node
   - Document the detection latency and convergence impact

4. **Stress test convergence time with node count scaling:**
   - Repeat test with 8 switches, 16 switches, 32 switches
   - Measure convergence time scaling: is it O(log N) or O(N)?
   - Find the breaking point where convergence time exceeds 5 seconds at scale

---

## 12. Self-Assessment (Field-2 BSL Scale)

After completing this lab, rate yourself:

**BSL-0 AWARENESS**
- You've read this lab once but haven't set up the topology or stress injection.
- You understand that geomagnetic stress impacts RSTP convergence, but can't explain how jitter affects BPDU timing.

**BSL-1 LAB CAPABLE**
- You completed this lab with the manual open, step-by-step.
- All 5 convergence-time measurements completed; ΔT < 5 seconds on all runs.
- You can show the tc qdisc output and describe what latency/loss parameters are active.

**BSL-2 OFFLINE**
- You could repeat this lab with the manual, no internet connection.
- You can modify the stress injection parameters (e.g., change loss from 5% to 3%) and predict the impact.
- You understand why link-type must be P2p (not auto-detected) under stress.

**BSL-3 RECOVERABLE**
- You could rebuild this lab from the topology diagram alone.
- Given the Field-2 proof obligation ("convergence < 5s under geomagnetic stress"), you'd know what to test and how.
- You can diagnose convergence failures using `show spanning-tree` and `debug` commands.

**BSL-4 MAINTAINABLE**
- You could modify this topology for a different scale (8 switches, 50+ hotspots) and still achieve the proof obligation.
- You can adjust stress parameters based on real geomagnetic data (NOAA Swarm satellite magnometer feeds).
- You can script the test (loop 10 iterations, record all convergence times, compute statistics).

**BSL-5 TEACHABLE**
- You could teach this lab's field-specific design to someone else, correctly explaining why each topology choice matters for geomagnetic resilience.
- You can connect this lab to the Haiti P38 deployment model and predict how this proof unblocks specific deployment decisions.
- You can extend the lab to test Byzantine resilience or formal model-checking.

**Target for this lab: BSL-2 to BSL-3** (offline capable, able to diagnose and troubleshoot convergence under stress)

---

## References

- IEEE 802.1D-2004: Rapid Spanning Tree Protocol
- NOAA Space Weather Prediction Center (SWPC): Geomagnetic storm data, Kp index
- Linux kernel netem qdisc: `man tc-netem` (packet loss, latency, jitter simulation)
- Day-17-Research-Paper.md (Section 2.6: Field-2 linkage and proof obligations)
- RESEARCH-LAB-STANDARD.md (Section 2: Field-Specific Lab Template)
