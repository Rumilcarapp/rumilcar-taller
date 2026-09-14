import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Client {
  id: string;
  type: 'persona' | 'empresa';
  nombre: string;
  apellido: string;
  documento: string; // V-12345678, etc.
  telefono: string;
  direccion: string;
}

interface ClientState {
  clients: Client[];
  addClient: (client: Client) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
}

export const useClientStore = create<ClientState>()(
  persist(
    (set) => ({
      clients: [],
      addClient: (client) => set((state) => {
        if (state.clients.some(c => c.documento === client.documento)) return state;
        return { clients: [client, ...state.clients] };
      }),
      updateClient: (id, updated) => set((state) => ({
        clients: state.clients.map(c => c.id === id ? { ...c, ...updated } : c)
      })),
      deleteClient: (id) => set((state) => ({
        clients: state.clients.filter(c => c.id !== id)
      }))
    }),
    {
      name: 'rumilcar-clients-storage',
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.clients)) {
          state.clients = state.clients.filter(
            (c) => !['CLI-001', 'CLI-002'].includes(c.id)
          );
        }
      },
    }
  )
);