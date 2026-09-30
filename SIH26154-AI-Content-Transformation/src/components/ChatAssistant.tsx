import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Mic, MicOff, Square, Sparkles, User, Volume2, VolumeX,
  RefreshCw, Copy, Check, AlertCircle, FileText, ShieldCheck,
  Bot, CornerDownLeft, Sparkle, ArrowUpCircle
} from 'lucide-react';
import { speechToTextService } from '../services/speechToTextService';
import { textToSpeechService } from '../services/textToSpeechService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  inputMode: 'text' | 'voice';
  timestamp: string;
}

export interface ProjectContextData {
  id: string;
  title: string;
  sourceText?: string;
  preferences?: Record<string, any>;
  truthLayer?: any;
  outputs?: Record<string, any>;
  claims?: any[];
  consistency?: { score: number; issues?: any[] };
  redTeam?: { risk: string; issues?: any[] };
}

interface ChatAssistantProps {
  activeProject?: ProjectContextData | null;
  onOpenProject?: (projectId: string) => void;
}

export function ChatAssistant({ activeProject }: ChatAssistantProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoVoiceResponse, setAutoVoiceResponse] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history for the project or user session
  useEffect(() => {
    let initialGreeting: ChatMessage = {
      id: 'greeting',
      role: 'assistant',
      content: activeProject
        ? `Hello! I am AI Buddy, your Content Transformation Assistant. I am linked to project **"${activeProject.title}"**. You can type or speak questions about the source document, Truth Layer facts, generated artefacts, or fact verification claims.`
        : `Hello! I am AI Buddy, your Gen AI Content Transformation Assistant. You can ask me to summarize documents, explain truth layer facts, review artefacts, or speak to me using voice input.`,
      inputMode: 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Load from storage or set greeting
    const storageKey = `sih26154_chat_${activeProject?.id || 'general'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch (e) {
        // Ignored
      }
    }

    setMessages([initialGreeting]);
  }, [activeProject?.id]);

  // Persist messages to local storage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      const storageKey = `sih26154_chat_${activeProject?.id || 'general'}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)));
      } catch (e) {
        // Ignored
      }
    }
  }, [messages, activeProject?.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, isRecording, isSpeaking]);

  // Stop audio and speech recognition on unmount
  useEffect(() => {
    return () => {
      speechToTextService.stopListening();
      textToSpeechService.stop();
    };
  }, []);

  const handleSendMessage = async (textToSend: string, mode: 'text' | 'voice') => {
    const text = textToSend.trim();
    if (!text) return;

    setError(null);
    textToSpeechService.stop();
    setIsSpeaking(false);
    setSpeakingMessageId(null);

    const userMsgId = crypto.randomUUID();
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      inputMode: mode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputText('');
    setInterimText('');
    setIsThinking(true);

    try {
      // Build project context payload
      const projectContext = activeProject
        ? {
            projectId: activeProject.id,
            title: activeProject.title,
            sourceText: activeProject.sourceText,
            preferences: activeProject.preferences,
            truthLayer: activeProject.truthLayer,
            outputs: activeProject.outputs,
            claims: activeProject.claims,
            consistency: activeProject.consistency,
            redTeam: activeProject.redTeam,
          }
        : undefined;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          projectContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response from AI agent.');
      }

      const aiText = data.text || 'I could not generate a response.';
      const aiMsgId = crypto.randomUUID();
      const aiMessage: ChatMessage = {
        id: aiMsgId,
        role: 'assistant',
        content: aiText,
        inputMode: mode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsThinking(false);

      // Save to Supabase content_chat_messages if user is logged in & Supabase is configured
      if (isSupabaseConfigured && user) {
        try {
          await supabase.from('content_chat_messages').insert([
            {
              project_id: activeProject?.id || null,
              user_id: user.id,
              role: 'user',
              content: text,
              input_mode: mode,
            },
            {
              project_id: activeProject?.id || null,
              user_id: user.id,
              role: 'assistant',
              content: aiText,
              input_mode: mode,
            },
          ]);
        } catch (e) {
          // Non-blocking in case table not yet created
          console.warn('[Chat] Supabase chat persistence fallback:', e);
        }
      }

      // CRITICAL REQUIREMENT:
      // If the user entered the message using VOICE,
      // the AI response MUST be played back in VOICE automatically.
      if (mode === 'voice' && autoVoiceResponse && textToSpeechService.isSupported()) {
        setIsPreparingAudio(true);
        setSpeakingMessageId(aiMsgId);
        try {
          await textToSpeechService.speak(aiText, {
            onStart: () => {
              setIsPreparingAudio(false);
              setIsSpeaking(true);
            },
            onEnd: () => {
              setIsSpeaking(false);
              setSpeakingMessageId(null);
            },
            onError: (err) => {
              console.warn('[TTS Error]:', err);
              setIsSpeaking(false);
              setIsPreparingAudio(false);
              setSpeakingMessageId(null);
            },
          });
        } catch (e) {
          setIsSpeaking(false);
          setIsPreparingAudio(false);
          setSpeakingMessageId(null);
        }
      }
    } catch (err: any) {
      console.error('[Chat Error]:', err);
      setIsThinking(false);
      setError(err?.message || 'Error communicating with AI assistant.');
    }
  };

  const handleStartVoice = () => {
    if (isRecording) {
      speechToTextService.stopListening();
      setIsRecording(false);
      return;
    }

    setError(null);
    textToSpeechService.stop();
    setIsSpeaking(false);
    setSpeakingMessageId(null);

    speechToTextService.startListening({
      language: 'en-US',
      interimResults: true,
      onStart: () => {
        setIsRecording(true);
        setInterimText('Listening to your voice...');
      },
      onResult: (transcript: string, isFinal: boolean) => {
        setInterimText(transcript);
        if (isFinal && transcript.trim()) {
          speechToTextService.stopListening();
          setIsRecording(false);
          handleSendMessage(transcript, 'voice');
        }
      },
      onError: (errMessage: string) => {
        setIsRecording(false);
        setInterimText('');
        setError(errMessage);
      },
      onEnd: () => {
        setIsRecording(false);
        if (interimText && interimText !== 'Listening to your voice...') {
          handleSendMessage(interimText, 'voice');
        }
        setInterimText('');
      },
    });
  };

  const handleStopRecording = () => {
    speechToTextService.stopListening();
    setIsRecording(false);
    if (interimText && interimText !== 'Listening to your voice...') {
      handleSendMessage(interimText, 'voice');
    }
    setInterimText('');
  };

  const handleStopSpeech = () => {
    textToSpeechService.stop();
    setIsSpeaking(false);
    setIsPreparingAudio(false);
    setSpeakingMessageId(null);
  };

  const handleSpeakMessage = (msgId: string, content: string) => {
    if (isSpeaking && speakingMessageId === msgId) {
      handleStopSpeech();
      return;
    }
    handleStopSpeech();
    setSpeakingMessageId(msgId);
    setIsSpeaking(true);
    textToSpeechService
      .speak(content, {
        onEnd: () => {
          setIsSpeaking(false);
          setSpeakingMessageId(null);
        },
        onError: () => {
          setIsSpeaking(false);
          setSpeakingMessageId(null);
        },
      })
      .catch(() => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      });
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    handleStopSpeech();
    speechToTextService.stopListening();
    const initialGreeting: ChatMessage = {
      id: 'greeting',
      role: 'assistant',
      content: activeProject
        ? `Chat history cleared. I'm ready with project context for **"${activeProject.title}"**.`
        : `Chat history cleared. How can I help you today?`,
      inputMode: 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initialGreeting]);
    const storageKey = `sih26154_chat_${activeProject?.id || 'general'}`;
    localStorage.removeItem(storageKey);
  };

  const suggestions = activeProject
    ? [
        'Summarize the uploaded document in five bullet points.',
        'Explain the main findings of this document.',
        'What are the three most important facts?',
        'Verify claims against the Shared Truth Layer.',
      ]
    : [
        'How does AI Buddy work?',
        'Explain the Shared Truth Layer architecture.',
        'What output artefacts can I generate?',
        'How does cross-output consistency checking work?',
      ];

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-5xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white grid place-items-center shadow-md shadow-blue-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-base">AI Buddy</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Online
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              {activeProject ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  <span className="font-semibold text-blue-700">Context:</span>
                  <span className="font-medium truncate max-w-xs">{activeProject.title}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                  <span>General Assistant Mode</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Auto-Play Toggle */}
          <button
            onClick={() => setAutoVoiceResponse(!autoVoiceResponse)}
            title={autoVoiceResponse ? 'Voice responses enabled' : 'Voice responses muted'}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              autoVoiceResponse
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600'
            }`}
          >
            {autoVoiceResponse ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{autoVoiceResponse ? 'Voice on' : 'Voice muted'}</span>
          </button>

          {/* Stop Audio Button if currently speaking */}
          {isSpeaking && (
            <button
              onClick={handleStopSpeech}
              className="px-3 py-2 rounded-xl bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 animate-pulse"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Audio</span>
            </button>
          )}

          {/* Clear history */}
          <button
            onClick={clearChat}
            title="Clear Chat History"
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 text-xs font-semibold"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-gradient-to-b from-slate-50/50 to-white">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isMsgSpeaking = isSpeaking && speakingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-2xl grid place-items-center shrink-0 shadow-sm ${
                  isUser
                    ? 'bg-slate-900 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>

              {/* Message Bubble Container */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-3xl p-4 sm:p-5 shadow-sm transition-all ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                }`}
              >
                {/* Mode & Meta header */}
                <div
                  className={`flex items-center justify-between gap-3 text-[10px] font-bold mb-2 pb-1.5 border-b ${
                    isUser ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {msg.inputMode === 'voice' ? (
                      <span className="flex items-center gap-1 text-blue-400">
                        <Mic className="w-3 h-3" /> Voice {isUser ? 'Input' : 'Output'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">Text</span>
                    )}
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {!isUser && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSpeakMessage(msg.id, msg.content)}
                        className={`p-1 rounded-lg hover:bg-slate-100 transition ${
                          isMsgSpeaking ? 'text-blue-600 font-black' : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title={isMsgSpeaking ? 'Stop speaking' : 'Read aloud'}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-normal break-words">
                  {msg.content}
                </div>

                {/* Speaking wave if active */}
                {isMsgSpeaking && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-blue-600">
                    <span className="flex items-end gap-0.5 h-4">
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                    </span>
                    <span>Speaking response aloud…</span>
                    <button
                      onClick={handleStopSpeech}
                      className="ml-auto underline hover:text-blue-800"
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white grid place-items-center shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl rounded-tl-sm p-4 text-slate-600 text-sm shadow-sm flex items-center gap-3">
              <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="font-semibold text-slate-700">Thinking…</span>
            </div>
          </div>
        )}

        {/* Preparing Voice Response Indicator */}
        {isPreparingAudio && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white grid place-items-center shrink-0">
              <Volume2 className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-3xl rounded-tl-sm p-4 text-blue-800 text-sm shadow-sm flex items-center gap-3">
              <span className="flex items-end gap-1 h-4 text-blue-600">
                <span className="wave-bar" />
                <span className="wave-bar" />
                <span className="wave-bar" />
              </span>
              <span className="font-bold">Preparing voice response…</span>
            </div>
          </div>
        )}

        {/* Recording Voice Indicator */}
        {isRecording && (
          <div className="flex items-start gap-3 flex-row-reverse">
            <div className="w-9 h-9 rounded-2xl bg-red-600 text-white grid place-items-center shrink-0 animate-pulse">
              <Mic className="w-4 h-4" />
            </div>
            <div className="bg-red-50 border border-red-200 rounded-3xl rounded-tr-sm p-4 text-red-900 text-sm shadow-sm max-w-[80%]">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-red-700 mb-1">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                Listening…
              </div>
              <p className="italic text-slate-700">{interimText || 'Speak into your microphone now…'}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleStopRecording}
                  className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-red-700"
                >
                  <Square className="w-3 h-3 fill-current" /> Finish & Send
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 overflow-x-auto flex gap-2 no-scrollbar">
        <span className="text-[11px] font-bold text-slate-400 shrink-0 self-center uppercase tracking-wider mr-1">
          Suggestions:
        </span>
        {suggestions.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(q, 'text')}
            disabled={isThinking || isRecording}
            className="text-xs bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-slate-600 hover:text-blue-700 px-3 py-1.5 rounded-xl whitespace-nowrap transition shrink-0 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Bottom Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText, 'text');
          }}
          className="flex items-center gap-2"
        >
          {/* Voice Record Button */}
          <button
            type="button"
            onClick={handleStartVoice}
            disabled={isThinking}
            title={isRecording ? 'Stop recording voice' : 'Speak using microphone'}
            className={`p-3.5 rounded-2xl flex items-center justify-center transition shrink-0 shadow-sm ${
              isRecording
                ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                : 'bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700'
            }`}
          >
            {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input Box */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isRecording ? 'Listening to voice input…' : 'Ask a question or request transformation…'}
              disabled={isThinking || isRecording}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition pr-10"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking || isRecording}
            className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold transition shrink-0 shadow-sm shadow-blue-500/20"
            title="Send text message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
          <span>
            <b>Voice input</b> automatically speaks responses. <b>Text input</b> gives text replies.
          </span>
          <span>OpenRouter • Gemini 3.8 Flash</span>
        </div>
      </div>
    </div>
  );
}
