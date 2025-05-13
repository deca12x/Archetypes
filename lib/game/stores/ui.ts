import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface UIStore {
  loading: boolean;
  dialog: {
    isOpen: boolean;
  };
  menu: {
    isOpen: boolean;
  };
  setLoading: (loading: boolean) => void;
  toggleDialog: () => void;
  toggleMenu: () => void;
  set: (fn: (state: UIStore) => UIStore) => void;
}

export const useUIStore = create<UIStore>()(
  devtools((set) => ({
    loading: true,
    dialog: {
      isOpen: false,
    },
    menu: {
      isOpen: false,
    },
    setLoading: (loading) => set(() => ({ loading })),
    toggleDialog: () =>
      set((state) => ({
        dialog: {
          isOpen: !state.dialog.isOpen,
        },
      })),
    toggleMenu: () =>
      set((state) => ({
        menu: {
          isOpen: !state.menu.isOpen,
        },
      })),
    set,
  }))
);
