// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";

import {DeskRouter} from "../src/DeskRouter.sol";
import {MockOracle} from "../src/mocks/MockOracle.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockWETH} from "../src/mocks/MockWETH.sol";

/// @notice Deploys the demo mocks and DeskRouter and records their addresses in config/sepolia.json.
contract Deploy is Script {
    string internal constant CONFIG = "../config/sepolia.json";

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address aqua = vm.parseJsonAddress(vm.readFile(CONFIG), ".aqua");
        bool mocksOnly = vm.envOr("DEPLOY_MOCKS_ONLY", uint256(0)) == 1;

        vm.startBroadcast(pk);
        MockWETH weth = new MockWETH();
        MockUSDC usdc = new MockUSDC();
        MockOracle oracle = new MockOracle(8, 4000e8);
        DeskRouter router;
        uint256 deployBlock;
        if (!mocksOnly) {
            router = new DeskRouter(aqua, address(weth), vm.addr(pk), "DeskRouter", "1.0.2-desk.1");
            deployBlock = block.number;
            require(address(router.AQUA()) == aqua, "aqua");
            require(address(router).code.length < 24_576, "size");
        }
        vm.stopBroadcast();

        _write(".tokens.weth", address(weth));
        _write(".tokens.usdc", address(usdc));
        _write(".oracle", address(oracle));
        console.log("weth", address(weth));
        console.log("usdc", address(usdc));
        console.log("oracle", address(oracle));
        if (!mocksOnly) {
            _write(".router", address(router));
            vm.writeJson(vm.toString(deployBlock), CONFIG, ".deployBlock");
            console.log("router", address(router));
            console.log("deployBlock", deployBlock);
        }
    }

    function _write(string memory key, address value) internal {
        vm.writeJson(string.concat("\"", vm.toString(value), "\""), CONFIG, key);
    }
}
