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
      clients: [
        {
          id: 'CLI-001',
          type: 'persona',
          nombre: 'Luis',
          apellido: 'Perez',
          documento: 'V-12345678',
          telefono: '4141234567',
          direccion: 'Chacao, Caracas'
        },
        {
          id: 'CLI-002',
          type: 'persona',
          nombre: 'Ana',
          apellido: 'Gomez',
          documento: 'V-87654321',
          telefono: '4247654321',
          direccion: 'Las Mercedes, Caracas'
        }
      ],
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
      name: 'rumilcar-clients-storage'
    }
  )
);