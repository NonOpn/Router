export declare class Command {
    exec(exe: string, args?: string[]): Promise<string>;
    _launch(resolve: any, reject: any, cmd: any): void;
}
