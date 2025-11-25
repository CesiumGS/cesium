export interface ApiItem {
    name: string;
    type: 'class' | 'namespace' | 'method' | 'property';
    category: string;
    description: string;
    url: string;
}