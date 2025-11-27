import { spawn } from 'node:child_process';

interface TestOptions {
    runner: string;
    watchMode: boolean;
    watchDirs: string[];
    extensions: string[];
    passThrough: string[];
}

export async function runTest(args: string[]) {
    const opts: TestOptions = {
        runner: 'jest',
        watchMode: false,
        watchDirs: [],
        extensions: [],
        passThrough: []
    };

    // Parse args
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--runner') {
            if (i + 1 < args.length) {
                opts.runner = args[i + 1];
                i++;
            }
        } else if (arg === '--watch') {
            // Check if next arg is a value (not starting with -)
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('-')) {
                opts.watchDirs.push(...nextArg.split(','));
                i++;
            } else {
                opts.watchMode = true;
            }
        } else if (arg === '--ext') {
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('-')) {
                opts.extensions.push(...nextArg.split(','));
                i++;
            }
        } else if (arg === '--') {
            opts.passThrough = args.slice(i + 1);
            break;
        } else if (arg.startsWith('-')) {
            // Unknown flag, ignore or assume it's part of pass-through if we wanted to support mixed args,
            // but for now we stick to strict parsing and assume user puts runner args after --
        }
    }

    // Determine mode
    const useNodemon = opts.watchDirs.length > 0 || opts.extensions.length > 0;

    let command: string;
    let commandArgs: string[];

    if (useNodemon) {
        // Nodemon mode
        command = 'nodemon';
        commandArgs = [];

        // Add watch dirs
        for (const dir of opts.watchDirs) {
            commandArgs.push('--watch', dir);
        }

        // Add extensions
        for (const ext of opts.extensions) {
            commandArgs.push('--ext', ext);
        }

        // Add exec command
        // We need to combine runner and passThrough into a single string for --exec
        const runnerCmd = [opts.runner, ...opts.passThrough].join(' ');
        commandArgs.push('--exec', runnerCmd);

    } else {
        // Standard mode
        const runnerParts = opts.runner.split(' ');
        command = runnerParts[0];
        commandArgs = runnerParts.slice(1);

        if (opts.watchMode) {
            commandArgs.push('--watch');
        }

        commandArgs.push(...opts.passThrough);
    }

    console.log(`[makage] running tests with: ${command} ${commandArgs.join(' ')}`);

    const child = spawn(command, commandArgs, {
        stdio: 'inherit',
        shell: true
    });

    return new Promise<void>((resolve, reject) => {
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                process.exit(code ?? 1);
            }
        });
        child.on('error', (err) => {
            console.error(`[makage] failed to start runner: ${err.message}`);
            process.exit(1);
        });
    });
}
