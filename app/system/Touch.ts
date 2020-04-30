import { Command } from './Command';

export class Touch {
  exec(filename: string): Promise<string> {
    const command = new Command();
    return command.exec("/usr/bin/touch", [filename]);
  }
}
