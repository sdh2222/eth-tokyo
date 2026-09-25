// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";

import {CalldataPtrLib} from "@1inch/solidity-utils/contracts/libraries/CalldataPtr.sol";
import {Context, ContextLib} from "@1inch/swap-vm/libs/VM.sol";

import {EnsGate, EnsGateArgs} from "../src/instructions/EnsGate.sol";
import {MockEnsRegistry} from "./mocks/MockEnsRegistry.sol";
import {MockEnsResolver} from "./mocks/MockEnsResolver.sol";

contract GateHarness is EnsGate {
    using ContextLib for Context;

    function run(bytes calldata args, bytes calldata takerData, address taker) external view {
        Context memory ctx = _ctx(takerData, taker);
        _ensGate(ctx, args);
    }

    function build(EnsGateArgs.GateArgs calldata a) external pure returns (bytes memory) {
        return EnsGateArgs.build(a);
    }

    function cursor(bytes calldata args, bytes calldata takerData, address taker) external view returns (bytes memory) {
        Context memory ctx = _ctx(takerData, taker);
        _ensGate(ctx, args);
        return ctx.takerArgs();
    }

    function _ctx(bytes calldata takerData, address taker) private pure returns (Context memory ctx) {
        ctx.vm.takerArgsPtr = CalldataPtrLib.from(takerData);
        ctx.query.taker = taker;
    }
}

contract EnsGateTest is Test {
    GateHarness internal gate;
    MockEnsRegistry internal ethReg;
    MockEnsRegistry internal deskReg;
    MockEnsRegistry internal clientsReg;
    MockEnsResolver internal resolver;
    address internal mm = address(0xBEEF);
    uint64 internal live;
    bytes internal suffix;
    bytes internal takerData;
    bytes internal args;

    function setUp() public {
        gate = new GateHarness();
        ethReg = new MockEnsRegistry();
        deskReg = new MockEnsRegistry();
        clientsReg = new MockEnsRegistry();
        resolver = new MockEnsResolver();
        live = uint64(block.timestamp + 365 days);
        suffix = _dns("clients.desk.eth");
        takerData = _taker("mm-a.clients.desk.eth");
        _wire(address(deskReg), address(clientsReg), address(resolver), live, live, live);
        resolver.setAddr(_dns("mm-a.clients.desk.eth"), mm);
        args = _args(address(ethReg), address(deskReg), address(clientsReg), address(resolver), suffix);
    }

    function test_TG1_happyPath() public view {
        gate.run(args, takerData, mm);
    }

    function test_TG2_invalidArgs() public {
        vm.expectRevert(EnsGate.EnsGateInvalidArgs.selector);
        gate.run(hex"01", takerData, mm);

        EnsGateArgs.GateArgs memory bad;
        bad.suffix = suffix;
        vm.expectRevert(EnsGate.EnsGateInvalidArgs.selector);
        gate.build(bad);

        bad.ethRegistry = address(ethReg);
        bad.deskRegistry = address(deskReg);
        bad.clientsRegistry = address(clientsReg);
        bad.resolver = address(resolver);
        bad.suffix = hex"00";
        vm.expectRevert(EnsGate.EnsGateInvalidArgs.selector);
        gate.build(bad);
    }

    function test_TG3_missingName() public {
        vm.expectRevert(EnsGate.EnsGateMissingName.selector);
        gate.run(args, "", mm);
        vm.expectRevert(EnsGate.EnsGateMissingName.selector);
        gate.run(args, hex"05abcd", mm);
    }

    function test_TG4_nameNotUnderDesk() public {
        vm.expectRevert(EnsGate.EnsGateNameNotUnderDesk.selector);
        gate.run(args, _taker("mm-a.clients.evil.eth"), mm);
        vm.expectRevert(EnsGate.EnsGateNameNotUnderDesk.selector);
        gate.run(args, hex"0100", mm);
        vm.expectRevert(EnsGate.EnsGateNameNotUnderDesk.selector);
        gate.run(args, _taker("mm-a.clients.evil.eth"), mm);
    }

    function test_TG5_deskMismatch() public {
        ethReg.set("desk", address(deskReg), address(0), uint64(block.timestamp));
        vm.expectRevert(abi.encodeWithSelector(EnsGate.EnsGateDeskMismatch.selector, address(0)));
        gate.run(args, takerData, mm);

        MockEnsRegistry other = new MockEnsRegistry();
        other.set("clients", address(clientsReg), address(0), live);
        ethReg.set("desk", address(other), address(0), live);
        vm.expectRevert(abi.encodeWithSelector(EnsGate.EnsGateDeskMismatch.selector, address(other)));
        gate.run(args, takerData, mm);
    }

    function test_TG6_clientsMismatch() public {
        deskReg.set("clients", address(clientsReg), address(0), uint64(block.timestamp));
        vm.expectRevert(abi.encodeWithSelector(EnsGate.EnsGateClientsMismatch.selector, address(0)));
        gate.run(args, takerData, mm);

        deskReg.set("clients", address(0x1234), address(0), live);
        vm.expectRevert(abi.encodeWithSelector(EnsGate.EnsGateClientsMismatch.selector, address(0x1234)));
        gate.run(args, takerData, mm);
    }

    function test_TG7_nameExpired() public {
        clientsReg.set("mm-a", address(0), address(resolver), uint64(block.timestamp));
        vm.expectRevert(abi.encodeWithSelector(EnsGate.EnsGateNameExpired.selector, uint64(block.timestamp)));
        gate.run(args, takerData, mm);

        vm.expectRevert(abi.encodeWithSelector(EnsGate.EnsGateNameExpired.selector, uint64(0)));
        gate.run(args, _taker("zz.clients.desk.eth"), mm);
    }

    function test_TG8_wrongResolver() public {
        clientsReg.set("mm-a", address(0), address(0), live);
        vm.expectRevert(abi.encodeWithSelector(EnsGate.EnsGateWrongResolver.selector, address(0)));
        gate.run(args, takerData, mm);

        clientsReg.set("mm-a", address(0), address(0x1234), live);
        vm.expectRevert(abi.encodeWithSelector(EnsGate.EnsGateWrongResolver.selector, address(0x1234)));
        gate.run(args, takerData, mm);
    }

    function test_TG9_takerMismatch() public {
        resolver.setAddr(_dns("mm-a.clients.desk.eth"), address(0xCAFE));
        vm.expectRevert(abi.encodeWithSelector(EnsGate.EnsGateTakerMismatch.selector, address(0xCAFE), mm));
        gate.run(args, takerData, mm);

        MockEnsResolver bare = new MockEnsResolver();
        clientsReg.set("mm-a", address(0), address(bare), live);
        bytes memory bareArgs = _args(address(ethReg), address(deskReg), address(clientsReg), address(bare), suffix);
        vm.expectRevert(abi.encodeWithSelector(EnsGate.EnsGateTakerMismatch.selector, address(0), mm));
        gate.run(bareArgs, takerData, mm);
    }

    function test_TG10_doesNotConsumeTakerArgs() public view {
        bytes memory left = gate.cursor(args, takerData, mm);
        assertEq(left, takerData);
    }

    function test_gateVector() public pure {
        bytes memory built = EnsGateArgs.build(
            EnsGateArgs.GateArgs({
                ethRegistry: address(uint160(0xe1)),
                deskRegistry: address(uint160(0xd1)),
                clientsRegistry: address(uint160(0xc1)),
                resolver: address(uint160(0xa1)),
                suffix: hex"07636c69656e7473046465736b0365746800"
            })
        );
        assertEq(
            built,
            hex"00000000000000000000000000000000000000e100000000000000000000000000000000000000d100000000000000000000000000000000000000c100000000000000000000000000000000000000a107636c69656e7473046465736b0365746800"
        );
    }

    function _wire(address desk, address clients, address resol, uint64 deskExp, uint64 clientsExp, uint64 nameExp)
        private
    {
        ethReg.set("desk", desk, address(0), deskExp);
        deskReg.set("clients", clients, address(0), clientsExp);
        clientsReg.set("mm-a", address(0), resol, nameExp);
    }

    function _args(address eth, address desk, address clients, address resol, bytes memory suf)
        private
        pure
        returns (bytes memory)
    {
        return EnsGateArgs.build(EnsGateArgs.GateArgs(eth, desk, clients, resol, suf));
    }

    function _taker(string memory name) private pure returns (bytes memory) {
        bytes memory dns = _dns(name);
        return abi.encodePacked(uint8(dns.length), dns);
    }

    function _dns(string memory name) private pure returns (bytes memory) {
        bytes memory raw = bytes(name);
        bytes memory out = new bytes(raw.length + 2);
        uint256 w;
        uint256 start;
        for (uint256 i; i <= raw.length; i++) {
            if (i == raw.length || raw[i] == ".") {
                uint256 n = i - start;
                out[w++] = bytes1(uint8(n));
                for (uint256 j; j < n; j++) {
                    out[w++] = raw[start + j];
                }
                start = i + 1;
            }
        }
        out[w++] = 0;
        assembly { mstore(out, w) }
        return out;
    }
}
