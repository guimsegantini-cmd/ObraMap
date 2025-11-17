import { Obra, EtapaLead, FaseObra, TipoTarefa, Representada, Contato, Tarefa, Proposta } from './types';

export const ETAPA_LEAD_OPTIONS = [
    { value: EtapaLead.LEAD, label: 'Lead', color: 'bg-gray-400', pinColor: '#9CA3AF' },
    { value: EtapaLead.CONTATO_INICIAL, label: 'Contato Inicial', color: 'bg-blue-500', pinColor: '#3B82F6' },
    { value: EtapaLead.VISITA_AGENDADA, label: 'Visita Agendada', color: 'bg-indigo-500', pinColor: '#6366F1' },
    { value: EtapaLead.NEGOCIACAO, label: 'Negociação', color: 'bg-yellow-500', pinColor: '#F59E0B' },
    { value: EtapaLead.FECHADO, label: 'Fechado', color: 'bg-green-500', pinColor: '#22C55E' },
    { value: EtapaLead.PERDIDO, label: 'Perdido', color: 'bg-red-500', pinColor: '#EF4444' },
    { value: EtapaLead.INATIVO, label: 'Inativo', color: 'bg-slate-600', pinColor: '#475569' },
];

export const FASE_OBRA_OPTIONS = Object.values(FaseObra);

// FIX: Manually define the array from the enum to prevent a build tool parsing error.
// The build tool was failing to correctly parse the `Object.values(TipoTarefa)` expression.
export const TIPO_TAREFA_OPTIONS = [
    TipoTarefa.LIGACAO,
    TipoTarefa.VISITA,
    TipoTarefa.EMAIL,
    TipoTarefa.PROPOSTA,
    TipoTarefa.FOLLOW_UP,
];

export const REPRESENTADA_PRODUTOS_MAP: Record<Representada, string[]> = {
    [Representada.DM2]: ['Portas Corta-Fogo'],
    [Representada.ALUMBRA]: ['Acabamentos Elétricos', 'Disjuntores'],
    [Representada.CONDEX]: ['Cabos Elétricos'],
    [Representada.MGM]: ['Kit porta pronta', 'Esquadrias de alumínio'],
    [Representada.ROCA]: ['Louças e Metais', 'Porcelanato'],
    [Representada.DACAPO]: ['Revestimentos'],
    [Representada.CONSTRUCOM]: ['Blocos de Concreto', 'Piso Intertravado', 'Argamassas'],
};


export const MOCK_OBRAS: Obra[] = [
    {
        id: '1',
        userId: 'mock_user_id',
        nome: 'Edifício Sol Nascente',
        construtora: 'Construtora Alfa',
        lat: -19.92,
        lng: -43.94,
        etapa: EtapaLead.NEGOCIACAO,
        fase: FaseObra.ACABAMENTO,
        dataCadastro: '2023-10-01',
        lastUpdated: new Date().toISOString(),
        contatos: [{ id: 'c1', nome: 'João Silva', telefone: '31 9999-8888', cargo: 'Engenheiro' }],
        tarefas: [{ id: 't1', obraId: '1', titulo: 'Enviar proposta final', tipo: TipoTarefa.PROPOSTA, data: new Date().toISOString(), status: 'Pendente' }],
        propostas: [{ id: 'p1', representada: Representada.ALUMBRA, produtos: ['Acabamentos Elétricos'], valor: 50000, data: new Date().toISOString() }],
        fotos: ['https://picsum.photos/seed/obra1/400/300'],
    },
    {
        id: '2',
        userId: 'mock_user_id',
        nome: 'Residencial Bela Vista',
        construtora: 'Construtora Beta',
        lat: -19.93,
        lng: -43.95,
        etapa: EtapaLead.LEAD,
        fase: FaseObra.FUNDACAO,
        dataCadastro: '2023-11-15',
        lastUpdated: new Date().toISOString(),
        contatos: [],
        tarefas: [],
        propostas: [],
        fotos: [],
    },
    {
        id: '3',
        userId: 'mock_user_id',
        nome: 'Condomínio Green Park',
        construtora: 'Construtora Gama',
        lat: -19.91,
        lng: -43.93,
        etapa: EtapaLead.FECHADO,
        fase: FaseObra.ENTREGUE,
        dataCadastro: new Date().toISOString().slice(0, 7) + '-01',
        lastUpdated: new Date().toISOString(),
        contatos: [{ id: 'c2', nome: 'Maria Souza', telefone: '31 9999-7777', cargo: 'Arquiteta' }],
        tarefas: [],
        propostas: [{ id: 'p2', representada: Representada.ROCA, produtos: ['Louças e Metais', 'Porcelanato'], valor: 120000, data: new Date().toISOString() }],
        fotos: ['https://picsum.photos/seed/obra3/400/300'],
    },
];
