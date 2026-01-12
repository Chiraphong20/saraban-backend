export type ProjectStatus = 'DRAFT' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'CANCELLED' | 'ACTIVE' | 'HOLD';

export interface Project {
    id: number;
    code: string;
    name: string;
    description: string;
    owner: string;
    budget: number;
    status: ProjectStatus;
    startDate: string;
    endDate: string;
    updated_at?: string;
}

export interface AuditLog {
    id: number;
    entity_id: number;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    actor: string;
    details: string;
    timestamp: string;
}

export interface User {
    id: number;
    username: string;
    fullname: string;
    role?: string;
}