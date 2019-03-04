export default class Errors {
    static instance: Errors;
    postJsonError(err: any): void;
    postJsonErrorPromise(err: any): Promise<{}>;
}
