# Day 52 Field-2 Variant — STP + HSRP Sync (Geomagnetic Stress)

## 0. Metadata

```
Field Focus:         Field 2: Geomagnetic Resilience
Core Proof Obligation: STP + HSRP convergence remains < 60 seconds under geomagnetic stress (±20% latency jitter, ±5% packet loss).
Haiti Deployment Phase: P38 pilot (mesh-connectivity) — geomagnetic events cause latency variance on long RF links; both protocols must converge despite jitter.
Estimated Time:      2.5 hours
Difficulty:          Advanced
Relationship to Base Lab: Same STP + HSRP protocol; added stress injection (jitter, loss) and convergence timing validation.
Prerequisite:        Complete Day 52 Lab Manual first; understand HSRP timers and STP max-age.
```

---

## 1. Business Context (Field-2 Framing)

Geomagnetic storms cause ionospheric disturbances that introduce latency variance and packet loss on long-distance RF links. In a P38 pilot with 15+ hotspots spread across an island, each hotspot's distribution-layer switches (DSW1, DSW2) must converge to their HSRP/STP roles reliably *despite* atmospheric noise adding ±20% latency jitter and ±5% packet loss to inter-switch trunk links.

**The problem:** HSRP's default hello interval is 3 seconds; if latency jitter causes some hellos to be delayed beyond 10 seconds (the dead interval), DSW1 incorrectly decides DSW2 is dead and reclaims active status even when DSW2 is still running. Simultaneously, STP's max-age timer expires prematurely due to delayed BPDUs, causing the spanning tree to recalculate multiple times, creating flapping convergence.

**This variant proves:** By reducing HSRP hello/dead timers and STP max-age delays, both protocols converge to a stable, aligned state within 60 seconds even under geomagnetic stress.

---

## 2. Topology Diagram (Field-2 Variant)

```
[FIELD-2 VARIANT — Geomagnetic Stress Injection]

DSW1 ──[STRESS INJECTOR]── DSW2
   ±20% latency jitter
   ±5% packet loss
   
   Simulates RF link degradation during geomagnetic event

[CONVERGENCE TEST]
1. Inject stress on the trunk link (tc command or GNS3 plugin)
2. Trigger a topology change (shut down a secondary link, or trigger HSRP failover)
3. Measure time from event to convergence (both HSRP and STP aligned)
4. Verify convergence time < 60 seconds despite stress
```

---

## 3. IP Addressing Plan (Field-2 Annotations)

Same as base lab, with annotations for stress scenarios:

| VLAN | Network | DSW1 SVI | DSW2 SVI | HSRP VIP | Stress Impact |
|---|---|---|---|---|---|
| VLAN 10 | 10.0.10.0/24 | 10.0.10.252 | 10.0.10.253 | 10.0.10.254 | Jitter delays STP BPDUs and HSRP hellos |
| VLAN 20 | 10.0.20.0/24 | 10.0.20.252 | 10.0.20.253 | 10.0.20.254 | Jitter delays STP BPDUs and HSRP hellos |

**Field-2 Annotations:**
- HSRP timers must be tuned to tolerate ±20% jitter without false failover
- STP timers must remain fast enough to detect real failures but not react to temporary jitter
- Trunk link bandwidth should be sized to handle BPDU and hello retransmissions under packet loss

---

## 4. Configuration (Field-2 Optimizations)

### 4.1 VLAN 10 HSRP with Tight Timers (DSW1 Active)

```text
DSW1(config)#interface vlan 10
DSW1(config-if)#ip address 10.0.10.252 255.255.255.0
DSW1(config-if)#standby 10 ip 10.0.10.254
DSW1(config-if)#standby 10 priority 150
DSW1(config-if)#standby 10 preempt
DSW1(config-if)#standby 10 timers 1 3
DSW1(config-if)#exit
```

**Explanation for Field-2:**
- `standby 10 timers 1 3`: Hello every 1 second (vs. default 3s), dead after 3 seconds (vs. default 10s). Under ±20% latency jitter, a hello might arrive 200ms late (expected), but 3-second dead timer gives 1.8+ seconds of buffer before false failover. This keeps HSRP from flapping while still detecting real link failures within ~3 seconds.
- **Field-2 Proof:** Under geomagnetic stress with 20% jitter, a 3-second hello becomes 2.4–3.6 seconds; the dead timer (3 seconds) catches it just in time. Default timers would fail here.

### 4.2 VLAN 20 HSRP with Tight Timers (DSW2 Active)

```text
DSW2(config)#interface vlan 20
DSW2(config-if)#ip address 10.0.20.253 255.255.255.0
DSW2(config-if)#standby 20 ip 10.0.20.254
DSW2(config-if)#standby 20 priority 150
DSW2(config-if)#standby 20 preempt
DSW2(config-if)#standby 20 timers 1 3
DSW2(config-if)#exit
```

### 4.3 STP Timers Optimized for Convergence

```text
DSW1(config)#spanning-tree vlan 10 root primary
DSW1(config)#spanning-tree vlan 10 hello-time 1
! Reduced from default 2 seconds to 1 second

DSW1(config)#spanning-tree vlan 10 forward-delay 8
! Reduced from default 15 seconds to 8 seconds

DSW1(config)#spanning-tree vlan 10 max-age 10
! Reduced from default 20 seconds to 10 seconds
! Under 5% packet loss, BPDUs may be dropped; 10s max-age allows faster detection of topology changes
```

**Explanation for Field-2:**
- **hello-time 1**: BPDUs sent every 1 second instead of 2, faster convergence signal.
- **max-age 10**: If root doesn't send BPDU within 10 seconds (instead of 20), assume root is down and recalculate. Under 5% loss, a BPDU might be dropped; 10s threshold catches this faster than 20s.
- **forward-delay 8**: Ports transition Listening → Learning → Forwarding in 2 steps × 8s = 16s total (vs. 2 steps × 15s = 30s default), reducing convergence time.
- **Total STP convergence under stress:** ~30 seconds (vs. ~50 seconds with default timers).

### 4.4 Equivalent Configuration for DSW2

```text
DSW2(config)#spanning-tree vlan 10 root secondary
DSW2(config)#spanning-tree vlan 10 hello-time 1
DSW2(config)#spanning-tree vlan 10 forward-delay 8
DSW2(config)#spanning-tree vlan 10 max-age 10

DSW2(config)#spanning-tree vlan 20 root primary
DSW2(config)#spanning-tree vlan 20 hello-time 1
DSW2(config)#spanning-tree vlan 20 forward-delay 8
DSW2(config)#spanning-tree vlan 20 max-age 10

DSW1(config)#spanning-tree vlan 20 root secondary
DSW1(config)#spanning-tree vlan 20 hello-time 1
DSW1(config)#spanning-tree vlan 20 forward-delay 8
DSW1(config)#spanning-tree vlan 20 max-age 10
```

---

## 5. Field-2 Verification Steps

### 5.1 Baseline Convergence (No Stress)

Before injecting stress, measure baseline convergence:

```text
DSW1#show standby vlan 10 brief
Group  Interface   Ip Address      State   Active router
10     Vlan10      10.0.10.254     Active  local

DSW1#show spanning-tree vlan 10 brief
VLAN0010
  Spanning tree enabled protocol rstp
  Root ID    Priority  24576
             This bridge is the root
  Bridge ID  Priority  24576
```

Both protocols show DSW1 as active/root for VLAN 10. Record the timestamp.

### 5.2 Inject Stress on Trunk Link

Using Linux `tc` (traffic control) on a hypervisor or GNS3:

```bash
# Inject 20% latency jitter + 5% packet loss on the DSW1—DSW2 trunk
tc qdisc add dev <trunk-interface> root netem delay 50ms 10ms loss 5%
# This adds 50ms base latency ± 10ms (jitter) and 5% packet loss

# To verify:
tc qdisc show dev <trunk-interface>
```

Or in GNS3:
- Right-click the DSW1—DSW2 link
- Set "Latency: 50ms, Latency jitter: 10ms, Packet loss: 5%"

### 5.3 Trigger Topology Change Under Stress

Shut down DSW1's trunk port (or crash DSW1 and observe automatic failover timing):

```text
DSW1#sh clock
*16:45:23.456 UTC <-- Record this timestamp

DSW1(config)#interface GigabitEthernet1/0
DSW1(config-if)#shutdown
DSW1(config-if)#exit
```

### 5.4 Measure Convergence Time

On DSW2, continuously monitor until convergence is complete:

```text
DSW2#show standby vlan 10 brief
[T=0s] Group 10 - State: Standby (DSW1 still perceived as active despite link-down)
[T~3s] Group 10 - State: Standby → Transition to Active
       (HSRP dead timer at 3s fired; DSW1 declared down)
[T~3s] Active virtual mac address is 0000.0c07.ac0a
       (DSW2 became active for VLAN 10)

DSW2#show spanning-tree vlan 10 brief
[T=0s]  STP computing new root...
[T~8s]  Multiple topology changes detected (forward-delay = 8s per hop)
[T~30s] Spanning tree re-converged on new root (DSW2 becomes root for VLAN 10)
```

**Convergence time = ~30 seconds (HSRP 3s + STP 27s)**

### 5.5 Verify Post-Convergence State

```text
DSW2#show standby vlan 10 brief
Group  Interface   Ip Address      State   Active router
10     Vlan10      10.0.10.254     Active  local

DSW2#show standby vlan 20 brief
Group  Interface   Ip Address      State   Active router
20     Vlan20      10.0.20.254     Standby  10.0.20.252
```

**Expected:** DSW2 is now active for VLAN 10 (it's the only one running). STP root for VLAN 10 also transferred to DSW2 (temporary, until DSW1 recovery).

### 5.6 Measure Convergence Time Under Stress: Repeat 5 Times

Remove the link-down condition (bring DSW1 back up or restart it):

```text
DSW1(config-if)#no shutdown
DSW1(config-if)#exit
DSW1#show clock
*16:45:53.890 UTC <-- Reboot/link-up timestamp
```

Repeat steps 5.3–5.5, recording convergence time each time:

| Trial | Stress Level | Convergence Time (HSRP + STP) | Pass/Fail (<60s) |
|---|---|---|---|
| 1 | ±20% jitter, 5% loss | 32s | PASS |
| 2 | ±20% jitter, 5% loss | 35s | PASS |
| 3 | ±20% jitter, 5% loss | 38s | PASS |
| 4 | ±20% jitter, 5% loss | 31s | PASS |
| 5 | ±20% jitter, 5% loss | 34s | PASS |

**PROOF OBLIGATION PASS:** All 5 trials converge within 60 seconds despite stress.

---

## 6. Expected Output Gallery (Field-2 Scenarios)

### Under Stress, Mid-Convergence

```
[T=2 seconds, DSW1 link down for 2s under stress]
DSW2#show standby vlan 10 brief
Group  Interface   Ip Address      State   Active router    Time Until Standby/Active
10     Vlan10      10.0.10.254     Standby  10.0.10.252     0:00:01 (dead timer at 1 second remaining)

[Latency jitter from ±20% may cause occasional out-of-order packet arrival, 
 but the 3-second dead timer is conservative enough not to trigger false failover]

[T=3 seconds]
DSW2#show standby vlan 10 brief
Group  Interface   Ip Address      State   Active router
10     Vlan10      10.0.10.254     Active  local (just transitioned; HSRP convergence complete)

[T=10 seconds]
DSW2#show spanning-tree vlan 10 brief
Spanning tree role changes:
  Non-root port (Gi1/0) → Designated (learning state)
  [STP is re-converging; under forward-delay=8s, this takes 2 transitions = 16s total]

[T=30 seconds]
DSW2#show spanning-tree vlan 10 brief
  Spanning tree role changes:
  Bridge ID    Priority  24576 (elected root)
  This bridge is the root (STP convergence complete)
  
[Total convergence: 3s (HSRP) + 27s (STP) = 30 seconds]
```

---

## 7. Common Field-2 Mistakes

1. **Using default HSRP timers (3s hello, 10s dead) with jitter** → False HSRP failover under 20% jitter. A delayed hello triggers premature dead-timer expiry. Symptom: "HSRP flapping" — active/standby state changes every few seconds even when the active switch is still reachable.
   - **Fix:** Reduce hello to 1s and dead to 3s (or 1s and 2s if jitter is tighter than expected).

2. **Using default STP timers with jitter** → STP recalculates multiple times during a single topology change due to delayed BPDUs. Convergence time exceeds 60 seconds. Symptom: Topology change notifications flood syslog; final root election takes > 90 seconds to stabilize.
   - **Fix:** Reduce forward-delay and max-age as shown in section 4.3.

3. **Not actually injecting stress** → Measuring "convergence time" on a perfect link is meaningless for Field-2. Default timers work fine under ideal conditions; the proof obligation specifically requires convergence under stress.
   - **Fix:** Always inject stress via `tc` or GNS3 before measuring convergence time.

4. **Measuring convergence time only once** → One lucky trial that converges in 40s doesn't prove the design. Jitter is probabilistic; outliers occur.
   - **Fix:** Repeat the convergence test at least 5 times and report min/max/average.

---

## 8. Troubleshooting by Field-2 (Diagnostic Method)

**Symptom: "HSRP is flapping (state changes every 2–3 seconds) under stress"**

```text
Step 1: Check HSRP dead timer setting
  show standby vlan 10 | include "Hold time"
  → If Hold time is 10 seconds (default), it's too long for 1-second hellos under jitter. 
    Change `standby 10 timers 1 3` (1s hello, 3s dead).

Step 2: Verify hello packets are being sent despite stress
  debug standby (on DSW1, limited to 10 seconds)
  → Should see "sending hello" every 1 second. If not, hellos are being dropped.

Step 3: Check if jitter is causing out-of-order packet arrival
  show standby vlan 10 | include "Standby router" "Active router"
  → If these alternate every few seconds, the dead timer is too tight or jitter is too high.

Step 4: Increase dead timer or reduce jitter
  standby 10 timers 1 5   (1s hello, 5s dead — more conservative)
  OR
  Remove 5% packet loss from stress injection (test with jitter only)
  → Measure convergence time again. Should stabilize.
```

**Symptom: "STP convergence takes > 60 seconds under stress"**

```text
Step 1: What is the current max-age setting?
  show spanning-tree vlan 10 | include "Max Age"
  → If it's 20 seconds (default), reduce to 10 or 15 for Field-2.

Step 2: Are BPDUs being dropped?
  debug spanning-tree events (on DSW1, limited to 10 seconds)
  → Should see "sending BPDU" every 1 second (hello-time=1). 
    If you see "1 out of 5 BPDUs received", 5% loss is real.

Step 3: How many topology change calculations occurred?
  show spanning-tree vlan 10 | include "Topology Change Count"
  → If this number increased 5+ times during a single failure event, STP recalculated too many times. 
    Reduce max-age or increase hello-time (more conservative) to stabilize.

Step 4: Verify all timers are applied
  show spanning-tree vlan 10 | include "Hello" "Max Age" "Forward Delay"
  → Must show Hello=1, Max Age=10, Forward Delay=8 to achieve <60s convergence.
```

---

## 9. Design Analysis: Field-2 Reasoning

**Why does this field-specific topology matter for geomagnetic resilience?**

Geomagnetic storms are predictable (NOAA forecasts them days in advance) and happen regularly during solar maxima. In a P38 pilot with 50–200 hotspots, geomagnetic events are not emergencies — they're normal operational conditions. A network designed for Black Start expects complete power loss; a network designed for geomagnetic resilience expects **degraded RF link quality** (latency jitter, packet loss) while power is still available.

This variant proves that tight HSRP and STP timers, combined with conservative dead-timer thresholds, allow both protocols to converge reliably within 60 seconds despite atmospheric noise. The default Cisco timers were designed for wired, low-jitter networks; RF links in geomagnetic events need tighter tuning.

For Haiti P38, this means:
- Mesh hotspots stay connected even during active geomagnetic disturbances
- Gateway failover completes within the user's "timeout tolerance" (usually ~30–45 seconds)
- No manual intervention needed; convergence is automatic

---

## 10. Real-World Parallel: Haiti Deployment Phase

**P38 Pilot — Geomagnetically-Resilient Mesh**

In the P38 pilot (island-wide mesh on 15+ hotspots), each hotspot's DSW1/DSW2 pair must converge to intended roles reliably despite NOAA-forecast geomagnetic events. During a forecast K-index 7–8 geomagnetic storm:
- Atmospheric absorption increases, adding 20–40% latency to ionospheric RF links
- Multipath scattering increases packet loss to 3–7%
- The event lasts 12–24 hours

This lab proves the gateway redundancy and spanning tree can handle these conditions. Before P38 deployment, these convergence-time benchmarks are fed into the SLA (service-level agreement) with field operators: "During K7–8 events, expect gateway failover delays up to 45 seconds; this is expected and does not require manual intervention."

---

## 11. Stretch Goals: Advanced Proof Obligations

1. **Convergence under sustained jitter:** Inject ±20% jitter on the trunk for 1 hour continuously. Measure convergence time during 10 random failover events throughout the hour. Verify convergence time stays < 60s consistently.

2. **Worst-case jitter model:** Using ESA Swarm geomagnetic-field data, derive the maximum latency jitter expected during a K8 event. Configure HSRP/STP timers based on this model and prove convergence under simulated worst-case conditions.

3. **Formal verification:** Using TLA+ or Alloy, model HSRP and STP state machines with nondeterministic packet delays (0–60ms) and verify convergence within 60 seconds for all possible interleavings.

4. **Packet-capture analysis:** During a convergence test, capture all HSRP hello and STP BPDU packets. Analyze packet timings under jitter to identify the critical path (which timers matter most for convergence speed).

---

## 12. Self-Assessment (Field-2 BSL)

```
BSL-0 AWARENESS      - You've read this lab once. You couldn't replicate it.
BSL-1 LAB CAPABLE    - You completed this lab with the manual open; convergence test worked once.
BSL-2 OFFLINE        - You could repeat this lab with the manual; you remember to inject stress.
BSL-3 RECOVERABLE    - You could rebuild this lab from the topology diagram; given geomagnetic stress scenarios, 
                        you'd know to reduce HSRP dead timer and STP max-age.
BSL-4 MAINTAINABLE   - You could adjust HSRP/STP timers for different jitter models (±10%, ±30%) and prove 
                        convergence still holds.
BSL-5 TEACHABLE      - You could teach why default Cisco timers fail under geomagnetic jitter, 
                        and why <60s convergence requires explicit timer tuning.

Target BSL for this lab: 3–4
```

---

**Push this file via Python payload JSON to RedjiJB-Labs/Day-52-Field-2-Lab.md**
