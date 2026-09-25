# QC gate (Desk testing and quality gates §3), in the order of T0 Spec requirement 9.
# Needs: git submodule update --init; yarn install --frozen-lockfile in contracts/lib/swap-vm; pnpm install.

.PHONY: check
check:
	cd contracts && forge fmt --check
	cd contracts && forge build --sizes
	cd contracts && forge test
	pnpm -C ts lint
	pnpm -C ts typecheck
	pnpm -C ts test --passWithNoTests
	pnpm secretlint "**/*"
