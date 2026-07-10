import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

// Display name for the person whose hours were shared with you.
// (The client can't read other users' emails, so this is a plain label.)
export const PARTNER_LABEL = "Partner";

// Who am I, and whose rows am I currently looking at?
// viewedUserId === userId  -> my own data, full read/write UI.
// viewedUserId !== userId  -> an owner who granted me read-only access;
//                             RLS blocks writes and the UI hides them.
const ViewContext = createContext(null);

export function ViewProvider({ userId, children }) {
  const [ownerIds, setOwnerIds] = useState([]);
  const [viewedOwnerId, setViewedOwnerId] = useState(null); // null = self

  useEffect(() => {
    let active = true;
    supabase
      .from("viewers")
      .select("owner_id, viewer_id")
      .eq("viewer_id", userId)
      .then(({ data }) => {
        if (!active) return;
        setOwnerIds((data ?? []).map((r) => r.owner_id));
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const value = useMemo(
    () => ({
      userId,
      viewedUserId: viewedOwnerId ?? userId,
      isViewingOther: viewedOwnerId != null,
      canViewPartner: ownerIds.length > 0,
      viewPartner: () => setViewedOwnerId(ownerIds[0] ?? null),
      viewSelf: () => setViewedOwnerId(null),
    }),
    [userId, viewedOwnerId, ownerIds]
  );

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export const useView = () => useContext(ViewContext);
