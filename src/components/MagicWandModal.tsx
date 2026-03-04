import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Plus, Loader2, Check } from 'lucide-react';
import { generateGuidedPrompts } from '../services/geminiService';

interface MagicWandModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddPrompt: (question: string) => void;
}

const PRESET_ROLES = ['爷爷', '奶奶', '父亲', '母亲', '长辈', '自己'];
const PRESET_PROFESSIONS = ['退伍军人', '教师', '医生', '工人', '公务员', '科研人员'];
const PRESET_KEYWORDS = ['知青岁月', '70年代', '故乡', '童年', '初恋', '工作经历'];
const PRESET_TONES = ['幽默', '怀旧', '深刻', '温暖', '平实'];

export const MagicWandModal: React.FC<MagicWandModalProps> = ({ isOpen, onClose, onAddPrompt }) => {
    const [role, setRole] = useState('');
    const [customRoles, setCustomRoles] = useState<string[]>([]);
    const [customRoleInput, setCustomRoleInput] = useState('');

    const [profession, setProfession] = useState('');
    const [customProfessions, setCustomProfessions] = useState<string[]>([]);
    const [customProfessionInput, setCustomProfessionInput] = useState('');

    const [keywords, setKeywords] = useState<string[]>([]);
    const [customKeywords, setCustomKeywords] = useState<string[]>([]);
    const [customKeywordInput, setCustomKeywordInput] = useState('');

    const [tone, setTone] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState<string[]>([]);
    const [addedIndices, setAddedIndices] = useState<number[]>([]);

    const toggleKeyword = (kw: string) => {
        if (keywords.includes(kw)) {
            setKeywords(keywords.filter(k => k !== kw));
        } else {
            setKeywords([...keywords, kw]);
        }
    };

    const handleAddCustomRole = () => {
        const val = customRoleInput.trim();
        if (val && !PRESET_ROLES.includes(val) && !customRoles.includes(val)) {
            setCustomRoles([...customRoles, val]);
            setRole(val);
            setCustomRoleInput('');
        } else if (val && (PRESET_ROLES.includes(val) || customRoles.includes(val))) {
            setRole(val);
            setCustomRoleInput('');
        }
    };

    const handleAddCustomProfession = () => {
        const val = customProfessionInput.trim();
        if (val && !PRESET_PROFESSIONS.includes(val) && !customProfessions.includes(val)) {
            setCustomProfessions([...customProfessions, val]);
            setProfession(val);
            setCustomProfessionInput('');
        } else if (val && (PRESET_PROFESSIONS.includes(val) || customProfessions.includes(val))) {
            setProfession(val);
            setCustomProfessionInput('');
        }
    };

    const handleAddCustomKeyword = () => {
        const val = customKeywordInput.trim();
        if (val && !PRESET_KEYWORDS.includes(val) && !customKeywords.includes(val)) {
            setCustomKeywords([...customKeywords, val]);
            setKeywords([...keywords, val]);
            setCustomKeywordInput('');
        } else if (val && (PRESET_KEYWORDS.includes(val) || customKeywords.includes(val))) {
            if (!keywords.includes(val)) setKeywords([...keywords, val]);
            setCustomKeywordInput('');
        }
    };

    const removeCustomRole = (val: string) => {
        setCustomRoles(customRoles.filter(r => r !== val));
        if (role === val) setRole('');
    };

    const removeCustomProfession = (val: string) => {
        setCustomProfessions(customProfessions.filter(p => p !== val));
        if (profession === val) setProfession('');
    };

    const removeCustomKeyword = (val: string) => {
        setCustomKeywords(customKeywords.filter(k => k !== val));
        setKeywords(keywords.filter(k => k !== val));
    };

    const handleGenerate = async () => {
        if (!role || !profession || keywords.length === 0 || !tone) return;

        setIsGenerating(true);
        setResults([]);
        setAddedIndices([]);

        try {
            const questions = await generateGuidedPrompts(role, profession, keywords, tone);
            setResults(questions);
        } catch (error) {
            console.error('Failed to generate prompts:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAdd = (question: string, index: number) => {
        onAddPrompt(question);
        setAddedIndices([...addedIndices, index]);
    };

    // Shared styles for UI consistency
    const inputStyle = "flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-stone-400 transition-all placeholder:text-stone-400";
    const addButtonStyle = "px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-200 transition-colors cursor-pointer active:scale-95 disabled:opacity-50";
    const tagStyle = (selected: boolean) => `px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${selected
        ? 'bg-stone-800 text-white shadow-md'
        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        }`;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-stone-100">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-stone-600" />
                                </div>
                                <h3 className="text-lg font-bold text-stone-800">AI 智能生成提示</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-stone-100 rounded-full transition-colors cursor-pointer text-stone-400 hover:text-stone-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {results.length === 0 && !isGenerating ? (
                                <>
                                    {/* Step 1: Role */}
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                            讲述人角色
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {PRESET_ROLES.map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => setRole(r)}
                                                    className={tagStyle(role === r)}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                            {customRoles.map(r => (
                                                <div key={r} className="relative group">
                                                    <button
                                                        onClick={() => setRole(r)}
                                                        className={tagStyle(role === r)}
                                                    >
                                                        {r}
                                                    </button>
                                                    <button
                                                        onClick={() => removeCustomRole(r)}
                                                        className="absolute -top-1 -right-1 w-4 h-4 bg-stone-200 border border-white text-stone-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm cursor-pointer z-10"
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="手动输入新角色..."
                                                value={customRoleInput}
                                                onChange={(e) => setCustomRoleInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomRole()}
                                                className={inputStyle}
                                            />
                                            <button
                                                disabled={!customRoleInput.trim()}
                                                onClick={handleAddCustomRole}
                                                className={addButtonStyle}
                                            >
                                                添加
                                            </button>
                                        </div>
                                    </div>

                                    {/* Step 1.5: Profession */}
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                            讲述人职业
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {PRESET_PROFESSIONS.map(p => (
                                                <button
                                                    key={p}
                                                    onClick={() => setProfession(p)}
                                                    className={tagStyle(profession === p)}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                            {customProfessions.map(p => (
                                                <div key={p} className="relative group">
                                                    <button
                                                        onClick={() => setProfession(p)}
                                                        className={tagStyle(profession === p)}
                                                    >
                                                        {p}
                                                    </button>
                                                    <button
                                                        onClick={() => removeCustomProfession(p)}
                                                        className="absolute -top-1 -right-1 w-4 h-4 bg-stone-200 border border-white text-stone-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm cursor-pointer z-10"
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="手动输入新职业..."
                                                value={customProfessionInput}
                                                onChange={(e) => setCustomProfessionInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomProfession()}
                                                className={inputStyle}
                                            />
                                            <button
                                                disabled={!customProfessionInput.trim()}
                                                onClick={handleAddCustomProfession}
                                                className={addButtonStyle}
                                            >
                                                添加
                                            </button>
                                        </div>
                                    </div>

                                    {/* Step 2: Keywords */}
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                            核心关键词
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {PRESET_KEYWORDS.map(kw => (
                                                <button
                                                    key={kw}
                                                    onClick={() => toggleKeyword(kw)}
                                                    className={tagStyle(keywords.includes(kw))}
                                                >
                                                    {kw}
                                                </button>
                                            ))}
                                            {customKeywords.map(kw => (
                                                <div key={kw} className="relative group">
                                                    <button
                                                        onClick={() => toggleKeyword(kw)}
                                                        className={tagStyle(keywords.includes(kw))}
                                                    >
                                                        {kw}
                                                    </button>
                                                    <button
                                                        onClick={() => removeCustomKeyword(kw)}
                                                        className="absolute -top-1 -right-1 w-4 h-4 bg-stone-200 border border-white text-stone-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm cursor-pointer z-10"
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="添加自定义关键词..."
                                                value={customKeywordInput}
                                                onChange={(e) => setCustomKeywordInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomKeyword()}
                                                className={inputStyle}
                                            />
                                            <button
                                                disabled={!customKeywordInput.trim()}
                                                onClick={handleAddCustomKeyword}
                                                className={addButtonStyle}
                                            >
                                                添加
                                            </button>
                                        </div>
                                    </div>

                                    {/* Step 3: Tone */}
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                            情绪基调
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {PRESET_TONES.map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setTone(t)}
                                                    className={tagStyle(tone === t)}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : isGenerating ? (
                                <div className="py-20 flex flex-col items-center justify-center space-y-6">
                                    <div className="relative">
                                        <motion.div
                                            animate={{
                                                rotate: 360,
                                                scale: [1, 1.05, 1]
                                            }}
                                            transition={{
                                                rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                                                scale: { duration: 2, repeat: Infinity }
                                            }}
                                            className="w-16 h-16 rounded-full border-2 border-stone-100 border-t-stone-800"
                                        />
                                        <Sparkles className="w-5 h-5 text-stone-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                    <p className="text-stone-400 text-sm font-medium tracking-wide animate-pulse">AI 正在翻阅回忆...</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">为您生成的提示问题</p>
                                    <div className="space-y-3">
                                        {results.map((q, idx) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                key={idx}
                                                className="group bg-white border border-stone-100 p-5 rounded-2xl shadow-sm hover:border-stone-800/10 hover:shadow-md transition-all flex items-center justify-between"
                                            >
                                                <p className="text-sm font-medium text-stone-800 leading-relaxed pr-4">{q}</p>
                                                <button
                                                    disabled={addedIndices.includes(idx)}
                                                    onClick={() => handleAdd(q, idx)}
                                                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${addedIndices.includes(idx)
                                                        ? 'bg-stone-800 text-white'
                                                        : 'bg-stone-50 text-stone-400 hover:bg-stone-800 hover:text-white'
                                                        }`}
                                                >
                                                    {addedIndices.includes(idx) ? <Check className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => { setResults([]); setAddedIndices([]); }}
                                        className="w-full py-4 text-sm font-bold text-stone-600 bg-stone-100 rounded-2xl hover:bg-stone-200 transition-colors cursor-pointer"
                                    >
                                        重置并重新生成
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {results.length === 0 && !isGenerating && (
                            <div className="p-6 bg-stone-50 border-t border-stone-100">
                                <button
                                    disabled={!role || !profession || keywords.length === 0 || !tone}
                                    onClick={handleGenerate}
                                    className="w-full py-4 bg-stone-800 hover:bg-stone-900 disabled:opacity-30 disabled:cursor-not-allowed text-stone-50 rounded-2xl font-bold shadow-xl shadow-stone-200 transition-all flex items-center justify-center gap-2 cursor-pointer group active:scale-[0.98]"
                                >
                                    <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                    生成提示问题
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
