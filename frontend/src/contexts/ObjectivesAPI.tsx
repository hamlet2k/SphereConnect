import React, { createContext, useContext } from 'react';

export interface ObjectiveDescription {
  brief: string;
  tactical: string;
  classified: string;
  metrics: { [key: string]: any };
}

export interface Objective {
  id: string;
  name: string;
  description: ObjectiveDescription;
  categories: string[];
  priority: string;
  allowed_ranks: string[];
  progress: any;
  tasks?: string[];
  lead_id?: string;
  squad_id?: string;
  guild_id: string;
}

interface ObjectivesAPIContextType {
  createObjective: (objective: Objective) => Promise<Objective>;
  getObjectives: (guildId: string, filters?: { status?: string; category_id?: string }) => Promise<Objective[]>;
  getObjective: (id: string) => Promise<Objective>;
  updateObjective: (id: string, objective: Partial<Objective>) => Promise<Objective>;
  deleteObjective: (id: string) => Promise<void>;
}

const ObjectivesAPIContext = createContext<ObjectivesAPIContextType | undefined>(undefined);

export const useObjectivesAPI = () => {
  const context = useContext(ObjectivesAPIContext);
  if (context === undefined) {
    throw new Error('useObjectivesAPI must be used within an ObjectivesAPIProvider');
  }
  return context;
};

interface ObjectivesAPIProviderProps {
  children: React.ReactNode;
}

export const ObjectivesAPIProvider: React.FC<ObjectivesAPIProviderProps> = ({ children }) => {
  const token = localStorage.getItem('token');
  const baseURL = 'http://localhost:8000';

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const createObjective = async (objective: Objective): Promise<Objective> => {
    const response = await fetch(`${baseURL}/api/objectives`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(objective)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create objective');
    }

    return response.json();
  };

  const getObjectives = async (guildId: string, filters?: { status?: string; category_id?: string }): Promise<Objective[]> => {
    const params = new URLSearchParams({ guild_id: guildId });
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category_id) params.append('category_id', filters.category_id);

    const response = await fetch(`${baseURL}/api/objectives?${params}`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch objectives');
    }

    return response.json();
  };

  const getObjective = async (id: string): Promise<Objective> => {
    const response = await fetch(`${baseURL}/api/objectives/${id}`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch objective');
    }

    return response.json();
  };

  const updateObjective = async (id: string, objective: Partial<Objective>): Promise<Objective> => {
    const response = await fetch(`${baseURL}/api/objectives/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(objective)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update objective');
    }

    return response.json();
  };

  const deleteObjective = async (id: string): Promise<void> => {
    const response = await fetch(`${baseURL}/api/objectives/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete objective');
    }
  };

  return (
    <ObjectivesAPIContext.Provider value={{
      createObjective,
      getObjectives,
      getObjective,
      updateObjective,
      deleteObjective
    }}>
      {children}
    </ObjectivesAPIContext.Provider>
  );
};