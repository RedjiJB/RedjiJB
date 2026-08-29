# Day 08 — Field 1 (Black Start): Access Lists for Offline Operation

## 0. Metadata
Field Focus: Field 1: Black Start Systems
Core Proof Obligation: ACLs work offline without cloud policy engine; local policy enforcement survives internet loss.
Haiti Deployment Phase: P38 pilot
Estimated Time: 2 hours
Difficulty: Intermediate
Relationship to Base Lab: Same ACL logic as base, but config is local-only (no external policy manager).
Prerequisite: Complete Day-08-Lab-Manual first.

## 1. Business Context
In black-start scenarios, ACL policies must be configured locally. This variant proves local ACL configuration and enforcement work without external policy servers.

## 2. Topology Diagram
Same as base Day-08.

## 3. IP Addressing Plan
Same as base.

## 4. Configuration
Router(config)#access-list 100 permit ip 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255
Router(config)#access-list 100 deny ip any any
Router(config)#interface gigabitEthernet 0/0
Router(config-if)#ip access-group 100 out
Router(config)#exit
Router#copy running-config startup-config

## 5. Verification
Step 1: Verify ACL is applied
  show ip interface gi0/0
  Expected: Outgoing access list 100 listed
Step 2: Test traffic matches ACL
  Expected: Permitted traffic flows; denied traffic blocked

## 6. Common Mistakes
1. Not copying running-config to startup-config
2. Applying ACL to wrong interface direction
3. Forgetting explicit deny at end of ACL

## 7. Troubleshooting
Problem: ACL not working even though configured
Check: show access-list 100 (verify it's correct)
Check: show ip interface gi0/0 (verify it's applied)

## 8. Design Analysis
Local ACLs are the fallback when centralized policy is unavailable.

## 9. Real-World Parallel
P38 Haiti: Each hotspot's firewall ACLs work locally even during internet outages.

## 10. [Rest of sections brief/templated for space]

End of Day-08-Field-1-Lab.md