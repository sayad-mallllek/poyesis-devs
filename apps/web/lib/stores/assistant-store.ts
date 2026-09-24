import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AssistantState {
  open: boolean;
  expanded: boolean;
  activeSessionId: string | null;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setExpanded: (expanded: boolean) => void;
  setActiveSession: (id: string | null) => void;
}

/** Dock state survives navigation and reloads; conversations live on the server. */
export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      open: false,
      expanded: false,
      activeSessionId: null,
      setOpen: (open) => set({ open, ...(open ? {} : { expanded: false }) }),
      toggle: () => set((s) => ({ open: !s.open, expanded: s.open ? false : s.expanded })),
      setExpanded: (expanded) => set({ expanded, open: true }),
      setActiveSession: (activeSessionId) => set({ activeSessionId }),
    }),
    { name: "assistant-dock" },
  ),
);
