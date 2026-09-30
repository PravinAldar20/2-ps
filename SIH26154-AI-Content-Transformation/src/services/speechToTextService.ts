/**
 * Speech-to-Text Service Abstraction
 * SIH26154 — AI Content Transformation Platform
 *
 * Modular abstraction for speech recognition.
 * Currently uses browser-native Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 * with a clean interface allowing future external providers (e.g. Whisper, Deepgram) without rewriting UI.
 */

export interface SpeechToTextOptions {
  language?: string;
  interimResults?: boolean;
  onStart?: () => void;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (errorMessage: string) => void;
  onEnd?: () => void;
}

export interface SpeechToTextService {
  isSupported(): boolean;
  startListening(options: SpeechToTextOptions): void;
  stopListening(): void;
  isListening(): boolean;
}

class BrowserSpeechToTextService implements SpeechToTextService {
  private recognition: any = null;
  private listening: boolean = false;
  private currentOptions: SpeechToTextOptions | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): boolean {
    if (typeof window === 'undefined') return false;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      return true;
    } catch (e) {
      console.warn('[STT] Failed to initialize SpeechRecognition:', e);
      return false;
    }
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  public isListening(): boolean {
    return this.listening;
  }

  public startListening(options: SpeechToTextOptions): void {
    if (!this.isSupported()) {
      options.onError(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or a Web Speech-compatible browser.'
      );
      return;
    }

    if (this.listening) {
      this.stopListening();
    }

    if (!this.recognition) {
      const ok = this.initRecognition();
      if (!ok) {
        options.onError('Unable to create speech recognition instance.');
        return;
      }
    }

    this.currentOptions = options;
    this.recognition.lang = options.language || 'en-US';
    this.recognition.interimResults = options.interimResults ?? true;

    this.recognition.onstart = () => {
      this.listening = true;
      options.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      if (finalTranscript) {
        options.onResult(finalTranscript.trim(), true);
      } else if (interimTranscript) {
        options.onResult(interimTranscript.trim(), false);
      }
    };

    this.recognition.onerror = (event: any) => {
      this.listening = false;
      let userFriendlyMessage = 'Speech recognition error occurred.';

      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          userFriendlyMessage =
            'Microphone access was denied. Please allow microphone permission in your browser.';
          break;
        case 'no-speech':
          userFriendlyMessage = 'No speech was detected. Please try speaking again.';
          break;
        case 'network':
          userFriendlyMessage =
            'Network error during speech recognition. Please check your internet connection.';
          break;
        case 'audio-capture':
          userFriendlyMessage =
            'No microphone was found or microphone is in use by another application.';
          break;
        case 'aborted':
          // User or programmatic stop - don't trigger error
          return;
        default:
          userFriendlyMessage = `Speech error: ${event.error || 'Unknown error'}`;
      }

      options.onError(userFriendlyMessage);
    };

    this.recognition.onend = () => {
      this.listening = false;
      options.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (err: any) {
      this.listening = false;
      options.onError(err?.message || 'Could not start microphone recording.');
    }
  }

  public stopListening(): void {
    if (this.recognition && this.listening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignored
      }
    }
    this.listening = false;
  }
}

// Singleton export
export const speechToTextService: SpeechToTextService = new BrowserSpeechToTextService();
