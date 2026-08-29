# Day 04 — Field 4 (Security): Device Security with Cryptographic Attestation

## 0. Metadata

Field Focus: Field 4: Security & Cryptographic Proof
Core Proof Obligation: Password hashes cryptographically signed; tampering detectable; changes immutably logged.
Haiti Deployment Phase: P38+
Estimated Time: 2.5 hours
Difficulty: Advanced
Relationship to Base Lab: Extends hardening with password verification; password changes create signed audit records.
Prerequisite: Complete Day-04-Lab-Manual first.

## 1. Business Context

In Field 4, every config change must be provably authorized. This variant proves password changes can be cryptographically attested, so offline verifiers detect tampering.

## 2. Topology Diagram

Same as base.

## 3. IP Addressing Plan

Same as base.

## 4. Configuration

# Generate keypair for attestation:
Router(config)#crypto key generate rsa modulus 2048

# Use SHA256 (not MD5):
Router(config)#username admin algorithm-type sha256 secret class

# Enable detailed logging:
Router(config)#archive
Router(config-archive)#log config
Router(config-archive-log)#logging enable
Router(config-archive-log)#notify syslog
Router(config)#service timestamps log datetime localtime

## 5. Verification

Step 1: Change password and verify attestation
Step 2: Extract audit log
  show archive log config all
Step 3: Verify password change is timestamped
  Expected: Each change has timestamp + hash

## 6. Expected Output

Router#show running-config | grep algorithm-type
username admin algorithm-type sha256 secret 5 hash

## 7. Common Mistakes

1. Using MD5 instead of SHA256
2. Not logging config changes
3. Forgetting to back up public key

## 8. Troubleshooting

Problem: Password uses MD5, not SHA256
Step 1: Check hash algorithm
Step 2: Recreate user with algorithm-type specified

## 9. Design Analysis

Field 4 requires proof of authenticity. Attestation ensures passwords can't be changed without detection.

## 10. Real-World Parallel

P38+ Haiti: Governors change admin passwords. Crypto attestation proves only authorized changes occurred — no silent takeovers.

## 11. Stretch Goals

- Implement password certificate pinning
- Test tampering detection (modify log offline, verify signature failure)

## 12. Self-Assessment

BSL-3: Can rebuild with SHA256 hashing and attestation
BSL-4: Can extract and verify signatures offline

End of Day-04-Field-4-Lab.md