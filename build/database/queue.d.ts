interface Provider<TYPE> {
    (): Promise<TYPE>;
}
export default class Queue<TYPE> {
    private waiting;
    private waiting_for_one_call;
    constructor();
    next(): void;
    enqueue(provider: Provider<TYPE>): Promise<TYPE>;
}
export {};
