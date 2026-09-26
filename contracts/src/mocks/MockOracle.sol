// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";

/// @title MockOracle
/// @notice Owner-set Chainlink-style price feed for the demo (Desk system §5.5). Not a SwapVM derivative.
/// @dev Keeps only the latest round. The deployer is the owner; `setAnswer` and `setUpdatedAt` are
///      `onlyOwner` (Desk security §3).
contract MockOracle is AggregatorV3Interface, Ownable {
    uint8 private immutable DECIMALS;

    uint80 private _roundId;
    int256 private _answer;
    uint256 private _updatedAt;

    /// @param decimals_ Decimals of the answer (8 for the demo).
    /// @param initialAnswer First answer; the round id starts at 1 and `updatedAt` at `block.timestamp`.
    constructor(uint8 decimals_, int256 initialAnswer) Ownable(msg.sender) {
        DECIMALS = decimals_;
        _roundId = 1;
        _answer = initialAnswer;
        _updatedAt = block.timestamp;
    }

    /// @notice Sets a new answer, bumps the round id and sets `updatedAt = block.timestamp`.
    function setAnswer(int256 answer) external onlyOwner {
        _roundId += 1;
        _answer = answer;
        _updatedAt = block.timestamp;
    }

    /// @notice Overwrites `updatedAt` of the latest round, so the demo can force staleness.
    function setUpdatedAt(uint256 updatedAt) external onlyOwner {
        _updatedAt = updatedAt;
    }

    function decimals() external view returns (uint8) {
        return DECIMALS;
    }

    function description() external pure returns (string memory) {
        return "Mock ETH / USD";
    }

    function version() external pure returns (uint256) {
        return 1;
    }

    /// @notice Returns the latest round for its own id; any other id has no data and returns zeros.
    function getRoundData(uint80 roundId_)
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        if (roundId_ != _roundId) return (roundId_, 0, 0, 0, roundId_);
        return (_roundId, _answer, _updatedAt, _updatedAt, _roundId);
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, _answer, _updatedAt, _updatedAt, _roundId);
    }
}
