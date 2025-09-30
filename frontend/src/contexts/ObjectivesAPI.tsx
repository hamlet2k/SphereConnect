import React, { createContext, useContext } from 'react';
import api from '../api';

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
  allowed_rank_ids?: string[];
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

  const createObjective = async (objective: Objective): Promise<Objective> => {
    const response = await api.post('/objectives', objective);
    return response.data;
  };

  const getObjectives = async (guildId: string, filters?: { status?: string; category_id?: string }): Promise<Objective[]> => {
    const params = new URLSearchParams({ guild_id: guildId });
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category_id) params.append('category_id', filters.category_id);

    const response = await api.get(`/objectives?${params}`);
    return response.data;
  };

  const getObjective = async (id: string): Promise<Objective> => {
    const response = await api.get(`/objectives/${id}`);
    return response.data;
  };

  const updateObjective = async (id: string, objective: Partial<Objective>): Promise<Objective> => {
    const response = await api.put(`/objectives/${id}`, objective);
    return response.data;
  };

  const deleteObjective = async (id: string): Promise<void> => {
    await api.delete(`/objectives/${id}`);
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