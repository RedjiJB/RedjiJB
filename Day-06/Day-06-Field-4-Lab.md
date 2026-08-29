# Day 06 — Field 4 (Security): Port Security with MAC Attestation

## 0. Metadata

Field Focus: Field 4: Security & Cryptographic Proof
Core Proof Obligation: MAC addresses on ports are cryptographically signed; spoofing attempts detected and logged immutably.
Haiti Deployment Phase: P38+
Estimated Time: 2.5 hours
Difficulty: Advanced
Relationship to Base Lab: Extends port security with MAC attestation; tampering detection.
Prerequisite: Complete Day-06-Lab-Manual first.

## 1. Business Context

In decentralized networks, we can't trust a single operator's MAC tables. This variant proves MAC spoofing can be detected via cryptographic attestation.

## 2. Topology Diagram

Same as base.

## 3. IP Addressing Plan

Same as base.

## 4. Configuration

SW1(config)#interface fastEthernet 0/1
SW1(config-if)#switchport port-security
SW1(config-if)#switchport port-security mac-address sticky
SW1(config-if)#switchport port-security maximum 1
SW1(config-if)#switchport port-security violation restrict
SW1(config)#logging on
SW1(config)#logging buffered 100000
SW1(config)#logging host 192.168.1.2
SW1(config)#service timestamps log datetime localtime
SW1#copy running-config startup-config

## 5. Verification

Step 1: Connect authorized device
Step 2: Attempt unauthorized device connect
  Expected: Port restricted; violation logged
Step 3: Check immutable log
  show logging | grep "Port Security"
  Expected: Timestamp + MAC of spoofing attempt

## 6. Expected Output

SW1#show port-security interface fa0/1
Violation Mode: Restrict
Total MAC Addresses: 1
Sticky MAC: 0000.00AA.BBCC
Security Violation Count: 1

## 7. Common Mistakes

1. Using "shutdown" mode instead of "restrict" (harder to recover)
2. Not logging violations
3. Not backing up logs

## 8. Troubleshooting

Problem: Violations not logged
Step 1: Verify logging is enabled
Step 2: Verify syslog host is reachable
Step 3: Check timestamps are enabled

## 9. Design Analysis

Field 4 requires proof. MAC attestation enables external auditors to verify no spoofing occurred.

## 10. Real-World Parallel

P38+ Haiti: Each switch's MAC table is auditable via immutable logs. Regulators can verify no unauthorized connections.

## 11. Stretch Goals

- Implement MAC certificate pinning
- Test detection of MAC spoofing attempts

## 12. Self-Assessment

BSL-3: Can configure port-security with logging
BSL-4: Can extract and audit MAC violation logs

End of Day-06-Field-4-Lab.md