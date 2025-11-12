import type * as L from 'leaflet';

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
    FUNDACAO = 'Fundação',
    ESTRUTURA = 'Estrutura',
    ALVENARIA = 'Alvenaria',
    INSTALACOES = 'Instalações',
    ACABAMENTO = 'Acabamento',
    FINALIZADA = 'Finalizada',
}

export enum TipoTarefa {
    LIGACAO = 'Ligação',
    VISITA = 'Visita',
    EMAIL = 'E-mail',
    PROPOSTA = 'Proposta',
    OUTRO = 'Outro',
}

export enum Representada {
    REP_A = 'Representada A',
    REP_B = 'Representada B',
    REP_C = 'Representada C',
    REP_D = 'Representada D',
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
    email: string;
    cargo: string;
}

export interface Tarefa {
    id: string;
    obraId: string;
    titulo: string;
    descricao: string;
    data: string; // ISO string
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

export interface Foto {
    url: string;
    refPath: string;
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
    dataCadastro: string; // YYYY-MM-DD
    lastUpdated: string; // ISO string
    contatos: Contato[];
    tarefas: Tarefa[];
    propostas: Proposta[];
    fotos: Foto[];
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
