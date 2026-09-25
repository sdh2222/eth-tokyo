// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {MockUSDC} from "../../src/mocks/MockUSDC.sol";
import {DeskRouter} from "../../src/DeskRouter.sol";
import {ISwapVM} from "@1inch/swap-vm/interfaces/ISwapVM.sol";

/// @notice Contract-wallet market maker. Approves the router and calls swap.
contract ContractMM {
    function fill(
        DeskRouter router,
        MockUSDC token,
        ISwapVM.Order calldata order,
        address tokenIn,
        address tokenOut,
        uint256 amount,
        bytes calldata takerData
    ) external {
        token.approve(address(router), type(uint256).max);
        router.swap(order, tokenIn, tokenOut, amount, takerData);
    }
}
