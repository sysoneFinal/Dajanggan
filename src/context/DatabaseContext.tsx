import { createContext, useContext, useState } from "react";

const DatabaseContext = createContext({
  selectedDb: null as string | null,
  setSelectedDb: (db: string | null) => {},
});

export const DatabaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedDb, setSelectedDb] = useState<string | null>(null);

  return (
    <DatabaseContext.Provider value={{ selectedDb, setSelectedDb }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => useContext(DatabaseContext);
