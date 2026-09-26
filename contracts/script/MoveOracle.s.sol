// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";

import {MockOracle} from "../src/mocks/MockOracle.sol";

/// @notice Moves the demo oracle through 4,000, then 4,020, then 3,980.
///         Each `setAnswer` refreshes `updatedAt` and opens the few-block window.
///         The deployer key stays in `DEPLOYER_PK` and is not printed.
contract MoveOracle is Script {
    string internal constant CONFIG = "../config/sepolia.json";

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address oracle = vm.parseJsonAddress(vm.readFile(CONFIG), ".oracle");

        vm.startBroadcast(pk);
        MockOracle(oracle).setAnswer(4000e8);
        MockOracle(oracle).setAnswer(4020e8);
        MockOracle(oracle).setAnswer(3980e8);
        vm.stopBroadcast();

        console.log("oracle", oracle);
        console.log("answers", uint256(4000), uint256(4020), uint256(3980));
    }
}
