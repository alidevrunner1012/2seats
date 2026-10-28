---
description: "Use before declaring a development phase complete or moving to the next phase. Requires unit testing, integration testing, and test-driven development."
name: "Phase Readiness Testing"
---
# Phase Readiness Testing

Before declaring a phase complete or moving to the next development phase:

1. Follow test-driven development for new behavior: write or update focused tests before implementation where practical, then implement the smallest complete change and refactor safely.
2. Run unit tests covering changed modules and relevant edge cases.
3. Run integration tests covering the real boundaries between affected components, services, databases, queues, browsers, or external adapters.
4. Run the repository's applicable lint, typecheck, and build checks after tests pass.
5. Do not claim phase readiness if unit or integration testing is unavailable or failing. Report the exact blocker and the validation that remains.
6. In the completion summary, list the test commands run, their results, and any environment-dependent checks that could not be executed.
