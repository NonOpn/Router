export default class Errors {
    static instance: Errors;
    postJsonError(err: any, reason?: string | undefined): void;
    postJsonErrorPromise(err: any, reason?: string | undefined): Promise<{}>;
}
