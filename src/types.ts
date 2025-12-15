export interface AppSettings {
    id?: number;
    name1: string;
    avatar1: string;
    password1: string;
    name2: string;
    avatar2: string;
    password2: string;
    startDate: string; // ISO date string YYYY-MM-DD
    adminPassword?: string;
}

export interface Message {
    id: string;
    text: string;
    date: string; // timestamp
    sender?: string; // 'name1' or 'name2'
}

export interface PhotoPost {
    id: string;
    imageUrls: string[];
    description?: string;
    date: string;
    uploader?: string; // 'name1' or 'name2'
}
