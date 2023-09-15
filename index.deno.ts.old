import path from 'node:path';
import { spawn } from 'node:child_process';

const TMP_FOLDER = path.join(
    Deno.env.get('HOME') as string,
    'coding/grh/remotes'
);

function print(a: any) {
    // show messages with error output, because git uses stdout to communicate
    console.error(a ? ` [PL] ${a}` : '');
}

async function main() {
    const args = Deno.args;
    print(`Remote helper started with command line args '${args.join(' ')}'`);
    print(`Remote URL passed as 2nd arg: '${args[1]}'`);

    const repoFolder = args[1].replace(/^[^:]+:\/\/(.+)/, '$1');
    const repoPath = path.join(TMP_FOLDER, repoFolder);

    print(`Using tmp '${repoPath}' for remote repo path`);
    print(`Starting communication loop...`);

    await processCommands(repoPath);
}

async function processCommands(repoPath: string) {
    const decoder = new TextDecoder();
    for await (const chunk of Deno.stdin.readable) {
        // read line
        const line = decoder.decode(chunk).replace(/\n/, '');

        // finish if line is empty
        if (!line) {
            print('Input command line is empty. Communication done');
            break;
        }

        // process command
        const [command, arg] = line.split(' ');
        print(`Handling input command '${command}' with argument '${arg}'`);

        switch (command) {
            case 'capabilities':
                console.log('connect');
                console.log('');
                break;
            case 'connect':
                console.log('');
                print(
                    `Running helper utility ${arg} on repository ${repoPath}`
                );
                // run command: 'arg repoPath'
                run(arg, repoPath);
                break;
            default:
                print(`Unrecognized command: '${command}'`);
        }
    }
}

function run(command: string, arg: string) {
    print(`Trying to run '${command}' with args: '${arg}'`);
    const c = new Deno.Command(command, {
        args: [arg],
        // stdin: 'piped',
        // stdout: 'piped',
    });
    const { code, stdout, stderr } = c.outputSync();
    if (code) {
        print(`ERROR: ${code} - ${new TextDecoder().decode(stderr)}`);
        throw new Error(`ERROR: ${code} - ${new TextDecoder().decode(stderr)}`);
    } else {
        console.log(new TextDecoder().decode(stdout));
    }
}

main();
