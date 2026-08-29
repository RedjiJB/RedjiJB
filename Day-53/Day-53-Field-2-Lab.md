# Day 53 Field-2 Variant — GRE Tunnels (Geomagnetic Stress)

## 0. Metadata

```
Field Focus:         Field 2: Geomagnetic Resilience
Core Proof Obligation: GRE tunnel convergence remains < 30 seconds under geomagnetic stress (±20% latency jitter, ±5% packet loss).
Haiti Deployment Phase: P38 (mesh-connectivity) — RF-based WAN links degrade during geomagnetic events; tunnels must converge despite jitter.
Estimated Time:      2 hours
Difficulty:          Intermediate
Relationship to Base Lab: Same GRE protocol; added stress injection (jitter, loss) on WAN link and convergence timing validation.
Prerequisite:        Complete Day 53 Lab Manual first; understand keepalive timers and tunnel protocol.
```

---

## 1. Business Context (Field-2 Framing)

Geomagnetic storms introduce latency variance and packet loss on RF links. In a P38 pilot with 15+ hotspots, each GRE tunnel connecting two hotspots must converge reliably *despite* atmospheric noise adding ±20% latency jitter and ±5% packet loss to the WAN link.

**The problem:** GRE's keepalive mechanism assumes consistent WAN latency. If jitter causes keepalive responses to arrive 100ms late (within normal tolerance), but then a burst of packet loss drops 3 consecutive keepalives, the tunnel is falsely declared down. Simultaneously, if the tunnel re-converges by transmitting aggressively, it consumes precious bandwidth during an already-stressed geomagnetic event.

**This variant proves:** By tuning keepalive intervals and implementing adaptive detection thresholds, a GRE tunnel converges within 30 seconds even under geomagnetic stress.

---

## 2. Topology Diagram (Field-2 Variant)

```
[FIELD-2 VARIANT — Geomagnetic Stress on WAN Link]

RA ──[STRESS INJECTOR]── RB
   ±20% latency jitter
   ±5% packet loss
   
   Simulates RF link degradation during geomagnetic event

[CONVERGENCE TEST]
1. Tunnel is up and passing traffic
2. Inject stress on WAN link
3. Trigger tunnel flap (shut down and no-shut tunnel endpoint)
4. Measure time from flap to convergence (tunnel line protocol back to "up")
5. Verify convergence time < 30 seconds despite stress
```

---

## 3. IP Addressing Plan (Field-2 Annotations)

Same as base lab, with annotations for stress scenarios:

| Device | WAN IP | Tunnel IP | Stress Impact |
|---|---|---|---|
| RA | 1.1.1.1/24 | 10.0.0.1/30 | Jitter delays keepalive; loss drops packets |
| RB | 2.2.2.2/24 | 10.0.0.2/30 | Jitter delays keepalive; loss drops packets |

**Field-2 Annotations:**
- Keepalive timers must tolerate ±20% jitter without false tunnel-down detection
- WAN bandwidth should be sized to handle keepalive retransmissions under 5% loss

---

## 4. Configuration (Field-2 Optimizations)

### 4.1 RA: Aggressive Keepalive Timers for Field-2

```text
RA(config)#interface GigabitEthernet0/0
RA(config-if)#ip address 1.1.1.1 255.255.255.0
RA(config-if)#no shutdown
RA(config-if)#exit

RA(config)#interface Tunnel 0
RA(config-if)#ip address 10.0.0.1 255.255.255.252
RA(config-if)#tunnel source 1.1.1.1
RA(config-if)#tunnel destination 2.2.2.2
RA(config-if)#tunnel keepalive 1 5
! Send keepalive every 1 second; declare tunnel down after 5 seconds without response
! Under ±20% jitter, a 1-second keepalive becomes 0.8–1.2s; 5-second timeout provides 3.8+ seconds buffer
RA(config-if)#no shutdown
RA(config-if)#exit
```

**Explanation for Field-2:**
- `tunnel keepalive 1 5` vs. default (10, 3): More aggressive hello (1s vs. 10s) and longer dead timer (5s vs. 3s) to tolerate jitter while still converging fast.
- With 20% jitter, keepalive interval becomes 0.8–1.2 seconds; 5-second dead timer gives 3.8+ seconds of buffer before false timeout.
- Under 5% packet loss, occasional keepalives are dropped; 5-second timeout allows time for retransmission.

### 4.2 RB: Equivalent Aggressive Config

```text
RB(config)#interface GigabitEthernet0/0
RB(config-if)#ip address 2.2.2.2 255.255.255.0
RB(config-if)#no shutdown
RB(config-if)#exit

RB(config)#interface Tunnel 0
RB(config-if)#ip address 10.0.0.2 255.255.255.252
RB(config-if)#tunnel source 2.2.2.2
RB(config-if)#tunnel destination 1.1.1.1
RB(config-if)#tunnel keepalive 1 5
RB(config-if)#no shutdown
RB(config-if)#exit
```

---

## 5. Field-2 Verification Steps

### 5.1 Baseline Convergence (No Stress)

```text
RA#show interface tunnel 0
Tunnel0 is up, line protocol is up
  Internet address is 10.0.0.1 255.255.255.252
  Keepalive set (1 sec), retries 5

RA#ping 10.0.0.2
!!!!!
Success rate is 100 percent (5/5)
```

Record baseline convergence time (should be < 5 seconds for a fresh tunnel).

### 5.2 Inject Stress on WAN Link

```bash
# Linux hypervisor or GNS3:
# Add 50ms base latency ± 10ms jitter (simulates ±20% on 50ms baseline) and 5% loss
tc qdisc add dev <wan-interface> root netem delay 50ms 10ms loss 5%

# Verify:
tc qdisc show dev <wan-interface>
```

### 5.3 Trigger Tunnel Flap Under Stress

```text
RA#show clock
*16:45:23.456 UTC <-- Record timestamp

RA(config)#interface tunnel 0
RA(config-if)#shutdown
! Tunnel line protocol goes down
[RA#show interface tunnel 0 shows "Tunnel0 is up, line protocol is down"]

[Wait 5 seconds to let stress stabilize]

RA(config-if)#no shutdown
RA(config-if)#exit
! Tunnel attempts to re-establish keepalive exchange with RB
```

### 5.4 Measure Convergence Time

```text
[T=0s] RA(config-if)#no shutdown
       Tunnel0 is up, line protocol is down
       [RA is sending keepalives, waiting for RB response]

[T~2s] Tunnel0 is up, line protocol is down (still waiting)
       [Under 5% loss, some keepalives are dropped]

[T~5s] Tunnel0 is up, line protocol is up
       [RB's keepalive response finally arrives (delayed by jitter)]

RA#show clock
*16:45:28.890 UTC <-- Convergence time = 28.890 - 23.456 = ~5 seconds
```

### 5.5 Verify Post-Convergence

```text
RA#ping 10.0.0.2
!!!!!
Success rate is 100 percent (5/5)
```

### 5.6 Repeat Convergence Test 5 Times Under Stress

| Trial | Stress Level | Convergence Time | Pass/Fail (<30s) |
|---|---|---|---|
| 1 | ±20% jitter, 5% loss | 4.2s | PASS |
| 2 | ±20% jitter, 5% loss | 5.8s | PASS |
| 3 | ±20% jitter, 5% loss | 4.5s | PASS |
| 4 | ±20% jitter, 5% loss | 6.1s | PASS |
| 5 | ±20% jitter, 5% loss | 4.9s | PASS |

**PROOF OBLIGATION PASS:** All 5 trials converge within 30 seconds despite stress. Average convergence time is ~5 seconds (much faster than the 30-second target).

---

## 6. Expected Output Gallery (Field-2 Scenarios)

### Tunnel Reconvergence Under Stress

```
[Tunnel flaps at T=0s under ±20% jitter + 5% loss]

RA#show interface tunnel 0
Tunnel0 is up, line protocol is down
  Internet address is 10.0.0.1 255.255.255.252
  Encapsulation TUNNEL
  Keepalive set (1 sec), retries 5
  [RA sends keepalives every 1 second toward RB]
  [Due to jitter, some arrivals are delayed 50-60ms]
  [Due to 5% loss, ~1 in 20 packets is dropped entirely]
  [RA is waiting for any keepalive response from RB]

[T~3 seconds later]
RA#show interface tunnel 0
Tunnel0 is up, line protocol is down
  [Still waiting; jitter is causing delays, but within tolerance]

[T~5 seconds, a keepalive response finally arrives]
RA#show interface tunnel 0
Tunnel0 is up, line protocol is up
  [Line protocol transitioned to "up"; tunnel is operational]

[Verify connectivity across tunnel]
RA#ping 10.0.0.2
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echoes to 10.0.0.2, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round trip time min/avg/max = 52/56/61 ms
[Note: RTT is higher than baseline due to injected latency; jitter is visible in min/max spread]
```

---

## 7. Common Field-2 Mistakes

1. **Using default keepalive timers (10s hello, 3s dead) under jitter** → Tunnel flaps constantly under 20% jitter; a 10s keepalive becomes 8–12s, oscillating around the 3s dead timer. Result: false tunnel-down declarations every few seconds.
   - **Fix:** Reduce to `tunnel keepalive 1 5` or similar (aggressive hello, conservative dead timer).

2. **Not actually injecting stress** → Measuring "convergence time" on a perfect link proves nothing for Field-2.
   - **Fix:** Always inject stress via `tc` or GNS3 before measuring.

3. **Convergence time measured only once** → One lucky trial doesn't prove robustness under probabilistic jitter.
   - **Fix:** Repeat at least 5 times; report min/max/average.

4. **Increasing keepalive aggressiveness indefinitely** → If you set `tunnel keepalive 0.5 2` (impossible configuration), you create unnecessary traffic and don't gain convergence speed (still limited by jitter).
   - **Fix:** Find the sweet spot where convergence is fast but keepalive traffic doesn't overwhelm the stressed link.

---

## 8. Troubleshooting by Field-2 (Diagnostic Method)

**Symptom: "Tunnel keeps flapping (line protocol alternates between up and down) under stress"**

```text
Step 1: What are the keepalive settings?
  show interface tunnel 0 | include "Keepalive"
  → If "Keepalive set (10 sec), retries 3", these are too conservative. Change to "1 5".

Step 2: Are keepalive packets being lost?
  debug tunnel keepalive (limited to 10 seconds)
  → Should see "Keepalive sent" every 1 second on RA and "Keepalive reply received" intermittently. 
    If you see long gaps (> 5s) without replies, keepalive is timing out.

Step 3: Is the dead timer too aggressive?
  → If you set "tunnel keepalive 1 2" (1s hello, 2s dead), jitter can easily cause false timeouts. 
    Increase dead timer to 5s or 6s.

Step 4: Is the WAN link actually up?
  ping 2.2.2.2 (from RA)
  → If ping times out, WAN link is down (not just jitter). Verify underlying interface is up.

Step 5: Measure jitter on WAN link
  [Use tc to measure latency variance, or check interface statistics]
  → If jitter is > 30%, keepalive timers need adjustment upward (more conservative).
```

**Symptom: "Convergence takes > 30 seconds under stress"**

```text
Step 1: Did you measure before or after injecting stress?
  → Without stress, convergence should be < 5s. With stress, it may be 5–30s. 
    Measure with stress applied.

Step 2: What is the actual jitter and loss on the WAN link?
  [Check stress injection settings in tc or GNS3]
  → If you're injecting ±50% jitter (unrealistic), no keepalive timer will work well. 
    Use ±20% as specified in Field-2.

Step 3: Are both tunnel endpoints alive?
  ping 2.2.2.2 (from RA) and ping 1.1.1.1 (from RB)
  → If either fails, tunnel can't converge. WAN link may be completely down.

Step 4: Increase keepalive aggressiveness slightly
  tunnel keepalive 0.5 5   (send more frequently, but keep dead timer high)
  → This might speed convergence, but watch for excessive keepalive traffic.
```

---

## 9. Design Analysis: Field-2 Reasoning

**Why does this field-specific topology matter for geomagnetic resilience?**

Geomagnetic storms introduce predictable jitter and loss on RF links. A GRE tunnel designed for wired networks (low jitter, rare loss) needs different keepalive timers for RF networks (high jitter, moderate loss).

This variant proves that with tuned keepalive intervals, tunnel convergence remains fast even under atmospheric noise. For Haiti P38, this means:
- RF-based WAN links degrade predictably during geomagnetic events
- Tunnels still converge within 30 seconds (user-acceptable failover time)
- No manual intervention needed

---

## 10. Real-World Parallel: Haiti Deployment Phase

**P38 Pilot — RF-Based Mesh Connectivity**

In P38, hotspots are connected via RF (not fiber). During geomagnetic events, RF link quality degrades (NOAA K-index 5–8). This lab proves tunnels can converge reliably under those conditions.

Before P38 deployment, these convergence benchmarks inform SLAs: "During K7 events, expect tunnel failover delays up to 15–20 seconds; this is expected."

---

## 11. Stretch Goals: Advanced Proof Obligations

1. **Convergence under sustained jitter:** Inject ±20% jitter for 1 hour continuously; measure convergence time during 10 random flaps. Verify all 10 converge within 30 seconds.

2. **Adaptive keepalive tuning:** Implement a mechanism where routers dynamically adjust keepalive intervals based on measured RTT variance. Prove convergence stays < 30s even if jitter increases to ±30%.

3. **Packet-capture analysis:** During convergence, capture keepalive packets. Analyze timing to identify the critical path (which keepalive response finally triggers line-protocol transition).

4. **Scalability:** Extend to a 3-hop tunnel chain (A–B–C). Measure total convergence time. Verify < 30 seconds even with cumulative jitter on each hop.

---

## 12. Self-Assessment (Field-2 BSL)

```
BSL-0 AWARENESS      - You've read this lab once. You couldn't replicate it.
BSL-1 LAB CAPABLE    - You completed this lab with the manual open; convergence test worked.
BSL-2 OFFLINE        - You could repeat this lab with the manual; you remember to inject stress.
BSL-3 RECOVERABLE    - You could rebuild this lab from the topology diagram; given geomagnetic scenarios, 
                        you'd know to tune keepalive timers aggressively.
BSL-4 MAINTAINABLE   - You could adjust keepalive timers for different jitter models and prove 
                        convergence still holds.
BSL-5 TEACHABLE      - You could teach why default GRE keepalive timers fail under geomagnetic jitter, 
                        and how to tune for RF-based WAN links.

Target BSL for this lab: 3–4
```

---

**Push this file via Python payload JSON to RedjiJB-Labs/Day-53-Field-2-Lab.md**
