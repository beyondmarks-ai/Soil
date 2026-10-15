// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Tamper-evident anchors for Soil Agri telemetry batches
/// @notice Stores only hashes and identifiers; private farm data remains in Cosmos DB.
contract SensorAudit {
    address public immutable owner;
    mapping(bytes32 => bool) private anchored;

    event TelemetryAnchored(bytes32 indexed digest, string batchId, uint64 timestamp);

    error NotOwner();
    error AlreadyAnchored();

    constructor() {
        owner = msg.sender;
    }

    function anchor(bytes32 digest, string calldata batchId, uint64 timestamp) external {
        if (msg.sender != owner) revert NotOwner();
        if (anchored[digest]) revert AlreadyAnchored();
        anchored[digest] = true;
        emit TelemetryAnchored(digest, batchId, timestamp);
    }

    function exists(bytes32 digest) external view returns (bool) {
        return anchored[digest];
    }
}
