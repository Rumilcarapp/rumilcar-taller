import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

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
  fetchClients: () => Promise<void>;
  addClient: (client: Client) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
}

export const useClientStore = create<ClientState>()(
  persist(
    (set, get) => ({
      clients: [],
      fetchClients: async () => {
        try {
          const data = await api.get('/clients');
          if (Array.isArray(data)) {
            const mapped: Client[] = data.map((c: any) => {
              const parts = (c.name || '').trim().split(' ');
              const nombre = parts[0] || '';
              const apellido = parts.slice(1).join(' ') || '';
              const taxId = c.taxId || '';
              const type: 'persona' | 'empresa' = taxId.toUpperCase().startsWith('J') || taxId.toUpperCase().startsWith('G')
                ? 'empresa'
                : 'persona';

              return {
                id: c.id,
                nombre,
                apellido,
                documento: taxId,
                telefono: c.phone || '',
                direccion: c.address || '',
                type,
              };
            });
            set({ clients: mapped });
          }
        } catch {
          // Keep local state if offline
        }
      },
      addClient: (client) => {
        set((state) => {
          if (state.clients.some((c) => c.documento && c.documento === client.documento)) {
            return state;
          }
          return { clients: [client, ...state.clients] };
        });

        // Sync with backend
        const fullName = `${client.nombre} ${client.apellido || ''}`.trim();
        api.post('/clients', {
          name: fullName,
          taxId: client.documento || null,
          phone: client.telefono || null,
          address: client.direccion || null,
        }).then((saved) => {
          if (saved && saved.id) {
            set((state) => ({
              clients: state.clients.map((c) => (c.id === client.id ? { ...c, id: saved.id } : c)),
            }));
          }
        }).catch(() => {});
      },
      updateClient: (id, updated) => {
        set((state) => ({
          clients: state.clients.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        }));

        const existing = get().clients.find((c) => c.id === id);
        if (existing) {
          const fullName = `${updated.nombre || existing.nombre} ${updated.apellido !== undefined ? updated.apellido : existing.apellido}`.trim();
          api.put(`/clients/${id}`, {
            name: fullName,
            taxId: updated.documento !== undefined ? updated.documento : existing.documento,
            phone: updated.telefono !== undefined ? updated.telefono : existing.telefono,
            address: updated.direccion !== undefined ? updated.direccion : existing.direccion,
          }).catch(() => {});
        }
      },
      deleteClient: (id) => {
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
        }));

        api.delete(`/clients/${id}`).catch(() => {});
      },
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