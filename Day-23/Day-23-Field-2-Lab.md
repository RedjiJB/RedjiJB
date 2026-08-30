# Day 23 — EtherChannel: LACP, PAgP, Static, and Load Balancing
## Field-2 Variant: Geomagnetic Resilience & Sub-Second Member Link Failover

---

## 0. Metadata

**Field Focus:** Field 2: Geomagnetic Resilience (Sub-Second Failover for Member Links Under Stress)

**Core Proof Obligation:** EtherChannel detects member link failures within 1 second and redistributes traffic to remaining members, even when individual member links experience geomagnetic-induced jitter/loss.

**Haiti Deployment Phase:** P38 pilot (hotspot-link-bundling module); geomagnetic resilience validation required before deployment.

**Estimated Time:** 60–90 minutes

**Difficulty:** Intermediate

**Relationship to Base Lab:** Same EtherChannel protocols (LACP, PAgP, static); different topology (4-member bundle stressed individually) and measurement focus (member failover time under packet loss).

**Prerequisite:** Complete Day-23-Lab-Manual first. Familiarity with stress injection tools (tc for packet loss simulation).

---

## 1. Business Context (Field-2 Framing)

The base Day-23 lab proves EtherChannel can bundle links and distribute traffic. But what happens when a member link experiences the jitter and packet loss common during geomagnetic storms? This lab proves EtherChannel's failover mechanism survives geomagnetic stress: failed member links are detected and removed within 1 second, remaining members immediately take over traffic, and re-added members re-join the bundle within 5 seconds—all without manual intervention.

**Success criteria:**
- Member link failure detected within 1 second (link-state detection, not protocol timeout)
- Traffic redistributed to remaining members with zero additional packet loss beyond the failed member's in-flight packets
- Failed member recovery detected and bundle re-inclusion within 5 seconds
- No bundle flapping or thrashing during stress (links don't repeatedly add/remove)

---

## 2. Topology Diagram (Field-2 Stress Topology)

```
[FIELD-2 ETHERchannel STRESS TOPOLOGY]

ASW1 ◄────────────────────► DSW1
     ◄────────────────────►
     ◄────────────────────►
     ◄────────────────────►
     (4-member bundle: Gi0/1, Gi0/2, Gi0/3, Gi0/4)

[Each member link stressed individually:]
- Member 1 (Gi0/1): Nominal (0% loss, baseline latency)
- Member 2 (Gi0/2): [STRESS INJECTED: 5% packet loss, 20ms latency variance]
- Member 3 (Gi0/3): Nominal
- Member 4 (Gi0/4): Nominal

[Test Sequence:]
Phase 1: All 4 members active, baseline load-balancing distribution
Phase 2: Fail Member 2 (shutdown Gi0/2 on ASW1 while stress active)
         → Measure time to bundle recalculation (should be < 1 sec)
Phase 3: Restore Member 2 (no shutdown Gi0/2)
         → Measure time to re-join bundle (should be < 5 sec)
Phase 4: Fail Member 1, then Member 3 in succession
         → Verify each failover takes < 1 sec
```

---

## 3. IP Addressing Plan (Field-2 Annotations)

```
L3 Routed Port-Channel (EtherChannel as uplink):
DSW-Core ↔ ASW-Access: 10.0.10.0/30
  DSW core-facing: 10.0.10.1/30
  ASW access-facing: 10.0.10.2/30
  └─ Annotation (Field-2): Port-channel is L3 interface; member link failures don't affect IP routing—EtherChannel handles it
  └─ Rationale: If a member link fails, port-channel stays UP (as long as >= 1 member is active)

Access VLAN (for end-devices on ASW):
ASW-LAN: 192.168.1.0/24
  ASW ports Fa0/1–0/20: Access VLAN members
  └─ Annotation (Field-2): Traffic from 20 access PCs is load-balanced across 4 EtherChannel members
     Member failure = 4 members → 3 members; traffic redistributes (some PCs' flows may move to new member)
```

---

## 4. Configuration (Field-2 Member-Link Stress)

### 4.1 EtherChannel Core Configuration (LACP)

```
ASW1 & DSW1:
spanning-tree mode rapid-pvst

interface range Gi0/1 – 0/4
 description EtherChannel members (Field-2 stress test)
 channel-group 1 mode active       [LACP active mode]
 no shutdown

interface port-channel 1
 description 4-member EtherChannel to DSW1
 ip address 10.0.10.2 255.255.255.252
 no switchport                      [L3 routed port-channel]
 no shutdown
```

### 4.2 Load-Balancing Hash Configuration

```
! Global load-balancing: by default, hash is source/destination IP
port-channel load-balance src-dst-ip
! Annotation (Field-2): With 4 members and hash algorithm, traffic is distributed across members
! Field-2 purpose: ensures member failures impact only ~25% of flows (those hashing to failed member)
```

### 4.3 Stress Injection on Member-2 (Linux tc)

```bash
#!/bin/bash
# Field-2: Stress individual member link to simulate geomagnetic-induced packet loss

TC=/sbin/tc
IFACE_MEMBER_2="veth-asw1-to-dsw1-member2"  # Virtual interface for Gi0/2

# Clear existing qdisc
$TC qdisc del dev $IFACE_MEMBER_2 root 2>/dev/null

# Add stress: 5% loss, 20ms jitter (geomagnetic-induced)
$TC qdisc add dev $IFACE_MEMBER_2 root netem \
  delay 10ms 2ms distribution normal \
  loss 5% \
  duplicate 1%

echo "Geomagnetic stress on Member-2 active:"
$TC -s qdisc show dev $IFACE_MEMBER_2
```

**Explanation (Field-2):** Member-2 experiences the same 5% loss and jitter as a geomagnetically-stressed link. The other members remain clean. Field-2 proves that when one member degrades, EtherChannel detects and removes it within 1 second, preventing cascading effects on the whole bundle.

---

## 5. Field-Specific Verification Steps

### Step 1: Baseline EtherChannel State (All Members Healthy)

```
1.1  Verify all 4 members are bundled and active:
ASW1# show etherchannel 1 summary
Flags: D - down, P - bundled, s - suspended, H - Hot-standby
       I - Individual, B - Backup

Number of channel-groups in use: 1
Number of aggregators: 1

Group  Port-channel  Protocol  Ports
─────────────────────────────────────────
1      Po1(SU)       LACP      Gi0/1(P)  Gi0/2(P)  Gi0/3(P)  Gi0/4(P)

[All members show 'P' (bundled). Po1 shows 'SU' (switched-up, Layer 3)]

1.2  Verify load-balancing distribution (baseline, no stress):
ASW1# show etherchannel 1 detail | include "Load"
Load Balance: src-dst-ip

1.3  Record traffic distribution:
- Monitor packet counters on each member before stress:
  ASW1# show interface Gi0/1 | include "packets input"
  ASW1# show interface Gi0/2 | include "packets input"
  [All members should show similar packet counts if traffic is balanced]
```

### Step 2: Activate Stress on Member-2

```
2.1  On the GNS3 host, activate stress injection:
$ sudo bash field2_stress_member2.sh

2.2  Verify stress is active (check dropped counter):
$ tc -s qdisc show dev veth-asw1-to-dsw1-member2
 Sent 1000 bytes, 50 packets (dropped 2, overlimits 0)
 [Should show dropped > 0, confirming 5% loss is active]

2.3  Wait 30 seconds; verify no automatic member removal yet:
ASW1# show etherchannel 1 summary
[Member-2 (Gi0/2) should still show 'P' (bundled); stress alone doesn't remove it.
 EtherChannel doesn't use packet loss to detect failures — it uses physical link state.]
```

### Step 3: Induce Member-2 Link Failure (Under Stress)

```
3.1  Shut down Gi0/2 on ASW1 (simulating geomagnetic-induced link loss):
ASW1(config)# interface Gi0/2
ASW1(config-if)# shutdown
! Record timestamp T_failure = NOW

3.2  Immediately monitor bundle state:
ASW1(config-if)# do show etherchannel 1 summary
[T_failure + 0.5 sec]
Flags: D - down, P - bundled, s - suspended, H - Hot-standby
...
Group  Port-channel  Protocol  Ports
1      Po1(SU)       LACP      Gi0/1(P)  Gi0/2(D)  Gi0/3(P)  Gi0/4(P)

[Gi0/2 shows 'D' (down). Po1 still shows SU (up, using remaining 3 members)]

3.3  Measure failover time:
ΔT_failover = (time when Gi0/2 shows 'D' on port-channel) - T_failure
PASS if < 1 second: Hardware link-state detection fast enough
FAIL if ≥ 1 second: Delayed failure detection (protocol-level issue)

3.4  Verify no packet loss on remaining members (ping test):
ASW1# ping 10.0.10.1  [ping the DSW across the bundle]
! Should succeed with 0 loss (remaining 3 members absorb Gi0/2's traffic)

3.5  Wait 30 seconds; verify bundle is stable (no oscillation):
ASW1# show etherchannel 1 summary
[Should still show Gi0/1(P) Gi0/2(D) Gi0/3(P) Gi0/4(P); no flapping]
```

### Step 4: Member-2 Recovery (Under Stress)

```
4.1  Re-enable Gi0/2 (link recovery):
ASW1(config-if)# no shutdown
! Record timestamp T_recovery = NOW

4.2  Monitor bundle recalculation:
ASW1(config-if)# do show etherchannel 1 summary
[T_recovery + 1 sec]
Flags: ...
Group  Port-channel  Protocol  Ports
1      Po1(SU)       LACP      Gi0/1(P)  Gi0/2(P)  Gi0/3(P)  Gi0/4(P)

[Gi0/2 should return to 'P' (bundled) within 5 seconds]

4.3  Measure recovery time:
ΔT_recovery = (time when Gi0/2 returns to 'P') - T_recovery
PASS if < 5 seconds: Fast enough to re-stabilize traffic distribution
FAIL if > 5 seconds: Slow recovery (may indicate LACP negotiation delay)

4.4  Verify load-balancing re-equilibrates:
ASW1# show interface Gi0/2 | include "packets input"
[Packet count should resume increasing as traffic flows through Gi0/2 again]
```

### Step 5: Repeated Failover Test (Stress Resilience)

```
5.1  Repeat Steps 3-4 five times, recording failover/recovery times:
Iteration 1: ΔT_failover = ____, ΔT_recovery = ____
Iteration 2: ΔT_failover = ____, ΔT_recovery = ____
Iteration 3: ΔT_failover = ____, ΔT_recovery = ____
Iteration 4: ΔT_failover = ____, ΔT_recovery = ____
Iteration 5: ΔT_failover = ____, ΔT_recovery = ____

5.2  Calculate statistics:
Min failover:       ____ (should be < 1 sec)
Max failover:       ____ (should be < 2 sec)
Avg failover:       ____
Min recovery:       ____ (should be < 2 sec)
Max recovery:       ____ (should be < 5 sec)
Avg recovery:       ____

5.3  [FIELD-2 PROOF]
If all measurements are within bounds, bundle is resilient to repeated member failures under stress.
This proves geomagnetic-induced link flaps won't cause cascading EtherChannel thrashing.
```

---

## 6. Expected Output Gallery (Field-2 Scenarios)

### 6.1 Pre-Failure Baseline (All 4 Members Healthy)

```
ASW1# show etherchannel 1 summary
Flags: D - down        P - bundled in port-channel (members)
       I - stand-alone s - suspended
       H - Hot-standby (LACP only)
       R - Layer3       S - Layer2

Number of channel-groups in use: 1
Number of aggregators: 1

Group  Port-channel  Protocol    Ports
────────────────────────────────────────
1      Po1(RSU)      LACP        Gi0/1(P)   Gi0/2(P)   Gi0/3(P)   Gi0/4(P)

[Interpretation (Field-2): All 4 members active; bundle is up (Po1 shows SU = Switched Up, Layer 3).
 Stress is active on Gi0/2, but EtherChannel doesn't care — link is still physically up.
 Packet loss on Gi0/2 doesn't trigger removal; only physical link-state down does.]
```

### 6.2 During Member-2 Shutdown (Failure Detected)

```
[T_failure + 0.3 seconds]
ASW1# show etherchannel 1 summary
Group  Port-channel  Protocol    Ports
────────────────────────────────────────
1      Po1(RSU)      LACP        Gi0/1(P)   Gi0/2(D)   Gi0/3(P)   Gi0/4(P)

[Gi0/2 shows 'D' (down). Po1 remains SU (still up, using 3 members).]

[Parallel test: ping across the bundle]
ASW1# ping 10.0.10.1
PING 10.0.10.1 (10.0.10.1): 56 data bytes
64 bytes from 10.0.10.1: seq=0 ttl=63 time=10ms
64 bytes from 10.0.10.1: seq=1 ttl=63 time=10ms
64 bytes from 10.0.10.1: seq=2 ttl=63 time=10ms
64 bytes from 10.0.10.1: seq=3 ttl=63 time=10ms

--- 10.0.10.1 statistics ---
4 packets transmitted, 4 packets received, 0% packet loss

[Interpretation (Field-2): Failover was transparent to ping; remaining 3 members
 seamlessly absorbed Gi0/2's traffic. This is the proof: < 1 second failover + 0% loss.]
```

### 6.3 After Member-2 Recovery (Re-Joined)

```
[T_recovery + 2 seconds]
ASW1# show etherchannel 1 summary
Group  Port-channel  Protocol    Ports
────────────────────────────────────────
1      Po1(RSU)      LACP        Gi0/1(P)   Gi0/2(P)   Gi0/3(P)   Gi0/4(P)

[Gi0/2 back to 'P' (bundled); all 4 members active again.
 Load-balancing redistributes across 4 members (flows that were on Gi0/1 may move to Gi0/2).]
```

---

## 7. Common Field-2 Mistakes

1. **Confusing packet loss with link failure:** EtherChannel detects link state (up/down), not packet loss. A member can have 50% packet loss and still be considered "up" — EtherChannel won't remove it. Only physical link failure (shutdown, unplugged cable) triggers removal.

2. **Expecting LACP negotiation delay during recovery:** When a member is shut down, LACP negotiations stop. When no shutdown, LACP must re-negotiate. This takes 1–3 seconds (LACP PDU exchange), not instant. Don't expect < 1 second recovery time; expect 1–5 seconds.

3. **Not accounting for load-balance hash recomputation:** When a member is removed/added, the hash algorithm recomputes which flows use which member. Some flows briefly move to a different member. If you're tracking a single flow (e.g., TCP connection), that flow might briefly pause while the hash changes. This is expected, not a bug.

4. **Using half-duplex links in bundle:** EtherChannel requires all members to have matching duplex (all full-duplex). Half-duplex + full-duplex mismatch silently disables the bundle. Always verify all members show "Full" duplex.

5. **Not removing stress injection between test iterations:** After each failover/recovery cycle, the stress injection (tc command) may time out or need re-activation. Always re-run the stress script before the next test iteration.

---

## 8. Troubleshooting by Field (Diagnostic Method)

### Problem: Member link fails but EtherChannel doesn't detect (member stays 'P')

```
Step 1: Is the physical interface actually down?
  ASW1# show interface Gi0/2
  → Should show "administratively down" or "down"
  → If shows "up", the interface isn't actually shutdown
  FIX: Re-run "shutdown" command

Step 2: Is the bundle missing the interface from port-channel?
  ASW1# show etherchannel 1 summary | include Gi0/2
  → Should show Gi0/2 in the Port-channel member list
  → If missing, it was never added; re-configure "channel-group 1 mode active"

Step 3: How long until EtherChannel detects the failure?
  Run "show etherchannel 1 summary" every 100ms during shutdown
  → Should see transition from P to D within 500ms–1s
  → If takes > 2s, there's a delay in link-state propagation
  FIX: Check switch hardware (may have slow link-state notification)
```

### Problem: Member recovery is slow (takes > 5 seconds)

```
Step 1: Is LACP negotiation stuck?
  ASW1# debug etherchannel LACP events (enable, wait 10 seconds, disable)
  → Should see LACP PDU exchange logs
  → If no logs, LACP isn't negotiating

Step 2: Is the port configured as channel-group member?
  ASW1# show run interface Gi0/2 | include channel
  → Should show "channel-group 1 mode active"
  → If missing, re-apply the channel-group command

Step 3: Is the port transitioning through spanning-tree states?
  Gi0/2 might be blocked by RSTP before joining the port-channel
  ASW1# show spanning-tree interface Gi0/2
  → State should be "forwarding" (or N/A if port-channel mode)
  → If "learning" or "listening", wait for RSTP Forward Delay (15 sec) to expire
  FIX: Enable spanning-tree portfast on port-channel member ports (should be automatic)
```

---

## 9. Design Analysis: Field-2 Reasoning

EtherChannel member links can fail for many reasons: cable fault, interface error, or (most relevant to Field-2) geomagnetic-induced link degradation. Traditional redundancy (STP-based backup) takes 50–70 seconds to fail over. EtherChannel's link-state based detection takes < 1 second.

This topology (4-member bundle stressed individually) forces EtherChannel to prove it handles partial bundle degradation. When Member-2 is shut down, the bundle doesn't collapse — it seamlessly shifts Member-2's traffic to the other three. This is the core Field-2 proof: under geomagnetic stress, EtherChannel failover is fast enough that users don't perceive an outage.

The stress injection on Member-2 (5% loss + jitter) simulates real geomagnetic conditions. In a full geomagnetic storm, some links might drop all packets (fail completely) while others just degrade. This lab proves EtherChannel handles both scenarios: complete failures trigger removal, while degraded links continue carrying reduced traffic until they completely fail.

---

## 10. Real-World Parallel: Haiti P38 Mesh

In P38, pairs of hotspots will have multiple inter-hotspot links for capacity and redundancy. Some hotspot pairs might have 2–4 member links in a bundle. When one link experiences a geomagnetic-induced dropout, the bundle must detect and remove it within seconds, or the user perceives an outage. Day-23-Field-2 proves this is possible: failover in < 1 second.

Without this proof, deployment would have to assume longer failover times and over-provision backup links or manual failover procedures. With this proof, P38 can confidently deploy EtherChannel for inter-hotspot links, knowing that geomagnetic glitches will be handled automatically.

**P38 Integration Point:** hotspot-link-bundling module, member-failure detection task
**Validation Gate:** Day-23-Field-2 proof complete before P38 link-design is finalized

---

## 11. Stretch Goals: Advanced Proof Obligations

1. **Formal model-check EtherChannel failover correctness:**
   - Use TLA+ to prove that removing a member and redistributing traffic doesn't cause packet loops or duplicate delivery
   - Prove that packet delivery remains ordered on surviving members (no out-of-order delivery)

2. **Measure failover impact on TCP connections:**
   - Run a TCP data transfer across the bundle; fail a member mid-transfer
   - Measure TCP retransmit rate, throughput drop, and recovery time
   - Document the impact on user experience

3. **Stress test multiple simultaneous member failures:**
   - Fail Member-2 and Member-3 at the same time
   - Verify bundle remains active with 2 members
   - Measure failover time (should be < 1 sec for both)

4. **Test recovery order resilience:**
   - Fail members in order (Gi0/1 down, then Gi0/2, then Gi0/3)
   - After all three are down, keep only Gi0/4 active
   - Then recover them in reverse order (Gi0/3 up, Gi0/2 up, Gi0/1 up)
   - Measure each recovery time; should remain < 5 seconds per member

---

## 12. Self-Assessment (Field-2 BSL Scale)

After completing this lab, rate yourself on:

**BSL-0–1:** Read the lab; completed it step-by-step with manual
**BSL-2:** Could repeat without manual; understand stress injection and failover detection
**BSL-3:** Could rebuild from topology only; diagnose failover issues using show commands
**BSL-4:** Could modify topology (3-member, 5-member bundles) and predict failover times
**BSL-5:** Could teach this lab and connect it to Haiti P38 deployment model

**Target: BSL-2 to BSL-3**

---

## References

- IEEE 802.3ad: Link Aggregation Control Protocol (LACP)
- Cisco IOS: EtherChannel Configuration, Member Failover Behavior
- Linux kernel netem: Traffic control and packet loss simulation
- Day-23-Research-Paper.md (Section 2.6: Field-2 linkage)
- RESEARCH-LAB-STANDARD.md
