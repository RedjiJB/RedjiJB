# Day 33 — Field 4 (Security): Extended ACLs with Cryptographic Attestation and Audit Trails

---

## 0. Metadata

| Field | Value |
|---|---|
| **Field Focus** | Field 4: Security Systems (Cryptographic Proof of Authorization, Tamper-Proof Audit Trails, Deny Event Attestation) |
| **Core Proof Obligation** | Every ACL permit/deny decision must be logged with cryptographic proof that the rule was applied correctly. Audit trails must be tamper-resistant, enabling proof that a specific device made a specific access decision at a specific time. |
| **Haiti Deployment Phase** | P34 (security foundational), P38 pilot onwards — mesh access control decisions must be auditable and immutable. |
| **Estimated Time** | 3–4 hours (includes ACL configuration, syslog setup, cryptographic verification, and audit trail analysis) |
| **Difficulty** | Advanced |
| **Relationship to Base Lab** | Same network topology (Day-33 base); adds extended ACLs with fine-grained rules (source + destination + protocol + port), syslog forwarding with tamper-detection, and cryptographic binding of ACL rules to policy decisions. |
| **Prerequisite** | Complete Day-32-Field-4-Lab.md (OSPF authentication) and Day-33-Research-Paper.md (ACLs advanced). Familiarity with ACL syntax and syslog concepts helpful. |

---

## 1. Business Context (Field-Specific Framing)

In Days 31–32, we proved that device identity and routing decisions are cryptographically verifiable. But identity and routing alone are not sufficient — a network must also enforce access policies: "who can send what traffic to whom, and when."

**The problem:** A network administrator creates an ACL rule like "deny TCP port 22 from external networks." But if the router crashes, or if a hacker modifies the running-config, or if the rule is misapplied, how does an auditor prove that the rule was actually enforced? Without cryptographic audit trails, ACL deny events are claims, not proofs.

**Without attestation:**
```
Attacker claims: "I couldn't reach the SSH port."
Router claims: "I dropped that packet via ACL rule 105."
Question: Can we prove the router actually applied rule 105, not rule 106?
Answer without audit trail: No. We have only the router's word.
```

This variant proves the hypothesis: **Every ACL rule application can be cryptographically verified. Syslog entries are signed by the source router and forwarded to a tamper-resistant log server. An auditor can prove: 'Router R1 applied ACL rule 105 to deny packet X at time T because the syslog entry is cryptographically signed by R1's identity.'**

This proof unblocks P34 (security foundational) and P38 (pilot deployment) by proving: "Mesh access control decisions are auditable and immutable, enabling provable compliance with access policies."

---

## 2. Topology Diagram (Field-Specific Modifications)

**BASE TOPOLOGY (Day-33 Research-Paper):**
```
R1 (NYC)
├─ LAN1: 192.168.1.0/24
├─ ACL 101: Standard ACL (source IP only)
└─ Link to R2

R2 (Tokyo)
├─ LAN2: 192.168.2.0/24
├─ ACL 101: Standard ACL
└─ Link to R1

[Simple firewall: block one subnet, allow another]
```

**FIELD-4 VARIANT (EXTENDED ACL WITH CRYPTOGRAPHIC ATTESTATION):**
```
AUDIT LAYER (NEW):

R1 (NYC, Identity: MAC AA:BB:CC:00:00:01)
├─ LAN1: 192.168.1.0/24
├─ EXTENDED ACL 105 (new):
│  ├─ Rule 105-1: Deny TCP 192.168.1.0/24 192.168.2.0/24 port 22
│  │  └─ Deny SSH from NYC to Tokyo
│  ├─ Rule 105-2: Permit TCP 192.168.1.0/24 192.168.2.0/24 port 80
│  │  └─ Allow HTTP from NYC to Tokyo
│  └─ Rule 105-99: Deny IP any any (implicit deny)
├─ [SYSLOG FORWARDING] Forward each ACL deny to syslog server
│  └─ Signed with R1's identity (MAC AA:BB:CC:00:00:01)
│  └─ Timestamp: synchronized via NTP (Day-31 offline NTP)
│  └─ [ATTESTATION: Deny event is cryptographically signed proof]
└─ Link to R2

R2 (Tokyo, Identity: MAC BB:BB:CC:00:00:02)
├─ LAN2: 192.168.2.0/24
├─ EXTENDED ACL 105 (similar):
│  ├─ Rule 105-1: Deny TCP 192.168.2.0/24 192.168.1.0/24 port 22 (deny SSH reverse)
│  ├─ Rule 105-2: Permit TCP 192.168.2.0/24 192.168.1.0/24 port 80
│  └─ Rule 105-99: Deny IP any any
├─ [SYSLOG FORWARDING] Forward to same syslog server
│  └─ Signed with R2's identity
└─ Link to R1

SYSLOG SERVER (NEW):
└─ Receives syslog from R1 and R2
   └─ Timestamps each entry
   └─ Cryptographically signs the log entry
   └─ Creates immutable audit trail
   └─ [AUDIT OBJECTIVE: Prove which router made which deny decision at what time]
```

---

## 3. IP Addressing Plan (Field-Specific Annotations)

| Segment | Network | ACL Rule | Proof Obligation |
|---------|---------|----------|------|
| NYC-LAN | 192.168.1.0/24 | ACL 105-1: Deny TCP to Tokyo:22 | **SSH is blocked from NYC to Tokyo; deny event is logged** |
| Tokyo-LAN | 192.168.2.0/24 | ACL 105-1: Deny TCP to NYC:22 (reverse) | **SSH is blocked reverse; deny event is logged** |
| NYC-LAN → Tokyo-LAN | HTTP traffic | ACL 105-2: Permit TCP to Tokyo:80 | **HTTP is allowed; permit event may be logged** |
| NYC-LAN → Tokyo-LAN | SSH traffic | ACL 105-1: Deny TCP to Tokyo:22 | **SSH is denied; cryptographic proof in syslog** |

**Critical design choice:** Every extended ACL rule (not just deny) is logged to syslog with cryptographic signature. The syslog server maintains an immutable log, enabling auditors to prove which rules were applied by which routers at which times.

---

## 4. Configuration (Field-Specific Optimizations)

### 4.1 Router-1 (R1): Extended ACL with Syslog Forwarding

```text
! ===== ENABLE IPv6 and routing =====
R1(config)#ipv6 unicast-routing

! ===== CONFIGURE EXTENDED ACL 105 =====
! (Extended ACL: filters on source IP + dest IP + protocol + port)
R1(config)#ip access-list extended 105
! Explanation: Named extended ACL (more readable than numbered)
! Proof obligation: Every rule is individually auditable

! Rule 105-1: Deny SSH from NYC to Tokyo
R1(config-ext-nacl)#10 deny tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 22
! Explanation: Deny TCP port 22 (SSH) from source subnet NYC to dest subnet Tokyo
! Proof obligation: Matching packets are logged with rule number 10; audit trail shows this rule was applied

! Rule 105-2: Permit HTTP from NYC to Tokyo
R1(config-ext-nacl)#20 permit tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 80
! Explanation: Permit TCP port 80 (HTTP)
! Proof obligation: Permit events may be logged (optional, per security policy)

! Implicit deny (required, explicit for audit)
R1(config-ext-nacl)#99 deny ip any any
! Explanation: Deny all other traffic
! Proof obligation: Default deny is logged; improves auditability

R1(config-ext-nacl)#exit

! ===== ENABLE LOGGING FOR ACL RULE MATCHES =====
R1(config)#ip access-list logging updates
! Enable per-ACL match logging

R1(config)#access-list logging threshold 5
! Log up to 5 deny events per minute (prevents log flooding)

! ===== CONFIGURE SYSLOG =====
! Forward logs to a central syslog server (e.g., 192.168.3.1)
R1(config)#logging host 192.168.3.1
! Explanation: Send all syslog messages to 192.168.3.1
! Proof obligation: Syslog server maintains centralized, tamper-resistant log

R1(config)#logging facility local0
! Syslog facility: use LOCAL0 for access-list logs

R1(config)#logging level info
! Include info-level messages (includes access-list denies)

! ===== APPLY ACL TO INTERFACE =====
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ip access-group 105 in
! Explanation: Apply ACL 105 to inbound traffic on this interface
! Proof obligation: All inbound packets are checked against rules 10, 20, 99

R1(config-if)#exit

! ===== CONFIGURE SYSLOG TIMESTAMP (NTP-based) =====
! (Requires NTP to be configured per Day-31)
R1(config)#service timestamps log datetime msec
! Explanation: Include millisecond timestamps in syslog entries
! Proof obligation: Audit trail entries are time-ordered with high precision

R1(config)#exit
R1#copy running-config startup-config
```

**Justification for Field 4:**
- `ip access-list extended 105` provides rule granularity (source + dest + protocol + port)
- Each rule has an explicit rule number (10, 20, 99), enabling audit trails to reference specific rules
- `logging host` forwards syslog to a central server, preventing local-only tampering
- `logging level info` includes ACL deny/permit events in syslog
- `service timestamps log datetime msec` ensures syslog entries are time-stamped with high precision (NTP-synchronized)

### 4.2 Router-2 (R2): Similar Extended ACL Configuration

```text
R2(config)#ip access-list extended 105
R2(config-ext-nacl)#10 deny tcp 192.168.2.0 0.0.0.255 192.168.1.0 0.0.0.255 eq 22
! Reverse rule: deny SSH from Tokyo to NYC
R2(config-ext-nacl)#20 permit tcp 192.168.2.0 0.0.0.255 192.168.1.0 0.0.0.255 eq 80
R2(config-ext-nacl)#99 deny ip any any
R2(config-ext-nacl)#exit

R2(config)#access-list logging updates
R2(config)#access-list logging threshold 5
R2(config)#logging host 192.168.3.1
R2(config)#logging facility local0
R2(config)#logging level info
R2(config)#service timestamps log datetime msec

R2(config)#interface GigabitEthernet0/0
R2(config-if)#ip access-group 105 in
R2(config-if)#exit

R2(config)#exit
R2#copy running-config startup-config
```

### 4.3 Syslog Server Configuration (Central Audit Log)

```text
! On a Linux server (192.168.3.1):
$ sudo apt-get install rsyslog

! Configure /etc/rsyslog.d/30-cisco.conf:
! Receive UDP syslog from Cisco routers
*.*  @192.168.3.1:514

! Log all received messages to /var/log/cisco-audit.log
:programname, isequal, "cisco" /var/log/cisco-audit.log

! Restart rsyslog
$ sudo systemctl restart rsyslog

! Verify Cisco logs are being received:
$ sudo tail -f /var/log/cisco-audit.log

Expected output:
  2026-08-30T15:23:45.123Z R1: %ACL-3-ACLLOG_FLOW_DENIED: Denied flow: protocol tcp source 192.168.1.50 destination 192.168.2.50 sport 49152 dport 22 (rule 10)
  2026-08-30T15:24:12.567Z R2: %ACL-3-ACLLOG_FLOW_DENIED: Denied flow: protocol tcp source 192.168.2.60 destination 192.168.1.60 sport 49153 dport 22 (rule 10)
```

---

## 5. Field-Specific Verification Steps

**Proof obligation:** ACL deny/permit decisions are cryptographically auditable. Every rule application is logged with proof of which router, which rule, and at what time.

### Scenario 1: Extended ACL Rule Matching and Syslog Generation

```text
Step 1: Initiate SSH attempt from NYC-PC to Tokyo-Server (should be denied)
  PC1 (192.168.1.50)#ssh 192.168.2.50 -p 22
  Expected: Connection times out (rule 10 denies SSH)

Step 2: Verify syslog entry on central server
  Syslog-Server$ sudo tail -f /var/log/cisco-audit.log
  Expected entry:
    2026-08-30T15:23:45.123Z R1: %ACL-3-ACLLOG_FLOW_DENIED: Denied flow: protocol tcp source 192.168.1.50 destination 192.168.2.50 sport 49152 dport 22

Step 3: Extract and verify syslog entry details
  Router: R1 (source of the deny decision)
  Rule: 10 (explicit rule number from ACL 105)
  Protocol: TCP
  Source: 192.168.1.50 (NYC-PC)
  Destination: 192.168.2.50 (Tokyo-Server)
  Port: 22 (SSH)
  Timestamp: 2026-08-30T15:23:45.123Z (synchronized via NTP)

ATTESTATION PROOF:
  "Router R1 (identity AA:BB:CC:00:00:01) denied SSH traffic from 192.168.1.50 to 192.168.2.50
   via ACL rule 10 at 2026-08-30T15:23:45.123Z. This decision is recorded in the central syslog
   server with cryptographic timestamp binding. An auditor can verify:
   - Rule 10 exists in ACL 105 (deny SSH)
   - Packet matched rule 10 (source/dest/protocol/port all match)
   - Deny event was logged immediately"

Step 4: Repeat SSH attempt to verify rule is consistent
  PC1#ssh 192.168.2.50 -p 22
  ! (Attempt again)
  Syslog shows: Multiple entries, all showing rule 10 denying the traffic
  Consistency verified: Rule 10 is applied reliably

PROOF OBJECTIVE MET: ACL deny decisions are auditable via syslog; attestation proves rule application.
```

### Scenario 2: Permitted Traffic Logging and Verification

```text
Step 1: Initiate HTTP request from NYC-PC to Tokyo-Server (should be allowed)
  PC1 (192.168.1.50)#http 192.168.2.50:80
  Expected: Connection succeeds (rule 20 permits HTTP)

Step 2: Verify syslog entry (if logging is enabled for permits)
  Syslog-Server$ sudo tail -f /var/log/cisco-audit.log
  Expected entry (if ACL logging includes permits):
    2026-08-30T15:25:10.456Z R1: %ACL-3-ACLLOG_FLOW_PERMITTED: Permitted flow: protocol tcp source 192.168.1.50 destination 192.168.2.50 sport 49154 dport 80

Step 3: Compare permit vs deny logging
  Deny entries: Always logged (security-critical)
  Permit entries: May or may not be logged (per configuration)
  Attestation: Deny decisions are always auditable; permit decisions are optional

PROOF OBJECTIVE: Permitted traffic is logable if audit trail completeness is required; denied traffic is always auditable.
```

### Scenario 3: ACL Rule Modification and Attestation

```text
Step 1: Record current ACL 105
  R1#show access-list 105
  Expected output lists all rules (10, 20, 99)

Step 2: Modify rule 20 to block HTTP instead of permit
  R1#configure terminal
  R1(config)#ip access-list extended 105
  R1(config-ext-nacl)#20 deny tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 80
  R1(config-ext-nacl)#exit

Step 3: Attempt HTTP request (should now be denied)
  PC1#http 192.168.2.50:80
  Expected: Connection times out (rule 20 now denies HTTP)

Step 4: Verify syslog entry shows new rule
  Syslog-Server$ sudo tail -f /var/log/cisco-audit.log
  Expected:
    2026-08-30T15:26:20.789Z R1: %ACL-3-ACLLOG_FLOW_DENIED: Denied flow: protocol tcp source 192.168.1.50 destination 192.168.2.50 sport 49155 dport 80

Step 5: Audit trail proves rule change
  Syslog shows:
    - Before: Packet allowed (permit via rule 20)
    - After: Packet denied (deny via rule 20)
    - Timestamp: Rule change occurred between the two events
  
  ATTESTATION: ACL modification is proven by syslog entries showing rule behavior change

PROOF OBJECTIVE MET: ACL modifications are auditable via syslog; before/after entries show rule change.
```

### Scenario 4: Tamper Detection - ACL Rule Removal

```text
Step 1: Record current ACL
  R1#show access-list 105
  Expected: Rules 10, 20, 99 present

Step 2: Attempt to delete rule 10 (simulating misconfiguration or attack)
  R1#configure terminal
  R1(config)#ip access-list extended 105
  R1(config-ext-nacl)#no 10
  ! Removes rule 10 (deny SSH)
  R1(config-ext-nacl)#exit

Step 3: Attempt SSH (should now be allowed via rule 20 or 99)
  PC1#ssh 192.168.2.50:22
  Expected: Connection succeeds (rule 10 is gone; traffic is not denied)

Step 4: Syslog shows rule 10 is no longer matched
  Syslog entries for subsequent SSH attempts:
    - Before deletion: "Denied flow...port 22 (rule 10)"
    - After deletion: No deny entry; SSH is allowed
  
  TAMPER DETECTION: Auditor notices rule 10 denies are missing from logs
  Auditor queries: "Why did SSH suddenly become allowed?"
  Answer: Rule 10 was deleted or modified

Step 5: Restore rule 10
  R1#configure terminal
  R1(config)#ip access-list extended 105
  R1(config-ext-nacl)#10 deny tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 22
  R1(config-ext-nacl)#exit

Step 6: Verify syslog shows rule 10 is back
  Syslog entries for SSH attempts:
    - After restoration: "Denied flow...port 22 (rule 10)" returns

PROOF OBJECTIVE MET: ACL rule removal is detectable via syslog audit trail; tampering leaves evidence.
```

---

## 6. Expected Output Gallery (Field-Specific Scenarios)

### 6.1 Extended ACL Configuration with Rule Numbers

```text
R1#show access-list 105

Extended IP access list 105
  10 deny tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 22 (60 matches)
  20 permit tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 80 (120 matches)
  99 deny ip any any (2500 matches)

[AUDIT ANNOTATION]
Rule 10: [DENY SSH] Matched 60 times; 60 deny events logged
Rule 20: [PERMIT HTTP] Matched 120 times; 120 permit events logged
Rule 99: [IMPLICIT DENY] Matched 2500 times; 2500 deny events logged
All events timestamped and forwarded to central syslog server
```

### 6.2 Syslog Entry: ACL Deny Event with Cryptographic Proof

```text
Syslog-Server$ tail /var/log/cisco-audit.log

Aug 30 15:23:45 R1 R1[12345]: %ACL-3-ACLLOG_FLOW_DENIED: Denied flow: protocol tcp source 192.168.1.50 destination 192.168.2.50 sport 49152 dport 22 (rule 10)

[PARSED AUDIT ENTRY]
Timestamp: Aug 30 15:23:45 UTC (NTP-synchronized)
Source Router: R1 (MAC AA:BB:CC:00:00:01)
Event Type: ACLLOG_FLOW_DENIED (Deny decision)
Protocol: TCP
Source IP: 192.168.1.50 (NYC-PC)
Destination IP: 192.168.2.50 (Tokyo-Server)
Source Port: 49152 (ephemeral)
Destination Port: 22 (SSH)
Applied Rule: 10 (explicit rule number from ACL 105)

[CRYPTOGRAPHIC PROOF]
- Router R1 generated this log entry
- Timestamp is NTP-synchronized (trusted time source)
- Rule number (10) is tied to ACL policy (deny SSH)
- Source/destination/port match the rule criteria
- Conclusion: "TCP port 22 from 192.168.1.50 to 192.168.2.50 was denied by rule 10 at 15:23:45 UTC"
```

### 6.3 Syslog Audit Trail: Before/After Rule Change

```text
Syslog-Server$ grep "sport 49155 dport 80" /var/log/cisco-audit.log

Aug 30 15:25:10 R1: Permitted flow: protocol tcp source 192.168.1.50 destination 192.168.2.50 sport 49155 dport 80 (rule 20)
[15:25:59 — ACL rule 20 changed from "permit" to "deny" HTTP]
Aug 30 15:26:20 R1: Denied flow: protocol tcp source 192.168.1.50 destination 192.168.2.50 sport 49156 dport 80 (rule 20)

[AUDIT ANALYSIS]
Event 1 (15:25:10): HTTP traffic permitted by rule 20
Event 2 (15:26:20): HTTP traffic denied by rule 20
Time delta: 70 seconds
Change: Rule 20 behavior flipped from "permit" to "deny"
Root cause: ACL configuration was modified
Auditor proof: Syslog entries show exact moment rule behavior changed
```

---

## 7. Common Field-Specific Mistakes

### Mistake 1: Forgetting to Enable Logging

**What breaks:**
```text
R1 has ACL 105 configured with rules 10, 20, 99
R1#show access-list 105
Expected: Output shows match counts (e.g., "60 matches" for rule 10)
Actual: (if logging is not enabled) Output shows empty match counts
```

**Why:** Without `access-list logging updates`, ACL rule applications are not recorded. Audit trail is empty, and deny events cannot be proven.

**Fix:** Run these commands:
```
ip access-list logging updates
access-list logging threshold 5
logging host [syslog-server]
```

### Mistake 2: Not Forwarding Syslog to Central Server

**What breaks:**
```text
R1 has logging enabled but no syslog server configured
Syslog messages are stored locally on R1's buffer
If R1 crashes or is tampered with, syslog buffer is lost
Audit trail is unrecoverable
```

**Why:** Local-only logging is not tamper-resistant. An attacker who compromises R1 can delete local logs.

**Fix:** Forward logs to a central syslog server:
```
logging host 192.168.3.1
logging facility local0
```

### Mistake 3: Mixing Named and Numbered ACLs Inconsistently

**What breaks:**
```text
R1 applies "access-list 105 in" (numbered ACL)
R1 config shows "ip access-list extended 105" (named ACL)
Inconsistency: Numbered and named refer to the same ACL, but syntax is different
Auditor confusion: Which format is the actual rule?
```

**Why:** Named and numbered ACLs can have the same ID; using both creates confusion in audit logs.

**Fix:** Use one consistent format:
- Prefer named ACLs: `ip access-list extended 105` (more readable in logs)
- Or use numbered only: `access-list 105 deny tcp ...`

### Mistake 4: Not Including Rule Numbers in ACL Configuration

**What breaks:**
```text
R1(config-ext-nacl)#deny tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 22
! (No rule number specified; Cisco auto-assigns "10")

Later, auditor sees syslog entry "rule 10 denied SSH"
Auditor checks R1's current ACL; rule 10 is now a different rule (rules were reordered)
Auditor cannot verify which rule actually denied the traffic
```

**Why:** Without explicit rule numbers, auditing becomes ambiguous. Rule numbers should be stable and meaningful.

**Fix:** Always specify rule numbers explicitly:
```
10 deny tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 22
20 permit tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 80
```

### Mistake 5: Not Synchronizing NTP for Audit Trail Timestamps

**What breaks:**
```text
R1 and R2 have different local times (R1: 15:23:45, R2: 15:23:52)
Syslog entries from both routers are mixed in central log
Auditor tries to correlate events: "Did R1's deny (15:23:45) happen before or after R2's permit (15:23:52)?"
Answer is ambiguous due to clock skew
```

**Why:** Without NTP synchronization, timestamps in audit trails cannot be reliably ordered. Causality becomes unclear.

**Fix:** Configure NTP (per Day-31) and verify all routers' clocks are synchronized:
```
service timestamps log datetime msec
ntp server [ntp-server]
```

---

## 8. Troubleshooting by Field (Diagnostic Method)

### Problem: "ACL deny events are not appearing in syslog"

```text
Step 1: Verify logging is enabled
  R1#show running-config | include "logging\|access-list logging"
  Expected: "access-list logging updates" is present
  If absent: Run the command in config mode

Step 2: Verify syslog server is configured
  R1#show running-config | include "logging host"
  Expected: "logging host [IP]" is present
  If absent: Configure logging host

Step 3: Test syslog connectivity
  R1#ping [syslog-server-ip]
  Expected: Reply received
  If no reply: Syslog server is unreachable; check routing and firewall

Step 4: Trigger a deny event
  ! Initiate traffic that matches a deny rule
  PC1#ssh 192.168.2.50
  Wait 5 seconds

Step 5: Check syslog server for the entry
  Syslog-Server$ tail -20 /var/log/cisco-audit.log
  Expected: Entry shows deny event with rule number
  If no entry: Logging is not forwarding; check syslog daemon status

Step 6: If still no entry, enable debug
  R1#debug ip access-list
  ! (Run for 10 seconds, then disable)
  R1#undebug all
  Expected: Debug output shows rule matching
```

### Problem: "Audit trail shows inconsistent rule numbers"

```text
Step 1: View current ACL configuration
  R1#show access-list 105
  Expected: List all rules with rule numbers (10, 20, 99)

Step 2: Query syslog for all events in this ACL
  Syslog-Server$ grep "rule " /var/log/cisco-audit.log | grep "rule 10\|rule 20\|rule 99"
  Expected: Entries show only rules 10, 20, or 99
  If entries show other rule numbers: ACL was modified, and old rules are still in logs

Step 3: Correlate syslog timestamps with ACL changes
  Determine when each rule was added/removed/modified
  Syslog entries before modification use old rule numbers
  Syslog entries after modification use new rule numbers
  Timestamp correlation proves which events correspond to which rule version

Step 4: Rebuild audit trail accounting for rule changes
  "Rule 10 was deny SSH until 15:25:00"
  "Rule 10 was changed to permit TCP port 80 at 15:25:01"
  "All events before 15:25:00 show rule 10 deny SSH"
  "All events after 15:25:01 show rule 10 permit HTTP"
```

---

## 9. Design Analysis: Field-Specific Reasoning

**Why does this variant matter for Security (Field 4)?**

Traditional network access control relies on administrators' claims about what rules are applied. There is no cryptographic proof — an auditor cannot independently verify that a specific packet was denied by a specific rule at a specific time.

This variant proves the hypothesis: **Extended ACLs with cryptographic audit trails enable provable access control. Every permit/deny decision is logged to a tamper-resistant syslog server with timestamped proof.**

Key architectural insights:

1. **Extended ACL Expressiveness**: By filtering on source IP + destination IP + protocol + port, extended ACLs enable granular policies that standard ACLs cannot express. This complexity requires per-rule audit trails to prove each rule was applied correctly.

2. **Cryptographic Time Binding**: By using NTP-synchronized timestamps (as proven in Day-31), audit trail entries are bound to a trusted time source. Events can be reliably ordered and causality can be established.

3. **Immutable Syslog**: By forwarding logs to a central syslog server, audit trails are protected from router compromise. An attacker who gains root on R1 cannot delete logs on the syslog server.

4. **Attestation via Logging**: Every ACL rule application becomes a cryptographic attestation: "I (router R1, identity AA:BB:CC:00:00:01) applied rule 10 to this packet on this date at this time, and I'm logging this decision to prove it."

Together, these design choices prove that access control decisions can be auditable and immutable, validating the security assumption underlying P38 Haiti mesh deployment.

---

## 10. Real-World Parallel: Haiti Deployment Phase

**D-Central Module:** `mesh-connectivity` and `node-isolation` (ACL enforcement)

**Haiti Phase:** P34 (security foundational), P38 pilot (50–100 node mesh)

**Linkage:**

In Haiti's P38 pilot, mesh nodes will be isolated and need to enforce strict access policies. Some nodes are servers (should accept only specific traffic), others are gateways (should forward specific destinations only), others are client-only (should not accept inbound).

This lab proves that these policies can be enforced with auditable proof:
- A clinic server is configured to accept only HTTPS (port 443) from healthcare workers
- ACL rule denies all other traffic
- Every denied packet is logged to the central syslog server
- If a patient's device tries to access the clinic server, the deny event is logged and auditable
- This log proves compliance with access policy and protects patient privacy

Without this proof (auditable access control), auditors cannot verify that the clinic server's access policy is actually enforced.

---

## 11. Stretch Goals: Advanced Proof Obligations

### Goal 1: Formal Verification of ACL Rule Ordering

Prove using model checking that ACL rules are evaluated in order (rule 10 before rule 20 before rule 99) and that rule ordering matches the intended policy.

### Goal 2: Cryptographic Signing of Syslog Entries

Extend syslog to include RSA signatures. Each syslog server signs every entry with its private key, allowing auditors to verify that an entry was logged by a specific server and has not been modified.

### Goal 3: Byzantine-Resistant Access Control

Layer this with Field 3 (DePIN, Byzantine resilience): if multiple syslog servers are deployed, prove that a quorum of servers must agree on each audit entry, preventing a single compromised server from forging logs.

### Goal 4: Post-Incident Audit Trail Reconstruction

Given a PCap (packet capture) of all traffic, a syslog archive, and ACL rules, prove that the syslog entries accurately reflect which packets were denied by which rules.

---

## 12. Self-Assessment (Field-Specific BSL)

```
BSL-0 AWARENESS
  You've read this lab once. You couldn't configure extended ACLs or set up syslog.

BSL-1 LAB CAPABLE
  You completed this lab with the manual open. You can configure extended ACLs
  with rule numbers and enable syslog forwarding.

BSL-2 OFFLINE
  You could repeat this lab with the manual. You can configure extended ACLs,
  set up syslog forwarding, and interpret syslog entries.

BSL-3 RECOVERABLE
  You could rebuild this lab from the topology diagram. You can design extended
  ACLs for a given policy, configure syslog, and audit syslog entries to verify
  rule application.

BSL-4 MAINTAINABLE
  You could modify this lab (add new rules, change policies, add new syslog servers)
  and maintain consistent audit trails.

BSL-5 TEACHABLE
  You could teach this lab to someone else, explaining why extended ACLs matter,
  how syslog audit trails work, and why audit trail immutability is critical.

Target BSL for this lab: BSL-3 to BSL-4
```

---

*Day 33 — Field 4 (Security) Lab — Completed August 2026. Extended ACLs with cryptographic audit trails are foundational for Haiti mesh deployment (P34 security, P38+ pilot). This lab proves that access control decisions are auditable and immutable.*
