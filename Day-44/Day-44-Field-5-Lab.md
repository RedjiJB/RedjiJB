# Day 44 — Field 5 (Healthcare AI): DNS/DHCP with Privacy-Preserving Inference Logging and HIPAA Compliance

---

## 0. Metadata
| Field | Value |
|---|---|
| **Field Focus** | Field 5: Healthcare AI (Privacy-preserving DNS/DHCP, HIPAA-compliant address assignment logging, device classification without patient data exposure) |
| **Core Proof Obligation** | DNS queries and DHCP assignments are logged for audit compliance, but patient data is not disclosed to any external service. Device classification (e.g., "clinic workstation" vs. "personal patient phone") happens locally without sending identifying information to cloud. |
| **Haiti Deployment Phase** | P38+ — clinic networks must be HIPAA-compliant and privacy-preserving |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Advanced |
| **Relationship to Base Lab** | Extends Day-44-Field-4 with privacy-preserving inference; DNS/DHCP logs are anonymized, device type inference uses local data only. |
| **Prerequisite** | Day-44-Field-4, Day-44-Research-Paper, healthcare privacy concepts |

---

## 1. Business Context (Field-Specific Framing)
Healthcare networks must comply with HIPAA (Health Insurance Portability and Accountability Act). DNS queries can leak patient information (e.g., "query for diabetes-support.com" suggests the patient has diabetes). DHCP assignments can link device MAC to patient names. Local DNS/DHCP servers help, but logging must be privacy-preserving.

This variant proves: **DNS/DHCP logs are HIPAA-compliant. Queries and assignments are logged for audit, but patient data is scrubbed. Device inference (classifying devices as clinic or personal) uses local heuristics without external cloud queries. Inference logs don't contain patient identifiers.**

---

## 2. Topology Diagram
**FIELD-5 VARIANT (PRIVACY-PRESERVING HEALTHCARE DNS/DHCP):**
```
R1 (Haiti Clinic) running privacy-preserving DNS + DHCP
├─ Local DNS Server:
│  ├─ Query logging: Log query type + timestamp (no patient data)
│  ├─ Query examples (logged):
│  │  ├─ Query: [QUERY] for "lab-results.clinic" [timestamp] [anonymized-source-IP]
│  │  └─ Response: lab-results.clinic → 192.168.1.60
│  │
│  └─ Privacy rule: Never log patient names in DNS queries
│     Example: Query for "MRN-12345.ehr-system.clinic" is logged as "[QUERY] EHR zone [timestamp]"
│
├─ Local DHCP Server:
│  ├─ Assignment logging: Log [assigned-IP, device-type] (no MAC, no hostname)
│  ├─ Device type inference: Clinic workstation (based on HTTP port usage), Personal device (limited ports)
│  │  └─ Inference uses local heuristics (no cloud query)
│  │  └─ Logged as: "192.168.1.101 = [clinic-workstation]" (anonymized)
│  │
│  └─ Privacy rule: Never link DHCP binding to patient identifiers
│
└─ HIPAA Compliance Audit:
   ├─ Retention: Logs kept for 7 years (regulatory requirement)
   ├─ Anonymization: Patient names removed from all entries
   └─ Access control: Only healthcare admin can view logs (role-based access)
```

---

## 3. IP Addressing Plan
| IP Address | Device Type (Inferred) | Privacy Status | Audit Trail |
|---|---|---|---|
| 192.168.1.50 | [clinic-workstation] | Anonymized | "2026-08-30 clinic device assigned 192.168.1.50" (no patient name) |
| 192.168.1.100 | [personal-device] | Anonymized | "2026-08-30 personal device assigned 192.168.1.100" (no patient name) |
| 192.168.1.200 | [medical-equipment] | Anonymized | "2026-08-30 medical-equipment assigned 192.168.1.200" (no model info) |

---

## 4. Configuration (Field-Specific Optimizations)
```text
! ===== PRIVACY-PRESERVING DNS LOGGING =====
R1(config)#ip dns server
R1(config)#ip domain-name clinic.local

! Enable logging but strip patient data
R1(config)#logging host 192.168.1.1
R1(config)#logging level info

! DNS query logging filter (remove sensitive queries)
R1(config)#ip dns query-logging
R1(config)#ip dns query-filter strip-hostname
! Log query type (e.g., "A record query") but not target hostname if it contains patient MRN

! ===== PRIVACY-PRESERVING DHCP LOGGING =====
R1(config)#ip dhcp pool clinic-devices
R1(dhcp-config)#network 192.168.1.0 255.255.255.0
R1(dhcp-config)#default-router 192.168.1.1
R1(dhcp-config)#dns-server 192.168.1.1
R1(dhcp-config)#exit

! Enable device type inference (local only, no cloud lookup)
R1(config)#ip dhcp device-classification local
R1(config)#ip dhcp device-classification rule "clinic-workstation" mac-prefix 00:1a:2b
R1(config)#ip dhcp device-classification rule "personal-device" mac-prefix 08:00:27
R1(config)#ip dhcp device-classification rule "medical-equipment" mac-prefix 52:54:00

! Enable DHCP logging with anonymization
R1(config)#ip dhcp logging
R1(config)#ip dhcp logging format [assigned-ip device-type timestamp]
R1(config)#ip dhcp logging exclude [mac-address hostname]
! Log only IP + device-type + timestamp; exclude MAC and hostname

! ===== HIPAA COMPLIANCE CONFIG =====
R1(config)#access-list 101 permit tcp any any eq 443
! Allow HTTPS only (encrypted) for EHR access; no HTTP

R1(config)#ip access-list extended encrypted-only
R1(config-ext-nacl)#permit tcp any any eq 443 (HTTPS)
R1(config-ext-nacl)#deny tcp any any eq 80 (block HTTP)
R1(config-ext-nacl)#exit

R1(config)#exit
R1#copy running-config startup-config
```

---

## 5. Field-Specific Verification Steps

### Scenario 1: HIPAA-Compliant DNS Logging
```text
Step 1: Clinic staff performs EHR query
  Workstation#nslookup MRN-12345.clinic.ehr
  Query: MRN-12345.clinic.ehr → R1's DNS

Step 2: R1 logs query (privacy-preserving)
  DNS Log Entry:
    Timestamp: 2026-08-30T15:00:00Z
    Query Type: A-record query (hostname stripped)
    Source IP: [anonymized]
    Result: Resolved to 192.168.1.200

  PRIVACY: Patient MRN (12345) is NOT logged; only "A-record query" is recorded

Step 3: Verify anonymization in syslog
  Syslog#grep "dns" /var/log/cisco.log
  Expected: "2026-08-30T15:00:00Z DNS A-record query [anon-ip]" (no MRN)
  If MRN appears: HIPAA violation detected

PROOF OBJECTIVE MET: DNS query is logged for compliance but patient data is stripped.
```

### Scenario 2: Privacy-Preserving Device Classification
```text
Step 1: Personal patient phone (MAC 08:00:27:11:22:33) boots
  DHCP DISCOVER sent by phone

Step 2: R1 classifies device locally (no cloud query)
  R1 checks MAC prefix: 08:00:27 → [personal-device]
  R1 infers: This is a personal device, not clinic workstation
  Inference method: MAC prefix matching (local data only)

Step 3: R1 assigns IP and logs with classification
  DHCP ACK: Assign 192.168.1.110
  Log entry: "2026-08-30T15:05:00Z 192.168.1.110 [personal-device]"
  
  PRIVACY: No patient name, no MAC address, no device model logged
  Only: IP address + device type classification

Step 4: Verify inference log doesn't contain patient data
  Audit Log: Query for "192.168.1.110"
  Expected result: "personal-device assigned on 2026-08-30T15:05:00Z"
  Should NOT show: MAC address, patient name, or device model

PROOF OBJECTIVE MET: Device is classified without exposing patient data.
```

---

## 6. Expected Output Gallery
```text
R1#show ip dhcp binding with classification

IP address       Device Type          Assignment Time          Expiration
192.168.1.50     [clinic-workstation] Aug 30 2026 14:00 PM    Aug 31 2026 02:00 AM
192.168.1.100    [personal-device]    Aug 30 2026 15:05 PM    Aug 31 2026 03:05 AM
192.168.1.200    [medical-equipment]  Aug 30 2026 13:30 PM    Aug 31 2026 01:30 AM

[HIPAA COMPLIANCE VERIFICATION]
Bindings logged: 3
Patient identifiers in logs: 0 (COMPLIANT)
MAC addresses exposed: 0 (COMPLIANT)
Anonymous device classification: 3/3 entries (COMPLIANT)
Privacy filtering enabled: Yes
```

---

## 7. Common Field-Specific Mistakes
- Logging full DHCP bindings including MAC (HIPAA violation)
- DNS logs showing patient MRNs or query hostnames (privacy breach)
- Device classification using cloud service (reveals device info externally)
- No anonymization of inference logs (links device to patient)

## 8. Troubleshooting by Field
**Problem: "DHCP logs contain MAC addresses (HIPAA violation)"**
```text
Step 1: Verify DHCP logging exclude filter
  R1#show running-config | include "dhcp logging exclude"
  Expected: "exclude [mac-address hostname]"
  If missing: Configure filtering immediately

Step 2: Audit existing logs for patient data leakage
  Audit#grep -i "mac\|hostname\|patient" /var/log/dhcp.log
  If matches found: HIPAA audit required
```

---

## 9. Design Analysis
**Why does privacy-preserving DNS/DHCP matter for Healthcare AI (Field 5)?**

Healthcare AI infers population health patterns and tailors treatments to individual patients. This requires access to population data but must never expose individual patient identifiers to external systems. Local DNS/DHCP with privacy-preserving logging enables this: inference happens locally using local data; external queries reveal nothing.

---

## 10. Real-World Parallel
**D-Central Module:** `clinic-naming-service` (HIPAA-compliant local DNS/DHCP)
**Haiti Phase:** P38+ — Haiti clinics must comply with emerging healthcare privacy regulations

---

## 11. Stretch Goals
- Differential privacy in inference logs (add noise to protect individual patients)
- Federated learning over private DNS/DHCP data (train AI models without centralizing patient data)

---

## 12. Self-Assessment (Field-Specific BSL)
```
Target BSL: BSL-3 to BSL-4
Understand HIPAA compliance, privacy-preserving logging, and local inference.
```

---

*Day 44 — Field 5 (Healthcare AI) Lab — August 2026.*
