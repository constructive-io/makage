const isObject = (val: any): boolean => val !== null && typeof val === 'object' && !Array.isArray(val);

/* eslint-disable no-control-regex */
// Modified version of https://github.com/chalk/ansi-regex (MIT License)
const ANSI_REGEX = /[\u001b\u009b][[\]#;?()]*(?:(?:(?:[^\W_]*;?[^\W_]*)\u0007)|(?:(?:[0-9]{1,4}(;[0-9]{0,4})*)?[~0-9=<>cf-nqrtyA-PRZ]))/g;

const hasColor = (): boolean => {
  if (typeof process !== 'undefined') {
    return process.env.FORCE_COLOR !== '0';
  }
  return false;
};

interface Style {
  name: string;
  codes: [number, number];
  open?: string;
  close?: string;
  regex?: RegExp;
  wrap?: (input: string, newline?: boolean) => string;
}

interface ColorStyles {
  [key: string]: Style;
}

interface ColorKeys {
  [key: string]: string[];
}

export interface YanseColors {
  enabled: boolean;
  visible: boolean;
  styles: ColorStyles;
  keys: ColorKeys;
  ansiRegex: RegExp;

  // Style modifiers
  reset: YanseColor;
  bold: YanseColor;
  dim: YanseColor;
  italic: YanseColor;
  underline: YanseColor;
  inverse: YanseColor;
  hidden: YanseColor;
  strikethrough: YanseColor;

  // Standard colors
  black: YanseColor;
  red: YanseColor;
  green: YanseColor;
  yellow: YanseColor;
  blue: YanseColor;
  magenta: YanseColor;
  cyan: YanseColor;
  white: YanseColor;
  gray: YanseColor;
  grey: YanseColor;

  // Background colors
  bgBlack: YanseColor;
  bgRed: YanseColor;
  bgGreen: YanseColor;
  bgYellow: YanseColor;
  bgBlue: YanseColor;
  bgMagenta: YanseColor;
  bgCyan: YanseColor;
  bgWhite: YanseColor;

  // Bright colors
  blackBright: YanseColor;
  redBright: YanseColor;
  greenBright: YanseColor;
  yellowBright: YanseColor;
  blueBright: YanseColor;
  magentaBright: YanseColor;
  cyanBright: YanseColor;
  whiteBright: YanseColor;

  // Bright background colors
  bgBlackBright: YanseColor;
  bgRedBright: YanseColor;
  bgGreenBright: YanseColor;
  bgYellowBright: YanseColor;
  bgBlueBright: YanseColor;
  bgMagentaBright: YanseColor;
  bgCyanBright: YanseColor;
  bgWhiteBright: YanseColor;

  // Utility methods
  hasColor(str: string): boolean;
  hasAnsi(str: string): boolean;
  alias(name: string, color: string | YanseColor | ((str: string) => string)): void;
  theme(custom: Record<string, YanseColor>): YanseColors;
  unstyle(str: string): string;
  stripColor(str: string): string;
  noop(str: string): string;
  none(str: string): string;
  clear(str: string): string;
  define(name: string, codes: [number, number], type: string): void;
}

export interface YanseColor {
  (input: string): string;
  stack?: string[];

  // All the chaining properties
  reset: YanseColor;
  bold: YanseColor;
  dim: YanseColor;
  italic: YanseColor;
  underline: YanseColor;
  inverse: YanseColor;
  hidden: YanseColor;
  strikethrough: YanseColor;

  black: YanseColor;
  red: YanseColor;
  green: YanseColor;
  yellow: YanseColor;
  blue: YanseColor;
  magenta: YanseColor;
  cyan: YanseColor;
  white: YanseColor;
  gray: YanseColor;
  grey: YanseColor;

  bgBlack: YanseColor;
  bgRed: YanseColor;
  bgGreen: YanseColor;
  bgYellow: YanseColor;
  bgBlue: YanseColor;
  bgMagenta: YanseColor;
  bgCyan: YanseColor;
  bgWhite: YanseColor;

  blackBright: YanseColor;
  redBright: YanseColor;
  greenBright: YanseColor;
  yellowBright: YanseColor;
  blueBright: YanseColor;
  magentaBright: YanseColor;
  cyanBright: YanseColor;
  whiteBright: YanseColor;

  bgBlackBright: YanseColor;
  bgRedBright: YanseColor;
  bgGreenBright: YanseColor;
  bgYellowBright: YanseColor;
  bgBlueBright: YanseColor;
  bgMagentaBright: YanseColor;
  bgCyanBright: YanseColor;
  bgWhiteBright: YanseColor;
}

const create = (): YanseColors => {
  const colors = {
    enabled: hasColor(),
    visible: true,
    styles: {} as ColorStyles,
    keys: {} as ColorKeys
  } as YanseColors;

  const ansi = (style: Style): Style => {
    const open = style.open = `\u001b[${style.codes[0]}m`;
    const close = style.close = `\u001b[${style.codes[1]}m`;
    const regex = style.regex = new RegExp(`\\u001b\\[${style.codes[1]}m`, 'g');

    style.wrap = (input: string, newline?: boolean): string => {
      if (input.includes(close)) {
        input = input.replace(regex, close + open);
      }
      let output = open + input + close;
      // Handle newlines in color output
      return newline ? output.replace(/\r*\n/g, `${close}$&${open}`) : output;
    };

    return style;
  };

  const wrap = (style: Style | YanseColor, input: string, newline?: boolean): string => {
    return typeof style === 'function' ? style(input) : (style as Style).wrap!(input, newline);
  };

  const style = (input: string, stack: string[]): string => {
    if (input === '' || input == null) return '';
    if (colors.enabled === false) return input;
    if (colors.visible === false) return '';

    let str = '' + input;
    const nl = str.includes('\n');
    let n = stack.length;

    if (n > 0 && stack.includes('unstyle')) {
      stack = [...new Set(['unstyle', ...stack])].reverse();
    }

    while (n-- > 0) {
      str = wrap(colors.styles[stack[n]], str, nl);
    }

    return str;
  };

  const define = (name: string, codes: [number, number], type: string): void => {
    colors.styles[name] = ansi({ name, codes });
    const keys = colors.keys[type] || (colors.keys[type] = []);
    keys.push(name);

    Reflect.defineProperty(colors, name, {
      configurable: true,
      enumerable: true,
      set(value: any) {
        colors.alias(name, value);
      },
      get() {
        const color: any = (input: string) => style(input, color.stack);
        Reflect.setPrototypeOf(color, colors);
        color.stack = this.stack ? this.stack.concat(name) : [name];
        return color;
      }
    });
  };

  // Define style modifiers
  define('reset', [0, 0], 'modifier');
  define('bold', [1, 22], 'modifier');
  define('dim', [2, 22], 'modifier');
  define('italic', [3, 23], 'modifier');
  define('underline', [4, 24], 'modifier');
  define('inverse', [7, 27], 'modifier');
  define('hidden', [8, 28], 'modifier');
  define('strikethrough', [9, 29], 'modifier');

  // Define standard colors
  define('black', [30, 39], 'color');
  define('red', [31, 39], 'color');
  define('green', [32, 39], 'color');
  define('yellow', [33, 39], 'color');
  define('blue', [34, 39], 'color');
  define('magenta', [35, 39], 'color');
  define('cyan', [36, 39], 'color');
  define('white', [37, 39], 'color');
  define('gray', [90, 39], 'color');
  define('grey', [90, 39], 'color');

  // Define background colors
  define('bgBlack', [40, 49], 'bg');
  define('bgRed', [41, 49], 'bg');
  define('bgGreen', [42, 49], 'bg');
  define('bgYellow', [43, 49], 'bg');
  define('bgBlue', [44, 49], 'bg');
  define('bgMagenta', [45, 49], 'bg');
  define('bgCyan', [46, 49], 'bg');
  define('bgWhite', [47, 49], 'bg');

  // Define bright colors
  define('blackBright', [90, 39], 'bright');
  define('redBright', [91, 39], 'bright');
  define('greenBright', [92, 39], 'bright');
  define('yellowBright', [93, 39], 'bright');
  define('blueBright', [94, 39], 'bright');
  define('magentaBright', [95, 39], 'bright');
  define('cyanBright', [96, 39], 'bright');
  define('whiteBright', [97, 39], 'bright');

  // Define bright background colors
  define('bgBlackBright', [100, 49], 'bgBright');
  define('bgRedBright', [101, 49], 'bgBright');
  define('bgGreenBright', [102, 49], 'bgBright');
  define('bgYellowBright', [103, 49], 'bgBright');
  define('bgBlueBright', [104, 49], 'bgBright');
  define('bgMagentaBright', [105, 49], 'bgBright');
  define('bgCyanBright', [106, 49], 'bgBright');
  define('bgWhiteBright', [107, 49], 'bgBright');

  colors.ansiRegex = ANSI_REGEX;

  colors.hasColor = colors.hasAnsi = (str: string): boolean => {
    colors.ansiRegex.lastIndex = 0;
    return typeof str === 'string' && str !== '' && colors.ansiRegex.test(str);
  };

  colors.alias = (name: string, color: string | YanseColor | ((str: string) => string)): void => {
    const fn = typeof color === 'string' ? (colors as any)[color] : color;

    if (typeof fn !== 'function') {
      throw new TypeError('Expected alias to be the name of an existing color (string) or a function');
    }

    if (!fn.stack) {
      Reflect.defineProperty(fn, 'name', { value: name });
      colors.styles[name] = fn;
      fn.stack = [name];
    }

    Reflect.defineProperty(colors, name, {
      configurable: true,
      enumerable: true,
      set(value: any) {
        colors.alias(name, value);
      },
      get() {
        const color: any = (input: string) => style(input, color.stack);
        Reflect.setPrototypeOf(color, colors);
        color.stack = this.stack ? this.stack.concat(fn.stack) : fn.stack;
        return color;
      }
    });
  };

  colors.theme = (custom: Record<string, YanseColor>): YanseColors => {
    if (!isObject(custom)) throw new TypeError('Expected theme to be an object');
    for (const name of Object.keys(custom)) {
      colors.alias(name, custom[name]);
    }
    return colors;
  };

  colors.alias('unstyle', (str: string): string => {
    if (typeof str === 'string' && str !== '') {
      colors.ansiRegex.lastIndex = 0;
      return str.replace(colors.ansiRegex, '');
    }
    return '';
  });

  colors.alias('noop', (str: string): string => str);
  colors.none = colors.clear = colors.noop;

  colors.stripColor = colors.unstyle;
  colors.define = define;

  return colors;
};

const yanse = create();

export default yanse;
export const {
  enabled,
  visible,
  ansiRegex,
  hasColor: hasColorFn,
  hasAnsi,
  alias,
  theme,
  unstyle,
  stripColor,
  define,

  // Modifiers
  reset,
  bold,
  dim,
  italic,
  underline,
  inverse,
  hidden,
  strikethrough,

  // Colors
  black,
  red,
  green,
  yellow,
  blue,
  magenta,
  cyan,
  white,
  gray,
  grey,

  // Background colors
  bgBlack,
  bgRed,
  bgGreen,
  bgYellow,
  bgBlue,
  bgMagenta,
  bgCyan,
  bgWhite,

  // Bright colors
  blackBright,
  redBright,
  greenBright,
  yellowBright,
  blueBright,
  magentaBright,
  cyanBright,
  whiteBright,

  // Bright background colors
  bgBlackBright,
  bgRedBright,
  bgGreenBright,
  bgYellowBright,
  bgBlueBright,
  bgMagentaBright,
  bgCyanBright,
  bgWhiteBright
} = yanse;

// Also export the create function for creating new instances
export { create };
