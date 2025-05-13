import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
// import { GridEngine } from "grid-engine";
type Direction = "up" | "down" | "left" | "right";
import type { Maps } from "../constants/assets";

export interface IPosition {
  map: Maps;
  x?: number;
  y?: number;
  facingDirection: Direction;
}

export interface ISettings {
  general: {
    enableSound: boolean;
  };
}

export interface IUserDataStore {
  position?: IPosition;
  settings: ISettings;
  update: (state: Partial<IUserDataStore>) => void;
}

export const useUserDataStore = create<IUserDataStore>()(
  devtools(
    persist(
      (set) => ({
        update: (updates: Partial<IUserDataStore>) => {
          set((state) => ({
            ...state,
            ...updates,
          }));
        },
        settings: {
          general: {
            enableSound: Boolean(true),
          },
        },
      }),
      {
        name: "userData",
      }
    )
  )
);
