import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HeaderContextType {
  headerAction: ReactNode | null;
  setHeaderAction: (action: ReactNode | null) => void;
}

const HeaderContext = createContext<HeaderContextType>({
  headerAction: null,
  setHeaderAction: () => {},
});

export const useHeaderActions = () => useContext(HeaderContext);

export const HeaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [headerAction, setHeaderAction] = useState<ReactNode | null>(null);

  return (
    <HeaderContext.Provider value={{ headerAction, setHeaderAction }}>
      {children}
    </HeaderContext.Provider>
  );
};
