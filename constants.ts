
import { EtapaLead, FaseObra, Representada, Obra } from './types';

export const ETAPA_LEAD_OPTIONS = [
  { value: EtapaLead.LEAD, label: 'Lead', color: 'bg-blue-500', pinColor: 'blue' },
  { value: EtapaLead.NEGOCIACAO, label: 'Negociação', color: 'bg-yellow-500', pinColor: 'gold' },
  { value: EtapaLead.FECHADO, label: 'Fechado', color: 'bg-green-500', pinColor: 'green' },
  { value: EtapaLead.PERDIDO, label: 'Perdido', color: 'bg-red-500', pinColor: 'red' },
  { value: EtapaLead.INATIVO, label: 'Inativo', color: 'bg-gray-500', pinColor: 'grey' },
];

export const FASE_OBRA_OPTIONS = Object.values(FaseObra);

export const REPRESENTADA_PRODUTOS_MAP: Record<Representada, string[]> = {
  [Representada.DM2]: ['Porta Corta-Fogo'],
  [Representada.ALUMBRA]: ['Disjuntores', 'Acabamentos Elétricos'],
  [Representada.MGM]: ['Esquadrias de Alumínio', 'Esquadrias de Madeira'],
  [Representada.ROCA]: ['Louças e Metais', 'Porcelanato'],
  [Representada.CONSTRUCOM]: ['Bloco de Concreto', 'Piso Intertravado', 'Argamassas'],
};

export const MOCK_OBRAS: Obra[] = [
  {
    id: '1',
    nome: 'Edifício Solaris',
    dataCadastro: '2023-10-01',
    fase: FaseObra.ESTRUTURA,
    etapa: EtapaLead.NEGOCIACAO,
    construtora: 'Construtora Horizonte',
    contatos: [{id: 'c1', nome: 'João Silva', telefone: '5511987654321', email: 'joao.silva@horizonte.com'}],
    tarefas: [],
    propostas: [
        { id: 'p1', representada: Representada.DM2, produto: 'Porta Corta-Fogo', valor: 50000 },
    ],
    fotos: [],
    lat: -19.9245,
    lng: -43.9352,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '2',
    nome: 'Residencial Bela Vista',
    dataCadastro: '2023-09-15',
    fase: FaseObra.ACABAMENTO,
    etapa: EtapaLead.LEAD,
    construtora: 'Engenharia Alfa',
    contatos: [{id: 'c2', nome: 'Maria Oliveira', telefone: '5531912345678', email: 'maria.o@alfa.com'}],
    tarefas: [],
    propostas: [],
    fotos: [],
    lat: -19.93,
    lng: -43.94,
    lastUpdated: new Date().toISOString(),
  },
];