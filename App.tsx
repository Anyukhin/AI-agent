
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Brain, Database, GitGraph, Settings, Send, 
  AlertCircle, FileText, Loader2, Globe, Key, ChevronDown, 
  Shield, Moon, Sun, Plus, Trash2, MessageSquare,
  Type, PlusCircle, MinusCircle, Lightbulb, Upload, Save, RefreshCw, Layers, X
} from 'lucide-react';
import { INCOSE_DATA, PRELOADED_PROMPTS, ROUTERAI_MODELS, GIGACHAT_MODELS } from './constants';
import { OntologyGraph } from './components/OntologyGraph';
import { analyzeRequirementsWithGigaChat } from './services/gigaChatService';
import { analyzeRequirementsWithOpenRouter } from './services/openRouterService';
import { analyzeRequirementsWithGemini } from './services/geminiService';
import { syncTtlToNeo4j, fetchGraphFromNeo4j } from './services/neo4jService';
import { ApiProvider, ChatSession, ApiKeys, TtlFile, GraphData } from './types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const getEnvKey = (key: string) => {
  try { return process.env[key] || ''; } catch { return ''; }
};

const App = () => {
  const [activeTab, setActiveTab] = useState<'input' | 'graph' | 'settings' | 'ttl'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshingGraph, setIsRefreshingGraph] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [globalTheme, setGlobalTheme] = useState<'light' | 'dark'>('light');
  const [resultFontSize, setResultFontSize] = useState<number>(14);

  // Multi-chat State
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Graph Data State
  const [currentGraphData, setCurrentGraphData] = useState<GraphData>(INCOSE_DATA);

  // TTL Management State
  const [ttlFiles, setTtlFiles] = useState<TtlFile[]>([]);
  const [editingTtlId, setEditingTtlId] = useState<string | null>(null);

  // Global Keys & Connection Settings
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    gigachat: getEnvKey('GIGACHAT_API_KEY') || '',
    routerai: getEnvKey('ROUTERAI_API_KEY') || 'sk-XXs5Zmfo4aryKV263wedR9IgaTKb4hme',
    // Hardcoded Neo4j credentials as per user request
    neo4jUrl: 'neo4j+s://f6f3d425.databases.neo4j.io',
    neo4jUser: 'neo4j',
    neo4jPassword: 'MqXAdaY56KpeH2eda9nRr-jCDjAr3P5aFNCMwPATyXY'
  });
  const [routerAiBaseUrl, setRouterAiBaseUrl] = useState<string>('https://routerai.ru/api/v1');
  const [corsProxy, setCorsProxy] = useState<string>('https://corsproxy.io/?');

  // Initialization
  useEffect(() => {
    if (chats.length === 0) {
      const initialChat: ChatSession = {
        id: crypto.randomUUID(),
        name: 'Новый анализ',
        input: '',
        result: null,
        promptId: PRELOADED_PROMPTS[0].id,
        provider: 'routerai',
        model: ROUTERAI_MODELS[0].id,
        timestamp: Date.now()
      };
      setChats([initialChat]);
      setActiveChatId(initialChat.id);
    }
  }, []);

  const activeChat = useMemo(() => 
    chats.find(c => c.id === activeChatId) || null
  , [chats, activeChatId]);

  const updateActiveChat = (updates: Partial<ChatSession>) => {
    if (!activeChatId) return;
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, ...updates } : c));
  };

  const createNewChat = () => {
    const newChat: ChatSession = {
      id: crypto.randomUUID(),
      name: `Анализ ${chats.length + 1}`,
      input: '',
      result: null,
      promptId: PRELOADED_PROMPTS[0].id,
      provider: 'routerai',
      model: ROUTERAI_MODELS[0].id,
      timestamp: Date.now()
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setActiveTab('input');
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newChats = chats.filter(c => c.id !== id);
    if (newChats.length === 0) {
      createNewChat();
    } else {
      setChats(newChats);
      if (activeChatId === id) setActiveChatId(newChats[0].id);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setTtlFiles(prev => [
          ...prev, 
          { id: crypto.randomUUID(), name: file.name, content }
        ]);
      };
      reader.readAsText(file);
    });
    // Clear input
    e.target.value = '';
  };

  const handleSyncNeo4j = async () => {
    if (ttlFiles.length === 0) {
      setError("Нет файлов для синхронизации.");
      return;
    }
    setIsSyncing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await syncTtlToNeo4j(ttlFiles, apiKeys);
      setSuccessMsg(result.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefreshGraph = async () => {
    setIsRefreshingGraph(true);
    setError(null);
    try {
      const newData = await fetchGraphFromNeo4j(apiKeys);
      setCurrentGraphData(newData);
      setSuccessMsg("Граф успешно обновлен из Neo4j.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRefreshingGraph(false);
    }
  };

  const updateTtlContent = (id: string, content: string) => {
    setTtlFiles(prev => prev.map(f => f.id === id ? { ...f, content } : f));
  };

  const removeTtlFile = (id: string) => {
    setTtlFiles(prev => prev.filter(f => f.id !== id));
    if (editingTtlId === id) setEditingTtlId(null);
  };

  const handleAnalyze = async () => {
    if (!activeChat || !activeChat.input.trim()) return;
    
    setIsLoading(true);
    setError(null);
    updateActiveChat({ result: null });

    try {
      let result = "";
      const promptTemplate = PRELOADED_PROMPTS.find(p => p.id === activeChat.promptId)?.template || PRELOADED_PROMPTS[0].template;

      if (activeChat.model.includes('gemini') && activeChat.provider === 'routerai') {
        const modelName = activeChat.model.split('/').pop() || activeChat.model;
        result = await analyzeRequirementsWithGemini(modelName, activeChat.input, promptTemplate);
      } else if (activeChat.provider === 'gigachat') {
        if (!corsProxy) throw new Error("GigaChat требует CORS Proxy. Настройте в настройках.");
        result = await analyzeRequirementsWithGigaChat(apiKeys.gigachat, activeChat.model, activeChat.input, promptTemplate, corsProxy);
      } else {
        result = await analyzeRequirementsWithOpenRouter(apiKeys.routerai, activeChat.model, activeChat.input, promptTemplate, routerAiBaseUrl, corsProxy);
      }
      
      updateActiveChat({ result, name: activeChat.input.slice(0, 20) + (activeChat.input.length > 20 ? '...' : '') });
    } catch (err: any) {
      setError(err.message || "Произошла ошибка.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertExample = () => {
    updateActiveChat({ input: "Таймер должен иметь возможность устанавливать заданное время." });
  };

  const isDark = globalTheme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      <aside className={`w-full md:w-72 flex flex-col shrink-0 border-r ${isDark ? 'bg-slate-900 border-slate-800 text-white shadow-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-xl'} z-20`}>
        <div className={`p-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 font-bold text-2xl">
            <Brain className="text-blue-500 w-8 h-8" />
            <span className={`tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>SysAnalyst <span className="text-blue-500">AI</span></span>
          </div>
        </div>

        <nav className="p-4 space-y-1.5">
          <button
            onClick={() => setActiveTab('input')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'input' ? 'bg-blue-600 text-white shadow-lg' : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-600'}`}
          >
            <FileText size={20} />
            <span className="font-medium">Анализ</span>
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'graph' ? 'bg-blue-600 text-white shadow-lg' : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-600'}`}
          >
            <GitGraph size={20} />
            <span className="font-medium">Онтология</span>
          </button>
          <button
            onClick={() => setActiveTab('ttl')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ttl' ? 'bg-blue-600 text-white shadow-lg' : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-600'}`}
          >
            <Layers size={20} />
            <span className="font-medium">База знаний (TTL)</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-600'}`}
          >
            <Settings size={20} />
            <span className="font-medium">Настройки</span>
          </button>
        </nav>

        <div className={`flex-1 overflow-y-auto px-4 py-4 border-t mt-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">История анализов</span>
            <button 
              onClick={createNewChat} 
              className="p-1.5 hover:bg-blue-500/10 rounded-full text-blue-500 transition-all hover:rotate-90"
              title="Новый анализ"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="space-y-1.5">
            {chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => { setActiveChatId(chat.id); setActiveTab('input'); }}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border ${activeChatId === chat.id ? (isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-blue-600 shadow-sm') : (isDark ? 'border-transparent text-slate-400 hover:bg-slate-800/50' : 'border-transparent text-slate-500 hover:bg-slate-50')}`}
              >
                <MessageSquare size={16} className={`shrink-0 ${activeChatId === chat.id ? 'text-blue-500' : 'opacity-40'}`} />
                <span className="text-sm truncate flex-1 font-medium">{chat.name}</span>
                <button 
                  onClick={(e) => deleteChat(chat.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
           <button 
             onClick={() => setGlobalTheme(isDark ? 'light' : 'dark')}
             className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl border transition-all ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-yellow-400' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm'}`}
           >
             {isDark ? <Sun size={18} /> : <Moon size={18} />}
             <span className="text-sm font-semibold">{isDark ? 'Светлая тема' : 'Тёмная тема'}</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className={`border-b px-8 py-5 flex items-center justify-between shadow-sm z-10 transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {activeTab === 'input' && (activeChat?.name || 'Анализ требований')}
            {activeTab === 'graph' && 'Граф знаний INCOSE'}
            {activeTab === 'ttl' && 'Управление TTL (Neo4j)'}
            {activeTab === 'settings' && 'Конфигурация'}
          </h1>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Model</span>
              <span className="text-xs font-mono text-blue-400">{activeChat?.model.split('/').pop()}</span>
            </div>
            <a href="https://incose.org" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:text-blue-400 font-bold transition-colors uppercase tracking-widest">INCOSE Guide</a>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
          {(error || successMsg) && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in duration-300 ${error ? 'bg-red-500/10 border border-red-500/20 text-red-500' : 'bg-green-500/10 border border-green-500/20 text-green-500'}`}>
              <AlertCircle size={20} />
              <span className="text-sm font-medium">{error || successMsg}</span>
              <button onClick={() => { setError(null); setSuccessMsg(null); }} className="ml-auto opacity-50 hover:opacity-100"><X size={16} /></button>
            </div>
          )}

          {activeTab === 'input' && activeChat && (
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-full pb-6">
              <div className="flex flex-col gap-6 h-full">
                <div className={`rounded-2xl shadow-2xl border p-6 flex flex-col h-full min-h-[550px] transition-all duration-300 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  
                  <div className={`flex flex-col gap-5 mb-8 p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-950 border-slate-800 shadow-inner' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                           <label className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em] px-1">Провайдер</label>
                           <div className="relative">
                              <select 
                                value={activeChat.provider}
                                onChange={(e) => {
                                  const provider = e.target.value as ApiProvider;
                                  const model = provider === 'gigachat' ? GIGACHAT_MODELS[0].id : ROUTERAI_MODELS[0].id;
                                  updateActiveChat({ provider, model });
                                }}
                                className={`w-full appearance-none border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-blue-500/50 transition-all cursor-pointer ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                              >
                                <option value="routerai">RouterAI</option>
                                <option value="gigachat">GigaChat</option>
                              </select>
                              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em] px-1">Модель</label>
                           <div className="relative">
                              <select 
                                value={activeChat.model}
                                onChange={(e) => updateActiveChat({ model: e.target.value })}
                                className={`w-full appearance-none border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-blue-500/50 transition-all cursor-pointer truncate ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                              >
                                {activeChat.provider === 'gigachat' ? GIGACHAT_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>) : ROUTERAI_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                           </div>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em] px-1">Режим анализа (Промпт)</label>
                        <div className="relative">
                          <select 
                            value={activeChat.promptId}
                            onChange={(e) => updateActiveChat({ promptId: e.target.value })}
                            className={`w-full appearance-none border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-blue-500/50 transition-all cursor-pointer ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                          >
                            {PRELOADED_PROMPTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                        </div>
                     </div>
                  </div>

                  <div className="flex justify-between items-center mb-3 px-1">
                    <label className="text-sm font-bold flex items-center gap-2">
                      <FileText size={16} className="text-blue-500" /> Текст требований
                    </label>
                    <button onClick={handleInsertExample} className={`text-[10px] font-bold flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}>
                      <Lightbulb size={12} className="text-yellow-500" /> Пример
                    </button>
                  </div>
                  
                  <textarea
                    className={`flex-1 w-full p-6 border rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:outline-none resize-none font-mono text-sm shadow-inner transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-700' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'}`}
                    placeholder="Введите требования для аудита..."
                    value={activeChat.input}
                    onChange={(e) => updateActiveChat({ input: e.target.value })}
                  />
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleAnalyze}
                      disabled={isLoading || !activeChat.input.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-10 py-4 rounded-2xl flex items-center gap-3 font-bold transition-all shadow-xl active:scale-[0.98]"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={22}/> : <Send size={22} />}
                      ЗАПУСТИТЬ АНАЛИЗ
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6 h-full relative">
                 <div className={`rounded-2xl shadow-2xl border p-8 h-full overflow-auto transition-all duration-300 relative ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-900'} ${!activeChat.result ? 'flex items-center justify-center' : ''}`}>
                    <div className="absolute top-5 right-5 flex items-center gap-2 bg-black/5 dark:bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 z-20">
                      <button onClick={() => setResultFontSize(prev => Math.max(10, prev - 1))} className="p-1 hover:text-blue-500"><MinusCircle size={18} /></button>
                      <div className="font-mono text-xs font-bold w-6 text-center">{resultFontSize}</div>
                      <button onClick={() => setResultFontSize(prev => Math.min(32, prev + 1))} className="p-1 hover:text-blue-500"><PlusCircle size={18} /></button>
                      <Type size={16} className="opacity-50 ml-2" />
                    </div>

                    {!activeChat.result && !isLoading && (
                      <div className="text-center text-slate-500 max-w-sm space-y-4">
                        <Brain size={48} className="opacity-10 mx-auto animate-pulse text-blue-500" />
                        <p className="text-sm font-bold opacity-40 italic">Ожидание анализа требований...</p>
                      </div>
                    )}

                    {isLoading && (
                       <div className="text-center">
                         <Loader2 className="animate-spin mx-auto mb-4 text-blue-500" size={48} />
                         <p className="text-lg font-bold text-blue-500 animate-pulse">Анализирую требования...</p>
                       </div>
                    )}

                    {activeChat.result && (
                      <div style={{ fontSize: `${resultFontSize}px` }} className={`prose max-w-none transition-all ${isDark ? 'prose-invert' : 'prose-slate'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeChat.result}</ReactMarkdown>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'graph' && (
             <div className="max-w-6xl mx-auto animate-in zoom-in-95 duration-500">
               <div className={`rounded-2xl shadow-2xl border p-8 mb-8 flex justify-between items-center transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                 <div>
                   <h2 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                     <Database className="text-blue-500 w-8 h-8" /> Визуализатор онтологии
                   </h2>
                   <p className="text-slate-500 text-sm mt-2">Интерактивная карта взаимосвязей правил INCOSE.</p>
                 </div>
               </div>
               <OntologyGraph 
                 data={currentGraphData} 
                 onRefresh={handleRefreshGraph}
                 isRefreshing={isRefreshingGraph}
               />
             </div>
          )}

          {activeTab === 'ttl' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
              <div className={`rounded-3xl shadow-2xl border p-8 transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3"><Layers className="text-blue-500" /> База знаний (TTL)</h2>
                    <p className="text-slate-500 text-sm mt-1">Загружайте и редактируйте RDF онтологии для Neo4j.</p>
                  </div>
                  <div className="flex gap-4">
                    <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm">
                      <Upload size={18} />
                      Загрузить TTL
                      <input type="file" multiple accept=".ttl" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button 
                      onClick={handleSyncNeo4j}
                      disabled={isSyncing || ttlFiles.length === 0}
                      className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                      {isSyncing ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                      Синхронизировать с Neo4j
                    </button>
                  </div>
                </div>

                {ttlFiles.length === 0 ? (
                  <div className="text-center py-20 opacity-30">
                    <Layers size={80} className="mx-auto mb-4" />
                    <p className="font-bold text-lg">Нет загруженных файлов</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ttlFiles.map(file => (
                      <div key={file.id} className={`border rounded-2xl overflow-hidden transition-all ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText size={20} className="text-blue-400" />
                            <span className="font-bold text-sm">{file.name}</span>
                            <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-mono">{file.content.length} bytes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setEditingTtlId(editingTtlId === file.id ? null : file.id)}
                              className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors"
                            >
                              {editingTtlId === file.id ? <Save size={18} /> : <FileText size={18} />}
                            </button>
                            <button 
                              onClick={() => removeTtlFile(file.id)}
                              className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        {editingTtlId === file.id && (
                          <div className="p-4 pt-0">
                            <textarea 
                              value={file.content}
                              onChange={(e) => updateTtlContent(file.id, e.target.value)}
                              className="w-full h-64 p-4 rounded-xl border font-mono text-xs focus:ring-2 ring-blue-500/20 outline-none transition-all bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
              <div className={`rounded-3xl shadow-2xl border overflow-hidden transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={`p-8 border-b ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                   <h2 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                     <Settings className="text-blue-500" /> Настройки Соединения
                   </h2>
                   <p className="text-slate-500 text-base mt-2">Конфигурация API и Neo4j.</p>
                </div>
                
                <div className="p-8 space-y-8">
                  {/* Neo4j Settings - Read Only as per request */}
                  <div className={`p-6 border rounded-3xl transition-all ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-4 tracking-[0.2em] px-1">Neo4j Connection (Fixed)</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Host/URL</label>
                        <input 
                          type="text" 
                          readOnly
                          value={apiKeys.neo4jUrl} 
                          className={`w-full p-3 border rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white opacity-80 cursor-not-allowed`} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Username</label>
                        <input 
                          type="text" 
                          readOnly
                          value={apiKeys.neo4jUser} 
                          className={`w-full p-3 border rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white opacity-80 cursor-not-allowed`} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Password</label>
                        <input 
                          type="password" 
                          readOnly
                          value={apiKeys.neo4jPassword} 
                          className={`w-full p-3 border rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white opacity-80 cursor-not-allowed`} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border transition-all ${isDark ? 'bg-blue-900/10 border-blue-500/20 shadow-inner' : 'bg-blue-50 border-blue-200 shadow-sm'}`}>
                    <label className="block text-sm font-bold mb-3 flex items-center gap-2">
                      <Shield size={20} className="text-blue-500" /> URL CORS Proxy
                    </label>
                    <input 
                      type="text" 
                      value={corsProxy} 
                      onChange={(e) => setCorsProxy(e.target.value)} 
                      className={`w-full p-4 border rounded-xl bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white`} 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className={`p-6 border rounded-3xl transition-all ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-4 tracking-[0.2em] px-1">Ключ RouterAI</label>
                      <input 
                        type="password" 
                        value={apiKeys.routerai} 
                        onChange={(e) => setApiKeys({...apiKeys, routerai: e.target.value})} 
                        className={`w-full p-4 border rounded-2xl text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white`} 
                      />
                    </div>
                    <div className={`p-6 border rounded-3xl transition-all ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-4 tracking-[0.2em] px-1">GigaChat Auth</label>
                      <input 
                        type="password" 
                        value={apiKeys.gigachat} 
                        onChange={(e) => setApiKeys({...apiKeys, gigachat: e.target.value})} 
                        className={`w-full p-4 border rounded-2xl text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white`} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
