import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronDown, ClipboardCheck, Download,
  Eye, EyeOff, FileAudio, FileImage, FileText, FileVideo, History, Image as ImageIcon, Lock, LogIn, LogOut,
  Mail, Menu, Mic, MicOff, Pause, Play, RefreshCw, Save, Search, Send, Settings, ShieldCheck, Sparkles, Upload,
  User, UserPlus, Volume2, VolumeX, X, XCircle, Zap, MessageSquare, Plus, Edit2, Bot
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { ChatAssistant, ProjectContextData } from './components/ChatAssistant';
import { speechToTextService } from './services/speechToTextService';

const OUTPUTS = [
  ['summary', 'Executive Summary', FileText],
  ['advisory', 'Advisory', ShieldCheck],
  ['presentation', 'Presentation', FileText],
  ['infographic', 'Infographic', ImageIcon],
  ['linkedin', 'LinkedIn Post', Send],
  ['xthread', 'X / Twitter Thread', Send],
  ['video', 'Video Package', FileVideo],
] as const;

const DEFAULT_PREFS = {
  audience: 'Executive leadership',
  tone: 'Formal',
  language: 'English',
  detail: 'Detailed',
  objective: 'Inform and brief',
  style: 'Professional',
};

type Result = {
  projectId: string;
  truthLayer: any;
  outputs: Record<string, any>;
  claims: any[];
  consistency: { score: number; issues?: any[] };
  redTeam: { risk: string; issues?: any[]; recommendations?: string[] };
};

function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'login') await signIn(email, password);
      else {
        const r = await signUp(name, email, password);
        setNotice(
          r.needsEmailConfirmation
            ? 'Account created. Confirm your email, then log in.'
            : 'Account created. You are signed in.'
        );
        if (r.needsEmailConfirmation) setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Ambient background glow orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[450px] h-[450px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-6xl grid lg:grid-cols-12 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Left Column: Visual Showcase with Animated Video */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-950 border-b lg:border-b-0 lg:border-r border-white/10 relative">
          <div>
            {/* Header / Brand */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-black tracking-tight text-lg text-white">SIH26154 Content Transformation</div>
                  <div className="text-[11px] text-blue-300 font-medium">SIH26154 • Gen AI Content Transformation</div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-cyan-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                <span>Live AI Engine</span>
              </div>
            </div>

            {/* Video Showcase Card */}
            <div className="relative my-4 rounded-2xl p-1 bg-gradient-to-b from-blue-500/30 via-indigo-500/15 to-transparent shadow-[0_0_40px_rgba(59,130,246,0.18)]">
              <div className="relative overflow-hidden rounded-[14px] bg-slate-950 aspect-video group">
                <video
                  ref={videoRef}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  poster="/login-animation-poster.jpg"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                >
                  <source src="/login-animation.mp4" type="video/mp4" />
                </video>

                {/* Subtle vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20 pointer-events-none" />

                {/* Floating Badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-cyan-300 flex items-center gap-1.5 shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>Interactive 3D UI</span>
                </div>

                {/* Video Controls (Play/Pause & Mute/Unmute) */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    title={isMuted ? 'Unmute' : 'Mute'}
                    className="w-8 h-8 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-white/90 hover:text-white hover:bg-slate-800 transition flex items-center justify-center shadow-lg"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    title={isPlaying ? 'Pause' : 'Play'}
                    className="w-8 h-8 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-white/90 hover:text-white hover:bg-slate-800 transition flex items-center justify-center shadow-lg"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Typography */}
            <h1 className="text-2xl sm:text-3xl font-black leading-tight mt-4 text-white">
              One source.<br />Many verified outputs.
            </h1>
            <p className="mt-2 text-sm text-blue-100/80 leading-relaxed max-w-lg">
              Transform reports, prompts, documents, images, audio and video into audience-specific
              communication artefacts with a shared truth layer, verification checks, and dedicated AI voice assistant.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="mt-6 grid grid-cols-2 gap-2.5 text-xs">
            <Feature label="Source grounding" />
            <Feature label="Truth layer" />
            <Feature label="Cross-output checks" />
            <Feature label="AI Voice Assistant" />
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-5 p-6 sm:p-10 bg-white text-slate-900 flex flex-col justify-between">
          <div className="max-w-md mx-auto w-full">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6 text-sm font-bold">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setNotice(''); }}
                className={`py-2 rounded-lg transition-all ${mode === 'login' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(''); setNotice(''); }}
                className={`py-2 rounded-lg transition-all ${mode === 'signup' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Create Account
              </button>
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900">
                {mode === 'login' ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {mode === 'login'
                  ? 'Operator access to the content transformation workspace.'
                  : 'Get started with verified multi-modal content generation.'}
              </p>
            </div>

            {!isSupabaseConfigured && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Supabase is not configured yet.</span> Add your Supabase URL and anon key to <b className="font-mono">.env</b> to enable full persistent auth.
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {notice && (
              <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>{notice}</div>
              </div>
            )}

            <form onSubmit={submit} className="mt-5 space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="input pl-10"
                      placeholder="Your name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="input pl-10 pr-10"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                disabled={busy || !isSupabaseConfigured}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition disabled:opacity-50 mt-2"
              >
                {busy ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign in to Studio</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Operator Account</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError('');
                  setNotice('');
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                {mode === 'login'
                  ? "Don't have an account yet? Create one"
                  : 'Already registered? Return to sign in'}
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            SIH26154 AI Multi-Modal Content Engine • Powered by Gemini &amp; OpenRouter
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 flex items-center gap-2">
      <Check className="w-4 text-cyan-300" />
      {label}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function AppShell() {
  const { user, loading, signOut } = useAuth();
  const [tab, setTab] = useState<'studio' | 'chat' | 'history' | 'settings'>('studio');
  const [mobile, setMobile] = useState(false);
  const [activeProject, setActiveProject] = useState<ProjectContextData | null>(null);
  const [studioKey, setStudioKey] = useState<string>(crypto.randomUUID());

  // Handler for New Project
  const handleNewProject = () => {
    setActiveProject(null);
    setStudioKey(crypto.randomUUID());
    setTab('studio');
    setMobile(false);
  };

  const handleOpenProjectInStudio = (projectRow: any) => {
    setActiveProject({
      id: projectRow.id,
      title: projectRow.title,
      sourceText: projectRow.source_text,
      preferences: projectRow.preferences,
      truthLayer: projectRow.truth_layer,
      outputs: projectRow.outputs ? (Array.isArray(projectRow.outputs) ? projectRow.outputs.reduce((acc: any, curr: any) => {
        try { acc[curr.output_type] = JSON.parse(curr.content); } catch { acc[curr.output_type] = curr.content; }
        return acc;
      }, {}) : projectRow.outputs) : undefined,
      claims: projectRow.claims,
      consistency: { score: projectRow.consistency_score, issues: [] },
      redTeam: { risk: projectRow.red_team_risk, issues: [] },
    });
    setStudioKey(projectRow.id);
    setTab('studio');
  };

  const handleOpenProjectInChat = (projectRow: any) => {
    setActiveProject({
      id: projectRow.id,
      title: projectRow.title,
      sourceText: projectRow.source_text,
      preferences: projectRow.preferences,
      truthLayer: projectRow.truth_layer,
      outputs: projectRow.outputs ? (Array.isArray(projectRow.outputs) ? projectRow.outputs.reduce((acc: any, curr: any) => {
        try { acc[curr.output_type] = JSON.parse(curr.content); } catch { acc[curr.output_type] = curr.content; }
        return acc;
      }, {}) : projectRow.outputs) : undefined,
      claims: projectRow.claims,
      consistency: { score: projectRow.consistency_score, issues: [] },
      redTeam: { risk: projectRow.red_team_risk, issues: [] },
    });
    setTab('chat');
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobile(!mobile)} className="lg:hidden p-2 rounded-xl hover:bg-slate-100">
            <Menu className="w-5" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white grid place-items-center shadow-sm">
            <Sparkles className="w-5" />
          </div>
          <div>
            <div className="font-black text-slate-900 tracking-tight">SIH26154 Content Transformation</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              SIH26154 • GEN AI PLATFORM
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* New Project Action Button */}
          <button
            onClick={handleNewProject}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition shadow-sm"
            title="Create an additional project (preserves all existing data)"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Project</span>
          </button>

          <div className="hidden sm:block text-right border-l border-slate-200 pl-3">
            <div className="text-xs font-bold text-slate-800">{user.name}</div>
            <div className="text-[10px] text-slate-400">Operator</div>
          </div>
          <button onClick={signOut} title="Sign out" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <LogOut className="w-4" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Nav */}
        <aside
          className={`${mobile ? 'fixed inset-y-16 left-0 z-20 w-72' : 'hidden'
            } lg:block lg:w-64 bg-slate-950 text-slate-300 min-h-[calc(100vh-4rem)] p-3 shrink-0 flex flex-col justify-between`}
        >
          <div>
            <div className="px-3 pt-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Workspace
            </div>

            <button
              onClick={handleNewProject}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black mb-3 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 transition"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>+ New Project</span>
            </button>

            <Nav
              active={tab === 'studio'}
              onClick={() => {
                setTab('studio');
                setMobile(false);
              }}
              icon={<Zap />}
              label="Content Studio"
            />
            <Nav
              active={tab === 'chat'}
              onClick={() => {
                setTab('chat');
                setMobile(false);
              }}
              icon={<Bot />}
              label="AI Assistant"
              badge="Voice + Text"
            />
            <Nav
              active={tab === 'history'}
              onClick={() => {
                setTab('history');
                setMobile(false);
              }}
              icon={<History />}
              label="Projects & History"
            />
            <Nav
              active={tab === 'settings'}
              onClick={() => {
                setTab('settings');
                setMobile(false);
              }}
              icon={<Settings />}
              label="Settings & Setup"
            />

            {/* Context Pill in Sidebar */}
            {activeProject && (
              <div className="mt-5 mx-1 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">
                  Active Context
                </div>
                <div className="font-semibold text-slate-200 truncate">{activeProject.title}</div>
                <button
                  onClick={() => setTab('chat')}
                  className="mt-2 text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" /> Ask Assistant
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-[11px] leading-5 text-slate-400">
            <div className="font-bold text-white mb-1">SIH26154 Pipeline</div>
            <div>Source → Truth Layer → Transform → Verify → Consistency → Red Team → Human Approval → Export</div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {tab === 'studio' ? (
            <ContentStudio
              key={studioKey}
              initialProject={activeProject}
              onProjectUpdated={(data) => setActiveProject(data)}
              onOpenChat={() => setTab('chat')}
            />
          ) : tab === 'chat' ? (
            <ChatAssistant activeProject={activeProject} />
          ) : tab === 'history' ? (
            <HistoryPage
              onOpenStudio={handleOpenProjectInStudio}
              onOpenChat={handleOpenProjectInChat}
            />
          ) : (
            <SettingsPage />
          )}
        </main>
      </div>

      {/* Floating AI Chat button when in other tabs */}
      {tab !== 'chat' && (
        <button
          onClick={() => setTab('chat')}
          title="Open SIH26154 AI Voice & Text Assistant"
          className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30 hover:scale-105 transition flex items-center gap-2 font-bold text-sm"
        >
          <Bot className="w-5 h-5" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>
      )}
    </div>
  );
}

function Nav({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-semibold mb-1 transition ${active ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 text-slate-400 hover:text-white'
        }`}
    >
      <div className="flex items-center gap-3">
        {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
        <span>{label}</span>
      </div>
      {badge && (
        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-blue-500/30 text-blue-200">
          {badge}
        </span>
      )}
    </button>
  );
}

function ContentStudio({
  initialProject,
  onProjectUpdated,
  onOpenChat,
}: {
  initialProject?: ProjectContextData | null;
  onProjectUpdated?: (data: ProjectContextData) => void;
  onOpenChat?: () => void;
}) {
  const { user } = useAuth();
  const [projectId] = useState<string>(() => initialProject?.id || crypto.randomUUID());
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState(initialProject?.sourceText || '');
  const [outputs, setOutputs] = useState<string[]>(['summary', 'advisory', 'presentation']);
  const [prefs, setPrefs] = useState(initialProject?.preferences || DEFAULT_PREFS);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(() => {
    if (initialProject && initialProject.truthLayer) {
      return {
        projectId: initialProject.id,
        truthLayer: initialProject.truthLayer,
        outputs: initialProject.outputs || {},
        claims: initialProject.claims || [],
        consistency: initialProject.consistency || { score: 0, issues: [] },
        redTeam: initialProject.redTeam || { risk: 'low', issues: [] },
      };
    }
    return null;
  });
  const [active, setActive] = useState('summary');
  const [approved, setApproved] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [editingOutput, setEditingOutput] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : ''), [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const toggle = (id: string) => setOutputs((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const generate = async (regenerate = false) => {
    setError('');
    if (!file && !text.trim()) return setError('Upload a source or paste source text.');
    if (!outputs.length) return setError('Select at least one output type.');

    setBusy(true);
    setApproved(false);
    setStatus('Analysing source and building truth layer…');

    try {
      const fd = new FormData();
      if (file) fd.append('file', file);
      fd.append('sourceText', text);
      fd.append('preferences', JSON.stringify(prefs));
      fd.append('selectedOutputs', JSON.stringify(regenerate ? [active] : outputs));
      if (regenerate && result) fd.append('truthLayer', JSON.stringify(result.truthLayer));

      const r = await fetch('/api/content/transform', { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Transformation failed');

      let finalResult: Result;
      if (regenerate && result) {
        finalResult = {
          ...data,
          projectId: result.projectId,
          outputs: { ...result.outputs, ...data.outputs },
        };
      } else {
        finalResult = { ...data, projectId };
      }

      setResult(finalResult);
      setActive(regenerate ? active : outputs[0] || 'summary');
      setStatus('AI review complete — human approval required');

      // Update active project context for AI Assistant
      onProjectUpdated?.({
        id: finalResult.projectId,
        title: file?.name || (text ? text.slice(0, 30) + '...' : 'Text Source Transformation'),
        sourceText: text,
        preferences: prefs,
        truthLayer: finalResult.truthLayer,
        outputs: finalResult.outputs,
        claims: finalResult.claims,
        consistency: finalResult.consistency,
        redTeam: finalResult.redTeam,
      });

      if (!regenerate) {
        await persistProject(finalResult, file, text, prefs, outputs, user!.id);
      } else {
        await persistRegeneration(finalResult, active, user!.id);
      }
    } catch (e: any) {
      setError(e.message || 'Transformation failed');
      setStatus('Error');
    } finally {
      setBusy(false);
    }
  };

  const persistProject = async (
    data: Result,
    sourceFile: File | null,
    sourceText: string,
    preferences: any,
    selected: string[],
    userId: string
  ) => {
    if (!isSupabaseConfigured) return;
    try {
      const { error: e1 } = await supabase.from('content_projects').insert({
        id: data.projectId,
        user_id: userId,
        title: sourceFile?.name || 'Text source',
        source_text: sourceText || null,
        preferences,
        selected_outputs: selected,
        truth_layer: data.truthLayer,
        consistency_score: data.consistency?.score || 0,
        red_team_risk: data.redTeam?.risk || 'low',
        status: 'human_review',
      });
      if (e1) console.warn('[DB] Insert project:', e1);

      if (sourceFile) {
        const safe = sourceFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${userId}/${data.projectId}/${Date.now()}-${safe}`;
        const up = await supabase.storage
          .from('SIH26154 Content Transformation-source-files')
          .upload(path, sourceFile, { upsert: false, contentType: sourceFile.type || 'application/octet-stream' });
        if (!up.error) {
          await supabase.from('content_source_files').insert({
            project_id: data.projectId,
            user_id: userId,
            storage_path: path,
            file_name: sourceFile.name,
            mime_type: sourceFile.type || 'application/octet-stream',
            file_size: sourceFile.size,
          });
        }
      }

      if (Object.keys(data.outputs || {}).length) {
        const rows = Object.entries(data.outputs).map(([output_type, content]) => ({
          project_id: data.projectId,
          user_id: userId,
          output_type,
          content: typeof content === 'string' ? content : JSON.stringify(content),
          status: 'generated',
        }));
        await supabase.from('content_outputs').insert(rows);
      }

      if (data.claims?.length) {
        await supabase.from('content_claims').insert(
          data.claims.map((c) => ({
            project_id: data.projectId,
            user_id: userId,
            claim: c.claim,
            status: c.status,
            evidence: c.evidence || null,
          }))
        );
      }

      await supabase.from('content_reviews').insert({
        project_id: data.projectId,
        user_id: userId,
        status: 'pending',
        note: null,
      });
    } catch (e) {
      console.warn('[DB] Persist error:', e);
    }
  };

  const persistRegeneration = async (data: Result, output: string, userId: string) => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('content_outputs').insert({
        project_id: data.projectId,
        user_id: userId,
        output_type: output,
        content:
          typeof data.outputs[output] === 'string'
            ? data.outputs[output]
            : JSON.stringify(data.outputs[output]),
        status: 'regenerated',
      });
    } catch (e) {
      console.warn('[DB] Persist regeneration:', e);
    }
  };

  const review = async (decision: 'approved' | 'rejected') => {
    if (!result || !isSupabaseConfigured) return setApproved(decision === 'approved');
    try {
      const { error: e } = await supabase.from('content_reviews').insert({
        project_id: result.projectId,
        user_id: user!.id,
        status: decision,
        note: reviewNote || null,
      });
      if (e) {
        setError(e.message);
        return;
      }
      await supabase
        .from('content_projects')
        .update({ status: decision === 'approved' ? 'approved' : 'rejected' })
        .eq('id', result.projectId);
      setApproved(decision === 'approved');
      setStatus(decision === 'approved' ? 'Approved and saved' : 'Rejected — revise and regenerate');
    } catch (e: any) {
      setError(e?.message || 'Review failed.');
    }
  };

  const exportOutput = () => {
    if (!result) return;
    const value = result.outputs[active];
    const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SIH26154-${active}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Human Edit feature before approval
  const startEditing = () => {
    if (!result) return;
    const val = result.outputs[active];
    setEditedContent(typeof val === 'string' ? val : JSON.stringify(val, null, 2));
    setEditingOutput(true);
  };

  const saveEdit = async () => {
    if (!result) return;
    let parsed: any = editedContent;
    try {
      parsed = JSON.parse(editedContent);
    } catch {
      parsed = editedContent;
    }

    const updatedOutputs = { ...result.outputs, [active]: parsed };
    const updatedResult = { ...result, outputs: updatedOutputs };
    setResult(updatedResult);
    setEditingOutput(false);

    onProjectUpdated?.({
      id: updatedResult.projectId,
      title: file?.name || 'Edited Project',
      sourceText: text,
      preferences: prefs,
      truthLayer: updatedResult.truthLayer,
      outputs: updatedOutputs,
      claims: updatedResult.claims,
      consistency: updatedResult.consistency,
      redTeam: updatedResult.redTeam,
    });

    if (isSupabaseConfigured && user) {
      try {
        await supabase.from('content_outputs').insert({
          project_id: result.projectId,
          user_id: user.id,
          output_type: active,
          content: typeof parsed === 'string' ? parsed : JSON.stringify(parsed),
          status: 'edited_by_human',
        });
      } catch (e) {
        console.warn('[DB] Save human edit:', e);
      }
    }
  };

  // Voice dictation using modular service
  const handleDictate = () => {
    if (isDictating) {
      speechToTextService.stopListening();
      setIsDictating(false);
      return;
    }

    if (!speechToTextService.isSupported()) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    speechToTextService.startListening({
      language: 'en-US',
      interimResults: false,
      onStart: () => setIsDictating(true),
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          setText((v) => (v ? v + '\n' : '') + transcript);
          setIsDictating(false);
        }
      },
      onError: (err) => {
        setIsDictating(false);
        setError(err);
      },
      onEnd: () => setIsDictating(false),
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            SIH26154 • GEN AI PLATFORM
          </div>
          <h1 className="text-3xl font-black mt-1">Content Transformation Studio</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            Submit one common source, configure deliverables, and ground all outputs in a single Shared Truth Layer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />
            Supabase {isSupabaseConfigured ? 'connected' : 'not configured'}
          </div>
          <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold">
            AI {status}
          </div>
          {onOpenChat && (
            <button
              onClick={onOpenChat}
              className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 transition"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Ask AI Assistant</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="font-bold underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid xl:grid-cols-[1.05fr_.95fr] gap-6">
        {/* Left Column: Source & Controls */}
        <section className="space-y-6">
          <Card title="1. Source material" icon={<Upload />}>
            <div className="grid sm:grid-cols-[1fr_auto] gap-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl p-6 bg-slate-50 cursor-pointer min-h-44 flex flex-col justify-center items-center text-center transition"
              >
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.mp4,.mov,.webm,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <>
                    <FileBadge file={file} />
                    <div className="mt-3 font-bold text-sm break-all">{file.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {Math.round(file.size / 1024)} KB • click to replace
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 text-blue-600" />
                    <div className="font-bold mt-3">Upload document, image, audio or video</div>
                    <div className="text-xs text-slate-500 mt-1">
                      PDF, DOCX, TXT, MD, Images, Audio, Video supported
                    </div>
                  </>
                )}
              </div>
              {preview && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white min-h-44 w-44">
                  <img src={preview} className="w-full h-full object-contain" alt="Source preview" />
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Or paste source text / contextual prompt
                </label>
                <button
                  type="button"
                  onClick={handleDictate}
                  className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${isDictating ? 'bg-red-100 text-red-700 animate-pulse' : 'text-blue-600 hover:bg-blue-50'
                    }`}
                >
                  <Mic className="w-3.5" />
                  {isDictating ? 'Listening… (click to stop)' : 'Dictate'}
                </button>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                className="input resize-y"
                placeholder="Paste a report, article, advisory, research text, meeting minutes, or contextual prompt…"
              />
            </div>
          </Card>

          <Card title="2. Output artefacts" icon={<Sparkles />}>
            <div className="grid sm:grid-cols-2 gap-3">
              {OUTPUTS.map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  className={`p-4 rounded-2xl border text-left transition ${outputs.includes(id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-5 ${outputs.includes(id) ? 'text-blue-600' : 'text-slate-400'}`} />
                    {outputs.includes(id) && <CheckCircle2 className="w-4 text-blue-600" />}
                  </div>
                  <div className="font-bold text-sm mt-3">{label}</div>
                  <div className="text-xs text-slate-500 mt-1">Generated from the verified Shared Truth Layer.</div>
                </button>
              ))}
            </div>
          </Card>

          <Card title="3. Communication controls" icon={<Settings />}>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(prefs).map(([key, value]) => (
                <Field key={key} label={key.replace(/[A-Z]/g, (m) => ' ' + m)}>
                  <select
                    className="input"
                    value={value}
                    onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.value }))}
                  >
                    {OPTIONS[key].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
          </Card>

          <button
            onClick={() => generate(false)}
            disabled={busy}
            className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white py-4 font-black flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20 transition cursor-pointer"
          >
            {busy ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-5" />
            )}
            {busy ? 'Transforming with AI…' : 'Generate selected artefacts'}
          </button>
        </section>

        {/* Right Column: Truth Layer, Generated Outputs, Quality & Human Review */}
        <section className="space-y-6">
          <Card title="4. Shared Truth Layer" icon={<ShieldCheck />}>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Facts', result?.truthLayer?.facts?.length || 0],
                ['Entities', result?.truthLayer?.entities?.length || 0],
                ['Events', result?.truthLayer?.events?.length || 0],
                ['Uncertainties', result?.truthLayer?.uncertainties?.length || 0],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-2xl font-black text-slate-800">{v as number}</div>
                  <div className="text-xs text-slate-500">{k}</div>
                </div>
              ))}
            </div>
            {result ? (
              <div className="mt-4 space-y-2 max-h-60 overflow-auto pr-1">
                {(result.truthLayer?.facts || []).map((f: any, idx: number) => (
                  <div key={f.id || idx} className="rounded-xl border border-slate-200 p-3 bg-white">
                    <div className="text-sm font-semibold text-slate-800">{f.text}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Evidence: {f.evidence || 'Source'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="Generate artefacts to build the shared truth layer from your source." />
            )}
          </Card>

          {result && (
            <>
              {/* Generated Outputs Card */}
              <Card title="5. Generated outputs" icon={<FileText />}>
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.keys(result.outputs).map((id) => (
                    <button
                      key={id}
                      onClick={() => {
                        setActive(id);
                        setEditingOutput(false);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition ${active === id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      {labelFor(id)}
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 min-h-64 max-h-[520px] overflow-auto">
                  {editingOutput ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Editing output: {labelFor(active)}</span>
                        <span>Direct edit mode</span>
                      </div>
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={14}
                        className="input font-mono text-xs leading-relaxed"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingOutput(false)} className="btn-secondary">
                          Cancel
                        </button>
                        <button onClick={saveEdit} className="btn-success">
                          <Check className="w-3.5 h-3.5" /> Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <OutputView value={result.outputs[active]} />
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={exportOutput} className="btn-secondary">
                    <Download className="w-4" /> Export
                  </button>
                  <button onClick={startEditing} className="btn-secondary">
                    <Edit2 className="w-4" /> Edit Content
                  </button>
                  <button onClick={() => generate(true)} disabled={busy} className="btn-secondary">
                    <RefreshCw className="w-4" /> Regenerate Output
                  </button>
                </div>
              </Card>

              {/* Quality & Consistency */}
              <Card title="6. Quality control & verification" icon={<ClipboardCheck />}>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Metric title="Consistency" value={`${result.consistency?.score ?? 0}/100`} />
                  <Metric title="Red-team risk" value={(result.redTeam?.risk || 'unknown').toUpperCase()} />
                  <Metric title="Claims checked" value={String(result.claims?.length || 0)} />
                </div>
                <div className="mt-4 space-y-2 max-h-48 overflow-auto pr-1">
                  {(result.claims || []).slice(0, 20).map((c: any, i: number) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-3 flex gap-3 bg-white">
                      <Status status={c.status} />
                      <div>
                        <div className="text-sm font-semibold">{c.claim}</div>
                        <div className="text-[11px] text-slate-500">{c.evidence}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {(result.redTeam?.issues || []).length > 0 && (
                  <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
                    <div className="font-bold text-amber-900 text-sm">Red-team findings</div>
                    <ul className="mt-2 space-y-1 text-xs text-amber-800 list-disc pl-4">
                      {result.redTeam.issues.map((x: any, i: number) => (
                        <li key={i}>{typeof x === 'string' ? x : x.issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>

              {/* Human Review & Approval */}
              <Card title="7. Human review & sign-off" icon={<ClipboardCheck />}>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Reviewer note (optional, saved to Supabase)…"
                />
                <div className="flex gap-2 mt-3">
                  <button onClick={() => review('approved')} className="btn-success">
                    <CheckCircle2 className="w-4" /> Approve & Sign Off
                  </button>
                  <button onClick={() => review('rejected')} className="btn-danger">
                    <XCircle className="w-4" /> Reject & Request Revision
                  </button>
                </div>
                {approved && (
                  <div className="mt-3 text-sm text-emerald-700 font-semibold flex items-center gap-1.5">
                    <Check className="w-4" /> Approved. The decision is recorded.
                  </div>
                )}
              </Card>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

const OPTIONS: Record<string, string[]> = {
  audience: ['Executive leadership', 'Technical team', 'General public', 'Policy makers', 'Social media audience', 'Internal operations'],
  tone: ['Formal', 'Neutral', 'Persuasive', 'Urgent', 'Educational', 'Conversational'],
  language: ['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Bengali'],
  detail: ['Brief', 'Moderate', 'Detailed', 'Very detailed'],
  objective: ['Inform and brief', 'Advise action', 'Raise awareness', 'Educate', 'Persuade', 'Document'],
  style: ['Professional', 'Technical', 'Plain language', 'Journalistic', 'Executive', 'Storytelling'],
};

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="flex items-center gap-2 font-black mb-4 text-slate-800">
        <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
          {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
        </span>
        {title}
      </div>
      {children}
    </section>
  );
}

function FileBadge({ file }: { file: File }) {
  const I = file.type.startsWith('image/')
    ? FileImage
    : file.type.startsWith('audio/')
      ? FileAudio
      : file.type.startsWith('video/')
        ? FileVideo
        : FileText;
  return (
    <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 grid place-items-center shadow-sm">
      <I />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-slate-400 text-center py-12">{text}</div>;
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
      <div className="text-xl font-black text-slate-800">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{title}</div>
    </div>
  );
}

function Status({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-lg ${status === 'verified'
          ? 'bg-emerald-100 text-emerald-700'
          : status === 'contradicted'
            ? 'bg-red-100 text-red-700'
            : 'bg-amber-100 text-amber-700'
        }`}
    >
      {status}
    </span>
  );
}

function OutputView({ value }: { value: any }) {
  if (!value) return <Empty text="No content generated for this output." />;
  if (typeof value === 'string') return <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{value}</div>;
  if (Array.isArray(value))
    return (
      <div className="space-y-3">
        {value.map((x, i) => (
          <pre key={i} className="whitespace-pre-wrap text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-800">
            {JSON.stringify(x, null, 2)}
          </pre>
        ))}
      </div>
    );
  return (
    <div className="space-y-4">
      {Object.entries(value).map(([k, v]) => (
        <div key={k}>
          <div className="text-xs font-black uppercase tracking-wider text-blue-600">{k}</div>
          {typeof v === 'string' ? (
            <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{v}</div>
          ) : (
            <pre className="mt-1 whitespace-pre-wrap text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-800">
              {JSON.stringify(v, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

function labelFor(id: string) {
  return OUTPUTS.find((x) => x[0] === id)?.[1] || id;
}

function HistoryPage({
  onOpenStudio,
  onOpenChat,
}: {
  onOpenStudio: (project: any) => void;
  onOpenChat: (project: any) => void;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const load = async () => {
    if (!isSupabaseConfigured || !user) {
      setBusy(false);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from('content_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setRows(data || []);
    setBusy(false);
  };

  useEffect(() => {
    load();
  }, []);

  const open = async (row: any) => {
    if (!isSupabaseConfigured) {
      setSelected(row);
      return;
    }
    const [{ data: outs }, { data: files }, { data: claims }, { data: reviews }] = await Promise.all([
      supabase.from('content_outputs').select('*').eq('project_id', row.id).order('created_at'),
      supabase.from('content_source_files').select('*').eq('project_id', row.id),
      supabase.from('content_claims').select('*').eq('project_id', row.id),
      supabase.from('content_reviews').select('*').eq('project_id', row.id).order('created_at', { ascending: false }),
    ]);
    let fileRows = files || [];
    for (const f of fileRows) {
      const { data } = await supabase.storage
        .from('SIH26154 Content Transformation-source-files')
        .createSignedUrl(f.storage_path, 3600);
      f.signed_url = data?.signedUrl || '';
    }
    setSelected({ ...row, outputs: outs || [], files: fileRows, claims: claims || [], reviews: reviews || [] });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">Persistence</div>
          <h1 className="text-3xl font-black mt-1">Projects & History</h1>
          <p className="text-sm text-slate-500 mt-2">
            Every project, uploaded source, generated output, claim check, and human review is preserved.
          </p>
        </div>
      </div>

      {!isSupabaseConfigured ? (
        <Card title="Supabase required" icon={<Settings />}>
          <Empty text="Configure Supabase in .env to view persistent history and previews." />
        </Card>
      ) : busy ? (
        <div className="grid place-items-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <Card title="No projects yet" icon={<History />}>
          <Empty text="Generate your first transformation in Content Studio." />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</div>
                <div className="font-black mt-2 text-base line-clamp-2 text-slate-900">{r.title}</div>
                <div className="flex gap-2 mt-4">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100">{r.status}</span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700">
                    Consistency {r.consistency_score}/100
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => open(r)}
                  className="text-xs font-bold text-slate-700 hover:text-blue-600 underline"
                >
                  View Details
                </button>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onOpenStudio(r)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700"
                    title="Open in Studio"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => onOpenChat(r)}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[11px] font-bold text-blue-700 flex items-center gap-1"
                    title="Ask AI Assistant about this project"
                  >
                    <Bot className="w-3 h-3" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Details Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 p-4 sm:p-8 flex items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs text-slate-400">Project Workspace</div>
                <h2 className="text-2xl font-black mt-1 text-slate-900">{selected.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const row = selected;
                    setSelected(null);
                    onOpenChat(row);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5"
                >
                  <Bot className="w-3.5 h-3.5" /> Chat with Assistant
                </button>
                <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-slate-100">
                  <X />
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mt-5">
              <Metric title="Status" value={selected.status} />
              <Metric title="Consistency" value={`${selected.consistency_score}/100`} />
              <Metric title="Red-team" value={selected.red_team_risk} />
            </div>

            {selected.files?.length > 0 && (
              <div className="mt-6">
                <h3 className="font-black text-slate-900">Stored source files</h3>
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  {selected.files.map((f: any) => (
                    <div key={f.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                      {f.mime_type.startsWith('image/') && f.signed_url ? (
                        <img src={f.signed_url} className="w-full h-44 object-contain bg-slate-100" alt={f.file_name} />
                      ) : (
                        <div className="h-24 grid place-items-center bg-slate-100 text-slate-400">
                          <FileText className="w-8 h-8" />
                        </div>
                      )}
                      <div className="p-3 bg-white border-t border-slate-100">
                        <div className="font-bold text-sm break-all">{f.file_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {Math.round(f.file_size / 1024)} KB • stored in Supabase Storage
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="font-black text-slate-900">Generated outputs</h3>
              <div className="space-y-3 mt-3">
                {(selected.outputs || []).map((o: any) => (
                  <details key={o.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                    <summary className="font-bold cursor-pointer text-slate-800">
                      {labelFor(o.output_type)} • <span className="text-xs font-semibold text-slate-500">{o.status}</span>
                    </summary>
                    <div className="mt-3 bg-white p-4 rounded-xl border border-slate-200">
                      <OutputView
                        value={(() => {
                          try {
                            return JSON.parse(o.content);
                          } catch {
                            return o.content;
                          }
                        })()}
                      />
                    </div>
                  </details>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-black text-slate-900">Claims & evidence</h3>
              <div className="space-y-2 mt-3">
                {(selected.claims || []).map((c: any) => (
                  <div key={c.id} className="border border-slate-200 rounded-xl p-3 flex gap-2 bg-white">
                    <Status status={c.status} />
                    <div className="text-sm">
                      <div className="font-semibold text-slate-800">{c.claim}</div>
                      <div className="text-xs text-slate-500 mt-1">{c.evidence}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">Configuration</div>
        <h1 className="text-3xl font-black mt-1">Settings & Setup</h1>
        <p className="text-sm text-slate-500 mt-2">
          Use the included .env and Supabase SQL schema to configure persistence and agentic AI.
        </p>
      </div>

      <Card title="Environment Configuration" icon={<Settings />}>
        <pre className="bg-slate-950 text-slate-100 rounded-2xl p-5 overflow-auto text-xs leading-6">
          {`VITE_SUPABASE_URL="https://YOUR-PROJECT-ID.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
AGENTIC_AI_PROVIDER="openrouter"
AGENTIC_AI_API_KEY="YOUR_OPENROUTER_KEY"
OPENROUTER_API_KEY="YOUR_OPENROUTER_KEY"
AGENTIC_AI_MODEL="google/gemini-3.8-flash"`}
        </pre>
        <div className="mt-4 text-sm text-slate-600">
          OpenRouter and service-role secrets are kept strictly server-side. The browser client only accesses public tokens.
        </div>
      </Card>

      <Card title="AI Capabilities & Voice" icon={<Bot />}>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <b className="text-slate-900">Speech-to-Text (STT)</b>
            <p className="text-slate-500 mt-1 text-xs">
              Modular <code>speechToTextService</code> supports real-time voice input directly from your microphone.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <b className="text-slate-900">Text-to-Speech (TTS)</b>
            <p className="text-slate-500 mt-1 text-xs">
              Modular <code>textToSpeechService</code> automatically speaks AI responses when voice input is used.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Supabase Persistence" icon={<Save />}>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <b className="text-slate-900">Database</b>
            <p className="text-slate-500 mt-1 text-xs">
              Projects, truth layers, outputs, claims, reviews, and chat messages.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <b className="text-slate-900">Storage</b>
            <p className="text-slate-500 mt-1 text-xs">
              Uploaded PDF, images, audio, video files in private <code>SIH26154 Content Transformation-source-files</code> bucket.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
