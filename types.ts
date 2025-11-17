import * as L from 'leaflet';

export enum EtapaLead {
    LEAD = 'Lead',
    CONTATO_INICIAL = 'Contato Inicial',
    VISITA_AGENDADA = 'Visita Agendada',
    NEGOCIACAO = 'Negociação',
    FECHADO = 'Fechado',
    PERDIDO = 'Perdido',
    INATIVO = 'Inativo',
}

export enum FaseObra {
    PROSPECCAO = 'Prospecção',
    PROJETO = 'Projeto',
    FUNDACAO = 'Fundação',
    ESTRUTURA = 'Estrutura',
    ALVENARIA = 'Alvenaria',
    ACABAMENTO = 'Acabamento',
    ENTREGUE = 'Entregue',
}

export enum TipoTarefa {
    LIGACAO = 'Ligação',
    VISITA = 'Visita',
    EMAIL = 'E-mail',
    PROPOSTA = 'Proposta',
    FOLLOW_UP = 'Follow-up',
}

export enum Representada {
    DM2 = 'DM2',
    ALUMBRA = 'ALUMBRA',
    CONDEX = 'CONDEX',
    MGM = 'MGM',
    ROCA = 'ROCA',
    DACAPO = 'DACAPO',
    CONSTRUCOM = 'CONSTRUCOM',
}

export interface User {
    id: string;
    nomeCompleto: string;
    email: string;
}

export interface Contato {
    id: string;
    nome: string;
    telefone: string;
    email?: string;
    cargo?: string;
}

export interface Tarefa {
    id: string;
    obraId: string;
    titulo: string;
    descricao?: string;
    data: string;
    tipo: TipoTarefa;
    status: 'Pendente' | 'Concluída';
}

export interface Proposta {
    id: string;
    representada: Representada;
    produtos: string[];
    valor: number;
    data: string; // ISO string
}

export interface Obra {
    id: string;
    userId: string;
    nome: string;
    construtora: string;
    lat: number;
    lng: number;
    etapa: EtapaLead;
    fase: FaseObra;
    dataCadastro: string; // ISO string date
    lastUpdated: string; // ISO string date
    contatos: Contato[];
    tarefas: Tarefa[];
    propostas: Proposta[];
    fotos: string[]; // URLs of photos
}

export interface Metas {
    id: string; // YYYY-MM
    vendasTotais: number;
    visitas: number;
    ligacoes: number;
    porRepresentada: Record<Representada, number>;
}

export interface Region {
    id: string;
    points: L.LatLngExpression[];
    color: string;
}
