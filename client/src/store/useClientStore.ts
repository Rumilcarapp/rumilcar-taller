import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';
import { capitalizeWords } from '../lib/stringUtils';

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
              const parts = (c.name || '').trim().split(/\s+/);
              const nombre = capitalizeWords(parts[0] || '');
              const apellido = capitalizeWords(parts.slice(1).join(' ') || '');
              const taxId = (c.taxId || '').toUpperCase();
              const type: 'persona' | 'empresa' = taxId.startsWith('J') || taxId.startsWith('G')
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
        const cleanNombre = capitalizeWords(client.nombre || '');
        const cleanApellido = capitalizeWords(client.apellido || '');
        const cleanDocumento = (client.documento || '').toUpperCase();
        const cleanClient: Client = {
          ...client,
          nombre: cleanNombre,
          apellido: cleanApellido,
          documento: cleanDocumento,
        };

        set((state) => {
          const exists = state.clients.some((c) => c.documento && c.documento === cleanDocumento);
          if (exists) {
            return {
              clients: state.clients.map((c) =>
                c.documento === cleanDocumento
                  ? {
                      ...c,
                      nombre: cleanNombre,
                      apellido: cleanApellido,
                      telefono: cleanClient.telefono || c.telefono,
                      direccion: cleanClient.direccion || c.direccion,
                    }
                  : c
              ),
            };
          }
          return { clients: [cleanClient, ...state.clients] };
        });

        // Sync with backend
        const fullName = `${cleanNombre} ${cleanApellido}`.trim();
        api.post('/clients', {
          name: fullName,
          taxId: cleanDocumento || null,
          phone: cleanClient.telefono || null,
          address: cleanClient.direccion || null,
        }).then((saved) => {
          if (saved && saved.id) {
            set((state) => ({
              clients: state.clients.map((c) => (c.id === client.id ? { ...c, id: saved.id } : c)),
            }));
          }
        }).catch(() => {});
      },
      updateClient: (id, updated) => {
        const cleanUpdated: Partial<Client> = {
          ...updated,
          ...(updated.nombre ? { nombre: capitalizeWords(updated.nombre) } : {}),
          ...(updated.apellido !== undefined ? { apellido: capitalizeWords(updated.apellido) } : {}),
          ...(updated.documento ? { documento: updated.documento.toUpperCase() } : {}),
        };

        set((state) => ({
          clients: state.clients.map((c) => (c.id === id ? { ...c, ...cleanUpdated } : c)),
        }));

        const existing = get().clients.find((c) => c.id === id);
        if (existing) {
          const finalNombre = cleanUpdated.nombre || existing.nombre;
          const finalApellido = cleanUpdated.apellido !== undefined ? cleanUpdated.apellido : existing.apellido;
          const fullName = `${finalNombre} ${finalApellido}`.trim();

          api.put(`/clients/${id}`, {
            name: fullName,
            taxId: cleanUpdated.documento !== undefined ? cleanUpdated.documento : existing.documento,
            phone: cleanUpdated.telefono !== undefined ? cleanUpdated.telefono : existing.telefono,
            address: cleanUpdated.direccion !== undefined ? cleanUpdated.direccion : existing.direccion,
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
          state.clients = state.clients
            .filter((c) => !['CLI-001', 'CLI-002'].includes(c.id))
            .map((c) => ({
              ...c,
              nombre: capitalizeWords(c.nombre || ''),
              apellido: capitalizeWords(c.apellido || ''),
              documento: (c.documento || '').toUpperCase(),
            }));
        }
      },
    }
  )
);