# The Research-Grade Standard for Network Engineering Labs

## What this document is

This is the reference standard for every `Day-NN-Research-Report.md` companion document in `RedjiJB-Labs/`. It defines, once, a rigor bar borrowed from contributor-grade engineering research (the kind expected of a submission to a standards body, a peer-reviewed systems venue, or an internal engineering design review at an organization like NASA or MIT Lincoln Laboratory) and applies it to CCNA lab work.

**Origin note:** this framework is adapted from a personal research-methodology standard built for producing publication-grade engineering work — originally specified as: a Delta Section, a Compliance Gap Analysis, Quantitative Benchmarking with confidence intervals, a Verification Traceability Matrix, and a Community Integration artifact. Applied here to a CCNA lab, at CCNA scope, without pretending a classroom exercise is a peer-reviewed paper — the standard is about the *habit of rigor*, not about manufacturing false novelty. Every per-lab report is honest about being a student engineering exercise held to a professional documentation standard, not a claim of original research.

---

## 1. Why this matters for a network engineer specifically

A CCNA lab, done well, teaches you to make a design work. It does not, by itself, teach you to defend the design against a skeptical reviewer, quantify how it performs against alternatives, or prove — with evidence, not assertion — that your verification actually covers your requirements. Those three skills are what separate "I got it working" from "I can be handed a project and trusted to document and defend it."

This matters concretely in two places: a design-review meeting where a senior engineer asks "why this and not X," and any environment (research, standards work, safety-critical systems) where "it worked when I tried it" is not an acceptable verification standard. The habits below are cheap to build now, on a lab you already understand, and expensive to build later, under deadline pressure, on a system you don't.

---

## 2. The Five Required Sections

Every `Day-NN-Research-Report.md` companion document contains these five sections, applied to that lab's specific design. None of them repeat the lab manual's content — they interrogate it.

### 2.1 Delta Section

**What it is:** an explicit statement of what this lab's design changes, relative to a stated baseline, and why.

**How it's used here:** since these are CCNA labs, not open-source contributions, "the baseline" is either (a) the most naive version of the design that would satisfy the stated business requirement, or (b) a documented industry-standard reference architecture (Cisco SAFE, a relevant RFC's recommended practice, or a named design pattern). The Delta Section states, precisely, what the lab's actual design does differently from that baseline and why that difference is justified — not just described.

**Required format:**
```
Baseline:      [the naive/standard alternative]
This design:   [what the lab actually does]
Delta:         [the specific difference, stated as a design decision]
Justification: [why the delta is worth its cost — cite a concrete failure mode
                the baseline has that this design avoids, or a requirement the
                baseline can't meet]
```

### 2.2 Compliance Gap Analysis

**What it is:** a comparison of the lab's design against a real, named external standard (an RFC, a Cisco best-practice guide, a CIS Benchmark, or equivalent), identifying exactly where the lab's design meets, exceeds, or falls short of that standard — and whether the gap is acceptable for the lab's stated scope.

**Required format:** a table with columns: `Standard Clause | Requirement | Lab's Design | Compliant? | Gap Justification (if any)`.

**Rule:** a lab report is not required to be fully compliant with the external standard — CCNA labs are intentionally simplified (e.g., no dynamic routing before Day 24, single-VLAN designs before Day 16). The value is in *naming the gap explicitly* rather than leaving it implicit. "This lab doesn't implement BCP 38 source-address validation because it's out of scope for a Day 4 basic-security lab" is a correct, complete gap analysis. Silence on the topic is not.

### 2.3 Quantitative Benchmarking

**What it is:** wherever the lab's design involves a measurable tradeoff (convergence time, subnet utilization efficiency, port/table scale, MTU/overhead cost, etc.), state the actual numbers, not just the qualitative direction.

**Required format:**
```
Metric:              [what's being measured]
Baseline value:      [naive alternative's number, or industry-typical figure, cited]
This design's value: [the lab's actual number — measured in GNS3/Packet Tracer where
                      feasible, or calculated from protocol specification where not]
Delta:                [the numeric difference]
Confidence/Caveat:    [how this was obtained — lab measurement, vendor documentation,
                      or protocol-spec calculation — and what would change the number]
```

**Example the standard expects:** not "VLSM saves address space" but "the naive /24-per-subnet design for this topology would require 7 × 254 = 1,778 addresses; the VLSM design in this lab uses 7 subnets sized exactly to host count, totaling 46 addresses — a 97.4% reduction in address space consumed, calculated from the addressing table in Section 4."

### 2.4 Verification Traceability Matrix

**What it is:** a table proving that every stated learning objective / functional requirement in the lab has at least one corresponding verification step that actually tests it — and flagging any requirement that the lab's own Verification Steps section doesn't actually cover.

**Required format:** a table with columns: `Requirement (from Lab Overview/Learning Objectives) | Verification Command(s) that test it | Covered? | Gap Note (if not covered)`.

**Why this matters:** this is the single most common gap in real engineering documentation — a requirements list and a test list that were written independently and never cross-checked. Building the habit of tracing every requirement to a specific verification step, and being willing to write "not directly verified in this lab, would require X" when a gap exists, is a professional documentation skill most engineers never practice deliberately.

### 2.5 Community Integration

**What it is:** since these are personal lab exercises rather than actual open-source contributions, this section is reframed as: what would it take to turn this lab's design or GNS3 automation into something contributable — a PR to an open-source project, a submission to a community knowledge base, or a teaching resource for someone else. Name the specific target and the specific gap between "works for me" and "ready to contribute."

**Required format:**
```
Contribution target:   [e.g., a specific open-source GNS3 appliance repo, a
                        community wiki, r/ccna, an open lab-manual project]
Current state:         [what exists — e.g., "a working build_lab.py for this
                        specific topology"]
Gap to contributable:  [what's missing — e.g., "hardcoded IPs should be
                        parameterized; no error handling for a GNS3 server
                        that's mid-startup; needs a LICENSE file"]
```

This section keeps the research-grade discipline honest — it's easy to over-claim novelty in a personal document with no external reviewer; naming the specific, concrete gap to a real external bar (a project maintainer would actually accept this PR, or they wouldn't) keeps the self-assessment calibrated.

---

## 3. Scope discipline — what this standard is not

This standard produces **rigorous documentation habits**, not manufactured research novelty. A CCNA lab is not a publishable paper, and the per-lab reports should never claim otherwise. Two failure modes to avoid:

1. **Over-claiming:** describing a routine configuration choice as if it were a novel contribution. If the Delta Section's "baseline" and "this design" are functionally identical, say so — don't invent a difference to fill the template.
2. **Under-scoping the Compliance Gap Analysis:** picking a standard so narrow or so loosely related that every clause trivially passes. Pick the standard that a real reviewer would actually compare this design against.

The discipline is the point. Filling out five sections honestly, including admitting where a lab has no real delta or a known compliance gap, is worth more than five sections that all read as unqualified praise for the design.

---

## 4. How to use the per-lab research reports

Each `Day-NN-Research-Report.md` file applies all five sections (§2.1–2.5) to that specific lab's design, using:

- A named, real baseline or standard for comparison (not a strawman)
- Actual numbers from that lab's addressing plan, topology, or protocol specification for the Quantitative Benchmarking section
- That lab's own Learning Objectives and Verification Steps sections as the input to the Traceability Matrix
- A concrete, plausible Community Integration target (often the lab's own GNS3 automation script, since that's genuinely reusable code)

These reports are written once you've completed the lab and its Black Start companion (see `BLACK-START-STANDARD.md`) — they assume you understand the design well enough to critique it, not just execute it.
