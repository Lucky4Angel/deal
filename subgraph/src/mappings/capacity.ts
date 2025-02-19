import {
  CapacityCommitmentStatus,
  createOrLoadCapacityCommitmentStatsPerEpoch,
  createOrLoadCapacityCommitmentToComputeUnit,
  createOrLoadComputeUnitPerEpochStat,
  createOrLoadEpochStatistic,
  createOrLoadGraphNetwork,
  createOrLoadProvider,
  UNO_BIG_INT,
  ZERO_ADDRESS,
  ZERO_BIG_INT,
} from "../models";
import {
  CapacityCommitment,
  ComputeUnit,
  Peer,
  Provider,
  SubmittedProof,
} from "../../generated/schema";
import {
  CollateralDeposited,
  CommitmentActivated,
  CommitmentCreated,
  CommitmentFailed,
  CommitmentFinished,
  CommitmentRemoved,
  CommitmentStatsUpdated,
  ProofSubmitted,
  RewardWithdrawn,
  UnitActivated,
  UnitDeactivated,
} from "../../generated/Capacity/Capacity";
import {
  calculateEpoch,
  calculateNextFailedCCEpoch,
  getCapacityMaxFailedRatio,
  getMinRequiredProofsPerEpoch,
} from "../contracts";
import { Initialized } from "../../generated/Capacity/Capacity";
import { BigInt } from "@graphprotocol/graph-ts";
import { formatAddress } from "./utils";
import { log } from "@graphprotocol/graph-ts/index";

export function handleInitialized(event: Initialized): void {
  let graphNetwork = createOrLoadGraphNetwork();
  graphNetwork.capacityContractAddress = event.address.toHexString();
  graphNetwork.save();
}

export function handleCommitmentCreated(event: CommitmentCreated): void {
  // TODO: rm those logs if phantom error does not occur.
  log.info("[handleCommitmentCreated] Start...", []);
  let commitment = new CapacityCommitment(
    event.params.commitmentId.toHexString(),
  );
  log.info("event.params.commitmentId.toHexString(): {}", [
    event.params.commitmentId.toHexString(),
  ]);
  log.info("event.params.peerId.toHexString(): {}", [
    event.params.peerId.toHexString(),
  ]);
  // Load or create peer.
  let peer = Peer.load(event.params.peerId.toHexString()) as Peer;
  log.info("peer loaded successfully: {}", [peer.id]);

  commitment.peer = peer.id;
  commitment.provider = peer.provider;
  commitment.rewardWithdrawn = ZERO_BIG_INT;
  commitment.status = CapacityCommitmentStatus.WaitDelegation;
  commitment.collateralPerUnit = event.params.fltCollateralPerUnit;
  commitment.createdAt = event.block.timestamp;
  commitment.duration = event.params.duration;
  commitment.rewardDelegatorRate = event.params.rewardDelegationRate.toI32();
  commitment.delegator = formatAddress(event.params.delegator);
  commitment.activeUnitCount = 0;
  commitment.startEpoch = ZERO_BIG_INT;
  commitment.endEpoch = ZERO_BIG_INT;
  commitment.totalFailCount = 0;
  commitment.failedEpoch = ZERO_BIG_INT;
  commitment.exitedUnitCount = 0;
  commitment.nextCCFailedEpoch = ZERO_BIG_INT;
  // When peer in CC, we can not modify number of CUs of this peer. Thus,
  //  we could save number of compute units for the commitment when CC created
  //  instead of waiting for collateral to be deposited
  //  (i.e. depositCollateral).
  const loadedComputeUnits = peer.computeUnits.load();
  const loadedComputeUnitsLength = loadedComputeUnits.length;
  commitment.computeUnitsCount = loadedComputeUnitsLength;
  for (let i = 0; i < loadedComputeUnitsLength; i++) {
    // We rely on contract logic that it is not possible to emit event with not existing CUs.
    //  Also, we rely that previously we save computeUnits successfully in prev. handler of computeUnitCreated.
    createOrLoadCapacityCommitmentToComputeUnit(
      commitment.id,
      loadedComputeUnits[i].id,
    );
  }
  commitment.nextAdditionalActiveUnitCount = 0;
  commitment.snapshotEpoch = ZERO_BIG_INT;
  commitment.deleted = false;
  commitment.totalCollateral = ZERO_BIG_INT;
  commitment.submittedProofsCount = 0;
  commitment.save();

  peer.currentCapacityCommitment = commitment.id;
  peer.save();

  let graphNetwork = createOrLoadGraphNetwork();
  graphNetwork.capacityCommitmentsTotal =
    graphNetwork.capacityCommitmentsTotal.plus(UNO_BIG_INT);
  graphNetwork.save();
}

// It is supposed that collateral deposited at the same time as commitment activated
//  (the same tx).
export function handleCommitmentActivated(event: CommitmentActivated): void {
  let commitment = CapacityCommitment.load(
    event.params.commitmentId.toHexString(),
  ) as CapacityCommitment;
  commitment.status = CapacityCommitmentStatus.WaitStart;
  commitment.startEpoch = event.params.startEpoch;
  commitment.endEpoch = event.params.endEpoch;
  commitment.activeUnitCount = event.params.unitIds.length;
  // Note, we add CUs to CC directly on after CommitmentCreated event.
  commitment.nextAdditionalActiveUnitCount = 0;
  const graphNetwork = createOrLoadGraphNetwork();

  commitment.snapshotEpoch = calculateEpoch(
    event.block.timestamp,
    BigInt.fromI32(graphNetwork.initTimestamp),
    BigInt.fromI32(graphNetwork.coreEpochDuration),
  );

  const _calculatedFailedEpoch = calculateNextFailedCCEpoch(
    BigInt.fromString(graphNetwork.capacityMaxFailedRatio.toString()),
    BigInt.fromString(commitment.computeUnitsCount.toString()),
    BigInt.fromString(commitment.activeUnitCount.toString()),
    BigInt.fromString(commitment.nextAdditionalActiveUnitCount.toString()),
    BigInt.fromString(commitment.totalFailCount.toString()),
    BigInt.fromString(commitment.snapshotEpoch.toString()),
  );
  commitment.nextCCFailedEpoch = _calculatedFailedEpoch;
  commitment.save();

  let peer = Peer.load(event.params.peerId.toHexString()) as Peer;
  peer.currentCCCollateralDepositedAt = event.params.startEpoch;
  peer.currentCCEndEpoch = event.params.endEpoch;
  peer.currentCCNextCCFailedEpoch = _calculatedFailedEpoch;
  peer.save();
}

export function handleCollateralDeposited(event: CollateralDeposited): void {
  let commitment = CapacityCommitment.load(
    event.params.commitmentId.toHexString(),
  ) as CapacityCommitment;
  // Mirror logic in capacity.depositCollateral.
  if (commitment.delegator == ZERO_ADDRESS) {
    commitment.delegator = formatAddress(event.transaction.from);
  }
  commitment.totalCollateral = event.params.totalCollateral;
  commitment.save();
}

export function handleCommitmentRemoved(event: CommitmentRemoved): void {
  let commitment = CapacityCommitment.load(
    event.params.commitmentId.toHexString(),
  ) as CapacityCommitment;
  commitment.deleted = true;
  commitment.save();

  let peer = Peer.load(commitment.peer) as Peer;
  peer.currentCapacityCommitment = null;
  peer.currentCCCollateralDepositedAt = ZERO_BIG_INT;
  peer.currentCCEndEpoch = ZERO_BIG_INT;
  peer.save();
}

export function handleCommitmentFinished(event: CommitmentFinished): void {
  let commitment = CapacityCommitment.load(
    event.params.commitmentId.toHexString(),
  ) as CapacityCommitment;
  commitment.status = CapacityCommitmentStatus.Removed;
  commitment.save();

  let peer = Peer.load(commitment.peer) as Peer;
  peer.currentCapacityCommitment = null;
  peer.currentCCCollateralDepositedAt = ZERO_BIG_INT;
  peer.currentCCEndEpoch = ZERO_BIG_INT;
  peer.save();
}

export function handleCommitmentFailed(event: CommitmentFailed): void {
  let commitment = CapacityCommitment.load(
    event.params.commitmentId.toHexString(),
  ) as CapacityCommitment;

  commitment.failedEpoch = event.params.failedEpoch;
  commitment.status = CapacityCommitmentStatus.Failed;

  commitment.save();
}

export function handleCommitmentStatsUpdated(
  event: CommitmentStatsUpdated,
): void {
  // Handle current commitment stats.
  let commitment = CapacityCommitment.load(
    event.params.commitmentId.toHexString(),
  ) as CapacityCommitment;

  commitment.totalFailCount = event.params.totalFailCount.toI32();
  commitment.exitedUnitCount = event.params.exitedUnitCount.toI32();
  commitment.activeUnitCount = event.params.activeUnitCount.toI32();
  commitment.nextAdditionalActiveUnitCount =
    event.params.nextAdditionalActiveUnitCount.toI32();

  const graphNetwork = createOrLoadGraphNetwork();

  if (commitment.failedEpoch != ZERO_BIG_INT) {
    commitment.nextCCFailedEpoch = commitment.failedEpoch;
  } else {
    // Calculate next failed epoch.
    const _calculatedFailedEpoch = calculateNextFailedCCEpoch(
      BigInt.fromString(graphNetwork.capacityMaxFailedRatio.toString()),
      BigInt.fromString(commitment.computeUnitsCount.toString()),
      BigInt.fromString(commitment.activeUnitCount.toString()),
      BigInt.fromString(commitment.nextAdditionalActiveUnitCount.toString()),
      BigInt.fromString(commitment.totalFailCount.toString()),
      BigInt.fromString(event.params.changedEpoch.toString()),
    );
    commitment.nextCCFailedEpoch = _calculatedFailedEpoch;
  }
  commitment.save();

  const currentEpoch = calculateEpoch(
    event.block.timestamp,
    BigInt.fromI32(graphNetwork.initTimestamp),
    BigInt.fromI32(graphNetwork.coreEpochDuration),
  );
  const epochStatistic = createOrLoadEpochStatistic(
    event.block.timestamp,
    currentEpoch,
    event.block.number,
  );

  let peer = Peer.load(commitment.peer) as Peer;
  peer.currentCCNextCCFailedEpoch = commitment.nextCCFailedEpoch;
  peer.save();

  // Save commitment stat for evolution graph.
  let capacityCommitmentStatsPerEpoch =
    createOrLoadCapacityCommitmentStatsPerEpoch(
      commitment.id,
      epochStatistic.id,
    );

  // totalFailCount is calculated by prevEpoch
  capacityCommitmentStatsPerEpoch.totalFailCount = commitment.totalFailCount;

  capacityCommitmentStatsPerEpoch.exitedUnitCount = commitment.exitedUnitCount;
  capacityCommitmentStatsPerEpoch.activeUnitCount = commitment.activeUnitCount;
  capacityCommitmentStatsPerEpoch.nextAdditionalActiveUnitCount =
    commitment.nextAdditionalActiveUnitCount;
  capacityCommitmentStatsPerEpoch.currentCCNextCCFailedEpoch =
    commitment.nextCCFailedEpoch;
  capacityCommitmentStatsPerEpoch.save();
}

export function handleUnitActivated(event: UnitActivated): void {}

// Handle that Compute Unit moved from CC to Deal with arguments of CC and CU.
// Currently, it updates only capacityCommitmentStatsPerEpoch.
export function handleUnitDeactivated(event: UnitDeactivated): void {
  // Update Stats regards to capacities stats below.
  const graphNetwork = createOrLoadGraphNetwork();
  const currentEpoch = calculateEpoch(
    event.block.timestamp,
    BigInt.fromI32(graphNetwork.initTimestamp),
    BigInt.fromI32(graphNetwork.coreEpochDuration),
  );
  const capacityCommitment = CapacityCommitment.load(
    event.params.commitmentId.toHexString(),
  ) as CapacityCommitment;
  const epochStatistic = createOrLoadEpochStatistic(
    event.block.timestamp,
    currentEpoch,
    event.block.number,
  );
  let capacityCommitmentStatsPerEpoch =
    createOrLoadCapacityCommitmentStatsPerEpoch(
      capacityCommitment.id,
      epochStatistic.id,
    );
  const computeUnit = ComputeUnit.load(
    event.params.unitId.toHexString(),
  ) as ComputeUnit;
  const computeUnitPerEpochStat = createOrLoadComputeUnitPerEpochStat(
    computeUnit.id,
    epochStatistic.id,
  );

  // When compute unit added to Deal we also should calculate if we need to
  //  decrease counter named computeUnitsWithMinRequiredProofsSubmittedCounter.
  if (
    computeUnitPerEpochStat.submittedProofsCount >=
    graphNetwork.minRequiredProofsPerEpoch
  ) {
    // Decrease computeUnitsWithMinRequiredProofsSubmittedCounter.
    capacityCommitmentStatsPerEpoch.computeUnitsWithMinRequiredProofsSubmittedCounter =
      capacityCommitmentStatsPerEpoch.computeUnitsWithMinRequiredProofsSubmittedCounter -
      1;
    capacityCommitmentStatsPerEpoch.save();
  }
}

export function handleProofSubmitted(event: ProofSubmitted): void {
  let proofSubmitted = new SubmittedProof(event.transaction.hash.toHexString());
  const blockTimestamp = event.block.timestamp;
  let capacityCommitment = CapacityCommitment.load(
    event.params.commitmentId.toHexString(),
  ) as CapacityCommitment;
  let computeUnit = ComputeUnit.load(
    event.params.unitId.toHexString(),
  ) as ComputeUnit;
  const provider = createOrLoadProvider(computeUnit.provider, blockTimestamp);
  let graphNetwork = createOrLoadGraphNetwork();
  const currentEpoch = calculateEpoch(
    blockTimestamp,
    BigInt.fromI32(graphNetwork.initTimestamp),
    BigInt.fromI32(graphNetwork.coreEpochDuration),
  );
  const epochStatistic = createOrLoadEpochStatistic(
    blockTimestamp,
    currentEpoch,
    event.block.number,
  );
  let capacityCommitmentStatsPerEpoch =
    createOrLoadCapacityCommitmentStatsPerEpoch(
      capacityCommitment.id,
      epochStatistic.id,
    );

  proofSubmitted.capacityCommitmentStatsPerEpoch =
    capacityCommitmentStatsPerEpoch.id;
  proofSubmitted.capacityCommitment = capacityCommitment.id;
  proofSubmitted.computeUnit = computeUnit.id;
  proofSubmitted.provider = provider.id;
  proofSubmitted.peer = computeUnit.peer;
  proofSubmitted.localUnitNonce = event.params.localUnitNonce;
  proofSubmitted.createdAt = blockTimestamp;
  proofSubmitted.createdEpoch = currentEpoch;
  proofSubmitted.save();

  // Update stats below.
  capacityCommitment.submittedProofsCount =
    capacityCommitment.submittedProofsCount + 1;
  capacityCommitment.save();

  computeUnit.submittedProofsCount =
    capacityCommitment.submittedProofsCount + 1;
  computeUnit.save();

  graphNetwork.proofsTotal = graphNetwork.proofsTotal.plus(UNO_BIG_INT);
  graphNetwork.save();

  let computeUnitPerEpochStat = createOrLoadComputeUnitPerEpochStat(
    computeUnit.id,
    epochStatistic.id,
  );
  computeUnitPerEpochStat.submittedProofsCount =
    computeUnitPerEpochStat.submittedProofsCount + 1;
  computeUnitPerEpochStat.capacityCommitment = capacityCommitment.id;
  computeUnitPerEpochStat.save();

  capacityCommitmentStatsPerEpoch.submittedProofsCount =
    capacityCommitmentStatsPerEpoch.submittedProofsCount + 1;
  // Let's catch when CU triggered to become succeceed in proof submission for the epoch (and only once) below.
  if (
    computeUnitPerEpochStat.submittedProofsCount ==
    graphNetwork.minRequiredProofsPerEpoch
  ) {
    capacityCommitmentStatsPerEpoch.computeUnitsWithMinRequiredProofsSubmittedCounter =
      capacityCommitmentStatsPerEpoch.computeUnitsWithMinRequiredProofsSubmittedCounter +
      1;
  }
  capacityCommitmentStatsPerEpoch.save();
}

export function handleRewardWithdrawn(event: RewardWithdrawn): void {
  let capacityCommitment = CapacityCommitment.load(
    event.params.commitmentId.toHexString(),
  ) as CapacityCommitment;
  capacityCommitment.rewardWithdrawn = capacityCommitment.rewardWithdrawn.plus(
    event.params.amount,
  );
  capacityCommitment.save();
}
