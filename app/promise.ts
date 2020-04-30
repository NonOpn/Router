export interface Resolve {
    (result: any): void;
}

export interface Reject {
    (err: Error): void;
}