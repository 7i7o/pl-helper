import debug from 'debug';
import { asyncMap } from 'rxjs-async-map';
import { rxToStream, streamToStringRx } from 'rxjs-stream';
import { filter, map, mergeMap, scan, tap } from 'rxjs/operators';
import { superpathjoin as join } from 'superpathjoin';

// TODO Add tests

import path from 'path';
const TMP_FOLDER = path.join(process.env.HOME as string, 'coding/grh/remotes');

export enum GitCommands {
    capabilities = 'capabilities',
    option = 'option',
    connect = 'connect',
}
export const ONE_LINE_COMMANDS = [
    GitCommands.capabilities,
    GitCommands.option,
    // GitCommands.connect,
];

export const logError = (...args: any) => {
    console.error(...args);
};
export const log = debug('git-remote-helper');
const logIo = log.extend('io');
const logInput = logIo.extend('input');
const logOutput = logIo.extend('output');

export type CommandCapabilities = {
    command: GitCommands.capabilities;
};
export type CommandOption = {
    command: GitCommands.option;
    key: string;
    value: string;
};
export type CommandConnect = {
    command: GitCommands.connect;
    gitCommand?: string;
};
export type Command = CommandCapabilities | CommandOption | CommandConnect;

/**
 * These are parameters which are passed to every api callback
 */
export type ApiBaseParams = {
    gitdir: string;
    /**
     * The remote name, or the remote URL if a name is not provided. Supplied by
     * the native git client.
     */
    remoteName: string;
    /**
     * The remote URL passed by the native git client.
     *
     * NOTE: It will not contain the leading `HELPER::`, only the part after that.
     */
    remoteUrl: string;
};

export type HandleConnect = (
    params: ApiBaseParams & { gitCommand: string }
) => Promise<string>;

export type ApiBase = {
    /**
     * Optional init() hook which will be called each time that the
     * git-remote-helper is invoked before any other APIs are called. It will be
     * awaited, so you can safely do setup steps here and trust they will be
     * finished before any of the other API methods are invoked.
     */
    init?: (params: ApiBaseParams) => Promise<void>;
    handleConnect?: HandleConnect;
};
export type ApiConnect = ApiBase & {
    handleConnect: HandleConnect;
};
export type Api = ApiConnect;

const GitRemoteHelper = async ({
    env,
    api,
    stdin,
    stdout,
}: {
    env: typeof process.env;
    stdin: typeof process.stdin;
    stdout: typeof process.stdout;
    api: Api;
}) => {
    const inputStream = streamToStringRx(stdin);

    const getDir = () => {
        if (typeof env['GIT_DIR'] !== 'string') {
            throw new Error('Missing GIT_DIR env #tVJpoU');
        }
        return env['GIT_DIR'];
    };
    const gitdir = join(process.cwd(), getDir());

    const [first, second, remoteName, remoteUrlGit] = process.argv;

    logError(`args: '${first}', '${second}'`);

    if (typeof remoteName !== 'string')
        throw new Error('Missing Remote Name argument #tVJpoU');
    if (typeof remoteUrlGit !== 'string')
        throw new Error('Missing Remote Url argument #tVJpoU');

    const remoteUrl = path.join(TMP_FOLDER, remoteUrlGit);

    const capabilitiesResponse =
        [GitCommands.option, GitCommands.connect]
            .filter((option) => {
                if (option === GitCommands.option) {
                    return true;
                } else if (option === GitCommands.connect) {
                    return typeof api.handleConnect === 'function';
                } else {
                    throw new Error('Unknown option #GDhBnb');
                }
            })
            .join('\n') + '\n\n';

    log('Startup #p6i3kB', {
        gitdir,
        remoteName,
        remoteUrl,
        capabilitiesResponse,
    });

    if (typeof api.init === 'function') {
        await api.init({ gitdir, remoteName, remoteUrl });
    }

    const commands = inputStream.pipe(
        tap((line) => {
            logInput('Got raw input line #gARMUQ', JSON.stringify(line));
        }),
        // The `line` can actually contain multiple lines, so we split them out into
        // multiple pieces and recombine them again
        map((line) => line.split('\n')),
        mergeMap((lineGroup) => lineGroup),
        // Commands include a trailing newline which we don't need
        map((line) => line.trimEnd()),
        scan(
            (acc, line) => {
                log('Scanning #NH7FyX', JSON.stringify({ acc, line }));
                // If we emitted the last value, then we ignore all of the current lines
                // and start fresh on the next "batch"
                const linesWaitingToBeEmitted = acc.emit ? [] : acc.lines;

                // When we hit an empty line, it's always the completion of a command
                // block, so we always want to emit the lines we've been collecting.
                // NOTE: We do not add the blank line onto the existing array of lines
                // here, it gets dropped here.
                if (line === '') {
                    if (linesWaitingToBeEmitted.length === 0) {
                        return { emit: false, lines: [] };
                    }

                    return { emit: true, lines: linesWaitingToBeEmitted };
                }

                // Some commands emit one line at a time and so do not get buffered
                if (
                    ONE_LINE_COMMANDS.find((command) =>
                        line.startsWith(command)
                    )
                ) {
                    // If we have other lines waiting for emission, something went wrong
                    if (linesWaitingToBeEmitted.length > 0) {
                        logError(
                            'Got one line command with lines waiting #ompfQK',
                            JSON.stringify({ linesWaitingToBeEmitted })
                        );
                        throw new Error(
                            'Got one line command with lines waiting #evVyYv'
                        );
                    }

                    return { emit: true, lines: [line] };
                }

                // Otherwise, this line is part of a multi line command, so stick it
                // into the "buffer" and do not emit
                return {
                    emit: false,
                    lines: linesWaitingToBeEmitted.concat(line),
                };
            },
            { emit: false, lines: [] as string[] }
        ),
        tap((acc) => {
            log('Scan output #SAAmZ4', acc);
        }),
        filter((acc) => acc.emit),
        map((emitted) => emitted.lines),
        tap((lines) => {
            log('Buffer emptied #TRqQFc', JSON.stringify(lines));
        })
    );

    // NOTE: Splitting this into 2 pipelines so typescript is happy that it
    // produces a string
    const output = commands.pipe(
        // filter(lines => lines.length > 0),
        // Build objects from the sequential lines
        map((lines): Command => {
            log('Mapping buffered line #pDqtRP', lines);

            const command = lines[0];

            if (typeof command !== 'string')
                throw new Error('Empty/undefined command #Py9QTP');

            if (command.startsWith('capabilities')) {
                return { command: GitCommands.capabilities };
            } else if (command.startsWith(GitCommands.option)) {
                const [, key = '', value = ''] = command.split(' ');
                return { command: GitCommands.option, key, value };
            } else if (command.startsWith(GitCommands.connect)) {
                return {
                    command: GitCommands.connect,
                    gitCommand: command.split(' ')[1],
                };
            }

            throw new Error('Unknown command #Py9QTP');
        }),
        asyncMap(async (command) => {
            if (command.command === GitCommands.capabilities) {
                log(
                    'Returning capabilities #MJMFfj',
                    JSON.stringify({ command, capabilitiesResponse })
                );
                return capabilitiesResponse;
            } else if (command.command === GitCommands.option) {
                // TODO Figure out how to handle options properly
                log(
                    'Reporting option unsupported #WdUrzx',
                    JSON.stringify({ command })
                );
                return 'unsupported\n';
            } else if (command.command === GitCommands.connect) {
                if (typeof api.handleConnect === 'undefined') {
                    throw new Error('api.handleConnect undefined #9eNmmz');
                }
                try {
                    // NOTE: Without the await here, the promise is returned immediately,
                    // and the catch block never fires.
                    const { gitCommand } = command;
                    if (!gitCommand)
                        throw new Error('gitCommand undefined #9eNmmz');
                    return await api.handleConnect({
                        gitdir,
                        remoteName,
                        remoteUrl,
                        gitCommand,
                    });
                } catch (error) {
                    console.error('api.handleConnect threw #5jxsQQ');
                    // console.error(error);
                    throw error;
                }
            }

            throw new Error('Unrecognised command #e6nTnS');
        }, 1),
        tap((x) => {
            logOutput('Sending response #31EyIs', JSON.stringify(x));
        })
    );

    rxToStream(output).pipe(stdout);
};

export default GitRemoteHelper;
