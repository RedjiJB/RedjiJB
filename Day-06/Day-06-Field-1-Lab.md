# Day 06 — Field 1 (Black Start): Port Security for Offline Operation

## 0. Metadata

Field Focus: Field 1: Black Start Systems
Core Proof Obligation: Port security works offline; sticky MAC learning survives power cycle.
Haiti Deployment Phase: P38 pilot
Estimated Time: 2 hours
Difficulty: Intermediate
Relationship to Base Lab: Same port security, but learned MACs are saved to NVRAM so they survive reboot.
Prerequisite: Complete Day-06-Lab-Manual first.

## 1. Business Context

During cold-start recovery, port security must work without re-learning MACs from scratch. This variant proves sticky MACs survive reboot.

## 2. Topology Diagram

Same as base.

## 3. IP Addressing Plan

Same as base.

## 4. Configuration

SW1(config)#interface fastEthernet 0/1
SW1(config-if)#switchport port-security
SW1(config-if)#switchport port-security mac-address sticky
SW1(config-if)#switchport port-security maximum 1
SW1(config-if)#switchport port-security violation shutdown
SW1#copy running-config startup-config

## 5. Verification

Step 1: Connect PC; port learns MAC
Step 2: Reboot switch
Step 3: Verify sticky MAC persists
  show port-security address
  Expected: Sticky MAC still present after reboot

## 6. Expected Output

SW1#show port-security address
Secure Mac Address Table
VlanId MacAddress Type Ports Remaining Age
  10   0000.00AA.BBCC StickyDynamic Fa0/1  -

## 7. Common Mistakes

1. Not enabling sticky learning
2. Not saving config to NVRAM
3. Forgetting copy running-config startup-config

## 8. Troubleshooting

Problem: Sticky MAC lost after reboot
Step 1: Verify sticky is enabled
Step 2: Verify running-config was saved
Step 3: Check startup-config includes sticky commands

## 9. Design Analysis

Black Start requires offline resilience. Sticky MACs enable port security to work autonomously without external DB.

## 10. Real-World Parallel

P38 Haiti: Switch reboots during power restoration. Sticky MACs ensure port security doesn't reset.

## 11. Stretch Goals

- Test maximum number of sticky MACs per port
- Compare sticky vs. static MAC configurations

## 12. Self-Assessment

BSL-3: Can configure sticky MACs with persistence
BSL-4: Can explain when sticky is better than static

End of Day-06-Field-1-Lab.md