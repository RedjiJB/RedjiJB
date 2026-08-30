# Day 05  Field 1 (Black Start): Device Security for Offline Operation

## 0. Metadata

Field Focus: Field 1: Black Start Systems
Core Proof Obligation: Device authentication works offline without AAA server; local user database sufficient for secure access during internet outage.
Haiti Deployment Phase: P38 pilot
Estimated Time: 2 hours
Difficulty: Intermediate
Relationship to Base Lab: Same hardening as base, but removes external AAA dependency; uses only local usernames.
Prerequisite: Complete Day-05-Lab-Manual first.

## 1. Business Context

Offline operation requires zero external infrastructure. This variant proves authentication works locally without TACACS+/RADIUS.

## 2. Topology Diagram

Same as base Day-05.

## 3. IP Addressing Plan

Same as base.

## 4. Configuration

# Use local authentication instead of external AAA:
Router(config)#username admin secret class
Router(config)#username backup secret backup123
Router(config)#line vty 0 4
Router(config-line)#login local
Router(config-line)#exit

## 5. Verification

Step 1: Disable external AAA server (simulate offline)
Step 2: SSH with local user
  ssh -l admin router-ip
  Expected: Login succeeds (local database used)
Step 3: SSH with non-existent user
  Expected: Authentication fails

## 6. Expected Output

Router#show running-config | grep username
username admin secret 5 hash
username backup secret 5 hash

## 7. Common Mistakes

1. Forgetting "login local" on vty lines
2. Not creating local users before disabling AAA
3. Weak passwords

## 8. Troubleshooting

Problem: SSH fails with correct username
Step 1: Verify username exists
Step 2: Verify "login local" on vty lines
Step 3: Verify SSH is enabled

## 9. Design Analysis

Black Start requires no external services. Local auth is the fallback when infrastructure is unavailable.

## 10. Real-World Parallel

P38 Haiti: During internet outages, Lakou admins still need node access. Local auth provides offline access.

## 11. Stretch Goals

- Add password aging (90-day expiration)
- Implement command auth via privilege levels

## 12. Self-Assessment

BSL-3: Can rebuild offline auth without external AAA
BSL-4: Can add multiple users with different privilege levels

End of Day-05-Field-1-Lab.md