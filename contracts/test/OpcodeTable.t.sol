// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {Controls} from "@1inch/swap-vm/instructions/Controls.sol";
import {Context} from "@1inch/swap-vm/libs/VM.sol";

import {DeskOpcodes} from "../src/opcodes/DeskOpcodes.sol";
import {DeskRouter} from "../src/DeskRouter.sol";
import {DeskPrice} from "../src/instructions/DeskPrice.sol";
import {EnsGate} from "../src/instructions/EnsGate.sol";
import {MockWETH} from "../src/mocks/MockWETH.sol";

contract OpcodeHarness is DeskOpcodes {
    function length() external pure returns (uint256) {
        return _opcodes().length;
    }

    function run(uint8 opcode, bytes calldata args, address taker) external {
        Context memory ctx;
        ctx.query.taker = taker;
        _opcodes()[opcode](ctx, args);
    }

    function runRead(uint8 opcode, bytes calldata args)
        external
        returns (uint256 nextPC, uint256 amountIn, uint256 amountOut)
    {
        Context memory ctx;
        ctx.vm.nextPC = 1;
        ctx.swap.amountIn = 2;
        ctx.swap.amountOut = 3;
        _opcodes()[opcode](ctx, args);
        return (ctx.vm.nextPC, ctx.swap.amountIn, ctx.swap.amountOut);
    }
}

contract OpcodeTableTest is Test {
    OpcodeHarness internal harness;
    MockWETH internal token;

    function setUp() public {
        harness = new OpcodeHarness();
        token = new MockWETH();
    }

    function test_OP1_noopSlotsLeaveContextUnchanged() public {
        uint8[26] memory slots =
            [uint8(0), 1, 2, 3, 4, 5, 6, 7, 8, 9, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 20];
        for (uint256 i = 0; i < slots.length; i++) {
            (uint256 nextPC, uint256 amountIn, uint256 amountOut) = harness.runRead(slots[i], "");
            assertEq(nextPC, 1, "nextPC");
            assertEq(amountIn, 2, "amountIn");
            assertEq(amountOut, 3, "amountOut");
        }
    }

    function test_OP1_jumpSetsNextPC() public {
        (uint256 nextPC,,) = harness.runRead(10, abi.encodePacked(uint16(9)));
        assertEq(nextPC, 9);
    }

    function test_OP1_deadlineRevertsWhenPast() public {
        vm.expectRevert(abi.encodeWithSelector(Controls.DeadlineReached.selector, address(this), uint256(0)));
        harness.run(13, abi.encodePacked(uint40(0)), address(this));
    }

    function test_OP1_balanceChecksRevert() public {
        vm.expectRevert(
            abi.encodeWithSelector(Controls.TakerTokenBalanceIsZero.selector, address(this), address(token))
        );
        harness.run(14, abi.encodePacked(address(token)), address(this));

        vm.expectRevert(
            abi.encodeWithSelector(
                Controls.TakerTokenBalanceIsLessThanRequired.selector, address(this), address(token), 0, uint256(1)
            )
        );
        harness.run(15, abi.encodePacked(address(token), uint256(1)), address(this));

        vm.expectRevert(
            abi.encodeWithSelector(
                Controls.TakerTokenBalanceSupplyShareIsLessThanRequired.selector,
                address(this),
                address(token),
                0,
                0,
                uint256(1)
            )
        );
        harness.run(16, abi.encodePacked(address(token), uint64(1)), address(this));
    }

    function test_OP1_txOriginBalanceReverts() public {
        vm.expectRevert(abi.encodeWithSelector(Controls.TxOriginTokenBalanceIsZero.selector, tx.origin, address(token)));
        harness.run(33, abi.encodePacked(address(token)), address(this));
    }

    function test_OP1_stubsRevertUntilT2AndT3() public {
        // T2: empty args are EnsGateInvalidArgs. T8 flips 35 to DeskPriceInvalidArgs.
        vm.expectRevert(EnsGate.EnsGateInvalidArgs.selector);
        harness.run(34, "", address(this));
        vm.expectRevert(DeskPrice.DeskPriceInvalidArgs.selector);
        harness.run(35, "", address(this));
    }

    function test_OP1_index36Panics() public {
        vm.expectRevert(abi.encodeWithSignature("Panic(uint256)", uint256(0x32)));
        harness.run(36, "", address(this));
    }

    function test_OP2_opcodeTableLength() public view {
        assertEq(harness.length(), 36);
    }

    function test_OP3_routerRuntimeSize() public {
        DeskRouter router = new DeskRouter(address(1), address(token), address(this), "DeskRouter", "1.0.2-desk.1");
        assertLt(address(router).code.length, 24_576);
    }
}
