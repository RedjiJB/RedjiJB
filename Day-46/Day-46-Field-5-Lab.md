# Day 46 Field-5 Variant — Voice VLANs for Privacy-Preserving Healthcare

## 0. Metadata

```
Field Focus:         Field 5: Privacy-Preserving Healthcare & Fairness
Core Proof Obligation: Voice VLAN topology isolates health-related voice (clinical calls, consultations) from data VLAN; voice packets encrypted end-to-end; fairness proven across concurrent calls and data traffic.
Haiti Deployment Phase: P45 (expansion phase) — rural clinics need encrypted voice for HIPAA compliance; multiple clinics share one WAN link fairly.
Estimated Time:      2–2.5 hours
Difficulty:          Intermediate-Advanced
Relationship to Base Lab: Same voice/data VLAN separation and ROAS; added end-to-end encryption, QoS fairness, and privacy-audit logging.
Prerequisite:        Complete Day-46-Lab-Manual first; understanding of HIPAA voice privacy rules.
```

---

## 1. Business Context (Field-5 Framing)

In Haiti P45 expansion, a clinic network connects multiple sites (rural clinics, regional hospital). Doctors make consults over voice (secure, HIPAA-compliant). Patients' personal health data traverses the same WAN link. **Failure mode:** if clinical voice traffic shares the data VLAN, an attacker sniffing packets can extract patient names, symptoms, medications. If voice traffic is not QoS-prioritized, it competes fairly (or unfairly) with a file backup, sometimes making clinical consults unintelligible.

**This variant proves:** Voice and data VLANs are separated; voice traffic is encrypted (TLS/SRTP); voice packets receive priority fairness guarantee over bulk data; audit logging proves compliance with HIPAA voice privacy rules.

---

## 2. Topology Diagram (Field-5 Variant)

```
[FIELD-5: PRIVACY-PRESERVING VOICE + FAIRNESS]

CLINIC NETWORK:

  [PC1/Workstation] ─── VLAN 10 (DATA) ─── SW1 access port (untagged)
                                               │
  [IP Phone] ─────────────── VLAN 20 (VOICE) ─── SW1 access port (802.1Q tagged)
                            ┌─────────────────────┤
                            │                     │ Trunk VLAN 10,20
                            └─── R1 (ROAS) ───────┤ Subinterfaces:
                                 │                │ F0/0.1 (data)
                                 │                │ F0/0.2 (voice)
                                 │
                                [WAN - QoS enforced]
                                │
                          REGIONAL HOSPITAL
                          (Same topology repeated)

ENCRYPTION & COMPLIANCE:
├─ Voice traffic (VLAN 20) encrypted via SRTP (Secure Real-time Protocol)
├─ Call metadata logged to secure audit server (VLAN 20 only)
├─ Data traffic (VLAN 10) uses standard TLS; no clinical content
└─ QoS ensures voice never starved by data; fairness algorithm prioritizes clinical calls

PRIVACY BOUNDARY:
Voice VLAN 20: Authorized access restricted to:
  ├─ IP phones (authenticated via 802.1X)
  ├─ Call server (local, verified)
  └─ Audit logging server (immutable logs)

Data VLAN 10: Standard network; no voice content
```

---

## 3. IP Addressing Plan (Field-5 Annotations)

| Interface | VLAN | Address | Privacy Annotation |
|---|---|---|---|
| R1 F0/0.1 | 10 | 192.168.10.1/24 | Data gateway; HIPAA-required encryption for all flows |
| R1 F0/0.2 | 20 | 192.168.20.1/24 | Voice-only gateway; highest-priority security zone |
| Call Server | 20 | 192.168.20.50 | Serves only voice; authenticates phones via 802.1X certs |
| Audit Log Server | 20 | 192.168.20.51 | Immutable audit trail (one-way syslog writes, signed) |
| IP Phone 1 | 20 | 192.168.20.100–102 | Multi-call handset; each call is separate SRTP stream |
| IP Phone 2 | 20 | 192.168.20.110–112 | Concurrent multi-call support |
| Clinic Workstation | 10 | 192.168.10.5 | Patient record system (NOT on voice VLAN) |

**Field-5 Annotations:**
- Voice VLAN (20) is restricted: only phones and call server can join.
- Data VLAN (10) carries workstations; clinical data encrypted via TLS but NOT voice.
- Audit server logs only voice events, immutably—no tamper risk.

---

## 4. Configuration (Field-5 Optimizations)

### 4.1 Access Ports with VLAN Isolation (SW1)

```text
SW1(config)# interface g1/0/2
SW1(config-if)# switchport mode access
SW1(config-if)# switchport access vlan 10
SW1(config-if)# exit

SW1(config)# interface g1/0/3
SW1(config-if)# switchport mode access
SW1(config-if)# switchport voice vlan 20
! Phone will auto-tag traffic on VLAN 20 via switchport voice vlan
SW1(config-if)# exit
```

**Explanation for Field-5:**
- Data port (g1/0/2) is access VLAN 10 only; no voice traffic can arrive here.
- Voice port (g1/0/3) uses `switchport voice vlan 20`; switch will expect 802.1Q-tagged VLAN 20 traffic from the phone.
- Isolation enforces that data and voice packets physically cannot cross on the same port.

### 4.2 Trunk with VLAN Restrictions (SW1)

```text
SW1(config)# interface g1/0/1
SW1(config-if)# switchport mode trunk
SW1(config-if)# switchport trunk allowed vlan 10,20
SW1(config-if)# switchport trunk native vlan 1
! Never allow voice traffic untagged; data untagged on native VLAN (separate, not 10 or 20)
```

### 4.3 Router-on-a-Stick with ACLs for Privacy (R1)

```text
R1(config)# interface f0/0.1
R1(config-subif)# encapsulation dot1q 10
R1(config-subif)# ip address 192.168.10.1 255.255.255.0
R1(config-subif)# exit

R1(config)# interface f0/0.2
R1(config-subif)# encapsulation dot1q 20
R1(config-subif)# ip address 192.168.20.1 255.255.255.0
! ACL: Only phones (MAC list) can source traffic on VLAN 20
R1(config-subif)# ip access-list extended VOICE_VLAN_ACL
R1(config-ext-nacl)# permit udp host 192.168.20.100 any eq 5060
! SIP (signaling) from phone 1
R1(config-ext-nacl)# permit udp host 192.168.20.100 any range 16384 32767
! RTP (voice) from phone 1
R1(config-ext-nacl)# permit udp host 192.168.20.110 any eq 5060
R1(config-ext-nacl)# permit udp host 192.168.20.110 any range 16384 32767
R1(config-ext-nacl)# permit ip host 192.168.20.50 any
! Call server traffic allowed
R1(config-ext-nacl)# permit ip host 192.168.20.51 any
! Audit server traffic allowed
R1(config-ext-nacl)# deny ip any any log
! Drop and log unauthorized voice traffic
R1(config-ext-nacl)# exit

R1(config-subif)# ip access-group VOICE_VLAN_ACL in
! Apply ACL inbound on VLAN 20
R1(config-subif)# exit

R1(config)# interface f0/0
R1(config-if)# no shutdown
```

**Explanation for Field-5:**
- ACL on VLAN 20 inbound explicitly lists only authorized phones (192.168.20.100, 192.168.20.110).
- SIP (port 5060) and RTP (16384–32767) are the only allowed protocols for phones.
- Denied traffic is logged—audit trail shows any unauthorized access attempts.

### 4.4 QoS for Voice Fairness (R1 trunk egress)

```text
R1(config)# class-map match-all VOICE_CLASS
R1(config-cmap)# match ip dscp ef
! EF (Expedited Forwarding) = voice traffic marked by phone
R1(config-cmap)# exit

R1(config)# policy-map VOICE_FAIRNESS
R1(config-pmap)# class VOICE_CLASS
R1(config-pmap-c)# priority 25
! Voice gets 25% of WAN link as strict priority queue (never starved by data)
R1(config-pmap-c)# exit

R1(config-pmap)# class class-default
R1(config-pmap-c)# bandwidth 75
! Data gets remaining 75% (bulk backup can't block voice)
R1(config-pmap-c)# exit

R1(config)# interface f0/0
R1(config-if)# service-policy output VOICE_FAIRNESS
R1(config-if)# exit
```

**Explanation for Field-5:**
- Voice traffic marked by phone with DSCP EF (0x2E).
- Priority queue ensures voice completes 25% of link _first_, regardless of data volume.
- Data traffic shares remaining 75%, but never blocks voice.
- Fairness algorithm: voice cannot exceed 25%, but is never less than 25%.

---

## 5. Field-5 Verification Steps

### 5.1 Privacy Boundary Verification

```text
On R1:
R1# show access-lists VOICE_VLAN_ACL
Extended IP access list VOICE_VLAN_ACL
    permit udp host 192.168.20.100 any eq 5060
    permit udp host 192.168.20.100 any range 16384 32767
    permit udp host 192.168.20.110 any eq 5060
    permit udp host 192.168.20.110 any range 16384 32767
    ...
    deny ip any any log

! Verify ACL is counting packets (proof that boundary is enforced):
R1# show access-lists | include "permit|deny"
  (Non-zero packet counts prove packets are being filtered)
```

### 5.2 Fairness Under Concurrent Load

```text
1. Establish a data bulk transfer (e.g., VLAN 10 backup) consuming all available bandwidth
   - PC1 sends a large file to server on VLAN 10

2. Simultaneously initiate a voice call (VLAN 20)
   - Phone 1 calls Phone 2 over VLAN 20

3. Measure voice quality metrics:
   - Latency (time from voice frame into phone → acoustic sound): <150 ms (HIPAA compliance)
   - Jitter (variation in latency): <50 ms
   - Packet loss (on voice RTP stream): <1%

4. Proof obligation: PASSED if voice metrics remain within bounds even with concurrent backup
   - If latency > 150 ms or jitter > 50 ms, QoS priority queue is not working
```

### 5.3 Audit Logging for Compliance

```text
On audit server (syslog endpoint on VLAN 20):

R1# show logging
Syslog logging: enabled
    Facility: local7
    Logging to 192.168.20.51, 0 messages logged, 0 messages rate-limited,
    0 messages dropped-by-ESM, XML disabled, sequence numbers disabled

[On audit server, check immutable logs]
$ tail -f /var/log/secure
Aug 29 10:03:45 R1: %ACL-4-ACLLOG_CREATION: List VOICE_VLAN_ACL created
Aug 29 10:04:02 R1: %SEC_LOGIN-5-INVALID_USER: Invalid user attempt; 192.168.10.10
Aug 29 10:05:30 R1: %ACL-6-ACLLOG_FLOW_SUMMARY: Deny udp 192.168.10.10 -> 192.168.20.100 eq 5060

(Any attempt to access VLAN 20 from unauthorized source is logged)
```

### 5.4 Encryption Verification (Packet Inspection)

```text
In Simulation Mode, inspect a voice call packet:

[Voice RTP Packet from Phone to Call Server]
Ethernet Frame: 802.1Q VLAN 20
IP Header:     Source 192.168.20.100, Dest 192.168.20.50
UDP Header:    Source port 16400 (RTP), Dest port 16400 (RTP)
Payload:       [ENCRYPTED, unreadable raw bytes — SRTP payload]

(Proof: If payload is readable/clear, SRTP encryption is not configured)
```

---

## 6. Expected Output Gallery (Field-5 Scenarios)

**After successful fairness test (voice + concurrent data):**

```text
R1# show policy-map interface f0/0 output

  Service-policy output: VOICE_FAIRNESS

    Class-map: VOICE_CLASS (match-all)
      150 packets, 18750 bytes
      Match: ip dscp ef (46)
      priority 25%
        Queue Stats for priority class:
        Packets queued: 0
        Bytes queued: 0
        (Packets flowing smoothly; queue depth 0 means no starvation)

    Class-map: class-default (match-any)
      1250 packets, 1500000 bytes
      Match: any
      bandwidth 75%
        Queue Stats:
        Packets output: 1250
        Bytes output: 1500000
        (Data flowing but constrained to 75%)
```

**ACL showing unauthorized attempts:**

```text
R1# show access-lists | include "deny"
%ACL-4-ACLLOG_CREATION: List VOICE_VLAN_ACL created
%ACL-6-ACLLOG_FLOW_SUMMARY: Deny udp 192.168.10.10 -> 192.168.20.100 eq 5060
  (One packet, 28 bytes)
  (Unauthorized PC attempted to send voice traffic on VLAN 20)
```

---

## 7. Common Field-5 Mistakes

1. **Forgetting to encrypt voice traffic (SRTP)** — voice packets in cleartext can be wiretapped; HIPAA violation.
2. **Not restricting VLAN 20 access with ACLs** — any device can potentially source voice traffic, risking impersonation.
3. **QoS priority queue set too low** — voice competes fairly with data but doesn't get guaranteed priority; calls become unintelligible during backups.
4. **Audit logging disabled or not persistent** — no proof that privacy controls are actually working; compliance audits fail.
5. **Data VLAN not encrypted** — patient workstations communicate unencrypted; privacy violation.

---

## 8. Troubleshooting by Field (Diagnostic Method)

**Symptom: Voice quality poor during data transfer**

```text
Step 1: Is QoS policy attached to the egress interface?
  R1# show policy-map interface f0/0 output
  → If "no policy", attach the VOICE_FAIRNESS policy

Step 2: Is voice traffic actually marked with DSCP EF (46)?
  R1# show ip dscp-map | grep ef
  → Phones must be configured to mark EF on RTP traffic

Step 3: Is the priority queue being used?
  R1# show policy-map interface f0/0 output | include "priority|Packets"
  → If "Packets output: 0" under VOICE_CLASS, no voice traffic is reaching R1
```

**Symptom: Unauthorized source sending voice traffic**

```text
Step 1: Check ACL deny counters
  R1# show access-lists VOICE_VLAN_ACL | include "deny"
  → Non-zero counters mean unauthorized traffic is being dropped

Step 2: Check audit logs
  Check syslog on 192.168.20.51 for ACLLOG_FLOW_SUMMARY entries
  → Logs identify the unauthorized source IP

Step 3: Verify authorized phone MAC/IP bindings
  R1# show ip dhcp binding | grep 192.168.20
  → Confirm only known phones hold VLAN 20 IPs
```

---

## 9. Design Analysis: Field-5 Reasoning

Privacy-preserving healthcare requires three layers:

1. **Isolation:** Voice and data VLANs separate at the switch; packets cannot cross physical access ports.
2. **Encryption:** Voice traffic is SRTP-encrypted; even if captured, content is unreadable.
3. **Access control:** Only authenticated phones and call servers can exist on VLAN 20; unauthorized access is blocked and logged.
4. **Fairness:** QoS ensures clinical calls never lose audibility to bulk data; patients receive consistent care quality.

This topology unblocks P45 expansion: clinics can add workstations and file servers to VLAN 10 without risking voice privacy, and voice calls remain reliable even during database backups.

---

## 10. Real-World Parallel: Haiti P45 Healthcare

A clinic in Cap-Haïtien shares one 2 Mbps WAN link with 5 other clinics (25 clinics total, 50 kbps allocated per clinic). A nightly database backup runs at 100 kbps. A doctor makes a telemedicine consult over IP phone (100 kbps VoIP + 50 kbps video):

- **Without fairness QoS:** backup competes 1:1 with call; call becomes choppy/unintelligible → consult fails.
- **With fairness QoS:** backup is capped to remaining 25 kbps; call gets stable 100 kbps → consult succeeds; privacy preserved.

This variant proves P45 can support both reliable clinical voice AND data backups on the same shared link.

---

## 11. Stretch Goals: Advanced Field-5 Proof

- Formal privacy proof: Prove using symbolic execution that voice VLAN packets are unreachable from data VLAN (no covert channel).
- Fairness under Byzantine: Simulate a malicious workstation attempting to join VLAN 20; verify ACL drops all packets.
- Encryption validation: Use a network analyzer to confirm SRTP payloads are unreadable even with packet capture.

---

## 12. Self-Assessment

```
BSL-0 AWARENESS      - You've read this lab once. You couldn't replicate it.
BSL-1 LAB CAPABLE    - You completed this lab with the manual open, and it worked.
BSL-2 OFFLINE        - You could repeat this lab with the manual, no internet.
BSL-3 RECOVERABLE    - You could rebuild this topology; given a privacy audit requirement, you'd know how to verify HIPAA compliance.
BSL-4 MAINTAINABLE   - You could modify this lab for different VLAN numbers, phone counts, or WAN link speeds and still hit the same fairness proof obligation.
BSL-5 TEACHABLE      - You could teach this lab's privacy and fairness design to a clinic admin, correctly explaining why voice isolation and QoS matter for HIPAA compliance.

Target BSL for this lab: 3–4
```

---

**Created:** August 30, 2026  
**Field:** Privacy-Preserving Healthcare (Field-5)  
**Status:** Complete — ready for Phase P45 expansion training
