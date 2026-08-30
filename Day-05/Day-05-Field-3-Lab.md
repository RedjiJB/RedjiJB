# Day 05  Field 3 (DePIN): Switching Basics with Byzantine Failure Simulation

## 0. Metadata

Field Focus: Field 3: Distributed Systems & DePIN Governance
Core Proof Obligation: Multi-switch topology continues to flood VLAN traffic reliably even when one switch drops 5% of packets (Byzantine failure).
Haiti Deployment Phase: P38 pilot
Estimated Time: 22.5 hours
Difficulty: Intermediate
Relationship to Base Lab: Same VLAN topology as base Day-05, but adds Byzantine failure injection and measures flooding reliability.
Prerequisite: Complete Day-05-Lab-Manual first.

## 1. Business Context

In DePIN, every switch is a peer. When a Byzantine switch drops 5% of flooded frames randomly, does the rest of the VLAN still achieve quorum (95%+ nodes receiving the frame)? This variant proves: **multi-switch topologies can tolerate Byzantine switches that drop frames randomly without breaking VLAN convergence.**

## 2. Topology Diagram

Same as base Day-05 VLAN topology + Byzantine failure injection on SW1 (drop 5% random packets).

## 3. IP Addressing Plan

Same as base Day-05.

## 4. Configuration

No config change  Byzantine failure is simulated via link loss injection in GNS3/Packet Tracer.

## 5. Verification Steps

Step 1: Enable 5% packet loss on SW1 (simulated Byzantine)
Step 2: Send 100 broadcast pings from PC1
Step 3: Measure reception at PC2 and PC3
  Expected: ~95 out of 100 received (5% loss due to Byzantine)
Step 4: Verify VLAN still functions despite loss
  PC1#ping 192.168.10.2
  Expected: Successful (flooding survives Byzantine node)

## 6. Expected Output

PC1#ping 192.168.10.2 -c 100
100 packets transmitted, 95 received, 5% loss

## 7. Common Mistakes

1. Not actually measuring Byzantine loss (configuring but not verifying)
2. Using loss > 10% (switches can't tolerate > 10% loss)

## 8. Troubleshooting

Problem: Byzantine loss configured but ping shows 0% loss
Solution: Verify Byzantine injection is enabled in simulator settings.

## 9. Design Analysis

In DePIN, Byzantine failure is the baseline. This variant proves L2 switching can tolerate random packet drops via probabilistic delivery  consensus protocols at Layer 3 still reach quorum if 95% of frames get through.

## 10. Real-World Parallel

P38 Haiti: If one switch is degraded (drops random frames), the rest of the mesh still converges. This is part of P38's resilience model.

## 11. Stretch Goals

- Test 10%, 20% loss; find breaking point where VLAN flooding fails
- Add RSTP and measure convergence under Byzantine loss

## 12. Self-Assessment

BSL-3: Can rebuild topology with Byzantine loss
BSL-4: Can identify max loss threshold where VLAN works

End of Day-05-Field-3-Lab.md