# Day 56 Field-4 Variant — Dynamic ARP Inspection with Cryptographic Attestation

## 0. Metadata

```
Field Focus:         Field 4: Cyber-Physical Security (Cryptographic Attestation)
Core Proof Obligation: DAI violations trigger signed syslog entries; audit trail proves ARP spoofing attempts with digital signatures; tampering with violation logs is cryptographically detectable.
Haiti Deployment Phase: P45 (expansion phase) — critical infrastructure requires immutable proof that ARP spoofing was detected and blocked; IEC 62443 Level 3 compliance.
Estimated Time:      2–2.5 hours
Difficulty:          Advanced
Relationship to Base Lab: Same DAI logic; added signed syslog, certificate pinning, and cryptographic proof-of-attack.
Prerequisite:        Complete Day-56-Lab-Manual and Day-49-Field-4 (cryptographic attestation patterns) first.
```

---

## 1. Business Context (Field-4 Framing)

In Haiti P45 expansion, critical infrastructure (power grid, water treatment) must prove to regulators that ARP spoofing attacks were detected and blocked. IEC 62443 requires immutable audit evidence: not just "attack was blocked," but cryptographically-signed proof that cannot be forged. This lab proves DAI violations are signed by the switch and auditable.

---

## 2. Topology Diagram (Field-4 Variant)

```
[FIELD-4: SIGNED ARP INSPECTION ATTESTATION]

R1 (Trusted Gateway)
    │
    ├─ G0/1 (trusted for DAI + DHCP Snooping)
    │
SW1 (DAI Enforcer)
    ├─ F0/1–F0/3 (untrusted; ARP validated)
    └─ [ARP SPOOFING ATTACK]
       ├─ Attacker sends forged ARP Reply from F0/2
       ├─ DAI detects: "ARP reply does not match binding"
       ├─ Violation logged + SIGNED (RFC 5425)
       └─ Syslog sent to audit server (10.0.0.51, TLS)
          ├─ Signature proves attack occurred (non-repudiation)
          ├─ Timestamp proves when (audit trail)
          └─ Hash proves log was not tampered (immutability)
```

---

## 3. IP Addressing Plan (Field-4 Annotations)

| Device | IP | Role | Cert |
|---|---|---|---|
| SW1 | 10.0.0.1 | DAI enforcer | Subject: CN=SW1.plant.local |
| Audit Server | 10.0.0.51 | Stores signed DAI violations | Subject: CN=audit.plant.local |
| R1 | 192.168.1.1 | Trusted gateway (not attacked) | NA |

**Field-4 Annotations:**
- SW1 signs every DAI violation with its private key (PKI).
- Audit server pins SW1's certificate; any tampering is detectable.
- Each violation is timestamped and signed (non-repudiation).

---

## 4. Configuration (Field-4 Optimizations)

### 4.1 DAI Configuration (Same as Field-1, with enhanced logging)

```text
SW1(config)# ip dhcp snooping
SW1(config)# ip dhcp snooping vlan 1
SW1(config)# interface g0/1
SW1(config-if)# ip dhcp snooping trust
SW1(config-if)# ip arp inspection trust
SW1(config-if)# exit
SW1(config)# interface range f0/1-f0/3
SW1(config-if-range)# no ip dhcp snooping trust
SW1(config-if-range)# no ip arp inspection trust
SW1(config-if-range)# exit

SW1(config)# ip arp inspection vlan 1
SW1(config)# ip arp inspection validate src-mac dst-mac ip
SW1(config)# ip arp inspection log-buffer entries 128
SW1(config)# ip arp inspection logging acl
```

### 4.2 Syslog with RFC 5425 Signing (Same pattern as Day-49-Field-4)

```text
SW1(config)# logging host 10.0.0.51 transport tcp port 6514
! TLS syslog (RFC 5425)

SW1(config)# crypto pki trustpoint AUDIT_SERVER
SW1(config-pki)# enrollment terminal
SW1(config-pki)# exit

! Import audit server CA certificate
SW1(config)# crypto pki import AUDIT_SERVER ca certificate
! [Paste audit server's CA cert]

SW1(config)# logging origin-id hostname
SW1(config)# logging source-interface vlan 1
SW1(config)# logging secure-server-logging
! Enable RFC 5425 signed syslog

SW1# write memory
```

### 4.3 Audit Server Configuration (Pseudocode)

```text
# /etc/rsyslog.d/dai_audit.conf

# TLS Server Setup
$DefaultNetstreamDriver gtls
$DefaultNetstreamDriverCAFile /etc/pki/audit_ca.crt
$DefaultNetstreamDriverCertFile /etc/pki/audit_cert.pem
$DefaultNetstreamDriverKeyFile /etc/pki/audit_key.pem

# Accept TLS syslog from SW1
$InputName imtcp
$RuleSet dai_violation_log
*.* /var/log/dai_violations.log;TEMPLATE

# Verify signature on DAI violations
if $HOSTNAME == "SW1" AND $MSG contains "ip arp inspection"
  then {
    $signature = extract_sig($MSG);
    $signer_cert = extract_cert($MSG);
    $verified = verify_sig($signature, $signer_cert, $MSG);
    
    if $verified == "true"
      then log_to_immutable_store($MSG);  # Append-only
      else alert_admin("FORGED_DAI_VIOLATION_REJECTED");
  }

# Cryptographic hash for audit trail
hash_algorithm = "SHA-256"
hash_entry(timestamp, msg_text, attack_src_mac, attack_src_ip, signer_cert_hash)
  → /var/log/dai_violation_hashes.log
```

---

## 5. Field-4 Verification Steps

### 5.1 Certificate Pinning

```text
SW1# show crypto pki trustpoint AUDIT_SERVER
Trustpoint AUDIT_SERVER:
  Subject Name: CN=audit.plant.local
  Fingerprint (SHA-256): ab:cd:ef:...:12:34

(Pin this fingerprint on audit server)
```

### 5.2 Trigger ARP Spoofing Attack + Verify Signature

```text
1. Attacker on F0/2 sends forged ARP Reply:
   "192.168.1.1 is at 00:11:22:33:44:55" (attacker's MAC)

2. SW1 DAI detects violation, logs to syslog:
   SW1# show ip arp inspection statistics vlan 1
   Dropped Packets: 1

3. Audit server receives signed violation (RFC 5425):
   $ tail -f /var/log/dai_violations.log

   Aug 30 14:10:30 SW1 %IP_ARP_INSPECT-4-INVALID_ARP: 
     ARP packet received on VLAN 1 from 192.168.10.2 (00:11:22:33:44:55) 
     claiming 192.168.1.1, but binding shows 192.168.1.1 = 00:90:2c:1e:1e:00
   Aug 30 14:10:30 SW1 [SIGN FIELD] signature=base64(...), 
     cert_hash=abcd...

4. Verify signature on audit server:
   $ openssl verify -CAfile /etc/pki/audit_ca.crt \
       -partial_chain \
       <(echo "Aug 30 14:10:30 SW1 %IP_ARP_INSPECT...") \
       /var/log/dai_violations.log

   OK (Signature valid; log was not forged)

(Proof: Attack is documented with cryptographic signature)
```

### 5.3 Tamper Detection (Proof Obligation)

```text
Attacker attempts to edit the audit log (delete evidence of attack):

1. Original (signed) entry:
   Aug 30 14:10:30 SW1: ARP from 192.168.10.2 claiming 192.168.1.1 [SIGN sig=abc...]

2. Attacker edits log:
   Aug 30 14:10:30 SW1: [DELETED]

3. Audit verification:
   $ verify_signature_on_deleted_entry()
   ERROR: Signature verification FAILED
   Reason: Entry deleted; checksum mismatch
   Alert: IMMUTABLE_LOG_TAMPERING_DETECTED

(Proof: Attacker cannot erase evidence of attack; tampering is caught)
```

### 5.4 Audit Trail for Legal Discovery

```text
Generate audit report for regulator:

$ audit_report.py --filter "dai_violations" \
    --verify-signatures \
    --output /tmp/dai_audit_report.pdf

Report: DAI Attack Evidence
═════════════════════════════════════════════════════════════

Attack #1: Aug 30 2026 14:10:30 UTC
  Source IP: 192.168.10.2
  Source MAC: 00:11:22:33:44:55 (UNAUTHORIZED)
  Claimed IP: 192.168.1.1
  Actual MAC: 00:90:2c:1e:1e:00 (from DHCP binding)
  Action: DROPPED
  Signature: VALID (matches SW1 cert pinned at deployment)
  Cryptographic Hash: sha256=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
  Verdict: ✓ AUTHENTIC (log was not tampered; attack really occurred)

Attack #2: Aug 30 2026 14:11:45 UTC
  Source IP: 192.168.10.3
  Source MAC: 00:22:33:44:55:66 (UNAUTHORIZED)
  Claimed IP: 192.168.1.254 (broadcast gateway—obvious spoof)
  Actual MAC: NONE (no binding for 192.168.1.254)
  Action: DROPPED
  Signature: VALID
  Verdict: ✓ AUTHENTIC

SUMMARY:
  Total ARP spoofing attempts detected: 2
  Total attempts dropped (blocked): 2
  All signatures verified: YES
  Log tampering detected: NO
  Compliance Status: ✓ PASS (IEC 62443 Level 3 audit trail)

Regulator can accept this report as legal evidence (signature-verified).
```

---

## 6. Expected Output Gallery (Field-4 Scenarios)

**Signed DAI violation entry on audit server:**

```text
$ cat /var/log/dai_violations.log

Aug 30 14:10:30 SW1 %IP_ARP_INSPECT-4-INVALID_ARP: 
  ARP packet received on VLAN 1 from 192.168.10.2 (00:11:22:33:44:55) 
  claiming IP 192.168.1.1, but the binding indicates that IP is at 00:90:2c:1e:1e:00
  Signer: CN=SW1.plant.local
  SignedAt: Aug 30 2026 14:10:30.123 UTC
  SignatureAlgorithm: SHA256withRSA
  Signature: MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7O... [base64 truncated]
  CertHash (SHA-256): ab:cd:ef:12:34:56:78:90:ab:cd:ef:12:34:56:78:90
  
  (Signature cryptographically proves the attack occurred; cannot be forged)
```

**Verification command output:**

```text
$ rsyslog_verify_sigs.py /var/log/dai_violations.log \
    --ca-cert /etc/pki/audit_ca.crt \
    --pinned-cert-hash ab:cd:ef:12:34:56:78:90:ab:cd:ef:12:34:56:78:90

Checking 5 DAI violation entries...
Entry 1: VALID (ARP spoofing from 192.168.10.2)
Entry 2: VALID (ARP spoofing from 192.168.10.3)
Entry 3: VALID (ARP replay attack)
Entry 4: VALID (ARP cache poisoning attempt)
Entry 5: VALID (Invalid ARP source MAC)

All 5 violations are cryptographically authentic.
No tampering detected.
Compliance: PASS (All attacks documented with proof-of-occurrence)
```

---

## 7. Common Field-4 Mistakes

1. **Not signing DAI violations** — unverifiable logs; regulator cannot accept as evidence.
2. **Using HTTP syslog instead of TLS** — violation entries in cleartext (MITM-able).
3. **Not pinning the signer certificate** — attacker could forge violations with a different cert.
4. **Storing audit logs on the switch itself** — attacker with switch access could delete logs.
5. **No hash verification** — cannot detect log tampering.

---

## 8. Troubleshooting by Field (Diagnostic Method)

**Symptom: DAI violations not signed**

```text
Step 1: Is RFC 5425 signing enabled?
  SW1# show logging | grep "secure-server"
  → If not listed, enable cryptographic signing

Step 2: Is the audit server certificate valid?
  SW1# show crypto pki trustpoint AUDIT_SERVER
  → Check validity dates; regenerate if expired

Step 3: Are TLS handshakes succeeding?
  SW1# debug ip syslog (limited 10 seconds)
  → Look for TLS handshake errors

Step 4: Is the signature present in syslog entries?
  Audit Server: tail -f /var/log/dai_violations.log | grep "SIGN"
  → If no [SIGN] field, signing is not working
```

**Symptom: Signature verification failing**

```text
Step 1: Did the certificate change?
  Compare: show crypto pki trustpoint AUDIT_SERVER
  vs. /etc/pki/pinned_sw1_cert.hash
  → If mismatch, SW1 cert was replaced; investigate

Step 2: Is the audit server validating signatures?
  Run: rsyslog_verify_sigs.py /var/log/dai_violations.log
  → If failures, check CA chain and certificate validity

Step 3: Was the entry edited?
  Check: /var/log/dai_violation_hashes.log (hash verification)
  → If hash mismatch, tampering is detected
```

---

## 9. Design Analysis: Field-4 Reasoning

Cyber-physical security for critical infrastructure requires immutable proof of attacks:

1. **Cryptographic attestation:** Every DAI violation is signed by SW1 (private key only SW1 holds).
2. **Non-repudiation:** SW1 cannot deny that the attack occurred (signature proves origination).
3. **Immutability:** Audit logs stored remotely, append-only, with cryptographic hashes—tampering is detectable.

This topology unblocks P45 IEC 62443 Level 3 compliance: regulators can audit ARP spoofing defense with cryptographic proof.

---

## 10. Real-World Parallel: Haiti P45 Water Authority

A regulator audits the water treatment plant's security. She asks: "Has anyone attempted to forge ARP packets? Prove it."

Without cryptographic attestation:
- Admin produces DAI logs from the switch.
- Regulator cannot verify logs were not tampered with.
- Audit fails; facility loses certification.

With cryptographic attestation (this variant):
- DAI violations are signed by SW1 (private key only SW1 holds).
- Each signature is verified against pinned SW1 certificate.
- If logs were edited, signatures fail verification.
- Regulator verifies signatures; audit passes; facility certified.

---

## 11. Stretch Goals: Advanced Field-4 Proof

- Formal proof: Signed DAI violations are resistant to forgery (preimage attack requires 2^256 work).
- Hardware security: Use TPM (Trusted Platform Module) to sign violations; private key never leaves chip.
- Blockchain audit trail: Chain DAI violation hashes; detect any attempt to reorder or delete entries.

---

## 12. Self-Assessment

```
Target BSL for this lab: 3–4 (Recoverable to Maintainable)
```

---

**Created:** August 30, 2026  
**Field:** Cyber-Physical Security (Field-4)  
**Status:** Complete — ready for Phase P45 expansion (IEC 62443 Level 3)
