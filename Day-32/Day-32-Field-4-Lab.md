# Day 32 — Field 4 (Security): OSPFv3 Routing with Cryptographic Authentication and Attestation

---

## 0. Metadata

| Field | Value |
|---|---|
| **Field Focus** | Field 4: Security Systems (Cryptographic Authentication, Routing Attestation, Tamper-Proof Routing Decisions) |
| **Core Proof Obligation** | OSPFv3 routing decisions must be cryptographically authenticated; a router's routing table is verified to be the result of legitimate OSPF messages signed by known neighbors, not forged by attackers. |
| **Haiti Deployment Phase** | P34 (security foundational), P38 pilot onwards — mesh routing must resist Byzantine attacks and spoofed OSPF advertisements. |
| **Estimated Time** | 3–4 hours (includes OSPF authentication configuration, routing verification, and tamper-detection scenarios) |
| **Difficulty** | Advanced |
| **Relationship to Base Lab** | Same three-router OSPFv3 topology (Day-32 base); adds OSPF message authentication (MD5/SHA), routing-decision attestation, and Byzantine attack detection. Tests that routing decisions are verifiable as legitimate. |
| **Prerequisite** | Complete Day-31-Field-4-Lab.md (IPv6 cryptographic identity) and Day-32-Research-Paper.md (OSPFv3 basics). Familiarity with OSPF message format and authentication concepts helpful. |

---

## 1. Business Context (Field-Specific Framing)

In Day-31, we proved that device identity is cryptographically tied to MAC addresses via IPv6 EUI-64. But identity alone is not enough — a device must use its identity to make trustworthy decisions.

**The problem:** An attacker on the mesh can forge OSPF routing advertisements, claiming to offer a path to a subnet that doesn't exist (or does exist but with lower cost). If OSPF routers accept these forged advertisements without verification, routing decisions become unreliable. A compromised node can redirect traffic, intercept sensitive data, or cause network partitions.

**Without authentication:**
```
Attacker broadcasts: "I have a route to 2001:DB8:0:2::/64 with metric 1 (very good!)"
Legitimate router (R3) broadcasts: "I have a route to 2001:DB8:0:2::/64 with metric 10"
OSPF selects: Attacker's route (lower metric)
Result: All traffic destined for 2001:DB8:0:2::/64 is routed to the attacker
```

This variant proves the hypothesis: **OSPF routing decisions can be cryptographically authenticated. Every OSPF message is signed by the sending router; receiving routers verify the signature before accepting the route. Routing tables become attestations: "I chose this route because Router X (MAC AA:BB:CC:00:00:01) signed this OSPF message with key shared via Day-31 device identity."**

This proof unblocks P34 (security foundational) and P38 (pilot deployment) by proving: "Mesh routing is Byzantine-resistant when every router's identity is tied to its MAC (Day-31) and every routing message is signed by that MAC-identified device (Day-32)."

---

## 2. Topology Diagram (Field-Specific Modifications)

**BASE TOPOLOGY (Day-32-Research-Paper):**
```
R1 (2001:DB8:0:1::1/64)
├─ LAN1: 2001:DB8:0:1::/64
├─ Link to R2 (via Gi0/1)
└─ Link to R3 (via Gi0/2)

R2 (2001:DB8:0:2::2/64)
├─ LAN2: 2001:DB8:0:2::/64
├─ Link to R1
└─ Link to R3

R3 (2001:DB8:0:3::3/64)
├─ LAN3: 2001:DB8:0:3::/64
├─ Link to R1
└─ Link to R2

OSPF Area 0: All three routers in single area
```

**FIELD-4 VARIANT (CRYPTOGRAPHIC ROUTING AUTHENTICATION):**
```
AUTHENTICATION LAYER (NEW):

R1 (Identity: MAC AA:BB:CC:00:00:01, IPv6: 2001:DB8:0:1::1)
├─ OSPF Interface Key: shared-key-1 (derived from device identity + pre-shared secret)
├─ LAN1: 2001:DB8:0:1::/64 (advertised with MD5 signature)
├─ [Secured Link to R2] MD5 authenticate all OSPF messages
└─ [Secured Link to R3] MD5 authenticate all OSPF messages
   └─ [ATTESTATION: Every routing decision is signed proof of device identity]

R2 (Identity: MAC BB:BB:CC:00:00:02, IPv6: 2001:DB8:0:2::2)
├─ OSPF Interface Key: shared-key-2
├─ LAN2: 2001:DB8:0:2::/64 (advertised with MD5 signature)
├─ [Secured Link to R1] MD5 authenticate
└─ [Secured Link to R3] MD5 authenticate
   └─ [ATTESTATION: R2's routing claims are verified to come from R2's identity]

R3 (Identity: MAC CC:BB:CC:00:00:03, IPv6: 2001:DB8:0:3::3)
├─ OSPF Interface Key: shared-key-3
├─ LAN3: 2001:DB8:0:3::/64 (advertised with MD5 signature)
├─ [Secured Link to R1] MD5 authenticate
└─ [Secured Link to R2] MD5 authenticate
   └─ [ATTESTATION: All routes learned via R3 are cryptographically verified]

OSPF Area 0 with Authentication:
- R1 ↔ R2: MD5 key-id 1, key "shared-secret-r1-r2"
- R1 ↔ R3: MD5 key-id 2, key "shared-secret-r1-r3"
- R2 ↔ R3: MD5 key-id 3, key "shared-secret-r2-r3"

SECURITY GUARANTEE:
- Forged OSPF messages without correct MD5 signature are dropped
- Routing table is attestation: "This route was learned from Router X because Router X signed the OSPF update"
- Byzantine router cannot inject routes without its identity being revealed
```

---

## 3. IP Addressing Plan (Field-Specific Annotations)

| Segment | IPv6 Network | Router Identity (MAC) | Cryptographic Key | Attestation Obligation |
|---------|------------|--------|--------|------|
| LAN1 | 2001:DB8:0:1::/64 | R1: AA:BB:CC:00:00:01 | shared-key-1 (MD5) | **R1's LAN1 advertisement is signed by R1's key; receivers verify signature to trust the route** |
| LAN2 | 2001:DB8:0:2::/64 | R2: BB:BB:CC:00:00:02 | shared-key-2 (MD5) | **R2's LAN2 advertisement is signed by R2's key; route is trusted iff signature matches R2's known key** |
| LAN3 | 2001:DB8:0:3::/64 | R3: CC:BB:CC:00:00:03 | shared-key-3 (MD5) | **R3's LAN3 advertisement is signed by R3's key; Byzantine routers cannot forge R3's signature** |
| R1-R2 Link | 2001:DB8:0:10::/64 | R1 ↔ R2 | "shared-secret-r1-r2" (MD5) | **OSPF adjacency requires MD5 authentication; unauthenticated hellos are dropped** |
| R1-R3 Link | 2001:DB8:0:20::/64 | R1 ↔ R3 | "shared-secret-r1-r3" (MD5) | **OSPF adjacency requires MD5 authentication; rogue routers cannot form adjacencies** |
| R2-R3 Link | 2001:DB8:0:30::/64 | R2 ↔ R3 | "shared-secret-r2-r3" (MD5) | **OSPF adjacency requires MD5 authentication; tamper detection via signature mismatch** |

**Critical design choice:** Each router's identity (MAC address) is bound to a cryptographic key used to sign OSPF messages. Receiving routers verify signatures before accepting routing updates. This transforms OSPF from "accept any update that has the right format" to "accept only updates signed by known routers."

---

## 4. Configuration (Field-Specific Optimizations)

### 4.1 Router-1 (R1): OSPF with MD5 Authentication

```text
! ===== ENABLE IPv6 ROUTING AND OSPF =====
R1(config)#ipv6 unicast-routing
! Explanation: Global IPv6 forwarding (same as Day-31)

! ===== CONFIGURE OSPF PROCESS =====
R1(config)#ipv6 router ospf 1
! Start OSPFv3 process ID 1

R1(config-rtr)#router-id 1.1.1.1
! Set router-id (can be any 32-bit value; here using 1.1.1.1 for R1)
! Explanation: OSPF uses this as the router's identity in routing advertisements
! Proof obligation: Router-ID should match device identity for accountability

R1(config-rtr)#exit

! ===== INTERFACE CONFIGURATION: LAN1 =====
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ipv6 address 2001:DB8:0:1::1/64
R1(config-if)#ipv6 enable

! Enable OSPF on this interface
R1(config-if)#ipv6 ospf 1 area 0
! Explanation: Add this interface to OSPF process 1, area 0

! Configure MD5 authentication for OSPF
R1(config-if)#ipv6 ospf message-digest-key 1 md5 shared-secret-r1-lan1
! Explanation: Set key-id 1, algorithm MD5, key "shared-secret-r1-lan1"
! Proof obligation: All OSPF Hello/DBD/LSU packets on this interface are now signed with this key
! Receivers will drop any OSPF packets without matching MD5 signature

R1(config-if)#ipv6 ospf authentication message-digest
! Explanation: Enable message-digest (MD5) authentication mode for this interface

R1(config-if)#no shutdown
R1(config-if)#exit

! ===== INTERFACE CONFIGURATION: Link to R2 (LAN1->R2) =====
R1(config)#interface GigabitEthernet0/1
R1(config-if)#ipv6 address 2001:DB8:0:10::1/64
R1(config-if)#ipv6 enable
R1(config-if)#ipv6 ospf 1 area 0
! Configure authentication for R1-R2 link
R1(config-if)#ipv6 ospf message-digest-key 1 md5 shared-secret-r1-r2
! Explanation: This link uses a different key than LAN1 (per-link key)
! Proof obligation: Only R2 (which knows shared-secret-r1-r2) can form an OSPF adjacency here
R1(config-if)#ipv6 ospf authentication message-digest
R1(config-if)#no shutdown
R1(config-if)#exit

! ===== INTERFACE CONFIGURATION: Link to R3 (LAN1->R3) =====
R1(config)#interface GigabitEthernet0/2
R1(config-if)#ipv6 address 2001:DB8:0:20::1/64
R1(config-if)#ipv6 enable
R1(config-if)#ipv6 ospf 1 area 0
R1(config-if)#ipv6 ospf message-digest-key 1 md5 shared-secret-r1-r3
R1(config-if)#ipv6 ospf authentication message-digest
R1(config-if)#no shutdown
R1(config-if)#exit

! ===== SAVE CONFIGURATION =====
R1(config)#exit
R1#copy running-config startup-config
```

**Justification for Field 4:**
- `ipv6 ospf message-digest-key` configures MD5 per-interface authentication. Every OSPF packet (Hello, Database Description, Link State Update) is signed with the configured key.
- `ipv6 ospf authentication message-digest` enables the authentication mode.
- Different keys per-link (shared-secret-r1-r2 vs shared-secret-r1-r3) ensure that if R2's key is compromised, R3's adjacency with R1 is unaffected.
- This cryptographic binding means: "Any OSPF message received on the R1-R2 link with a valid MD5 signature came from a device that knows shared-secret-r1-r2." If R2 is the only device that knows this key, the message came from R2.

### 4.2 Router-2 (R2) and Router-3 (R3): Similar Configuration

```text
! ===== ROUTER-2 (R2) =====
R2(config)#ipv6 unicast-routing
R2(config)#ipv6 router ospf 1
R2(config-rtr)#router-id 2.2.2.2
R2(config-rtr)#exit

R2(config)#interface GigabitEthernet0/0
R2(config-if)#ipv6 address 2001:DB8:0:2::2/64
R2(config-if)#ipv6 enable
R2(config-if)#ipv6 ospf 1 area 0
R2(config-if)#ipv6 ospf message-digest-key 1 md5 shared-secret-r2-lan2
R2(config-if)#ipv6 ospf authentication message-digest
R2(config-if)#no shutdown
R2(config-if)#exit

! Link to R1
R2(config)#interface GigabitEthernet0/1
R2(config-if)#ipv6 address 2001:DB8:0:10::2/64
R2(config-if)#ipv6 enable
R2(config-if)#ipv6 ospf 1 area 0
R2(config-if)#ipv6 ospf message-digest-key 1 md5 shared-secret-r1-r2
! Key matches R1's configuration (shared-secret-r1-r2)
! Explanation: Both sides must agree on the key for adjacency to form
R2(config-if)#ipv6 ospf authentication message-digest
R2(config-if)#no shutdown
R2(config-if)#exit

! Link to R3
R2(config)#interface GigabitEthernet0/2
R2(config-if)#ipv6 address 2001:DB8:0:30::2/64
R2(config-if)#ipv6 enable
R2(config-if)#ipv6 ospf 1 area 0
R2(config-if)#ipv6 ospf message-digest-key 1 md5 shared-secret-r2-r3
R2(config-if)#ipv6 ospf authentication message-digest
R2(config-if)#no shutdown
R2(config-if)#exit

! ===== ROUTER-3 (R3) =====
R3(config)#ipv6 unicast-routing
R3(config)#ipv6 router ospf 1
R3(config-rtr)#router-id 3.3.3.3
R3(config-rtr)#exit

R3(config)#interface GigabitEthernet0/0
R3(config-if)#ipv6 address 2001:DB8:0:3::3/64
R3(config-if)#ipv6 enable
R3(config-if)#ipv6 ospf 1 area 0
R3(config-if)#ipv6 ospf message-digest-key 1 md5 shared-secret-r3-lan3
R3(config-if)#ipv6 ospf authentication message-digest
R3(config-if)#no shutdown
R3(config-if)#exit

! Link to R1
R3(config)#interface GigabitEthernet0/1
R3(config-if)#ipv6 address 2001:DB8:0:20::3/64
R3(config-if)#ipv6 enable
R3(config-if)#ipv6 ospf 1 area 0
R3(config-if)#ipv6 ospf message-digest-key 1 md5 shared-secret-r1-r3
! Same key as R1's outgoing link to R3
R3(config-if)#ipv6 ospf authentication message-digest
R3(config-if)#no shutdown
R3(config-if)#exit

! Link to R2
R3(config)#interface GigabitEthernet0/2
R3(config-if)#ipv6 address 2001:DB8:0:30::3/64
R3(config-if)#ipv6 enable
R3(config-if)#ipv6 ospf 1 area 0
R3(config-if)#ipv6 ospf message-digest-key 1 md5 shared-secret-r2-r3
R3(config-if)#ipv6 ospf authentication message-digest
R3(config-if)#no shutdown
R3(config-if)#exit

R3(config)#exit
R3#copy running-config startup-config
```

---

## 5. Field-Specific Verification Steps

**Proof obligation:** OSPF routing decisions are cryptographically authenticated. Every route in the routing table can be traced to an OSPF message signed by a known router. Spoofed messages are rejected.

### Scenario 1: OSPF Adjacency Formation with MD5 Authentication

```text
Step 1: Verify OSPF process is running on R1
  R1#show ipv6 ospf neighbor
  Expected: Initially empty (neighbors not yet formed)

Step 2: Wait for OSPF Hello exchange and adjacency formation
  ! After ~10 seconds, OSPF Hello packets are exchanged
  ! If MD5 keys match, adjacencies form; if keys don't match, adjacencies fail

Step 3: Verify adjacencies have formed
  R1#show ipv6 ospf neighbor
  Expected output:
    Neighbor ID     Pri   State        Dead Time   Interface
    2.2.2.2         1     FULL         38          Gi0/1
    3.3.3.3         1     FULL         38          Gi0/2
  
  PROOF OBJECTIVE: Adjacencies formed means MD5 signatures were verified on both sides
  (If keys didn't match, this "FULL" state would not be reached)

Step 4: Verify each adjacency used the correct authentication
  R1#debug ipv6 ospf hello
  ! (Run for 10 seconds, then disable)
  R1#undebug all
  Expected in debug output: "MD5 authentication successful" messages
  (If MD5 failed, you'd see "authentication failed" and adjacencies wouldn't form)

PROOF OBJECTIVE MET: All adjacencies authenticated via MD5; routing is trusted.
```

### Scenario 2: Routing Table Attestation (Routes from Known Sources)

```text
Step 1: Allow OSPF to converge
  ! After 30–60 seconds, all routes should be learned and installed

Step 2: Verify R1's routing table shows learned routes
  R1#show ipv6 route
  Expected output:
    O   2001:DB8:0:2::/64 [110/1] via 2001:DB8:0:10::2, Gi0/1
        (Learned from R2 via link Gi0/1; metric 1)
    O   2001:DB8:0:3::/64 [110/1] via 2001:DB8:0:20::3, Gi0/2
        (Learned from R3 via link Gi0/2; metric 1)
    C   2001:DB8:0:1::/64 [0/0] via Gi0/0, directly connected
        (Connected route; not learned)

Step 3: Trace route back to source router
  For route "2001:DB8:0:2::/64 via Gi0/1":
    - Interface Gi0/1 is the R1-R2 link
    - Key used: shared-secret-r1-r2
    - Router-ID 2.2.2.2 (R2) sent this route
    - Signature verified: MD5(shared-secret-r1-r2, OSPF-message) = [correct]
  
  ATTESTATION: R1's routing table proves: "I have route 2001:DB8:0:2::/64 because
    Router 2 (ID 2.2.2.2) sent me an OSPF update signed with our shared key.
    The signature is valid, so I trust this route came from R2."

Step 4: Verify no alternative routes are present
  R1#show ipv6 route | include "2001:DB8:0:2"
  Expected: Only one route shown (from R2)
  If multiple routes shown: OSPF is accepting updates from multiple sources
  (OK if intentional; problem if unexpected)

PROOF OBJECTIVE MET: Every route in the table is traceable to an authenticated source.
```

### Scenario 3: Byzantine Attack Detection (Forged OSPF Message)

```text
Step 1: Simulate a rogue router advertising a route with wrong signature
  ! In a real scenario, a compromised router or external attacker would forge an OSPF message
  ! Configuration for this lab: manually disable authentication on one interface, inject a test message

Step 2: Disable authentication on R2-R3 link (simulating compromised R2)
  ! (For simulation only; in production, never disable authentication)
  R2#configure terminal
  R2#interface Gi0/2
  R2(config-if)#no ipv6 ospf authentication message-digest
  ! Now R2 sends unauthenticated OSPF on the R2-R3 link
  R2(config-if)#exit

Step 3: Observe OSPF behavior on R3
  R3#show ipv6 ospf neighbor | include "2.2.2.2"
  Expected: Neighbor 2.2.2.2 shows "INIT" or "DOWN" state (not "FULL")
  Reason: R3 drops unauthenticated Hello packets from R2 because authentication is required
  
  This proves: R3 rejects R2's messages if they lack valid MD5 signature

Step 4: Re-enable authentication on R2
  R2#configure terminal
  R2#interface Gi0/2
  R2(config-if)#ipv6 ospf authentication message-digest
  R2(config-if)#exit

Step 5: Verify adjacency recovers
  R3#show ipv6 ospf neighbor | include "2.2.2.2"
  Expected after ~30 seconds: Neighbor 2.2.2.2 shows "FULL" state
  Proof: R3 re-accepts R2's messages once they're authenticated again

PROOF OBJECTIVE MET: Byzantine attack (forged OSPF message without signature) is detected and rejected.
```

### Scenario 4: Key Compromise Scenario (Tamper Detection)

```text
Step 1: Simulate key compromise: change R2's authentication key
  R2#configure terminal
  R2#interface Gi0/1
  R2(config-if)#no ipv6 ospf message-digest-key 1 md5 shared-secret-r1-r2
  R2(config-if)#ipv6 ospf message-digest-key 1 md5 wrong-key-12345
  ! R1 still has shared-secret-r1-r2; R2 now has wrong-key-12345
  R2(config-if)#exit

Step 2: Observe OSPF behavior on R1
  R1#show ipv6 ospf neighbor | include "2.2.2.2"
  Expected: Neighbor 2.2.2.2 shows "DOWN" or "INIT" (not "FULL")
  Reason: R1 drops R2's Hello packets because MD5(wrong-key-12345) ≠ MD5(shared-secret-r1-r2)

Step 3: Verify route to 2001:DB8:0:2::/64 is removed
  R1#show ipv6 route | include "2001:DB8:0:2"
  Expected: Route is absent or shown as unreachable
  Reason: Adjacency with R2 is down; route learned from R2 is no longer trusted

Step 4: Restore correct key on R2
  R2#configure terminal
  R2#interface Gi0/1
  R2(config-if)#no ipv6 ospf message-digest-key 1 md5 wrong-key-12345
  R2(config-if)#ipv6 ospf message-digest-key 1 md5 shared-secret-r1-r2
  R2(config-if)#exit

Step 5: Verify adjacency and route recover
  R1#show ipv6 ospf neighbor | include "2.2.2.2"
  Expected after ~30 seconds: "FULL" state restored
  
  R1#show ipv6 route | include "2001:DB8:0:2"
  Expected: Route reappears

PROOF OBJECTIVE MET: Key compromise is immediately detected; routing is interrupted until keys are corrected.
```

---

## 6. Expected Output Gallery (Field-Specific Scenarios)

### 6.1 OSPF Adjacency with MD5 Authentication

```text
R1#show ipv6 ospf neighbor

Neighbor ID     Pri   State        Dead Time   Interface Instance ID
2.2.2.2         1     FULL         35          GigabitEthernet0/1 0
3.3.3.3         1     FULL         35          GigabitEthernet0/2 0

[SECURITY NOTATION]
Adjacency to 2.2.2.2 (R2):
  Authentication: MD5, key-id 1
  Status: FULL (Fully Adjacent)
  Proof: This neighbor is authenticated via shared-secret-r1-r2

Adjacency to 3.3.3.3 (R3):
  Authentication: MD5, key-id 1
  Status: FULL (Fully Adjacent)
  Proof: This neighbor is authenticated via shared-secret-r1-r3
```

### 6.2 Routing Table with Route Attestation

```text
R1#show ipv6 route

IPv6 Routing Table - 5 entries
Codes: C - Connected, L - Local, S - Static, R - RIP, B - BGP, D - EIGRP, EX - EIGRP external, O - OSPF Intra, OI - OSPF Inter, OE1 - OSPF ext 1, OE2 - OSPF ext 2

C  2001:DB8:0:1::/64 [0/0]
     via Gi0/0, directly connected
O  2001:DB8:0:2::/64 [110/1]
     via 2001:DB8:0:10::2, Gi0/1
     [Route authenticated from R2 via shared-secret-r1-r2]
O  2001:DB8:0:3::/64 [110/1]
     via 2001:DB8:0:20::3, Gi0/2
     [Route authenticated from R3 via shared-secret-r1-r3]

[ATTESTATION SUMMARY]
Route to 2001:DB8:0:2::/64:
  Source: R2 (router-id 2.2.2.2)
  Via: Link GigabitEthernet0/1 (shared-secret-r1-r2)
  Authentication: MD5 verified
  Status: TRUSTED (Cryptographically verified to come from R2)
```

### 6.3 Debug Output: MD5 Authentication Success

```text
R1#debug ipv6 ospf hello
OSPFv3 hello debugging is on

[OSPF Hello received on Gi0/1]
Hello from 2.2.2.2 (R2), length 40 bytes
Neighbor IP FE80::2
Auth Type: Message Digest, Key ID 1
MD5 Digest: [A3F7E1BC...] (40 bytes)
MD5 Verification: PASS ✓
Auth Key: shared-secret-r1-r2 (matched)

[OSPF Hello received on Gi0/2]
Hello from 3.3.3.3 (R3), length 40 bytes
Neighbor IP FE80::3
Auth Type: Message Digest, Key ID 1
MD5 Digest: [7F9C2B...] (40 bytes)
MD5 Verification: PASS ✓
Auth Key: shared-secret-r1-r3 (matched)

[Authentication Status: All neighbors verified]
```

---

## 7. Common Field-Specific Mistakes

### Mistake 1: Mismatched Authentication Keys Between Neighbors

**What breaks:**
```text
R1 configuration:
  interface Gi0/1
    ipv6 ospf message-digest-key 1 md5 shared-secret-r1-r2

R2 configuration:
  interface Gi0/1
    ipv6 ospf message-digest-key 1 md5 WRONG-SECRET

Result:
  R1#show ipv6 ospf neighbor
  ! Neighbor 2.2.2.2 shows "DOWN" state
  ! OSPF messages from R2 are rejected (MD5 signature doesn't match)
```

**Why:** OSPF MD5 authentication requires both sides to share the same key. If the key is different, the MD5 digest won't match, and Hello packets are silently dropped.

**Fix:** Ensure both routers have identical keys:
- R1: `ipv6 ospf message-digest-key 1 md5 shared-secret-r1-r2`
- R2: `ipv6 ospf message-digest-key 1 md5 shared-secret-r1-r2` (same exact string)

### Mistake 2: Forgetting to Enable Authentication on Both Interfaces

**What breaks:**
```text
R1#interface Gi0/1
R1#ipv6 ospf message-digest-key 1 md5 shared-secret-r1-r2
! Forgot to run: ipv6 ospf authentication message-digest

Result:
  R1 sends Hello packets WITHOUT authentication
  R2 expects authenticated packets and drops R1's Hellos
  Adjacency fails
```

**Why:** Configuring a key is not sufficient; you must also enable the authentication mode with `ipv6 ospf authentication message-digest`.

**Fix:** Always run both commands:
```
ipv6 ospf message-digest-key 1 md5 [key]
ipv6 ospf authentication message-digest
```

### Mistake 3: Different Authentication Methods on Same Link

**What breaks:**
```text
R1#interface Gi0/1
R1(config-if)#ipv6 ospf authentication message-digest
! R1 expects MD5

R2#interface Gi0/1
R2(config-if)#ipv6 ospf authentication null
! R2 expects no authentication (null auth)

Result:
  R1 and R2 send Hellos with different authentication types
  Adjacency fails to form
```

**Why:** OSPF adjacency requires both sides to use the same authentication type and key.

**Fix:** Ensure all neighbors on a link use the same authentication method and key.

### Mistake 4: Not Saving Configuration After MD5 Setup

**What breaks:**
```text
R1#configure terminal
R1(config)#interface Gi0/1
R1(config-if)#ipv6 ospf message-digest-key 1 md5 shared-secret-r1-r2
R1(config-if)#ipv6 ospf authentication message-digest
! (Forget to save)
R1#reload

! After reboot, MD5 configuration is lost from NVRAM
! Adjacency fails because authentication is no longer configured
```

**Why:** Running-config is lost if the router reloads before saving to startup-config.

**Fix:** Always save after configuration: `copy running-config startup-config`

### Mistake 5: Mixing Authentication Keys Across Different Links

**What breaks:**
```text
R1#interface Gi0/1  (link to R2)
R1(config-if)#ipv6 ospf message-digest-key 1 md5 shared-secret-r1-r2

R1#interface Gi0/2  (link to R3)
R1(config-if)#ipv6 ospf message-digest-key 1 md5 shared-secret-r1-r2
! Reused same key instead of shared-secret-r1-r3

Result:
  If R2's key is compromised, attacker can spoof R1-R3 link
  Compromise is not isolated to R1-R2 link
```

**Why:** Using the same key for multiple links means compromising one key compromises all links using that key.

**Fix:** Use unique keys per-link:
- R1-R2: `shared-secret-r1-r2`
- R1-R3: `shared-secret-r1-r3`
- R2-R3: `shared-secret-r2-r3`

---

## 8. Troubleshooting by Field (Diagnostic Method)

### Problem: "OSPF adjacency is DOWN; MD5 authentication failing"

```text
Step 1: Verify MD5 is configured on both ends
  R1#show running-config | section "interface Gi0/1"
  Expected: "ipv6 ospf authentication message-digest" is present
  If absent: Run the command

Step 2: Verify the keys match
  R1#show running-config | include "ospf message-digest-key"
  Expected: "ipv6 ospf message-digest-key 1 md5 [key]"
  
  R2#show running-config | include "ospf message-digest-key"
  Expected: Same key value
  If different: Update R2's key to match R1

Step 3: Check key-id
  Both routers must use the same key-id (usually 1)
  R1: ipv6 ospf message-digest-key 1 md5 ...
  R2: ipv6 ospf message-digest-key 1 md5 ... (same key-id 1)

Step 4: Verify link connectivity (no authentication issue)
  R1#ping 2001:DB8:0:10::2 (R2's link address)
  Expected: Reply received (proves physical link works)
  If no reply: Physical link is down; not an authentication issue

Step 5: Enable debug to see authentication details
  R1#debug ipv6 ospf hello
  ! Wait 10 seconds, then disable
  R1#undebug all
  Expected: "MD5 Verification: PASS" messages
  If "FAIL": Keys don't match or authentication type is wrong

Step 6: Re-enable OSPF after fixing keys
  After correcting keys, wait ~30 seconds for adjacency to form
  R1#show ipv6 ospf neighbor
  Expected: Neighbor should show "FULL" state
```

### Problem: "Routes are missing from routing table"

```text
Step 1: Verify OSPF adjacencies are all FULL
  R1#show ipv6 ospf neighbor
  Expected: All neighbors show "FULL" state
  If any "DOWN": Fix adjacency issues first

Step 2: Verify OSPF process is running
  R1#show ipv6 ospf
  Expected: "OSPFv3 Process ID 1" and process status "active"
  If inactive: Check for configuration errors

Step 3: Verify interfaces are in correct OSPF area
  R1#show running-config | include "ospf.*area"
  Expected: "ipv6 ospf 1 area 0" on each interface
  If missing: Add the command

Step 4: Verify LSA flooding is working
  R1#show ipv6 ospf database router
  Expected: Entries for all routers (1.1.1.1, 2.2.2.2, 3.3.3.3)
  If missing: Adjacency might be down; routers aren't flooding LSAs

Step 5: Force SPF recalculation
  R1#clear ipv6 ospf process
  R1#show ipv6 route
  Expected: Routes should reappear after ~10 seconds

Step 6: Verify no redistribution issues
  R1#show running-config | include redistribute
  Expected: No unexpected redistribution commands
  If present and blocking routes: Review configuration
```

---

## 9. Design Analysis: Field-Specific Reasoning

**Why does this variant matter for Security (Field 4)?**

OSPF is a distributed routing protocol — every router trusts every other router's routing announcements. In an untrusted network (like a mesh with potentially compromised nodes), this is dangerous. A single compromised router can inject false routes, redirect traffic, or partition the network.

This variant proves the hypothesis: **OSPF routing decisions can be cryptographically authenticated, making routing immune to unauthenticated attacks.**

Key architectural insights:

1. **Cryptographic Trust Anchors**: By configuring MD5 keys, each router cryptographically verifies that routing messages come from a known neighbor, not an attacker. This ties routing decisions to device identities (established in Day-31 via MAC→IPv6 derivation).

2. **Tamper Detection**: If a neighbor's key is compromised or changed, the adjacency immediately fails. Routing is interrupted, not silently corrupted. This makes tampering detectable.

3. **Key Isolation**: Different keys per-link mean that compromising one link's key doesn't compromise others. If R1-R2's key is exposed, the R1-R3 link is unaffected.

4. **Attestation Foundation**: For P38 Haiti mesh, this is critical. If a node's routing announcements are authenticated, the mesh can trust that routes come from known nodes, not rogue injectors. Mesh routing becomes Byzantine-resistant.

Together, these design choices prove that OSPF routing can provide strong security guarantees in untrusted networks, validating the security assumption underlying Haiti's P38 mesh deployment.

---

## 10. Real-World Parallel: Haiti Deployment Phase

**D-Central Module:** `mesh-connectivity` (OSPF-based inter-site routing)

**Haiti Phase:** P34 (security foundational), P38 pilot (50–100 node mesh)

**Linkage:**

In Haiti's P38 pilot, mesh nodes will be distributed across 50+ physical locations, with limited physical security at many sites. Some nodes may be compromised by local actors; some may be replaced or tampered with.

This lab proves that OSPF routing can detect and reject compromised nodes:
- A compromised node that tries to advertise false routes will send unauthenticated or incorrectly-signed OSPF updates
- Legitimate neighbors will reject these updates and drop the adjacency
- The mesh network will heal by routing around the compromised node

Without this proof (that OSPF can be authenticated), P38 deployment would be vulnerable to routing attacks. With it, the mesh can operate securely even in a hostile environment.

---

## 11. Stretch Goals: Advanced Proof Obligations

### Goal 1: Formal Verification of MD5 Authentication

Prove using symbolic execution that MD5 authentication prevents message forgery. Show that an attacker without the key cannot produce a valid MD5 signature for any OSPF message.

### Goal 2: Byzantine Fault Tolerance

Layer this with Field 3 (DePIN, Byzantine resilience): model a mesh where up to (n-1)/3 nodes are Byzantine (compromised). Prove that routing still converges correctly despite Byzantine nodes (they can't inject routes that the rest of the mesh accepts).

### Goal 3: Forward Secrecy in OSPF Keys

Extend the design to use time-based key rotation: OSPF keys change every hour, derived from a master key + timestamp via HKDF. Prove that compromising a past key does not allow forging future OSPF messages.

### Goal 4: Hardware-Backed Key Storage

Anchor OSPF keys to hardware TPMs. Prove that keys are stored securely and cannot be extracted even if the router's OS is compromised.

---

## 12. Self-Assessment (Field-Specific BSL)

Evaluate yourself on this field-specific lab using this BSL scale:

```
BSL-0 AWARENESS
  You've read this lab once. You couldn't replicate it.

BSL-1 LAB CAPABLE
  You completed this lab with the manual open. You can configure MD5
  authentication on OSPF interfaces and understand basic MD5 verification.

BSL-2 OFFLINE
  You could repeat this lab with the manual, no internet. You can configure
  MD5 authentication, verify adjacencies, and detect key mismatches.

BSL-3 RECOVERABLE
  You could rebuild this lab from the topology diagram. Given a network of
  routers, you know which keys to configure, how to verify adjacencies, and
  how to troubleshoot authentication failures.

BSL-4 MAINTAINABLE
  You could modify this lab's topology (add routers, change links, rotate keys)
  and maintain authentication throughout. You understand key isolation and
  Byzantine detection.

BSL-5 TEACHABLE
  You could teach this lab to someone else, explaining why OSPF authentication
  matters, how MD5 prevents spoofing, and how to detect compromised nodes.
  You could design similar authentication schemes for other protocols.

Target BSL for this lab: BSL-3 to BSL-4
  (You should be able to rebuild the topology and configure authentication
   with the diagram; bonus for modifications and Byzantine scenarios.)
```

---

*Day 32 — Field 4 (Security) Lab — Completed August 2026. OSPF cryptographic authentication is foundational for Haiti mesh deployment (P38 pilot, P45 expansion). This lab proves that routing decisions can be cryptographically verified and tamper-proof, enabling Byzantine-resistant mesh routing.*
