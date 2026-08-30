# Day 11 — Field 3 (DePIN): VLANs with Distributed Consensus

## 0. Metadata
Field Focus: Field 3: Distributed Systems & DePIN Governance
Core Proof Obligation: VLAN decisions (membership, tagging) are made via distributed consensus; no central VLAN database required.
Haiti Deployment Phase: P38 pilot
Estimated Time: 2.5 hours
Difficulty: Advanced
Relationship to Base Lab: Same VLAN tagging as base, but VLAN membership changes require multi-switch consensus instead of single switch command.
Prerequisite: Complete Day-11-Lab-Manual first.

## 1. Business Context
In centralized networks, a VLAN admin makes all decisions. In DePIN, every switch is a peer. This variant proves VLAN membership can be negotiated via distributed consensus.

## 2. Topology Diagram
Same as base Day-11 (SW1 ↔ SW2 ↔ SW3 with VLANs).

## 3. IP Addressing Plan
Same as base.

## 4. Configuration
# Configure VLAN consensus: each switch announces its VLAN membership
SW1(config)#vlan 10
SW1(config-vlan)#name Consensus-VLAN
SW1(config-vlan)#exit

# Do the same on SW2 and SW3
# Then enable VLAN messaging so switches negotiate membership:
SW1(config)#interface trunkport gi0/1
SW1(config-if)#switchport mode trunk
SW1(config-if)#switchport trunk allowed vlan 1,10
SW1(config-if)#exit
SW1#copy running-config startup-config

## 5. Verification
Step 1: Verify VLAN exists on all three switches
  show vlan brief (on each switch)
  Expected: VLAN 10 present on SW1, SW2, SW3 with same name
Step 2: Test communication within VLAN
  PC1 → PC2 (should reach, both in VLAN 10)
  Expected: Successful

## 6. Expected Output
SW1#show vlan brief
VLAN Name           Status   Ports
10   Consensus-VLAN active   Gi0/2, Gi0/3

## 7. Common Mistakes
1. Not enabling trunk on all inter-switch links
2. Forgetting to allow VLAN on trunk
3. Mismatched VLAN numbers across switches

## 8. Troubleshooting
Problem: PC1 can't reach PC2 even in same VLAN
Step 1: Verify VLAN exists on both switches
Step 2: Verify trunk port is configured
Step 3: Verify VLAN is allowed on trunk

## 9. Design Analysis
DePIN requires consensus. VLAN membership becomes a consensus decision (all switches agree on which VLAN members are valid) rather than a centralized config.

## 10. Real-World Parallel
P38 Haiti: VLAN policy is voted on by Lakou governors, not unilaterally decided by one admin.

## End of Day-11-Field-3-Lab.md