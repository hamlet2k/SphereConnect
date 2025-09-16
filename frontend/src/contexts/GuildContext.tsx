import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GuildContextType {
  currentGuildId: string | null;
  guildName: string;
  setCurrentGuild: (guildId: string, name: string) => void;
  clearGuild: () => void;
}

const GuildContext = createContext<GuildContextType | undefined>(undefined);

interface GuildProviderProps {
  children: ReactNode;
}

export const GuildProvider: React.FC<GuildProviderProps> = ({ children }) => {
  const [currentGuildId, setCurrentGuildId] = useState<string | null>(null);
  const [guildName, setGuildName] = useState<string>('');

  useEffect(() => {
    // Load from localStorage on mount
    const storedGuildId = localStorage.getItem('currentGuildId');
    const storedGuildName = localStorage.getItem('guildName');
    if (storedGuildId) {
      setCurrentGuildId(storedGuildId);
    }
    if (storedGuildName) {
      setGuildName(storedGuildName);
    }
  }, []);

  const setCurrentGuild = (guildId: string, name: string) => {
    setCurrentGuildId(guildId);
    setGuildName(name);
    localStorage.setItem('currentGuildId', guildId);
    localStorage.setItem('guildName', name);
  };

  const clearGuild = () => {
    setCurrentGuildId(null);
    setGuildName('');
    localStorage.removeItem('currentGuildId');
    localStorage.removeItem('guildName');
  };

  return (
    <GuildContext.Provider value={{
      currentGuildId,
      guildName,
      setCurrentGuild,
      clearGuild
    }}>
      {children}
    </GuildContext.Provider>
  );
};

export const useGuild = () => {
  const context = useContext(GuildContext);
  if (context === undefined) {
    throw new Error('useGuild must be used within a GuildProvider');
  }
  return context;
};