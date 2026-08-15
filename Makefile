# Dira — one-command entry points for judges and developers.
# Everything here runs credential-free: no Google OAuth, no cloud project needed.

.PHONY: install demo-replay demo-variations replay-20x test typecheck ci web

install:
	npm install

# The golden 48-Hour Shock workflow, end to end, with the injected 409 failure.
demo-replay:
	npm run demo:replay

# Same workflow across the runtime-variation matrix (exam time, slot outages, ...).
demo-variations:
	npm run demo:variations

# Reliability evidence: 20 consecutive deterministic replays.
replay-20x:
	npm run demo:replay:20x

test:
	npm test

typecheck:
	npm run typecheck

ci: typecheck test replay-20x

web:
	npm --workspace apps/web run dev
