import { LatLngExpression } from 'leaflet';

export enum EtapaLead {
  LEAD = 'Lead',
  NEGOCIACAO = 'Negociação',
  FECHADO = 'Fechado',
  PERDIDO = 'Perdido',
  INATIVO = 'Inativo',
}

export enum FaseObra {
  FUNDACAO = 'Fundação',
  ESTRUTURA = 'Estrutura',
  ALVENARIA = 'Alvenaria',
  INSTALACOES = 'Instalações',
  ACABAMENTO = 'Acabamento',
  FACHADA = 'Fachada',
  ENTREGUE = 'Entregue',
}

export enum TipoTarefa {
  LIGACAO = 'Ligação',
  VISITA = 'Visita',
  EMAIL = 'E-mail',
}

export enum Representada {
  DM2 = 'DM2',
  ALUMBRA = 'ALUMBRA',
  MGM = 'MGM',
  ROCA = 'ROCA',
  CONSTRUCOM = 'CONSTRUCOM',
}

export interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
}

export interface Tarefa {
  id: string;
  obraId: string;
  titulo: string;
  tipo: TipoTarefa;
  data: string; // ISO string for datetime
  descricao: string;
  status: 'Pendente' | 'Concluída';
}

export interface Proposta {
  id: string;
  representada: Representada;
  produto: string;
  valor: number;
  anexoNome?: string;
  anexoUrl?: string; // URL from Firebase Storage
  anexoPath?: string; // Path in Firebase Storage for deletion
}

export interface Obra {
  id: string;
  nome: string;
  dataCadastro: string; // YYYY-MM-DD
  fase: FaseObra;
  cnpj?: string;
  contatos: Contato[];
  etapa: EtapaLead;
  construtora: string;
  fotos: string[]; // Array of image URLs from Firebase Storage
  tarefas: Tarefa[];
  propostas: Proposta[];
  lat: number;
  lng: number;
  lastUpdated: string; // ISO string for inactivity check
}

export interface User {
  id: string; // Firebase UID
  nomeCompleto: string;
  email: string;
}

export interface Metas {
  id: string; // YYYY-MM format
  vendasTotais: number;
  visitas: number;
  ligacoes: number;
  porRepresentada: Record<Representada, number>;
}

export interface Region {
  id: string;
  points: LatLngExpression[];
  color: string;
}

// FIX: Added missing BackupData interface to be exported.
export interface BackupData {
  obras: Obra[];
  metas: Metas;
  regions: Region[];
}
