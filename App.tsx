
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Activity, Brain, Database, GitGraph, Settings, Send, 
  AlertCircle, FileText, Loader2, Globe, Key, ChevronDown, 
  Shield, Moon, Sun, Plus, Trash2, MessageSquare,
  Type, PlusCircle, MinusCircle, Lightbulb, Upload, Save, RefreshCw, Layers, X, User, Bot, Sparkles
} from 'lucide-react';
import { INCOSE_DATA, PRELOADED_PROMPTS, ROUTERAI_MODELS, GIGACHAT_MODELS } from './constants';
import { OntologyGraph } from './components/OntologyGraph';
import { analyzeRequirementsWithGigaChat } from './services/gigaChatService';
import { analyzeRequirementsWithOpenRouter } from './services/openRouterService';
import { analyzeRequirementsWithGemini } from './services/geminiService';
import { syncTtlToNeo4j, fetchGraphFromNeo4j } from './services/neo4jService';
import { ApiProvider, ChatSession, ApiKeys, TtlFile, GraphData, ChatMessage } from './types';
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
  const [globalTheme, setGlobalTheme] = useState<'light' | 'dark'>('light'); // Default to light theme
  const [resultFontSize, setResultFontSize] = useState<number>(14);
  const [userInput, setUserInput] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

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
    routerai: getEnvKey('ROUTERAI_API_KEY') || '',
    neo4jUrl: 'neo4j+s://f6f3d425.databases.neo4j.io',
    neo4jUser: 'neo4j',
    neo4jPassword: 'MqXAdaY56KpeH2eda9nRr-jCDjAr3P5aFNCMwPATyXY'
  });
  const [routerAiBaseUrl, setRouterAiBaseUrl] = useState<string>('https://routerai.ru/api/v1');
  const [corsProxy, setCorsProxy] = useState<string>('https://corsproxy.io/?');

  useEffect(() => {
    if (chats.length === 0) {
      createNewChat();
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, isLoading]);

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
      name: 'Новый анализ',
      messages: [],
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
        setTtlFiles(prev => [...prev, { id: crypto.randomUUID(), name: file.name, content }]);
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  const removeTtlFile = (id: string) => {
    setTtlFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSyncNeo4j = async () => {
    if (ttlFiles.length === 0) { setError("Нет файлов для синхронизации."); return; }
    setIsSyncing(true); setError(null); setSuccessMsg(null);
    try {
      const result = await syncTtlToNeo4j(ttlFiles, apiKeys);
      setSuccessMsg(result.message);
    } catch (err: any) { setError(err.message); } finally { setIsSyncing(false); }
  };

  const handleRefreshGraph = async () => {
    setIsRefreshingGraph(true); setError(null);
    try {
      const newData = await fetchGraphFromNeo4j(apiKeys);
      setCurrentGraphData(newData);
      setSuccessMsg("Граф успешно обновлен из Neo4j.");
    } catch (err: any) { setError(err.message); } finally { setIsRefreshingGraph(false); }
  };

  const handleSendMessage = async () => {
    if (!activeChat || !userInput.trim() || isLoading) return;
    
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userInput,
      timestamp: Date.now()
    };

    const currentHistory = [...activeChat.messages, newUserMessage];
    const newName = activeChat.messages.length === 0 ? userInput.slice(0, 25) + (userInput.length > 25 ? '...' : '') : activeChat.name;
    
    updateActiveChat({ 
      messages: currentHistory,
      name: newName
    });
    setUserInput("");
    setIsLoading(true);
    setError(null);

    try {
      let result = "";
      const promptTemplate = PRELOADED_PROMPTS.find(p => p.id === activeChat.promptId)?.template || PRELOADED_PROMPTS[0].template;

      if (activeChat.model.includes('gemini') && activeChat.provider === 'routerai') {
        const modelName = activeChat.model.split('/').pop() || activeChat.model;
        result = await analyzeRequirementsWithGemini(modelName, currentHistory, promptTemplate);
      } else if (activeChat.provider === 'gigachat') {
        result = await analyzeRequirementsWithGigaChat(apiKeys.gigachat, activeChat.model, currentHistory, promptTemplate, corsProxy);
      } else {
        result = await analyzeRequirementsWithOpenRouter(apiKeys.routerai, activeChat.model, currentHistory, promptTemplate, routerAiBaseUrl, corsProxy);
      }
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result,
        timestamp: Date.now()
      };

      updateActiveChat({ 
        messages: [...currentHistory, assistantMessage] 
      });
    } catch (err: any) {
      setError(err.message || "Произошла ошибка при получении ответа.");
    } finally {
      setIsLoading(false);
    }
  };

  const insertExample = () => {
    setUserInput("Таймер должен иметь возможность устанавливать заданное время.");
  };

  const isDark = globalTheme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      <aside className={`w-full md:w-72 flex flex-col shrink-0 border-r ${isDark ? 'bg-slate-900 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'} z-20`}>
        <div className={`p-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 font-bold text-2xl">
            <Brain className="text-blue-500 w-8 h-8" />
            <span className={`tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>SysAnalyst <span className="text-blue-500">AI</span></span>
          </div>
        </div>

        <nav className="p-4 space-y-1.5">
          <button onClick={() => setActiveTab('input')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'input' ? 'bg-blue-600 text-white shadow-lg' : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-600'}`}>
            <MessageSquare size={20} /> <span className="font-medium">Диалоги</span>
          </button>
          <button onClick={() => setActiveTab('graph')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'graph' ? 'bg-blue-600 text-white shadow-lg' : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-600'}`}>
            <GitGraph size={20} /> <span className="font-medium">Онтология</span>
          </button>
          <button onClick={() => setActiveTab('ttl')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ttl' ? 'bg-blue-600 text-white shadow-lg' : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-600'}`}>
            <Layers size={20} /> <span className="font-medium">База знаний</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-600'}`}>
            <Settings size={20} /> <span className="font-medium">Настройки</span>
          </button>
        </nav>

        <div className={`flex-1 overflow-y-auto px-4 py-4 border-t mt-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">История</span>
            <button onClick={createNewChat} className="p-1.5 hover:bg-blue-500/10 rounded-full text-blue-500 transition-all hover:rotate-90">
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
                <button onClick={(e) => deleteChat(chat.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
           <button onClick={() => setGlobalTheme(isDark ? 'light' : 'dark')} className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl border transition-all ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-yellow-400' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm'}`}>
             {isDark ? <Sun size={18} /> : <Moon size={18} />}
             <span className="text-sm font-semibold">{isDark ? 'Светлая тема' : 'Тёмная тема'}</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className={`border-b px-8 py-5 flex items-center justify-between shadow-sm z-10 transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col">
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {activeTab === 'input' && (activeChat?.name || 'Анализ требований')}
              {activeTab === 'graph' && 'Граф знаний INCOSE'}
              {activeTab === 'ttl' && 'Управление TTL (Neo4j)'}
              {activeTab === 'settings' && 'Конфигурация'}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            {activeTab === 'input' && activeChat && (
              <div className="flex items-center gap-3">
                 <select 
                   value={activeChat.provider}
                   onChange={(e) => updateActiveChat({ provider: e.target.value as ApiProvider })}
                   className={`text-xs px-2 py-1 rounded bg-black/10 dark:bg-white/20 border border-black/10 dark:border-white/10 outline-none font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                 >
                   <option value="routerai" className={isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>RouterAI</option>
                   <option value="gigachat" className={isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>GigaChat</option>
                 </select>
                 <select 
                   value={activeChat.model}
                   onChange={(e) => updateActiveChat({ model: e.target.value })}
                   className={`text-xs px-2 py-1 rounded bg-black/10 dark:bg-white/20 border border-black/10 dark:border-white/10 outline-none max-w-[150px] font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                 >
                   {activeChat.provider === 'gigachat' ? 
                     GIGACHAT_MODELS.map(m => <option key={m.id} value={m.id} className={isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>{m.name}</option>) : 
                     ROUTERAI_MODELS.map(m => <option key={m.id} value={m.id} className={isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>{m.name}</option>)}
                 </select>
              </div>
            )}
            <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 backdrop-blur-md px-3 py-1 rounded-full border border-black/10 dark:border-white/10">
              <button onClick={() => setResultFontSize(prev => Math.max(10, prev - 1))} className="p-1 hover:text-blue-500"><MinusCircle size={16} /></button>
              <span className="font-mono text-[10px] font-bold w-4 text-center">{resultFontSize}</span>
              <button onClick={() => setResultFontSize(prev => Math.min(32, prev + 1))} className="p-1 hover:text-blue-500"><PlusCircle size={16} /></button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            {(error || successMsg) && (
              <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in duration-300 ${error ? 'bg-red-500/10 border border-red-500/20 text-red-500' : 'bg-green-500/10 border border-green-500/20 text-green-500'}`}>
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{error || successMsg}</span>
                <button onClick={() => { setError(null); setSuccessMsg(null); }} className="ml-auto opacity-50 hover:opacity-100"><X size={16} /></button>
              </div>
            )}

            {activeTab === 'input' && activeChat && (
              <div className="max-w-4xl mx-auto w-full space-y-6 pb-20">
                {activeChat.messages.length === 0 ? (
                  <div className="py-20 text-center space-y-6 opacity-30">
                    <Brain size={80} className="mx-auto text-blue-500" />
                    <div>
                      <h2 className="text-2xl font-bold">Готов к анализу</h2>
                      <p className="max-w-md mx-auto mt-2">Введите требования или вопрос по стандартам INCOSE для начала диалога.</p>
                    </div>
                  </div>
                ) : (
                  activeChat.messages.map((msg, i) => (
                    <div key={i} className={`flex gap-4 animate-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                        {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                      </div>
                      <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm border transition-all ${msg.role === 'user' ? (isDark ? 'bg-blue-600/20 border-blue-500/30' : 'bg-blue-50 border-blue-100') : (isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200')}`}>
                        <div style={{ fontSize: `${resultFontSize}px` }} className={`prose prose-sm max-w-none ${isDark ? 'prose-invert' : 'prose-slate'}`}>
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-4 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                      <Bot size={16} className="text-white" />
                    </div>
                    <div className={`max-w-[85%] rounded-2xl p-5 border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin text-blue-500" size={18} />
                        <span className="text-sm font-medium text-slate-500">Система думает...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {activeTab === 'graph' && (
               <div className="max-w-6xl mx-auto animate-in zoom-in-95 duration-500 pb-10">
                 <OntologyGraph data={currentGraphData} onRefresh={handleRefreshGraph} isRefreshing={isRefreshingGraph} />
               </div>
            )}

            {activeTab === 'ttl' && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500 pb-10">
                <div className={`rounded-3xl shadow-2xl border p-8 transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-2xl font-bold flex items-center gap-3"><Layers className="text-blue-500" /> База знаний</h2>
                    <div className="flex gap-4">
                      <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white px-5 py-2 rounded-xl transition-all flex items-center gap-2 font-bold text-sm">
                        <Upload size={18} /> Загрузить <input type="file" multiple accept=".ttl" onChange={handleFileUpload} className="hidden" />
                      </label>
                      <button onClick={handleSyncNeo4j} disabled={isSyncing || ttlFiles.length === 0} className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg">
                        {isSyncing ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />} Синхронизация
                      </button>
                    </div>
                  </div>
                  {ttlFiles.length === 0 ? <div className="text-center py-20 opacity-30"><Layers size={80} className="mx-auto mb-4" /><p className="font-bold text-lg">Нет файлов</p></div> : (
                    <div className="space-y-4">
                      {ttlFiles.map(file => (
                        <div key={file.id} className={`border rounded-2xl transition-all ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="p-4 flex items-center justify-between">
                            <span className="font-bold text-sm">{file.name}</span>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingTtlId(editingTtlId === file.id ? null : file.id)} className="p-2 hover:bg-blue-500/10 text-blue-500"><Save size={18} /></button>
                              <button onClick={() => removeTtlFile(file.id)} className="p-2 hover:bg-red-500/10 text-red-500"><Trash2 size={18} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500 pb-10">
                <div className={`rounded-3xl shadow-2xl border transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className="p-8 space-y-8">
                    <div className="space-y-4">
                       <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">API Ключи</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">RouterAI API Key</label>
                            <input type="password" value={apiKeys.routerai} onChange={(e) => setApiKeys({...apiKeys, routerai: e.target.value})} className={`w-full p-3 border rounded-xl text-xs bg-black/5 dark:bg-white/5 border-slate-300 dark:border-slate-700 outline-none ${isDark ? 'text-white' : 'text-slate-900'}`} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">GigaChat Auth Key</label>
                            <input type="password" value={apiKeys.gigachat} onChange={(e) => setApiKeys({...apiKeys, gigachat: e.target.value})} className={`w-full p-3 border rounded-xl text-xs bg-black/5 dark:bg-white/5 border-slate-300 dark:border-slate-700 outline-none ${isDark ? 'text-white' : 'text-slate-900'}`} />
                          </div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Сетевые настройки</h3>
                       <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">CORS Proxy URL</label>
                            <input type="text" value={corsProxy} onChange={(e) => setCorsProxy(e.target.value)} className={`w-full p-3 border rounded-xl text-xs bg-black/5 dark:bg-white/5 border-slate-300 dark:border-slate-700 outline-none ${isDark ? 'text-white' : 'text-slate-900'}`} />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeTab === 'input' && activeChat && (
            <div className={`p-4 md:p-6 border-t ${isDark ? 'bg-slate-900/80 border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]'} backdrop-blur-xl z-20`}>
              <div className="max-w-4xl mx-auto flex flex-col gap-2">
                 <div className="flex items-center gap-2 mb-1 px-1">
                   <button 
                     onClick={insertExample}
                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-200/50"
                   >
                     <Sparkles size={12} /> Пример требования
                   </button>
                 </div>
                 <div className="flex gap-4 relative">
                    <div className="flex-1 relative">
                       <textarea 
                         value={userInput}
                         onChange={(e) => setUserInput(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             handleSendMessage();
                           }
                         }}
                         rows={1}
                         placeholder="Введите требования для анализа или вопрос..."
                         className={`w-full p-4 pr-12 rounded-2xl border resize-none focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-medium ${isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                         style={{ height: 'auto', minHeight: '56px' }}
                       />
                       <div className="absolute right-4 bottom-4 flex items-center gap-2">
                         <button onClick={handleSendMessage} disabled={isLoading || !userInput.trim()} className={`p-2 rounded-xl transition-all ${userInput.trim() ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'}`}>
                           {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                         </button>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="max-w-4xl mx-auto mt-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <select 
                     value={activeChat.promptId}
                     onChange={(e) => updateActiveChat({ promptId: e.target.value })}
                     className={`text-[10px] font-bold uppercase tracking-widest bg-transparent border-none outline-none cursor-pointer hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                   >
                     {PRELOADED_PROMPTS.map(p => <option key={p.id} value={p.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>{p.name}</option>)}
                   </select>
                </div>
                <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
                  <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SHIFT+ENTER для переноса</span>
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
