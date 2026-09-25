// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockWETH
/// @notice Demo wrapped ether: 18 decimals, open mint (Desk system §5.5). Not a SwapVM derivative.
contract MockWETH is ERC20("Mock Wrapped Ether", "WETH") {
    /// @notice Mints `amount` to `to`. Open to anyone (testnet demo only).
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
