declare module 'nspell' {
  interface NSpell {
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string): this;
    remove(word: string): this;
    wordChars(chars: string): this;
    data(key: string, value: any): this;
  }

  function nspell(aff: Buffer | string, dic?: Buffer | string): NSpell;
  function nspell(options: { aff?: Buffer | string; dic?: Buffer | string }): NSpell;

  export = nspell;
} 