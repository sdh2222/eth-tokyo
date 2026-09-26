// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IDeskEvents
/// @notice Events emitted by the desk instructions (Desk system §5.4, D13).
interface IDeskEvents {
    /// @notice Emitted by #35 DeskPrice on a real fill only (`!ctx.vm.isStaticContext`), before the transfers.
    event DeskFill(
        bytes32 indexed orderHash, // = strategyHash in Aqua
        bytes32 indexed nameHash, // keccak256(dnsName)
        address indexed taker,
        bytes dnsName,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 midWad, // oracle price, 18 decimals
        uint16 sSellBps,
        uint16 sBuyBps,
        uint256 wBeforeWad // wWad before the fill
    );
}
