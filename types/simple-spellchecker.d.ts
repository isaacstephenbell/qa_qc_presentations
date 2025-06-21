declare module 'simple-spellchecker' {
    interface Spellchecker {
        spellCheck: (word: string) => boolean;
        getSuggestions: (word: string, maxSuggestions?: number) => string[];
    }

    function getDictionary(lang: 'en-US' | 'en_US', path?: string | null, callback?: (err: Error | null, dictionary: Spellchecker) => void): void;

    const Spellchecker: {
        getDictionary: typeof getDictionary;
    };

    export = Spellchecker;
} 