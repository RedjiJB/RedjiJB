# Day 35 — Field 4 (Security): ACLs Advanced — Cryptographic Rule Derivation and Policy-Proof Obligations

## 0. Metadata
| Field | Value |
|---|---|
| **Field Focus** | Field 4: Security (Cryptographic ACL rule derivation, policy-proof verification, rule tampering detection) |
| **Core Proof Obligation** | ACL rules are cryptographically derived from policy. A rule can be verified by recomputing its cryptographic hash from the policy; if the rule's hash doesn't match, the rule was tampered with. |
| **Haiti Deployment Phase** | P38+ — mesh ACLs must be verifiable as correctly derived from governance policies |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Advanced |
| **Relationship to Base Lab** | Extends Day-34 with cryptographic verification of rule correctness; rules are signed and versioned |
| **Prerequisite** | Day-34 Field-4 and Field-6 |

## 1. Business Context (Field-Specific Framing)
Days 33-34 proved ACLs are auditable and governed. But how do we know a rule wasn't surreptitiously modified? A rogue administrator could change rule 10 from "deny SSH" to "permit SSH" after deployment. Cryptographic rule verification solves this: each rule is signed based on the policy it implements, and changes are immediately detectable.

This variant proves: **ACL rules are cryptographically derived from policies. Auditors can verify: 'Rule 10 is the correct and unmodified implementation of Policy MH-2026-001 by recomputing the rule's cryptographic hash.'**

---

## 2. Topology Diagram
**FIELD-4 VARIANT (CRYPTOGRAPHIC RULE VERIFICATION):**
```
Policy MH-2026-001 (text: "Deny SSH to clinic servers")
├─ Cryptographic hash: SHA256[MH-2026-001] = A3F7E1BC...
├─ Rule derivation: SHA256[hash + "deny SSH"] = C9D2B... (rule 10)
├─ Signed rule: RSA-sign(C9D2B...) with policy authority's key
│
ACL Rule 10 (deployed on R1)
├─ Content: "deny tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 22"
├─ Signature: RSA-SIGN[C9D2B...]  (verified with policy authority's public key)
├─ Verification: Auditor computes SHA256[rule 10 content] → C9D2B... → matches policy signature ✓
└─ Tampering detection: If rule is modified, hash changes, signature no longer matches
```

## 3. IP Addressing Plan
| Rule | Content | Cryptographic Hash | Signature Status | Proof |
|---|---|---|---|---|
| Rule 10 | Deny SSH | C9D2B7... | Valid | **Rule 10 is correctly derived from policy** |
| Rule 20 | Permit HTTP | D4E8F3... | Valid | **Rule 20 is correctly derived from policy** |
| Rule 99 | Deny all | F1A9C2... | Valid | **Rule 99 is correctly derived from policy** |

---

## 4. Configuration (Field-Specific Optimizations)
```text
! On policy authority server:
$ Policy_ID="MH-2026-001"
$ Policy_Content="Deny SSH to clinic servers"
$ Policy_Hash=$(echo -n "$Policy_Content" | sha256sum | cut -d' ' -f1)
$ echo "Policy hash: $Policy_Hash"

$ Rule_Content="deny tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 22"
$ Rule_Hash=$(echo -n "$Rule_Content" | sha256sum | cut -d' ' -f1)
$ echo "Rule hash: $Rule_Hash"

$ Rule_Signature=$(openssl dgst -sha256 -sign policy_authority.key \
    <(echo -n "$Rule_Hash") | openssl enc -base64)
$ echo "Rule signature: $Rule_Signature"

! On router R1 (configure with rule and signature):
R1(config)#ip access-list extended 105
R1(config-ext-nacl)#remark Rule 10: SHA256=$Rule_Hash, SIG=$Rule_Signature
R1(config-ext-nacl)#10 deny tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 22
R1(config-ext-nacl)#exit

! Enable rule verification (optional advanced feature)
R1(config)#crypto key import rsa policy-authority-public-key.pem
! Store policy authority's public key for rule signature verification
```

## 5. Field-Specific Verification Steps
**Proof obligation:** Rules are correctly derived from policies and signed; tampering is detectable.

### Scenario 1: Cryptographic Rule Verification
```text
Step 1: Retrieve rule from R1
  R1#show access-list 105 | grep "10 deny"
  Expected: "deny tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 22"

Step 2: Compute rule's cryptographic hash
  $ Rule_Hash=$(echo -n "deny tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 22" | sha256sum)
  $ echo "Rule 10 hash: $Rule_Hash"

Step 3: Retrieve rule's signature from R1
  R1#show access-list 105 | grep "Rule 10: SHA256="
  Expected: Shows rule hash and signature

Step 4: Verify signature using policy authority's public key
  $ openssl dgst -sha256 -verify policy-authority-public.key \
    -signature rule-10.sig <(echo -n "$Rule_Hash")
  Expected: "Verified OK"

VERIFICATION RESULT: Rule 10 is correctly derived from policy MH-2026-001

Step 5: Repeat for all rules (10, 20, 99)

PROOF OBJECTIVE MET: All rules are cryptographically verified as correctly derived from policies.
```

### Scenario 2: Tampering Detection via Rule Modification
```text
Step 1: Rule 10 is currently: "deny tcp ... eq 22"
  Signature: RSA-SIGN[C9D2B...]

Step 2: Attacker modifies rule to: "permit tcp ... eq 22"
  Rule_Hash_New=$(echo -n "permit tcp ... eq 22" | sha256sum)
  $ echo "New rule hash: $Rule_Hash_New"  (different from original C9D2B...)

Step 3: Try to verify modified rule
  $ openssl dgst -sha256 -verify policy-authority-public.key \
    -signature rule-10.sig <(echo -n "$Rule_Hash_New")
  Expected: "Verification failure" (old signature doesn't match new hash)

TAMPERING DETECTED: Modified rule does not verify against policy authority signature

PROOF OBJECTIVE MET: Any rule modification is immediately detectable.
```

---

## 6. Expected Output Gallery
```text
R1#show access-list 105 detailed

Extended IP access list 105
remark Rule 10: Policy=MH-2026-001, SHA256=C9D2B7E1A4F9D2C3E6B8A1F4D7E9C2B5
  Signature=RSA-SIGN[C9D2B7...] (VERIFIED ✓)
  10 deny tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 22

remark Rule 20: Policy=MH-2026-002, SHA256=D4E8F3A7C1B9E2D5F8A3B6C9E1D4F7A2
  Signature=RSA-SIGN[D4E8F3...] (VERIFIED ✓)
  20 permit tcp 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255 eq 80

[CRYPTOGRAPHIC VERIFICATION STATUS]
All rules verified: 3/3 rules match policy signatures
Tampering detected: 0/3 rules modified
Overall status: SECURE
```

---

## 7. Common Field-Specific Mistakes
- Not storing rule signatures with rules (cannot verify later)
- Not using timestamped hashes (rule verification ambiguous if rule changed multiple times)
- Signature verification not performed regularly (tampering not detected)
- Policy authority's public key not stored securely (attacker replaces key to forge signatures)

## 8. Troubleshooting by Field
**Problem: "Rule signature verification fails"**
```text
Step 1: Verify policy authority's public key is correct
  R1#show crypto key rsa pubkey-chain
  Expected: Policy authority's key is present

Step 2: Re-compute rule hash from current rule
  $ Rule_Hash=$(echo -n "current-rule-content" | sha256sum)

Step 3: Verify signature against recomputed hash
  Expected: Signature validates if rule hasn't changed

If verification fails: Rule was modified (tampering detected) or policy authority key is wrong
```

---

## 9. Design Analysis
**Why does cryptographic rule verification matter for Security (Field 4)?**

ACL rules implement policies; if rules change without authorization, policy enforcement is broken. Cryptographic verification ensures rules stay synchronized with approved policies, preventing rogue administrators from silently weakening security.

---

## 10. Real-World Parallel
**D-Central Module:** `policy-enforcement-engine` (ACL rule derivation and verification)
**Haiti Phase:** P38+ — clinic ACLs must be verifiable as correctly implementing security policies

---

## 11. Stretch Goals
- Formal verification that cryptographic rule derivation is collision-resistant
- Time-locked rule signatures (rules can only be deployed during specific windows)
- Distributed rule verification (multiple routers independently verify each other's rules)

---

## 12. Self-Assessment (Field-Specific BSL)
```
Target BSL: BSL-3 to BSL-4
Understand rule hashing, signature verification, and tampering detection.
```

---

*Day 35 — Field 4 (Security) Lab — August 2026.*
