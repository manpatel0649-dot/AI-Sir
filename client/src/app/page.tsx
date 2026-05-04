"use client";

import { useState, useEffect, useRef } from "react";
import { BookOpen, Mail, Lock, User, ArrowRight, Upload, FileText, Trash2, Eye, LogOut, Loader2, Sparkles, MessageSquare, Send, X, GraduationCap, CheckCircle2, AlertCircle } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import toast, { Toaster } from 'react-hot-toast';

export default function Home() {
  // --- STATE ---
  const [isLogin, setIsLogin] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState("");
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<{title: string, text: string} | null>(null);
  
  // Chat State
  const [chatFile, setChatFile] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Quiz State
  const [quizData, setQuizData] = useState<any[] | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  // Detect if we are running on Vercel or localhost
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 
    (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:5000');

  useEffect(() => {
    console.log("Client-side API_URL:", API_URL || "(relative)");
    if (process.env.NEXT_PUBLIC_API_URL) {
      console.log("NEXT_PUBLIC_API_URL is explicitly set to:", process.env.NEXT_PUBLIC_API_URL);
    }
  }, [API_URL]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isThinking]);

  // --- AUTH LOGIC ---
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
      fetchFiles(savedToken);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error(`Server returned status ${res.status}`);
      }

      if (res.ok) {
        if (isLogin) {
          localStorage.setItem("token", data.token);
          setToken(data.token);
          setIsLoggedIn(true);
          fetchFiles(data.token);
        } else {
          toast.success("Registered! Now please login.");
          setIsLogin(true);
        }
      } else {
        toast.error(data?.message || "Authentication failed");
      }
    } catch (err: any) {
      toast.error(err.message === "Server returned status 404" 
        ? "API Route not found. Is your server running the latest code?" 
        : "Failed to connect to server");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setFiles([]);
  };

  // --- FILE LOGIC ---
  const fetchFiles = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/files`, {
        headers: { "Authorization": `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) setFiles(data);
    } catch (err) {
      console.error("Error fetching files");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_URL}/api/files/upload`, {

        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        fetchFiles(token);
        toast.success("File uploaded successfully");
      } else {
        const data = await res.json();
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`${API_URL}/api/files/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        fetchFiles(token);
        toast.success("File deleted");
      }
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  // --- AI LOGIC ---
  const summarizeFile = async (id: string) => {
    setSummarizing(id);
    try {
      const res = await fetch(`${API_URL}/api/ai/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ fileId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedContent({ title: "AI Summary", text: data.summary });
        fetchFiles(token);
      } else toast.error(data.message);
    } catch (err) {
      toast.error("Summarization failed");
    } finally {
      setSummarizing(null);
    }
  };

  const generateQuiz = async (id: string) => {
    setGeneratingQuiz(id);
    try {
      const res = await fetch(`${API_URL}/api/ai/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ fileId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuizData(data.quiz);
        setCurrentQuestionIdx(0);
        setUserAnswers([]);
        setQuizScore(null);
      } else toast.error(data.message);
    } catch (err) {
      toast.error("Quiz generation failed");
    } finally {
      setGeneratingQuiz(null);
    }
  };

  const handleAnswer = (optionIdx: number) => {
    if (userAnswers[currentQuestionIdx] !== undefined) return;
    
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIdx] = optionIdx;
    setUserAnswers(newAnswers);

    // If last question, calculate score
    if (currentQuestionIdx === quizData!.length - 1) {
      const score = newAnswers.reduce((acc, ans, idx) => {
        return acc + (ans === quizData![idx].correctAnswer ? 1 : 0);
      }, 0);
      setTimeout(() => setQuizScore(score), 1000);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !chatFile) return;
    const userMsg = userInput;
    setUserInput("");
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsThinking(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ fileId: chatFile._id, message: userMsg }),
      });
      const data = await res.json();
      if (res.ok) setChatMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
      else toast.error(data.message);
    } catch (err) {
      toast.error("Chat failed");
    } finally {
      setIsThinking(false);
    }
  };

  const viewRawText = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/files/${id}/text`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setSelectedContent({ title: "Extracted Text", text: data.text });
    } catch (err) {
      toast.error("Failed to fetch text");
    }
  };

  // --- UI RENDER ---
  if (isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-200 p-8 relative overflow-hidden">
        <Toaster position="top-center" />
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="text-white w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Study<span className="text-blue-400">AI</span></h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400 hidden sm:flex bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-800">
                <User className="w-4 h-4" /> 
                <span>Student</span>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-800" title="Sign Out">
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm sticky top-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-400" /> Upload Document
                </h2>
                <label className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
                  <input type="file" className="hidden" accept=".pdf" onChange={handleUpload} disabled={uploading} />
                  {uploading ? <Loader2 className="w-10 h-10 text-blue-500 animate-spin" /> : <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><FileText className="text-slate-400 group-hover:text-blue-400" /></div>}
                  <p className="text-sm text-slate-400 text-center">{uploading ? "Analyzing..." : "Click to upload PDF"}</p>
                </label>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" /> My Materials
              </h2>
              {files.length === 0 ? (
                <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 italic">No documents uploaded yet.</div>
              ) : (
                files.map((file) => (
                  <div key={file._id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex items-center justify-between hover:border-slate-700 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-blue-400"><FileText /></div>
                      <div>
                        <h3 className="text-white font-medium truncate max-w-[200px]">{file.originalname}</h3>
                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => generateQuiz(file._id)} disabled={generatingQuiz === file._id} className="p-2 hover:bg-green-500/10 text-green-500 rounded-lg transition-colors disabled:opacity-50" title="Generate Quiz">
                        {generatingQuiz === file._id ? <Loader2 className="w-5 h-5 animate-spin" /> : <GraduationCap className="w-5 h-5" />}
                      </button>
                      <button onClick={() => setChatFile(file)} className="p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors" title="Chat with AI"><MessageSquare className="w-5 h-5" /></button>
                      <button onClick={() => summarizeFile(file._id)} disabled={summarizing === file._id} className="p-2 hover:bg-yellow-500/10 text-yellow-500 rounded-lg transition-colors disabled:opacity-50" title="AI Summarize">
                        {summarizing === file._id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      </button>
                      <button onClick={() => viewRawText(file._id)} className="p-2 hover:bg-slate-500/10 text-slate-400 rounded-lg transition-colors" title="View Text"><Eye className="w-5 h-5" /></button>
                      <button onClick={() => deleteFile(file._id)} className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Content Viewer Modal */}
        {selectedContent !== null && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-2 text-white font-bold"><Sparkles className="text-yellow-500" /> {selectedContent.title}</div>
                <button onClick={() => setSelectedContent(null)} className="text-slate-400 hover:text-white"><X /></button>
              </div>
              <div className="p-8 overflow-y-auto text-slate-300 leading-relaxed bg-slate-950/50 prose prose-invert max-w-none text-sm">
                <ReactMarkdown>{selectedContent.text || "No content found."}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Modal */}
        {quizData && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
              {quizScore !== null ? (
                <div className="p-12 text-center space-y-6">
                  <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                    <GraduationCap className="text-blue-500 w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-bold text-white">Quiz Complete!</h3>
                  <p className="text-6xl font-black text-blue-500">{quizScore} / {quizData.length}</p>
                  <p className="text-slate-400">{quizScore === quizData.length ? "Perfect score! You're a master." : "Keep studying and try again!"}</p>
                  <button onClick={() => setQuizData(null)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all">Back to Dashboard</button>
                </div>
              ) : (
                <>
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Question {currentQuestionIdx + 1} of {quizData.length}</span>
                    <button onClick={() => setQuizData(null)} className="text-slate-400 hover:text-white"><X /></button>
                  </div>
                  <div className="p-8 space-y-8">
                    <h3 className="text-xl text-white font-medium leading-tight">{quizData[currentQuestionIdx].question}</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {quizData[currentQuestionIdx].options.map((opt: string, idx: number) => {
                        const isSelected = userAnswers[currentQuestionIdx] === idx;
                        const isCorrect = idx === quizData[currentQuestionIdx].correctAnswer;
                        const hasAnswered = userAnswers[currentQuestionIdx] !== undefined;
                        
                        let bgColor = "bg-slate-800/50 border-slate-700 hover:border-blue-500/50";
                        if (hasAnswered) {
                          if (isCorrect) bgColor = "bg-green-500/20 border-green-500/50 text-green-400";
                          else if (isSelected) bgColor = "bg-red-500/20 border-red-500/50 text-red-400";
                          else bgColor = "bg-slate-800/50 border-slate-700 opacity-50";
                        }

                        return (
                          <button 
                            key={idx} 
                            onClick={() => handleAnswer(idx)}
                            className={`w-full p-4 rounded-xl border text-left text-sm transition-all flex justify-between items-center ${bgColor}`}
                          >
                            {opt}
                            {hasAnswered && isCorrect && <CheckCircle2 className="w-5 h-5" />}
                            {hasAnswered && isSelected && !isCorrect && <AlertCircle className="w-5 h-5" />}
                          </button>
                        );
                      })}
                    </div>
                    {userAnswers[currentQuestionIdx] !== undefined && (
                      <button onClick={() => setCurrentQuestionIdx(v => v + 1)} className="w-full bg-blue-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-500 transition-all">Next Question <ArrowRight className="w-5 h-5" /></button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Chat Drawer */}
        {chatFile && (
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-3"><MessageSquare className="text-blue-500" /><h3 className="text-white font-bold text-sm truncate max-w-[200px]">{chatFile.originalname}</h3></div>
              <button onClick={() => {setChatFile(null); setChatMessages([]);}} className="text-slate-400 hover:text-white"><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/30">
              {chatMessages.length === 0 && <div className="text-center py-12"><p className="text-slate-400 text-sm">Ask me anything about this document!</p></div>}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm prose prose-invert prose-p:leading-relaxed prose-pre:bg-slate-900 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none prose-p:text-white' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {isThinking && <div className="flex justify-start">
<div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none flex gap-1"><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></div><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></div></div></div>}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleChat} className="p-4 border-t border-slate-800 bg-slate-900"><div className="relative"><input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Type question..." className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-3 pl-4 pr-12 text-sm"/><button type="submit" disabled={isThinking || !userInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-400"><Send className="w-5 h-5" /></button></div></form>
          </div>
        )}
      </main>
    );
  }

  // --- LOGIN/REGISTER VIEW (LANDING PAGE) ---
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 flex flex-col relative overflow-hidden">
      <Toaster position="top-center" />
      {/* Background blobs */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      {/* Navbar */}
      <header className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <BookOpen className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">Study<span className="text-blue-400">AI</span></span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10 py-12">
        {/* Left: Hero Copy */}
        <div className="space-y-8 text-center lg:text-left">
          <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-tight">
            Learn Faster with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">AI Intelligence.</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
            Upload your PDFs and let our AI instantly generate summaries, answer your questions, and create custom quizzes to test your knowledge.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-slate-800/50 text-left">
            <div className="space-y-2 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              <h3 className="font-semibold text-white">Instant Summaries</h3>
              <p className="text-sm text-slate-500">Extract key points from long documents in seconds.</p>
            </div>
            <div className="space-y-2 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50">
              <MessageSquare className="w-6 h-6 text-blue-500" />
              <h3 className="font-semibold text-white">Chat with PDFs</h3>
              <p className="text-sm text-slate-500">Ask questions and get answers directly from the text.</p>
            </div>
            <div className="space-y-2 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50">
              <GraduationCap className="w-6 h-6 text-green-500" />
              <h3 className="font-semibold text-white">Smart Quizzes</h3>
              <p className="text-sm text-slate-500">Test your retention with AI-generated multiple choice questions.</p>
            </div>
          </div>
        </div>

        {/* Right: Auth Form */}
        <div className="relative w-full max-w-md mx-auto lg:ml-auto mt-12 lg:mt-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl blur-2xl opacity-20"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">{isLogin ? "Welcome Back" : "Create Account"}</h2>
              <p className="text-slate-400 text-sm">Join thousands of students learning smarter.</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" /><input type="text" placeholder="Username" className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required /></div>}
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" /><input type="email" placeholder="Email Address" className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required /></div>
              <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" /><input type="password" placeholder="Password" className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required /></div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 group">{isLogin ? "Sign In" : "Get Started Free"}<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></button>
            </form>
            <div className="mt-8 text-center"><p className="text-slate-500 text-sm">{isLogin ? "New here?" : "Already have an account?"}{" "}<button onClick={() => setIsLogin(!isLogin)} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">{isLogin ? "Create an account" : "Sign in instead"}</button></p></div>
          </div>
        </div>
      </div>
    </main>
  );
}
