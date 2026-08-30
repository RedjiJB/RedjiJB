# Day 49 Field-4 Variant — Port Security with Cryptographic Attestation

## 0. Metadata

```
Field Focus:         Field 4: Cyber-Physical Security (Cryptographic Attestation)
Core Proof Obligation: Port security violations trigger cryptographic proof-of-event (signed syslog entries, digital certificate hash); tampering with violation logs is cryptographically detectable.
Haiti Deployment Phase: P45 (expansion phase) — critical infrastructure (power, water) require immutable audit trails; IEC 62443 Level 3 compliance.
Estimated Time:      2–2.5 hours
Difficulty:          Advanced
Relationship to Base Lab: Same port security; added signed syslog, certificate pinning, and violation proof-of-ownership.
Prerequisite:        Complete Day-49-Lab-Manual first; understanding of digital signatures and PKI.
```

---

## 1. Business Context (Field-4 Framing)

Haiti P45 water treatment plant's network includes critical sensors (pressure, pH, contamination detection). Port security prevents rogue devices from joining. But **IEC 62443 compliance** requires immutable evidence: if a violation occurs, the facility administrator must prove *when* it happened, *how*, and *that the log was not tampered with*. This lab proves port security violations are cryptographically signed and audit logs cannot be forged.

---

## 2. Topology Diagram (Field-4 Variant)

```
[FIELD-4: ATTESTATION-BASED PORT SECURITY]

TREATMENT PLANT NETWORK:

Pressure Sensor ─→ SW1(F0/1, 1 MAC, shutdown) ─→ [VIOLATION OCCURS: Rogue Device]
                    └─ Violation event logged + signed with PKI cert
                       └─ Syslog server (IPAM: 10.0.0.51, TLS)
                          └─ Stores immutable, signed violation record
                             └─ Hash: SHA-256(violation_packet + timestamp + signer_cert)
                                └─ Proof that log cannot be forged (preimage attack infeasible)

CRYPTOGRAPHIC BOUNDARY:
├─ Switch signs every violation event (RFC 5424 TLS syslog)
├─ Signing cert pinned (hash verified by audit server)
├─ Violation timestamp signed (non-repudiation)
└─ Log server verifies all signatures on ingest (reject unsigned/invalid)
```

---

## 3. IP Addressing Plan (Field-4 Annotations)

| Device | IP | Role | Cert |
|---|---|---|---|
| SW1 | 10.0.0.1 | Switch (port security enforcer) | Subject: CN=SW1.plant.local, pinned at audit server |
| Audit/Syslog Server | 10.0.0.51 | Stores signed violations | Subject: CN=audit.plant.local |
| Pressure Sensor | 10.0.0.10 | Authorized (1 MAC) | Not required (data device) |

**Field-4 Annotations:**
- Switch and syslog server authenticate via certificates (PKI).
- Each port security violation is signed by SW1's certificate.
- Audit server pins SW1's cert; any tampering is cryptographically detectable.

---

## 4. Configuration (Field-4 Optimizations)

### 4.1 Port Security (Same as Field-1, but with enhanced logging)

```text
SW1(config)# interface f0/1
SW1(config-if)# switchport mode access
SW1(config-if)# switchport port-security
SW1(config-if)# switchport port-security maximum 1
SW1(config-if)# switchport port-security violation shutdown
SW1(config-if)# switchport port-security mac-address sticky
SW1(config-if)# exit
```

### 4.2 Syslog Configuration with TLS Encryption & Signing

```text
SW1(config)# ip access-list extended VIOLATION_LOG
SW1(config-ext-nacl)# permit ip any any log
! Log all security-related events

SW1(config)# logging host 10.0.0.51 transport tcp port 6514
! TLS-based syslog (RFC 5425, port 6514)

SW1(config)# logging 10.0.0.51 facility local7
SW1(config)# logging trap informational

SW1(config)# logging origin-id hostname
SW1(config)# logging source-interface vlan 1
! Include switch identity in syslog

SW1(config)# crypto pki trustpoint AUDIT_SERVER
SW1(config-pki)# enrollment terminal
SW1(config-pki)# exit

! Import audit server's CA certificate
SW1(config)# crypto pki import AUDIT_SERVER ca certificate
! [Paste audit server's CA cert in DER/PEM format]
! [Switch verifies audit server identity via PKI]

SW1(config)# logging secure-server-logging
! Enable RFC 5425 signed syslog to 10.0.0.51

SW1# write memory
```

**Explanation for Field-4:**
- `logging host 10.0.0.51 transport tcp port 6514`: Sends syslog over TLS (encrypted + authenticated).
- `crypto pki trustpoint`: Switch verifies audit server's certificate before sending logs.
- `logging secure-server-logging`: RFC 5425 SIGN extension (if IOS supports; otherwise rely on TLS server auth).

### 4.3 Audit Server Configuration (Pseudocode; actual server is Linux/rsyslog)

```text
# /etc/rsyslog.d/audit.conf (on 10.0.0.51)

# TLS Server Setup
$DefaultNetstreamDriver gtls
$DefaultNetstreamDriverCAFile /etc/pki/audit_ca.crt
$DefaultNetstreamDriverCertFile /etc/pki/audit_cert.pem
$DefaultNetstreamDriverKeyFile /etc/pki/audit_key.pem

# Accept TLS syslog from SW1
$InputName imtcp
$RuleSet remote_violation_log
*.* /var/log/violations/sw1_violations.log;TEMPLATE

# Verify signature on incoming violation
# (pseudocode; actual rsyslog module would be C-based)
if $HOSTNAME == "SW1" AND $MSGTYPE == "port-security-violation"
  then {
    $signature = extract_sig($MSG);  # RFC 5425 SIGN field
    $signer_cert = extract_cert($MSG);
    $verified = verify_sig($signature, $signer_cert, $MSG);
    
    if $verified == "true"
      then log_to_immutable_store($MSG);  # Append-only, owned by syslog
      else alert_admin("FORGED_VIOLATION_REJECTED");
  }

# Hash and timestamp every violation for legal discovery
hash_algorithm = "SHA-256"
hash_entry(timestamp, msg_text, signer_cert_hash) → /var/log/violation_hashes.log
```

---

## 5. Field-4 Verification Steps

### 5.1 Certificate Pinning Verification

```text
SW1# show crypto pki trustpoint AUDIT_SERVER
Trustpoint AUDIT_SERVER:
  Subject Name: CN=audit.plant.local, O=Haiti Water Authority
  Serial Number: 0x123456789ABCDEF
  Validity Dates: Aug 30 2026 – Aug 30 2027
  Fingerprint (SHA-256): ab:cd:ef:...:12:34

(Manually pin this fingerprint on audit server configuration)
```

### 5.2 Violation Event + Cryptographic Proof

```text
1. Trigger a port security violation:
   - Connect unauthorized device to F0/1 (second MAC address)

2. On SW1, check syslog output:
   SW1# show logging | include "VIOLATION"
   %SEC-5-VIOLATION_EVENT: Port-security violation on F0/1
       MAC Address: 00:11:22:33:44:55 (unauthorized)
       Timestamp: Aug 30 2026 14:05:30 UTC

3. On audit server, check received syslog (TLS):
   $ tail -f /var/log/violations/sw1_violations.log
   Aug 30 14:05:30 SW1 %SEC-5-VIOLATION_EVENT: Port-security violation on F0/1 (authorized)
   Aug 30 14:05:31 SW1 [SIGN FIELD] signature=base64(...), cert_hash=abcdef...

   (Signature field proves the violation was signed by SW1's certificate)

4. Verify signature (on audit server):
   $ openssl verify -CAfile /etc/pki/audit_ca.crt \
       -partial_chain \
       <(echo "Aug 30 14:05:30 SW1 %SEC-5-VIOLATION_EVENT...") \
       /var/log/violations/sw1_violations.log
   
   OK (Signature is valid; not forged)

   (If admin tried to edit the log, signature verification fails)
```

### 5.3 Tamper Detection (Proof Obligation)

```text
Attempt to forge a violation (edit syslog entry on audit server):

1. Original (signed) entry:
   Aug 30 14:05:30 SW1: Unauthorized MAC 00:11:22:33:44:55 on F0/1 [SIGN signature=abc...]

2. Attacker edits log:
   Aug 30 14:05:30 SW1: Unauthorized MAC 00:22:33:44:55:66 on F0/1 [SIGN signature=abc...]
   (Changed MAC, but kept same signature)

3. Audit verification:
   $ verify_signature_on_edited_entry()
   ERROR: Signature verification FAILED
   Reason: Hash of (timestamp + msg_text + cert) does not match signature
   Alert: IMMUTABLE_LOG_TAMPERING_DETECTED

(Proof: Forging the log is cryptographically infeasible)
```

---

## 6. Expected Output Gallery (Field-4 Scenarios)

**Signed syslog entry on audit server:**

```text
$ cat /var/log/violations/sw1_violations.log

Aug 30 14:05:30 SW1 %SEC-5-VIOLATION_EVENT: Port-security violation on port FastEthernet0/1
  Violation MAC Address: 00:11:22:33:44:55
  Allowed MAC: 00:90:2c:1e:1a:00
  Violation Mode: Shutdown
  Port Status: Port-Disable due to violation
  Signer: CN=SW1.plant.local
  SignedAt: Aug 30 2026 14:05:30 UTC
  SignatureAlgorithm: SHA256withRSA
  Signature: MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7OL/... [base64 truncated]
  CertHash (SHA-256): a1:b2:c3:d4:e5:f6:g7:h8:i9:j0:k1:l2:m3:n4:o5:p6

(Signature proves the entry came from SW1; audit server verified SW1's cert)
```

**Verification command (audit server):**

```text
$ rsyslog_verify_sigs.py /var/log/violations/sw1_violations.log \
    --ca-cert /etc/pki/audit_ca.crt \
    --pinned-cert-hash a1:b2:c3:d4:e5:f6:g7:h8:i9:j0:k1:l2:m3:n4:o5:p6

Checking 5 violation entries...
Entry 1: VALID (signature verified; cert matches pinned hash)
Entry 2: VALID (signature verified; cert matches pinned hash)
Entry 3: VALID (signature verified; cert matches pinned hash)
Entry 4: VALID (signature verified; cert matches pinned hash)
Entry 5: VALID (signature verified; cert matches pinned hash)

All 5 violations are cryptographically authentic.
No tampering detected.
Compliance: PASS (IEC 62443 Level 3 audit trail requirement met)
```

---

## 7. Common Field-4 Mistakes

1. **Not pinning the signer certificate** — any rogue device could send fake syslog entries (no attestation).
2. **Using HTTP syslog instead of HTTPS/TLS** — syslog entries in cleartext can be MITM'd and forged.
3. **Not verifying signatures on ingest** — accepting unsigned entries as valid (defeats immutability).
4. **Losing the signing certificate private key** — cannot sign new violations; audit trail becomes incomplete.

---

## 8. Troubleshooting by Field (Diagnostic Method)

**Symptom: Syslog messages not arriving at audit server**

```text
Step 1: Is TLS port 6514 reachable from SW1 to audit server?
  SW1# ping 10.0.0.51
  → If unreachable, check network path

Step 2: Is the audit server certificate valid?
  SW1# show crypto pki trustpoint AUDIT_SERVER
  → Check validity dates; regenerate if expired

Step 3: Are TLS handshakes succeeding?
  SW1# debug ip syslog (limited 10 seconds)
  → Look for TLS handshake errors in output

Step 4: Is the signed syslog format correct?
  Audit Server: $ tcpdump -i eth0 'port 6514' -A
  → Inspect raw TLS traffic for RFC 5425 SIGN field
```

**Symptom: Signature verification failing on audit server**

```text
Step 1: Did the certificate hash change?
  Compare: show crypto pki trustpoint AUDIT_SERVER fingerprint
  vs. /etc/pki/pinned_sw1_cert.hash
  → If mismatch, SW1's certificate was replaced; investigate

Step 2: Was the syslog entry edited?
  Run: rsyslog_verify_sigs.py /var/log/violations/sw1_violations.log
  → If any entry fails, tampering is detected; preserve for forensics
```

---

## 9. Design Analysis: Field-4 Reasoning

Cyber-physical security for critical infrastructure requires:

1. **Cryptographic attestation:** Every security event (port violation) is cryptographically signed by the enforcer (SW1).
2. **Immutable audit trail:** Audit server stores signed violations in append-only storage; tampering is detectable.
3. **Non-repudiation:** SW1 cannot deny that a violation occurred (signature proves origination).

This topology unblocks P45: IEC 62443 Level 3 compliance requires immutable audit logs for critical infrastructure; cryptographic signatures provide the immutability proof.

---

## 10. Real-World Parallel: Haiti P45 Water Treatment

An inspector from Haiti's water regulator needs to audit the treatment plant's security controls. She asks: "Has anyone attempted to connect an unauthorized device to critical sensors?"

Without cryptographic attestation:
- Admin produces violation logs from syslog server.
- Inspector cannot verify logs were not tampered with.
- Audit fails; facility loses certification.

With cryptographic attestation:
- Violation logs are signed by SW1 (private key only SW1 holds).
- Each signature is verified against pinned SW1 certificate.
- If logs were edited, signatures fail verification.
- Inspector verifies signatures; audit passes; facility certified compliant.

---

## 11. Stretch Goals: Advanced Field-4 Proof

- Formal proof that signed syslog entries are resistant to forgery (preimage attack requires 2^256 work).
- Implement Merkle tree over signed violations for batch verification and efficient auditing.
- Hardware-backed signing (SW1 uses TPM to sign violations; private key never leaves chip).

---

## 12. Self-Assessment

```
Target BSL for this lab: 3–4 (Recoverable to Maintainable)
```

---

**Created:** August 30, 2026  
**Field:** Cyber-Physical Security (Field-4)  
**Status:** Complete — ready for Phase P45 expansion (IEC 62443 Level 3)
