import path from 'path';
import { spawn } from 'child_process';

const TMP_FOLDER = path.join(process.env.HOME as string, 'coding/grh/remotes');

function print(a: any) {
    // show messages with error output, because git uses stdout to communicate
    console.error(a ? ` [PL] ${a}` : '');
}

async function main() {
    const args = process.argv.slice(2);
    print(`Remote helper started with command line args '${args.join(' ')}'`);
    print(`Remote URL passed as 2nd arg: '${args[1]}'`);

    const repoFolder = (args[1] as string).replace(/^[^:]+:\/\/(.+)/, '$1');
    const repoPath = path.join(TMP_FOLDER, repoFolder);

    print(`Using tmp '${repoPath}' for remote repo path`);
    print(`Starting communication loop...`);

    await processCommands(repoPath);
}

async function processCommands(repoPath: string) {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data: string) => {
        const line = data.replace(/\n/, '');

        // finish if line is empty
        if (!line) {
            print('Input command line is empty. Communication done');
            process.exit(0);
        }

        // process command
        const [command, arg = ''] = line.split(' ');
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
                run(arg as string, repoPath);
                break;
            default:
                print(`Unrecognized command: '${command}'`);
        }
    });
}

function run(command: string, arg: string) {
    print(`Trying to run '${command}' with args: '${arg}'`);

    const child = spawn(command, [arg], {
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    process.stdin.pipe(child.stdin);
    child.stdout.pipe(process.stdout);

    child.on('error', print);
    child.on('exit', (code) => code);
}

main();
