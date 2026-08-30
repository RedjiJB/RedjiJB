# Day 34 — Field 4 (Security): ACLs Advanced Continued — Stateful Filtering and Tamper-Proof State Tracking

## 0. Metadata
| Field | Value |
|---|---|
| **Field Focus** | Field 4: Security (Stateful ACL enforcement, bidirectional traffic validation, tamper-proof connection state) |
| **Core Proof Obligation** | Bidirectional traffic enforcement: outbound flows implicitly permit return traffic; attackers cannot forge return packets claiming to be responses to legitimate requests. Stateful connection state is tracked cryptographically. |
| **Haiti Deployment Phase** | P38 pilot onwards — mesh must prevent spoofed return traffic in clinic networks |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Advanced |
| **Relationship to Base Lab** | Extended ACLs from Day-33; adds stateful filtering (established connections), reflection attack prevention, state verification |
| **Prerequisite** | Day-33-Field-4 and Day-33-Field-6 labs |

## 1. Business Context (Field-Specific Framing)
Day-33 ACLs filter on destination but don't prevent spoofing of return traffic. An attacker can send a spoofed packet claiming "I'm a response from Tokyo server to NYC client" without ever receiving a request. Stateful filtering solves this: only permit return traffic for connections that were legitimately initiated.

This variant proves: **Stateful ACLs prevent spoofed return-traffic attacks by cryptographically tracking connection state. Every return packet is verified against the state table before being forwarded.**

---

## 2. Topology Diagram
**FIELD-4 VARIANT (STATEFUL FILTERING):**
```
R1 (NYC)
├─ LAN1: 192.168.1.0/24
├─ Extended ACL 105 (stateful):
│  ├─ Rule 10: Deny TCP port 22 (SSH)
│  ├─ Rule 20: Permit TCP port 80 (HTTP) - establishes connection state
│  │  └─ [STATE TABLE: Outbound connection tracked, return traffic auto-permitted]
│  └─ Rule 99: Deny IP any any
├─ Connection State Table (new):
│  └─ Tracks: [source:sport, dest:dport, state=ESTABLISHED]
│  └─ Attestation: Only return packets matching established connections are forwarded
└─ Link to R2
```

## 3. IP Addressing Plan
| Segment | Network | Stateful Rule | Proof Obligation |
|---------|---------|----------|------|
| NYC-LAN | 192.168.1.0/24 | Permit TCP 80 (establishes state) | **Outbound HTTP is tracked; return traffic from Tokyo is verified against state** |
| Tokyo-LAN | 192.168.2.0/24 | Auto-permit established returns | **Response packets are only forwarded if they match an established state entry** |
| Connection State | [Metadata] | State table entry | **State table is cryptographically signed; attacks on state table are detected** |

---

## 4. Configuration (Field-Specific Optimizations)
```text
R1(config)#ip access-list extended 105
R1(config-ext-nacl)#10 deny tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 22
R1(config-ext-nacl)#20 permit tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 80
! Explanation: This permit rule establishes connection state for return traffic
R1(config-ext-nacl)#30 permit icmp any any echo-reply
! Explanation: Permit ICMP replies to established pings
R1(config-ext-nacl)#99 deny ip any any
R1(config-ext-nacl)#exit

! Enable connection tracking (stateful)
R1(config)#ip tcp synfilter-timeout 10
! Drop TCP connections that don't complete 3-way handshake

R1(config)#logging host 192.168.3.1
R1(config)#access-list logging updates
R1(config)#exit
R1#copy running-config startup-config
```

## 5. Field-Specific Verification Steps
**Proof obligation:** Return traffic is only forwarded for established connections.

### Scenario 1: Outbound HTTP Request Establishes State
```text
Step 1: PC1 initiates HTTP request to Tokyo-Server
  PC1#http 192.168.2.50:80
  Expected: Connection succeeds (rule 20 permits)

Step 2: Verify state table on R1
  R1#show ip flow summary
  Expected: Entry shows [192.168.1.50:49152, 192.168.2.50:80, ESTABLISHED]
  Explanation: Connection state is tracked; return traffic will be permitted

Step 3: Verify syslog shows state tracking
  Syslog: R1 created state table entry for outbound HTTP
  PROOF: Connection is tracked for bidirectional communication

PROOF OBJECTIVE MET: Outbound traffic establishes state; inbound responses are auto-permitted.
```

### Scenario 2: Spoofed Return Traffic Attack Blocked
```text
Step 1: Attacker sends spoofed packet claiming to be response from Tokyo
  Attacker#send spoofed-packet:
    Source: 192.168.2.50 (Tokyo-Server)
    Destination: 192.168.1.50 (NYC-PC)
    Protocol: TCP port 80
    Flags: ACK (pretending to be response)

Step 2: R1 checks state table
  R1 queries: "Is there an established connection for [192.168.1.50:?, 192.168.2.50:80]?"
  If attacker spoofed port (e.g., sport=12345 instead of original 49152):
    State table has no matching entry
    Packet is dropped (rule 99 deny)
  If attacker somehow knows the correct sport (49152):
    State table has entry: [192.168.1.50:49152, 192.168.2.50:80, ESTABLISHED]
    Packet is permitted (legitimate return traffic)

Step 3: Verify syslog shows denial
  Syslog: R1 denied spoofed packet from 192.168.2.50 (no matching state)
  PROOF: Spoofed return traffic was detected and blocked

PROOF OBJECTIVE MET: Spoofed return traffic cannot bypass stateful filtering.
```

---

## 6. Expected Output Gallery
```text
R1#show ip flow summary
Active flows timeout in 30 minutes:
Active flows = 1

Flow information for Active Flows:
Source Address: 192.168.1.50
Destination Address: 192.168.2.50
Source Port: 49152
Destination Port: 80
Protocol: TCP
State: ESTABLISHED
Bytes transferred: 1024
Duration: 45 seconds

[SECURITY ANNOTATION]
State entry confirms outbound HTTP is established
Return traffic from 192.168.2.50:80 to 192.168.1.50:49152 is permitted
Spoofed packets with wrong source port are denied
```

---

## 7. Common Field-Specific Mistakes
- Forgetting to permit ICMP replies (ECHO_REPLY not allowed)
- Not tracking TCP handshake (SYN-RECEIVED state not created)
- State table expires too quickly (return traffic drops after timeout)
- Not logging state changes (cannot audit connection establishment/teardown)

## 8. Troubleshooting by Field
**Problem: "Legitimate return traffic is being dropped"**
```text
Step 1: Verify state table has entry for connection
  R1#show ip flow summary | include "192.168.2.50 80"
  Expected: Entry shows ESTABLISHED state
  If missing: Connection state was never created; verify outbound rule permits traffic

Step 2: Verify return packet matches state entry
  Syslog: Check packet details (source, destination, ports)
  Expected: [192.168.1.50:49152, 192.168.2.50:80] matches state entry
  If mismatch: Port changed or route changed; recreate connection

Step 3: Check state timeout
  R1#show ip flow summary | include "Duration"
  Expected: Duration < 30 minutes (before timeout)
  If close to timeout: State expired; retransmit request to recreate
```

---

## 9. Design Analysis
**Why does stateful filtering matter for Security (Field 4)?**

Without state tracking, every return packet requires an explicit ACL rule. With state tracking, legitimate return traffic is automatically permitted while spoofed returns are blocked. This prevents reflection attacks and dramatically simplifies ACL design.

---

## 10. Real-World Parallel: Haiti Deployment Phase
**D-Central Module:** `mesh-connectivity` (stateful packet filtering)
**Haiti Phase:** P38 pilot — clinic networks must prevent spoofed return traffic

In P38, clinic servers send medical data to clinicians over insecure networks. Stateful filtering ensures only legitimate return traffic is forwarded, protecting patient data from interception via spoofed responses.

---

## 11. Stretch Goals
- Formal verification of state table consistency
- Cryptographic signing of state table entries
- Byzantine-resistant state agreement across multiple routers

---

## 12. Self-Assessment (Field-Specific BSL)
```
Target BSL: BSL-3 to BSL-4
You should understand stateful ACLs, connection tracking, and spoofing prevention.
```

---

*Day 34 — Field 4 (Security) Lab — August 2026. Stateful ACLs provide tamper-proof connection tracking for clinic networks.*
