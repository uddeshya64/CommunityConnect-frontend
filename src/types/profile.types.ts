export interface Profile {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    skills?: string[];
    linkedin?: string;
    github?: string;
    profession?: string;
    avatar_url?: string;
    bio?: string;
    location?: string;
    registrations?: any[];
    events_created?: any[];
    team_memberships?: any[];
    saved_events?: any[];
    _count?: {
        events_created?: number;
        teams_led?: number;
        mentor_assignments?: number;
        submissions?: number;
        registrations?: number;
        team_memberships?: number;
        saved_events?: number;
    };
}
