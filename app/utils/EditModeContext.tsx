import React, { createContext, useContext, useState } from "react";

type EditModeContextType = {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  toggleEditMode: () => void;
};

const EditModeContext = createContext<EditModeContextType | undefined>(
  undefined,
);

export const EditModeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [editMode, setEditMode] = useState(false);
  const toggleEditMode = () => setEditMode((v) => !v);
  return (
    <EditModeContext.Provider value={{ editMode, setEditMode, toggleEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
};

export function useEditMode() {
  const ctx = useContext(EditModeContext);
  if (!ctx) throw new Error("useEditMode must be used within EditModeProvider");
  return ctx;
}
