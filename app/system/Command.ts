const { spawn } = require('child_process');

export class Command {

  exec(exe: string, args: string[] = []): Promise<string> {
      return new Promise((resolve, reject) => {
          const cmd = spawn(exe, args);
          this._launch(resolve, reject, cmd);
      });
  }

  _launch(resolve: any, reject: any, cmd: any) {
      var output = "";

      cmd.stdout.on("data", (data: any) => output += data);

      try {
          cmd.stderr.on("data", (data: any) => output += data);
      } catch(e) {
          output += "error " + e;
      }

      cmd.on('close', (code: any) => resolve(output));
  }
}
