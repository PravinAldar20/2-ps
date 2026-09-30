/**
 * Text-to-Speech Service Abstraction
 * SIH26154 — AI Content Transformation Platform
 *
 * Modular abstraction for speech synthesis.
 * Currently uses browser-native Web Speech API (window.speechSynthesis)
 * with natural markdown cleansing and chunking, allowing future external providers
 * (e.g. ElevenLabs, Google Cloud TTS) to be plugged in seamlessly.
 */

export interface TextToSpeechOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (errorMessage: string) => void;
}

export interface TextToSpeechService {
  isSupported(): boolean;
  speak(text: string, options?: TextToSpeechOptions): Promise<void>;
  stop(): void;
  isSpeaking(): boolean;
}

class BrowserTextToSpeechService implements TextToSpeechService {
  private speaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  public isSpeaking(): boolean {
    if (!this.isSupported()) return false;
    return this.speaking || window.speechSynthesis.speaking;
  }

  /**
   * Cleans markdown, formatting artifacts, and raw JSON before speaking
   * so the voice assistant reads naturally.
   */
  private cleanTextForSpeech(raw: string): string {
    if (!raw) return '';
    let cleaned = raw
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, ' [code block omitted] ')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove headers (# Title)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italics
      .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
      // Remove blockquotes (> quote)
      .replace(/^>\s+/gm, '')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, '')
      // Remove bullet markers
      .replace(/^\s*[-*+]\s+/gm, '')
      // Remove numbered list markers
      .replace(/^\s*\d+\.\s+/gm, '')
      // Collapse multiple newlines/spaces
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  public speak(text: string, options?: TextToSpeechOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        const msg = 'Text-to-speech is not supported by your browser.';
        options?.onError?.(msg);
        return reject(new Error(msg));
      }

      this.stop();

      const spokenText = this.cleanTextForSpeech(text);
      if (!spokenText) {
        options?.onEnd?.();
        return resolve();
      }

      const utterance = new SpeechSynthesisUtterance(spokenText);
      this.currentUtterance = utterance;

      utterance.rate = options?.rate ?? 1.0;
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.volume = options?.volume ?? 1.0;

      // Select high quality voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferred =
          voices.find((v) => v.name === options?.voice) ||
          voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online'))) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];
        if (preferred) {
          utterance.voice = preferred;
        }
      }

      utterance.onstart = () => {
        this.speaking = true;
        options?.onStart?.();
      };

      utterance.onend = () => {
        this.speaking = false;
        this.currentUtterance = null;
        options?.onEnd?.();
        resolve();
      };

      utterance.onerror = (e) => {
        this.speaking = false;
        this.currentUtterance = null;
        // If aborted by user stopping, do not throw error
        if (e.error === 'interrupted' || e.error === 'canceled') {
          resolve();
          return;
        }
        const errorMsg = `Speech playback failed: ${e.error || 'Unknown error'}`;
        options?.onError?.(errorMsg);
        reject(new Error(errorMsg));
      };

      // Workaround for Chrome bug where long speech pauses after 15 seconds
      let timer: any = null;
      const keepAlive = () => {
        if (this.speaking && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
          timer = setTimeout(keepAlive, 10000);
        } else {
          clearTimeout(timer);
        }
      };
      timer = setTimeout(keepAlive, 10000);

      window.speechSynthesis.speak(utterance);
    });
  }

  public stop(): void {
    if (!this.isSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // Ignored
    }
    this.speaking = false;
    this.currentUtterance = null;
  }
}

// Singleton export
export const textToSpeechService: TextToSpeechService = new BrowserTextToSpeechService();
