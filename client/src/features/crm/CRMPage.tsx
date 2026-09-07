import React, { useState } from 'react';
import { useClientStore, Client } from '../../store/useClientStore';
import { useWorkOrderStore } from '../../store/useWorkOrderStore';
import { useVehicleStore } from '../../store/useVehicleStore';
import { useCRMStore, CRMOpportunity, CRMTemplate } from '../../store/useCRMStore';
import { Button, Card } from '../../components/ui';
import { PredictiveTab } from './components/PredictiveTab';
import { PipelineTab } from './components/PipelineTab';
import { SegmentationTab } from './components/SegmentationTab';
import { TemplatesTab } from './components/TemplatesTab';
import { TimelineTab } from './components/TimelineTab';
import { CRMPipelineModal } from './components/CRMPipelineModal';
import { CRMTemplateModal } from './components/CRMTemplateModal';
import { CRMClient360Modal } from './components/CRMClient360Modal';
import { 
  Users, 
  MessageSquare, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  Plus, 
  Zap, 
  DollarSign, 
  TrendingUp, 
  Droplet 
} from 'lucide-react';

export const CRMPage: React.FC = () => {
  const { clients } = useClientStore();
  const { workOrders } = useWorkOrderStore();
  const { vehicles } = useVehicleStore();
  const { opportunities, templates, interactions } = useCRMStore();

  const [activeTab, setActiveTab] = useState<'predictivo' | 'pipeline' | 'segmentacion' | 'plantillas' | 'bitacora'>('predictivo');

  // Modals state
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<CRMOpportunity | null>(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CRMTemplate | null>(null);

  const [selectedClient360, setSelectedClient360] = useState<Client | null>(null);

  const now = new Date();

  // Compute 360 metrics for each client
  const clientMetrics = clients.map((client) => {
    const clientOrders = workOrders.filter(
      (o) =>
        (o.client?.documento && o.client.documento === client.documento) ||
        (o.client?.nombre === client.nombre && o.client?.apellido === client.apellido)
    );

    const sortedOrders = [...clientOrders].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastOrder = sortedOrders[0];

    let lastVisitDate: Date | null = null;
    let daysSinceVisit = 999;
    if (lastOrder) {
      lastVisitDate = new Date(lastOrder.date);
      daysSinceVisit = Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Vehicle info
    const clientVehs = vehicles.filter(
      (v) => v.ownerDocumento === client.documento
    );
    const primaryVehicle = clientVehs[0] || (lastOrder?.vehicle ? {
      placa: lastOrder.vehicle.placa,
      marca: lastOrder.vehicle.marca,
      modelo: lastOrder.vehicle.modelo,
      kilometraje: lastOrder.vehicle.kilometraje || 45000,
    } : null);

    const baseKm = (primaryVehicle as any)?.kilometraje || 45000;
    const estimatedCurrentKm = baseKm + Math.min(25000, Math.floor(daysSinceVisit * 35));

    // Predictive Maintenance Statuses
    const isOilDue = daysSinceVisit >= 90 || (estimatedCurrentKm % 5000) < 500;
    const isBrakesDue = daysSinceVisit >= 180;
    const isBeltDue = estimatedCurrentKm >= 50000 && daysSinceVisit >= 365;

    // Financials
    const totalSpent = clientOrders.reduce((acc, o) => acc + (o.totalUSD || 0), 0);
    const totalPaid = clientOrders.reduce((acc, o) => {
      const paid = (o.payments || []).reduce((pAcc, p) => pAcc + (p.amountUSD || 0), 0);
      return acc + paid;
    }, 0);
    const pendingBalance = Math.max(0, totalSpent - totalPaid);

    // RFM Segmentation
    let segmentTag = 'NUEVO';
    if (totalSpent >= 600 || clientVehs.length >= 2) {
      segmentTag = 'VIP_FLOTA';
    } else if (clientOrders.length >= 3 && daysSinceVisit <= 90) {
      segmentTag = 'RECURRENTE';
    } else if (clientOrders.length >= 2 && daysSinceVisit > 90 && daysSinceVisit <= 180) {
      segmentTag = 'EN_RIESGO';
    } else if (daysSinceVisit > 180) {
      segmentTag = 'INACTIVO';
    }

    return {
      client,
      clientOrders,
      lastOrder,
      lastVisitDate,
      daysSinceVisit,
      primaryVehicle,
      estimatedCurrentKm,
      isOilDue,
      isBrakesDue,
      isBeltDue,
      totalSpent,
      pendingBalance,
      segmentTag,
    };
  });

  const totalPendingFollowups = clientMetrics.filter((c) => c.isOilDue || c.isBrakesDue || c.daysSinceVisit >= 90).length;
  const totalPipelineValue = opportunities.reduce((acc, opp) => opp.stage !== 'PERDIDO' ? acc + (opp.estimatedValueUSD || 0) : acc, 0);
  const totalVIPClients = clientMetrics.filter((c) => c.segmentTag === 'VIP_FLOTA').length;
  const totalInRiskClients = clientMetrics.filter((c) => c.segmentTag === 'EN_RIESGO').length;

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users color="var(--color-primary)" /> CRM y Fidelización 360°
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Mantenimiento predictivo, embudo de recontacto por WhatsApp, segmentación inteligente y bitácora.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button 
            variant="outline" 
            onClick={() => {
              setEditingTemplate(null);
              setIsTemplateModalOpen(true);
            }}
            icon={<MessageSquare size={16} />}
          >
            Nueva Plantilla
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setEditingOpportunity(null);
              setIsPipelineModalOpen(true);
            }}
            icon={<Plus size={16} />}
          >
            Nueva Oportunidad CRM
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Por Recontactar</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{totalPendingFollowups}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Mantenimientos o inactivos</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Clock size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Valor en Pipeline</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '4px' }}>${totalPipelineValue.toFixed(2)}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Oportunidades en curso</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <DollarSign size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Clientes VIP & Flotillas</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>{totalVIPClients}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Mayor facturación / autos</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <Zap size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>En Riesgo de Pérdida</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{totalInRiskClients}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Sin visita en 90-180 días</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <AlertCircle size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '4px', marginBottom: '20px', overflowX: 'auto' }}>
        <button
          type="button"
          onClick={() => setActiveTab('predictivo')}
          style={{
            padding: '10px 18px',
            borderBottom: activeTab === 'predictivo' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'predictivo' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            whiteSpace: 'nowrap'
          }}
        >
          <Droplet size={16} /> Recordatorios Predictivos
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pipeline')}
          style={{
            padding: '10px 18px',
            borderBottom: activeTab === 'pipeline' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'pipeline' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            whiteSpace: 'nowrap'
          }}
        >
          <TrendingUp size={16} /> Embudo / Kanban ({opportunities.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('segmentacion')}
          style={{
            padding: '10px 18px',
            borderBottom: activeTab === 'segmentacion' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'segmentacion' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            whiteSpace: 'nowrap'
          }}
        >
          <UserCheck size={16} /> Segmentación 360° ({clients.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plantillas')}
          style={{
            padding: '10px 18px',
            borderBottom: activeTab === 'plantillas' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'plantillas' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            whiteSpace: 'nowrap'
          }}
        >
          <MessageSquare size={16} /> Plantillas WhatsApp ({templates.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bitacora')}
          style={{
            padding: '10px 18px',
            borderBottom: activeTab === 'bitacora' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'bitacora' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 700,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            whiteSpace: 'nowrap'
          }}
        >
          <Clock size={16} /> Bitácora General ({interactions.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'predictivo' && (
        <PredictiveTab 
          clientMetrics={clientMetrics} 
          onOpenClient360={(c) => setSelectedClient360(c)} 
        />
      )}

      {activeTab === 'pipeline' && (
        <PipelineTab
          onNewOpportunity={() => {
            setEditingOpportunity(null);
            setIsPipelineModalOpen(true);
          }}
          onEditOpportunity={(opp) => {
            setEditingOpportunity(opp);
            setIsPipelineModalOpen(true);
          }}
        />
      )}

      {activeTab === 'segmentacion' && (
        <SegmentationTab
          clientMetrics={clientMetrics}
          onOpenClient360={(c) => setSelectedClient360(c)}
        />
      )}

      {activeTab === 'plantillas' && (
        <TemplatesTab
          onNewTemplate={() => {
            setEditingTemplate(null);
            setIsTemplateModalOpen(true);
          }}
          onEditTemplate={(tpl) => {
            setEditingTemplate(tpl);
            setIsTemplateModalOpen(true);
          }}
        />
      )}

      {activeTab === 'bitacora' && <TimelineTab />}

      {/* Modals */}
      <CRMPipelineModal
        isOpen={isPipelineModalOpen}
        onClose={() => {
          setIsPipelineModalOpen(false);
          setEditingOpportunity(null);
        }}
        initialOpportunity={editingOpportunity}
      />

      <CRMTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => {
          setIsTemplateModalOpen(false);
          setEditingTemplate(null);
        }}
        initialTemplate={editingTemplate}
      />

      <CRMClient360Modal
        isOpen={!!selectedClient360}
        onClose={() => setSelectedClient360(null)}
        client={selectedClient360}
      />

    </div>
  );
};
