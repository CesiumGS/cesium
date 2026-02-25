export interface Tutorial {
    name: string;
    slug: string;
    category: string;
    description: string;
    code: {
        html: string;
        javascript: string;
        css?: string;
    };
}

export interface TutorialMetadata {
    name: string;
    slug: string;
    category: string;
    description: string;
}
