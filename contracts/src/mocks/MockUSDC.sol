// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice Demo USD coin: 6 decimals, open mint (Desk system §5.5). Not a SwapVM derivative.
contract MockUSDC is ERC20("Mock USD Coin", "USDC") {
    /// @notice Mints `amount` to `to`. Open to anyone (testnet demo only).
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
