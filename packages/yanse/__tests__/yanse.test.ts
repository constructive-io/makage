import yanse, { red, green, blue, bold, cyan, yellow, create } from '../src';

describe('yanse', () => {
  describe('Basic colors', () => {
    it('should apply red color', () => {
      const result = red('Hello');
      expect(result).toContain('Hello');
      expect(result).toMatch(/\u001b\[31m.*\u001b\[39m/);
    });

    it('should apply green color', () => {
      const result = green('Success');
      expect(result).toContain('Success');
      expect(result).toMatch(/\u001b\[32m.*\u001b\[39m/);
    });

    it('should apply blue color', () => {
      const result = blue('Info');
      expect(result).toContain('Info');
      expect(result).toMatch(/\u001b\[34m.*\u001b\[39m/);
    });

    it('should apply yellow color', () => {
      const result = yellow('Warning');
      expect(result).toContain('Warning');
      expect(result).toMatch(/\u001b\[33m.*\u001b\[39m/);
    });

    it('should apply cyan color', () => {
      const result = cyan('Info');
      expect(result).toContain('Info');
      expect(result).toMatch(/\u001b\[36m.*\u001b\[39m/);
    });
  });

  describe('Style modifiers', () => {
    it('should apply bold modifier', () => {
      const result = bold('Bold Text');
      expect(result).toContain('Bold Text');
      expect(result).toMatch(/\u001b\[1m.*\u001b\[22m/);
    });

    it('should apply dim modifier', () => {
      const result = yanse.dim('Dimmed');
      expect(result).toContain('Dimmed');
      expect(result).toMatch(/\u001b\[2m.*\u001b\[22m/);
    });

    it('should apply italic modifier', () => {
      const result = yanse.italic('Italic');
      expect(result).toContain('Italic');
      expect(result).toMatch(/\u001b\[3m.*\u001b\[23m/);
    });

    it('should apply underline modifier', () => {
      const result = yanse.underline('Underlined');
      expect(result).toContain('Underlined');
      expect(result).toMatch(/\u001b\[4m.*\u001b\[24m/);
    });
  });

  describe('Chained colors', () => {
    it('should chain bold and red', () => {
      const result = yanse.bold.red('Bold Red');
      expect(result).toContain('Bold Red');
      expect(result).toMatch(/\u001b\[1m/);
      expect(result).toMatch(/\u001b\[31m/);
    });

    it('should chain multiple modifiers', () => {
      const result = yanse.bold.yellow.italic('Complex');
      expect(result).toContain('Complex');
      expect(result).toMatch(/\u001b\[1m/);
      expect(result).toMatch(/\u001b\[33m/);
      expect(result).toMatch(/\u001b\[3m/);
    });

    it('should chain green, bold, and underline', () => {
      const result = yanse.green.bold.underline('Styled');
      expect(result).toContain('Styled');
      expect(result).toMatch(/\u001b\[32m/);
      expect(result).toMatch(/\u001b\[1m/);
      expect(result).toMatch(/\u001b\[4m/);
    });
  });

  describe('Nested colors', () => {
    it('should handle nested colors', () => {
      const result = yellow(`foo ${red.bold('red')} bar ${cyan('cyan')} baz`);
      expect(result).toContain('foo');
      expect(result).toContain('red');
      expect(result).toContain('bar');
      expect(result).toContain('cyan');
      expect(result).toContain('baz');
    });

    it('should handle deeply nested colors', () => {
      const result = green(`outer ${blue(`middle ${red('inner')} middle`)} outer`);
      expect(result).toContain('outer');
      expect(result).toContain('middle');
      expect(result).toContain('inner');
    });
  });

  describe('Background colors', () => {
    it('should apply background colors', () => {
      const result = yanse.bgRed('Background');
      expect(result).toContain('Background');
      expect(result).toMatch(/\u001b\[41m.*\u001b\[49m/);
    });

    it('should combine foreground and background colors', () => {
      const result = yanse.white.bgBlue('Contrast');
      expect(result).toContain('Contrast');
      expect(result).toMatch(/\u001b\[37m/);
      expect(result).toMatch(/\u001b\[44m/);
    });
  });

  describe('Bright colors', () => {
    it('should apply bright colors', () => {
      const result = yanse.redBright('Bright Red');
      expect(result).toContain('Bright Red');
      expect(result).toMatch(/\u001b\[91m.*\u001b\[39m/);
    });

    it('should apply bright background colors', () => {
      const result = yanse.bgGreenBright('Bright BG');
      expect(result).toContain('Bright BG');
      expect(result).toMatch(/\u001b\[102m.*\u001b\[49m/);
    });
  });

  describe('Utility methods', () => {
    it('should strip ANSI codes with unstyle', () => {
      const styled = red.bold('Styled Text');
      const unstyled = yanse.unstyle(styled);
      expect(unstyled).toBe('Styled Text');
      expect(unstyled).not.toMatch(/\u001b/);
    });

    it('should strip ANSI codes with stripColor', () => {
      const styled = blue.underline('Styled');
      const unstyled = yanse.stripColor(styled);
      expect(unstyled).toBe('Styled');
    });

    it('should detect ANSI codes with hasColor', () => {
      const styled = green('Text');
      const plain = 'Text';
      expect(yanse.hasColor(styled)).toBe(true);
      expect(yanse.hasColor(plain)).toBe(false);
    });

    it('should detect ANSI codes with hasAnsi', () => {
      const styled = yellow.bold('Text');
      expect(yanse.hasAnsi(styled)).toBe(true);
    });
  });

  describe('Enabling/disabling colors', () => {
    it('should respect enabled flag', () => {
      const instance = create();
      instance.enabled = false;
      const result = instance.red('No Color');
      expect(result).toBe('No Color');
      expect(result).not.toMatch(/\u001b/);
    });

    it('should respect visible flag', () => {
      const instance = create();
      instance.visible = false;
      const result = instance.green('Invisible');
      expect(result).toBe('');
    });
  });

  describe('Aliases and themes', () => {
    it('should create aliases', () => {
      const instance = create();
      instance.alias('primary', instance.blue);
      const result = (instance as any).primary('Primary');
      expect(result).toContain('Primary');
      expect(result).toMatch(/\u001b\[34m/);
    });

    it('should create themes', () => {
      const instance = create();
      instance.theme({
        danger: instance.red,
        success: instance.green,
        info: instance.cyan
      });
      expect((instance as any).danger('Error')).toMatch(/\u001b\[31m/);
      expect((instance as any).success('OK')).toMatch(/\u001b\[32m/);
      expect((instance as any).info('Note')).toMatch(/\u001b\[36m/);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      expect(red('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(red(null as any)).toBe('');
      expect(red(undefined as any)).toBe('');
    });

    it('should handle strings with newlines', () => {
      const result = green('Line 1\nLine 2');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });
  });

  describe('Logger use case', () => {
    it('should work with logger pattern', () => {
      type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

      const levelColors: Record<LogLevel, typeof cyan> = {
        info: cyan,
        warn: yellow,
        error: red,
        debug: yanse.gray,
        success: green
      };

      const scope = 'TestScope';
      const level: LogLevel = 'info';

      const tag = bold(`[${scope}]`);
      const color = levelColors[level];
      const prefix = color(`${level.toUpperCase()}:`);

      expect(tag).toContain('[TestScope]');
      expect(prefix).toContain('INFO:');
      expect(yanse.hasAnsi(tag)).toBe(true);
      expect(yanse.hasAnsi(prefix)).toBe(true);
    });
  });
});
