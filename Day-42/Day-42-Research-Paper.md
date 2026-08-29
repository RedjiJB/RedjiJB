# Day 42 Research Paper — SSH: Secure Remote Access & Management

Applies `RedjiJB-Labs/RESEARCH-PAPER-STANDARD.md` §2–2.6 to this lab's design.

---

## 2.1 Delta Section

```
Baseline:      A newly installed switch with Telnet enabled (in-band only),
               no local authentication, default (no) enable secret, no RSA keys.
This design:   A hardened switch with SSH-only VTY access, local username
               authentication, RSA 2048-bit key-based encryption, an ACL
               restricting management access to a single authorized host IP,
               and an idle session timeout.
Delta:         Layered security controls: (1) RSA key generation and SSH
               enforcement (encryption), (2) local credential authentication
               (identity), (3) ACL-based IP filtering (authorization), (4)
               session timeout (preventing credential harvesting).
Justification: Telnet transmits credentials in plaintext, making any telnet
               session vulnerable to packet capture. Without local auth, there
               are no credentials to verify. Without an ACL, any host on the
               network segment can attempt management access. Without a timeout,
               an attacker who gains console access once can leave the session
               open indefinitely. This delta layers defenses so that each is
               independent: even if an attacker bypasses one (e.g., port-scans
               the ACL), the others remain intact.
```

---

## 2.2 Compliance Gap Analysis

SSH is defined by **RFC 4251–4254** (protocol specification) and **NIST SP 800-53 AC-2** (access control requirements). This lab aligns with RFC 4251's core design (transport layer, public-key authentication, encryption) but omits some production hardening. Comparison:

| Standard Clause | Requirement | Lab's Design | Compliant? | Gap Justification (if any) |
|---|---|---|---|---|
| RFC 4251 (SSH Transport Layer) | Establish encrypted channel before credential transmission | Lab uses SSH v2 with RSA 2048 key exchange and symmetric encryption (AES or 3DES depending on IOS version) | Compliant | — |
| RFC 4252 (SSH User Authentication) | Support public-key, password, keyboard-interactive authentication | Lab uses local username + password (equivalent to password auth); does not generate user RSA key pairs for public-key auth | Functionally compliant for CCNA scope; production SSH would support multiple auth methods | Password auth is weaker than public-key; gap is scope-appropriate (CCNA 200-301 doesn't require certificate management) |
| NIST SP 800-53 AC-2 (Account Management) | Unique accounts per user, password complexity enforcement, account lockout | Lab uses hardcoded local username (no per-user identity tracking); no password-complexity policy; no failed-login lockout | Partially compliant; acceptable gap for educational lab | Production systems enforce password composition (uppercase, digits, symbols) and lock accounts after N failed attempts; lab omits both. Gap acceptable for CCNA scope. |
| NIST AC-6 (Least Privilege) | Restrict management access to explicitly authorized users/hosts | Lab uses a standard ACL restricting VTY access to one source IP | Compliant (ACL implements least privilege by default-deny) | — |
| RFC 4251 (session termination) | No normative requirement | Lab configures `exec-timeout` to terminate idle sessions | Exceeds RFC (good practice, not required) | Positive addition |

---

## 2.3 Quantitative Benchmarking

```
Metric:              Time to crack credentials via packet capture
Baseline value:      Telnet: credentials visible in cleartext packets
                      (capture time ~0s, crack time ~0s — already exposed)
This design's value: SSH with RSA 2048: passive packet capture yields
                      encrypted payload; active attack requires factoring
                      2048-bit RSA modulus (estimated ~10^308 operations,
                      impractical with current technology)
Delta:                From instant capture to computationally infeasible
                      (for all practical purposes: "infinite" crack time
                      vs. ~0s for Telnet)
Confidence/Caveat:    Based on NIST recommendations for RSA 2048 (acceptable
                      through 2030, deprecated after 2031); assumes attacker
                      has no quantum computer (post-quantum cryptography
                      out of scope for CCNA)
```

```
Metric:              Authentication factors layered
Baseline value:      Telnet: source IP (anyone on the segment) + optional
                      Telnet password (if configured) = ~1–1.5 factors
This design's value: SSH with ACL + local auth + encryption = 3 factors:
                      1) IP source restriction (network layer)
                      2) Username/password (credential layer)
                      3) Encryption (transport layer — useless to an attacker
                      even if they reach the port)
Delta:                From 1–1.5 to 3 independent security layers, each with
                      fail-independent consequences (breach of one doesn't
                      compromise the others)
Confidence/Caveat:    Factors are not cryptographically independent
                      (e.g., if an attacker exploits a routing protocol to
                      spoof the ACL IP, they bypass factor 1 but not 2/3);
                      however, each factor adds real cost to an attack, and
                      all three together raise the bar significantly above
                      Telnet baseline
```

---

## 2.4 Verification Traceability Matrix

| Requirement | Verification Command(s) | Covered? | Gap Note |
|---|---|---|---|
| 1. Explain why L2 switch needs SVI + default gateway | Configuration of SVI VLAN 1 on SW2 with IP 192.168.2.253/24; routing verification with ping from PC1 to SW2 across R1/R2 | Yes | Lab requires actual end-to-end ping, proving SVI is reachable (not just configured). |
| 2. Configure local username authentication | `username jeremy secret ccna` + `login local` on VTY lines | Yes | Verification: attempt SSH with wrong username (rejected), then correct username (accepted) |
| 3. Generate RSA keys and explain why SSH requires them | `crypto key generate rsa` on SW2 | Yes | Lab does not verify that Telnet is *disabled* as a consequence (gap: should show `show ip ssh` confirming SSH server listening, and attempt Telnet connection failing) |
| 4. Lock VTY to SSH-only: `transport input ssh` | `transport input ssh` on VTY lines; `show ip ssh` confirmation | Partial | Gap: lab doesn't include a step that attempts Telnet after lockdown and expects it to fail — a negative-test verification that would prove SSH-only is enforced |
| 5. Apply standard ACL to restrict management access | `access-list 1 permit 192.168.1.1` on SW2, applied to VTY with `access-class 1 in` | Yes | Verification: SSH from PC1 (permitted) succeeds; SSH from an unauthorized host (rejected). Lab does not include a second unauthorized host, so only the happy path is tested. |
| 6. Trace a connection attempt through every layer | Lab manual walks through each layer conceptually but doesn't require the student to construct a packet diagram or syslog trace of a failed SSH attempt | Partial | Lab teaches "what each layer does" but not "how to prove each layer fired" via packet inspection or device logs — an advanced skill not expected at CCNA Intermediate level |

---

## 2.5 Community Integration

```
Contribution target:   GNS3 community lab collection or r/ccna resource library
Current state:         A detailed lab manual with step-by-step SSH hardening
                        checklist, topology diagram, and expected output
Gap to contributable:  1. No build_lab.py automation — manual SSH config
                        requires learner interaction, which is pedagogically
                        good, but automating topology bring-up (switch, router,
                        PC, ACL skeleton) would be helpful.
                        2. No "how to troubleshoot broken SSH" troubleshooting
                        section — common mistakes (wrong RSA key size, VTY not
                        set to local login, ACL denying the management PC) are
                        not explicitly addressed.
                        3. No post-lab extension on certificate management or
                        RADIUS — these are production-scale topics, but a link
                        to "next steps" would improve the lab's reusability in
                        advanced networks.
```

---

## 2.6 Research-Field Linkage

### 2.6.a Research Fields Identified

This lab contributes evidence to two research fields:

- **Field 1: Black Start Systems (Secure Offline Access)** — The lab demonstrates SSH as an encrypted, cryptographically-authenticated mechanism for remote management without requiring a central authentication server (radius/TACACS) or external PKI. Offline SSH is foundational to autonomous network operations.

- **Field 4: Security (Identity Attestation & Access Control)** — The lab demonstrates layered identity attestation: RSA key-based encryption (cryptographic identity of the device), local username/password (human identity), and ACL-based authorization (explicit permission). Together, these prove that a device can cryptographically attest its identity and selectively allow access.

### 2.6.b Proof Obligations

**Field 1 (Black Start Systems):**
- Proof obligation 1: SSH must function for remote management without a centralized authentication server (RADIUS, TACACS+).
  - Validation: Configure SW2 with local accounts only (`username jeremy secret ccna`, no RADIUS config). Attempt SSH from PC1 with correct credentials (succeeds). Disconnect R1 from any backend server. Reattempt SSH; it still works. This proves authentication is purely local, not cloud-dependent.

- Proof obligation 2: SSH encryption must work offline (no periodic PKI check-ins required).
  - Validation: Generate RSA keys on SW2 (`crypto key generate rsa`). Disable any external connectivity (simulate internet loss). Attempt SSH from PC1; connection negotiates encryption and authenticates successfully. Verify `show crypto key rsa` shows the keys are persistently stored on-device. This proves the encryption is self-contained, not dependent on external validation.

**Field 4 (Security):**
- Proof obligation 1: Device identity must be cryptographically verifiable and unique (RSA key fingerprint).
  - Validation: Generate RSA keys on SW2. Display the key fingerprint via `show crypto key rsa` or SSH client-side display of the key fingerprint on first connection. Verify the fingerprint is stable across reboots (manually reboot SW2, reconnect via SSH, confirm fingerprint matches). This proves device identity is persistent and verifiable.

- Proof obligation 2: Access control must enforce per-host restrictions independent of encryption/authentication.
  - Validation: Configure ACL to permit only PC1 (192.168.1.1) on VTY. Attempt SSH from PC1 (via R1's routing): succeeds. Attempt SSH from an unauthorized host on the same VLAN (e.g., another PC2): gets `% Connection refused` at the IP layer (ACL drops it before SSH negotiation). Verify with `show access-list` that the denied traffic is counted. This proves the ACL filters independent of SSH/authentication.

### 2.6.c Haiti Deployment Linkage

**Field 1 (Black Start — Phase P38 onwards):**
- Module: `dcentral-fieldops-remote-management` (secure, offline-capable node access)
- When: P38 pilot (50–100 remote nodes). P45 expansion (500+ nodes). P52+ scale (5000+ nodes).
- Why this proof matters: Haiti's remote nodes must be manageable over degraded connectivity (often satellite, sometimes mesh). SSH-only with local auth (no RADIUS) ensures that a node can be configured or recovered even when the regional NOC's authentication server is unreachable. Day-42's proof that SSH functions without centralized auth servers is a prerequisite for P38 autonomous operations.

**Field 4 (Security — Phase P38 onwards):**
- Module: `dcentral-core-device-attestation` (cryptographic identity and access control)
- When: P38 pilot. P45+ full deployment.
- Why this proof matters: Every device in the Haiti mesh must cryptographically prove its identity to peers (mutual TLS or equivalent). Day-42's proof that RSA-based device identity is stable and verifiable is foundational to dcentral-core's device-attestation layer. Without it, there's no way to distinguish an authentic device from a compromised clone during a network partition.

### 2.6.d Publication Linkage

This lab's proof feeds into:

- **Publication #6: "Cryptographic Identity in Autonomous Mesh Networks"** (Field 4, target phase P60–P65, venue: CCS/S&P)
  - Specific contribution: Day-42's proof that RSA device identity is persistent and verifiable off-network feeds into the formal definition of device identity in mesh-network protocols. This is a case study in how a simple SSH key can be the root of trust for a larger system.

- **Publication #9: "Remote Management Without Cloud Backends"** (Field 1 + Field 4, target phase P45–P52, venue: Harvard peer-reviewed)
  - Specific contribution: Day-42's local-auth SSH is cited as an operational pattern for autonomous systems: how to enable remote management without assuming backend infrastructure is always available.

### 2.6.e Validation Gate

Before P38 pilot can deploy devices with secure management:

- **Research milestone: Formal verification of SSH key persistence under failure scenarios**
  - Target: Publication #6 must include a proof that RSA device keys survive unexpected restarts, power loss, and network partitions.
  - Status: In progress (T3 phase, P26 target for draft).
  - Consequence if missed: P38 pilot devices include SSH but without formal guarantee of key persistence; a device that loses its keys mid-deployment would lose its identity (requiring manual re-provisioning). Deployment board mitigates by implementing automated key backup (adding complexity). If gate completes on time, keys can be treated as authoritative without backup.

---

## Summary

**Day-42's research contribution:** Demonstrates SSH as a self-contained, offline-capable, cryptographically-authenticated remote-management mechanism with layered access controls (encryption + local auth + IP ACL). This proof unblocks Field 1 (autonomous operations without centralized auth) and Field 4 (device identity attestation) for Haiti P38 deployment.

