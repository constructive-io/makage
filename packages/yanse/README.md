# yanse

<p align="center">
  <img src="https://raw.githubusercontent.com/hyperweb-io/dev-utils/refs/heads/main/docs/img/logo.svg" width="80">
  <br />
    Yanse (颜色) - Fast terminal color styling
  <br />
  <a href="https://github.com/hyperweb-io/dev-utils/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/hyperweb-io/dev-utils/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://github.com/hyperweb-io/dev-utils/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
</p>

Fast and lightweight terminal color styling library with a chalk-like API. Yanse (颜色, yánsè) means "color" in Chinese.

Why? We got tired of chalk's ESM-only errors and needed control over our dependencies. This utility is too simple to justify depending on chalk and wrestling with `module: true`.

## Features

- **Fast & Lightweight** - Zero dependencies, optimized for performance
- **Chalk-like API** - Drop-in replacement for chalk with familiar syntax
- **TypeScript Support** - Fully typed with comprehensive type definitions
- **Nested Colors** - Proper handling of nested color styles without bugs
- **Chained Styles** - Chain multiple colors and modifiers
- **Toggle Support** - Easily enable/disable colors
- **Themes & Aliases** - Create custom color themes and aliases

## Install

```sh
npm install yanse
```

## Usage

### Basic Colors

```typescript
import yanse, { red, green, blue, yellow, cyan } from 'yanse';

console.log(red('Error message'));
console.log(green('Success message'));
console.log(blue('Info message'));
console.log(yellow('Warning message'));
console.log(cyan('Debug message'));
```

### Chained Colors

```typescript
import yanse from 'yanse';

console.log(yanse.bold.red('Bold red text'));
console.log(yanse.bold.yellow.italic('Bold yellow italic text'));
console.log(yanse.green.bold.underline('Bold green underlined text'));
```

### Nested Colors

```typescript
import { yellow, red, cyan } from 'yanse';

console.log(yellow(`foo ${red.bold('red')} bar ${cyan('cyan')} baz`));
```

### Logger Example

Perfect for building loggers with colored output:

```typescript
import yanse, { cyan, yellow, red, green, bold } from 'yanse';

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

const levelColors: Record<LogLevel, typeof cyan> = {
  info: cyan,
  warn: yellow,
  error: red,
  debug: yanse.gray,
  success: green
};

class Logger {
  constructor(private scope: string) {}

  log(level: LogLevel, message: string) {
    const tag = bold(`[${this.scope}]`);
    const color = levelColors[level];
    const prefix = color(`${level.toUpperCase()}:`);

    console.log(`${tag} ${prefix} ${message}`);
  }
}

const logger = new Logger('MyApp');
logger.log('info', 'Application started');
logger.log('success', 'Connection established');
logger.log('warn', 'Deprecated API used');
logger.log('error', 'Failed to connect');
```

## Available Styles

### Colors

- `black`
- `red`
- `green`
- `yellow`
- `blue`
- `magenta`
- `cyan`
- `white`
- `gray` / `grey`

### Background Colors

- `bgBlack`
- `bgRed`
- `bgGreen`
- `bgYellow`
- `bgBlue`
- `bgMagenta`
- `bgCyan`
- `bgWhite`

### Bright Colors

- `blackBright`, `redBright`, `greenBright`, `yellowBright`
- `blueBright`, `magentaBright`, `cyanBright`, `whiteBright`

### Bright Background Colors

- `bgBlackBright`, `bgRedBright`, `bgGreenBright`, `bgYellowBright`
- `bgBlueBright`, `bgMagentaBright`, `bgCyanBright`, `bgWhiteBright`

### Style Modifiers

- `bold`
- `dim`
- `italic`
- `underline`
- `inverse`
- `hidden`
- `strikethrough`
- `reset`

## Toggle Color Support

```typescript
import yanse from 'yanse';

// Disable colors
yanse.enabled = false;
console.log(yanse.red('This will not be colored'));

// Re-enable colors
yanse.enabled = true;
console.log(yanse.red('This will be red'));
```

## Strip ANSI Codes

```typescript
import yanse from 'yanse';

const styled = yanse.blue.bold('Hello World');
console.log(yanse.unstyle(styled)); // 'Hello World'
console.log(yanse.stripColor(styled)); // 'Hello World' (alias)
```

## Themes & Aliases

### Create Aliases

```typescript
import yanse from 'yanse';

yanse.alias('primary', yanse.blue);
yanse.alias('secondary', yanse.gray);

console.log(yanse.primary('Primary text'));
console.log(yanse.secondary('Secondary text'));
```

### Create Themes

```typescript
import yanse from 'yanse';

yanse.theme({
  danger: yanse.red,
  success: yanse.green,
  warning: yanse.yellow,
  info: yanse.cyan,
  primary: yanse.blue,
  muted: yanse.dim.gray
});

console.log(yanse.danger('Error occurred!'));
console.log(yanse.success('Operation successful!'));
console.log(yanse.warning('Be careful!'));
```

## Create Custom Instances

```typescript
import { create } from 'yanse';

const customYanse = create();
customYanse.enabled = false; // This instance has colors disabled

console.log(customYanse.red('Not colored'));
```

## API

### Properties

- `enabled: boolean` - Enable/disable color output
- `visible: boolean` - Make output visible/invisible
- `ansiRegex: RegExp` - Regex for matching ANSI codes

### Methods

- `hasColor(str: string): boolean` - Check if string contains ANSI codes
- `hasAnsi(str: string): boolean` - Alias for hasColor
- `unstyle(str: string): string` - Remove ANSI codes from string
- `stripColor(str: string): string` - Alias for unstyle
- `alias(name: string, color: YanseColor): void` - Create color alias
- `theme(colors: Record<string, YanseColor>): void` - Create color theme
- `create(): YanseColors` - Create new yanse instance

## Why Yanse?

- **Zero Dependencies** - No external dependencies, minimal bundle size
- **Fast** - Optimized for performance
- **Correct Nested Colors** - Unlike some libraries, yanse correctly handles nested color styles
- **TypeScript First** - Written in TypeScript with full type support
- **Familiar API** - Drop-in replacement for chalk

## Developing

When first cloning the repo:

```sh
pnpm install
pnpm build
```

## Testing

```sh
pnpm test
```

## Credits

Inspired by [chalk](https://github.com/chalk/chalk) and [ansi-colors](https://github.com/doowb/ansi-colors).
