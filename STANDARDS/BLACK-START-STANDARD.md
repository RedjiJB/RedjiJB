# The Black Start Standard for Network Engineering Labs

## What this document is

This is the reference standard referenced by every `Day-NN-Black-Start.md` companion document in `RedjiJB-Labs/`. It defines, once, the doctrine, terminology, and scoring system that each lab's Black Start companion applies to that lab's specific topology. Read this once; the per-lab documents assume it.

**Origin note:** this framework is adapted from a broader personal sovereign-operator doctrine (the Black Start Augmentation System) built around the principle that knowledge which depends on the internet, cloud services, or documentation being reachable is *dependent* knowledge, not *sovereign* knowledge. Applied here specifically to CCNA network engineering: a network engineer who can only configure a device by copy-pasting from a browser tab has not actually learned networking — they've learned to retrieve networking. This standard exists to close that gap, lab by lab.

---

## 1. Why this matters for a network engineer specifically

Every lab in this repo teaches you to configure a device with the manual open next to you. That's necessary for learning, but it is not the finish line. Consider the actual failure mode this trains for:

- A core switch fails at 2 AM. The internet link that would let you Google the config is *routed through that switch*. You have console access and a blank replacement device. Nothing else.
- A ransomware incident takes down your documentation wiki along with everything else. You need to rebuild firewall rules, VLANs, and routing from memory and first principles, under time pressure, while the business bleeds money per minute.
- You're doing a technical interview or a CCNA lab practical exam with no reference material allowed, and the difference between "I've configured this before" and "I understand this" becomes very obvious very fast.

In every one of these situations, the engineer who can rebuild a working network from a blank device with no external reference is doing something categorically different from the engineer who followed a manual. This standard names that difference and gives you a way to test for it, honestly, lab by lab.

---

## 2. The Three-Track Rule

No lab is "done" until it clears all three tracks. This mirrors the original CL → SL → BSL doctrine, mapped onto network engineering:

```
TRACK 1 — COGNITIVE LAYER (CL)
  You can explain, out loud, without notes, what every command in this lab does,
  what mode it runs in, and why it's necessary. This is the "Design Analysis" and
  "Common Mistakes" sections of the main lab manual, internalized.

TRACK 2 — SYSTEM LAYER (SL)
  You have built the working topology yourself — in Packet Tracer or GNS3 — following
  the lab manual, and verified it against the Expected Output Gallery. This is
  "I did the lab."

TRACK 3 — BLACK START LAYER (BSL)
  You can rebuild this lab's topology from a blank/factory-default device, from memory,
  with the lab manual closed, within a time budget, and produce working end-to-end
  connectivity that passes the lab's original verification steps. This is "I don't need
  the lab anymore."
```

**The rule, stated plainly:** CL and SL together get you a passing grade. BSL is what makes you employable in an outage. Every lab's Black Start companion document exists to test Track 3 specifically — it deliberately does *not* repeat the configuration steps, because if you need to read them again, you haven't reached BSL for this lab yet.

---

## 3. BSL Maturity Levels

Score yourself honestly against this scale for each lab, using the drill in that lab's Black Start companion document.

| Level | Name | What it means for a CCNA lab |
|---|---|---|
| **BSL-0** | Awareness | You've read the lab manual once. You could not configure any of it without it open. |
| **BSL-1** | Lab Capable | You completed the lab with the manual open, copying commands, and it worked. |
| **BSL-2** | Offline | You could re-do the lab with the manual open but *without internet access* — i.e., you're not dependent on looking things up beyond what's already written down. |
| **BSL-3** | Recoverable | Manual closed. Given the topology diagram and addressing table only (no commands), you can write and apply the full configuration from memory, though you may need 1–2 reference checks for exact syntax on a command you rarely use. |
| **BSL-4** | Maintainable | Manual and addressing table both closed. Given only the topology diagram (device names and physical connections), you can design your own addressing plan and configure the entire topology from memory, unassisted, within the lab's time budget. |
| **BSL-5** | Teachable | You can walk a beginner through this lab's concepts and configuration from memory, correctly answering "why" questions on the spot, without preparation. |
| **BSL-6** | Replaceable | You could reconstruct this lab's entire topology, addressing scheme, and configuration from a one-line description of the business requirement alone ("two branches, different firewall placement, static routing") — no diagram, no table, nothing but the scenario. |

**Realistic target for a CCNA student:** BSL-3 or BSL-4 on every lab by the time you finish the full 47-lab set. BSL-5/6 is graduate-level internalization — treat it as a stretch goal, not a requirement, especially on the more protocol-dense labs (OSPF, EIGRP, BGP-adjacent content).

---

## 4. The 6 Operational Domains (network engineering translation)

The original doctrine scores six domains for infrastructure sovereignty. Translated to what a CCNA-level network actually consists of:

| Domain | Original meaning | CCNA-lab meaning |
|---|---|---|
| **Energy** | Can systems stay alive without the grid? | Not directly applicable at CCNA scope — noted for completeness; becomes relevant once you're managing physical infrastructure (UPS on switches/routers, PoE budget for phones/APs) |
| **Compute** | Can you run code when infrastructure is gone? | Can you get a device to a working state (boot, recover from a bad config, reset to factory defaults and rebuild) without external tooling? |
| **Storage** | Can you preserve knowledge and state? | Do you have your own `copy running-config startup-config` discipline, offline config backups, and documented addressing plans independent of any cloud tool? |
| **Network** | Can systems communicate? | The literal subject of every lab — can you achieve end-to-end reachability from first principles? |
| **Control** | Can you manage access and trust? | Can you configure AAA, SSH, ACLs, and device hardening from memory, not just IP addressing? |
| **Production** | Can you repair and rebuild what's missing? | Given a broken/misconfigured device, can you diagnose and repair it under the Troubleshooting Guide's diagnostic method, without being told what's wrong? |

Each lab's Black Start companion scores **Network**, **Control**, **Storage**, and **Production** specifically (Energy and Compute are noted only where physically relevant — e.g., PoE labs, device recovery labs).

---

## 5. The 4 Operational Modes

Every lab's Black Start drill should be attempted in one of these modes, in increasing difficulty:

```
MODE 1  ONLINE      Manual open, internet available. This is normal lab completion (SL).
MODE 2  DEGRADED    Manual open, no internet — you rely only on what's written down.
MODE 3  OFFLINE     Manual closed, addressing table available — reconstruct from memory + given data.
MODE 4  BLACK START Manual and addressing table both closed — reconstruct from the topology diagram
                     and business scenario alone, exactly as described in that lab's Business Context
                     section, with a hard time limit.
```

Mode 4 is the actual Black Start test. Each lab's companion document gives you the specific Mode 4 drill for that lab's topology.

---

## 6. The 7-Stage Skill Pipeline

Apply this to any lab where you want to go beyond BSL-4:

```
1 LEARN    Read the lab manual once, understand every command.
2 BUILD    Complete the lab (Packet Tracer/GNS3), following the manual.
3 INSPECT  Read your own running-config line by line — can you justify every line?
4 BREAK    Deliberately misconfigure 2-3 things (see the lab's Common Mistakes section
           for realistic candidates), and confirm the failure matches what the
           Troubleshooting Guide predicts.
5 DEFEND   Fix what you broke using only `show` commands and the diagnostic method —
           no re-reading the original configuration steps.
6 RECOVER  Wipe the device (erase startup-config, reload) and rebuild from a blank
           device using only the topology diagram — this is the core Black Start drill.
7 OPTIMIZE Once it works, ask: what would I change about this design, and why? This
           is the lab's own Design Analysis section, but now it's your answer, not
           the manual's.
```

---

## 7. Black Start Score Matrix — quarterly self-audit

If you're working through this 47-lab set over an extended period, re-score yourself against this matrix periodically (e.g., every 8-10 labs), not per-lab:

| Domain | 0 = Dependent | 100 = Sovereign |
|---|---|---|
| Network | need the manual open for every lab | can design and build any lab's topology from a one-line scenario |
| Control | copy AAA/ACL syntax every time | write AAA/SSH/ACL configs from memory, correct on first attempt |
| Storage | never save configs outside Packet Tracer's own save file | maintain your own versioned, offline config archive with documented addressing plans |
| Production | can't diagnose a break without the Troubleshooting Guide | diagnose and fix an induced fault using only `show` commands, unassisted |

**Rule of thumb:** by lab 15-20 of this set (roughly the VLAN/STP/routing block), you should be able to attempt Mode 3 (offline, manual closed) on new labs before reading them. By the end of the full set, Mode 4 (Black Start) should be achievable on any of the first 20 labs, since those concepts will have had the most repetition.

---

## 8. How to use the per-lab companion documents

Each `Day-NN-Black-Start.md` file contains, for that specific lab:

1. **BSL Target** — the realistic BSL level to aim for on this specific lab, given its complexity (a basic device-security lab has a higher achievable BSL target than a multi-protocol OSPF troubleshooting lab).
2. **The Mode 4 Drill** — a restated version of the lab's business scenario (no addressing table, no commands, no topology diagram beyond a device/role list) that you use as your only input to rebuild the lab from scratch.
3. **Time Budget** — a realistic time limit for the Mode 4 drill, scaled to the lab's complexity.
4. **Self-Grading Rubric** — specific pass/fail criteria tied to that lab's own Verification Steps and Expected Output Gallery, so grading yourself is objective, not vibes-based.
5. **Domain Scoring** — a quick checklist against the 4 applicable Operational Domains (§4) for this specific lab.
6. **Break/Recover Drill** — 2-3 specific induced-fault scenarios (drawn from that lab's own Common Mistakes section) to run Stage 4-6 of the Skill Pipeline (§6).

None of these documents repeat the lab's CLI commands or addressing plan — that would defeat the purpose. If you find yourself needing to open the main lab manual to complete a Black Start drill, that's not a failure, it's data: it tells you exactly which lab needs another pass before you've actually reached BSL-3 or above on it.
