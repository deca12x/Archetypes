// components/game/GameMoves.tsx
"use client";

import { useWriteContract, useWatchContractEvent } from "wagmi";
import { GAME_MOVES_ADDRESS, GAME_MOVES_ABI } from "@/lib/contracts/config";
import { Log } from "viem";

// Add type for GameOver event log
type GameOverLog = Log & {
  args: {
    finalPadlocks: number;
    finalSeals: number;
    winners: string[];
    prizePerWinner: bigint;
    gameDuration: bigint;
  };
};

// MoveType enum matching the contract
enum MoveType {
  InspireAlliance = 0,
  Discover = 1,
  Purify = 2,
  CreateEnchantedKey = 3,
  RoyalDecree = 4,
  GuardianBond = 5,
  CopycatMove = 6,
  CreateFakeKey = 7,
  ConjureStaff = 8,
  Lockpick = 9,
  SoulBond = 10,
  EnergyFlow = 11,
  ForgeKey = 12,
  SecureChest = 13,
  ArcaneSeal = 14,
  SeizeItem = 15,
  Distract = 16,
  Guard = 17,
  Evade = 18,
  PleaOfPeace = 19,
  UnlockChest = 20,
  UnsealChest = 21,
  Gift = 22,
}

export function useGameMoves() {
  const { writeContract } = useWriteContract();

  // Watch for GameOver event with proper typing
  useWatchContractEvent({
    address: GAME_MOVES_ADDRESS,
    abi: GAME_MOVES_ABI,
    eventName: "GameOver",
    onLogs(logs) {
      const gameOverLog = logs[0] as GameOverLog;
      console.log("Game Over!", {
        finalPadlocks: gameOverLog.args.finalPadlocks,
        finalSeals: gameOverLog.args.finalSeals,
        winners: gameOverLog.args.winners,
        prizePerWinner: gameOverLog.args.prizePerWinner,
        gameDuration: gameOverLog.args.gameDuration,
      });

      // Dispatch custom event that WorldScene can listen to
      const gameOverEvent = new CustomEvent("gameOver", {
        detail: {
          finalPadlocks: gameOverLog.args.finalPadlocks,
          finalSeals: gameOverLog.args.finalSeals,
          winners: gameOverLog.args.winners,
        }
      });
      window.dispatchEvent(gameOverEvent);
    },
  });

  // Artist forges a key
  const forgeKey = async (artistAddress: string) => {
    await writeContract({
      address: GAME_MOVES_ADDRESS,
      abi: GAME_MOVES_ABI,
      functionName: "executeMove",
      args: [
        {
          moveType: MoveType.ForgeKey,
          actor: artistAddress,
          targetPlayer: "0x0000000000000000000000000000000000000000", // No target needed
          useEnchantedItem: false,
          additionalParam: 0,
        },
      ],
    });
  };

  // Artist gifts key to Hero
  const giftKeyToHero = async (artistAddress: string, heroAddress: string) => {
    await writeContract({
      address: GAME_MOVES_ADDRESS,
      abi: GAME_MOVES_ABI,
      functionName: "executeMove",
      args: [
        {
          moveType: MoveType.Gift,
          actor: artistAddress,
          targetPlayer: heroAddress,
          useEnchantedItem: false,
          additionalParam: 0,
        },
      ],
    });
  };

  // Hero unlocks chest
  const unlockChest = async (heroAddress: string) => {
    await writeContract({
      address: GAME_MOVES_ADDRESS,
      abi: GAME_MOVES_ABI,
      functionName: "executeMove",
      args: [
        {
          moveType: MoveType.UnlockChest,
          actor: heroAddress,
          targetPlayer: "0x0000000000000000000000000000000000000000", // No target needed
          useEnchantedItem: false,
          additionalParam: 0,
        },
      ],
    });
  };

  // Wizard conjures staff
  const conjureStaff = async (wizardAddress: string) => {
    await writeContract({
      address: GAME_MOVES_ADDRESS,
      abi: GAME_MOVES_ABI,
      functionName: "executeMove",
      args: [
        {
          moveType: MoveType.ConjureStaff,
          actor: wizardAddress,
          targetPlayer: "0x0000000000000000000000000000000000000000", // No target needed
          useEnchantedItem: false,
          additionalParam: 0,
        },
      ],
    });
  };

  // Wizard gifts staff to Innocent
  const giftStaffToInnocent = async (
    wizardAddress: string,
    innocentAddress: string
  ) => {
    await writeContract({
      address: GAME_MOVES_ADDRESS,
      abi: GAME_MOVES_ABI,
      functionName: "executeMove",
      args: [
        {
          moveType: MoveType.Gift,
          actor: wizardAddress,
          targetPlayer: innocentAddress,
          useEnchantedItem: false,
          additionalParam: 0,
        },
      ],
    });
  };

  // Innocent unseals chest
  const unsealChest = async (innocentAddress: string) => {
    await writeContract({
      address: GAME_MOVES_ADDRESS,
      abi: GAME_MOVES_ABI,
      functionName: "executeMove",
      args: [
        {
          moveType: MoveType.UnsealChest,
          actor: innocentAddress,
          targetPlayer: "0x0000000000000000000000000000000000000000", // No target needed
          useEnchantedItem: false,
          additionalParam: 0,
        },
      ],
    });
  };

  return {
    forgeKey,
    giftKeyToHero,
    unlockChest,
    conjureStaff,
    giftStaffToInnocent,
    unsealChest,
  };
}
