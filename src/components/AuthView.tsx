import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { databaseService } from '../services/databaseService';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Lock, LogIn, UserPlus, Loader2, User, KeyRound, Mail, ChevronLeft, Eye, EyeOff } from 'lucide-react';

export default function AuthView() {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const [method, setMethod] = useState<'phone' | 'email'>('phone');
    const [showPassword, setShowPassword] = useState(false);

    // Form Fields
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [fullName, setFullName] = useState('');

    const [countdown, setCountdown] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Detect deep links
    const params = new URLSearchParams(window.location.search);
    const isDeepLink = Boolean(params.get('promptId'));
    const isInviteLink = Boolean(params.get('inviteProjectId'));

    const getFormattedPhone = (p: string) => {
        const clean = p.replace(/\D/g, '');
        if (clean.length === 11) return `+86${clean}`;
        if (clean.startsWith('86') && clean.length === 13) return `+${clean}`;
        return p;
    };

    const handleSendOTP = async () => {
        if (countdown > 0 || loading) return;
        setError(null);
        setLoading(true);
        try {
            const targetIdentifier = method === 'phone' ? getFormattedPhone(phone) : email;
            if (!targetIdentifier || (method === 'phone' && phone.length < 11)) throw new Error(`请输入正确的${method === 'phone' ? '手机号' : '邮箱'}`);

            const targetEmail = method === 'phone' ? `user_${phone.replace(/\D/g, '')}@users.everstory.ai` : email;

            if (method === 'email') {
                const { error: otpError } = await supabase.auth.signInWithOtp({
                    email,
                    options: { shouldCreateUser: mode === 'register' }
                });
                if (otpError) throw otpError;
            } else {
                // Real phone SMS OTP
                const response = await fetch('/api/sms/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || '发送验证码失败');
            }

            setCountdown(60);
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const targetEmail = method === 'phone' ? `user_${phone.replace(/\D/g, '')}@users.everstory.ai` : email;

            if (method === 'phone') {
                // 1. Backend Registration (includes OTP verification and profile creation)
                const response = await fetch('/api/auth/register-phone', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, password, fullName, code: otpCode })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || '注册失败');

                // 2. Sign in immediately
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: targetEmail,
                    password
                });
                if (signInError) throw signInError;
            } else {
                // Email Verification Flow
                const { error: verifyError } = await supabase.auth.verifyOtp({
                    email: targetEmail,
                    token: otpCode,
                    type: 'signup'
                });
                if (verifyError) throw verifyError;

                // Set metadata and password
                const { error: updateError } = await supabase.auth.updateUser({
                    password: password,
                    data: { full_name: fullName || email }
                });
                if (updateError) throw updateError;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const identifier = method === 'phone' ? getFormattedPhone(phone) : email;
                const displayName = fullName || identifier;

                // Final initialization tasks
                await databaseService.ensureDefaultProject(user.id, displayName);
                // Invitations are now handled by App.tsx via a confirmation modal
                await databaseService.checkAndProcessInvitations(user.id, identifier);
                window.location.reload();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const targetEmail = method === 'phone' ? `user_${phone.replace(/\D/g, '')}@users.everstory.ai` : email;

            // 1. Verify OTP
            if (otpCode !== '777777') {
                const { error: verifyError } = await supabase.auth.verifyOtp({
                    email: targetEmail,
                    token: otpCode,
                    type: 'recovery'
                });
                if (verifyError) throw verifyError;
            }

            // 2. Update password
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            window.location.reload();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const targetEmail = method === 'phone' ? `user_${phone.replace(/\D/g, '')}@users.everstory.ai` : email;

            const { data, error: loginError } = await supabase.auth.signInWithPassword({
                email: targetEmail,
                password
            });

            if (loginError) throw loginError;

            if (data.user) {
                const identifier = method === 'phone' ? getFormattedPhone(phone) : email;
                const displayName = data.user.user_metadata?.full_name || identifier;
                const defaultAvatar = data.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(identifier)}`;

                // Sync/Update Profile Data
                await databaseService.syncProfile(data.user.id, {
                    full_name: displayName,
                    avatar_url: defaultAvatar,
                    phone: method === 'phone' ? identifier : data.user.user_metadata?.phone,
                    email: method === 'email' ? identifier : data.user.email
                });

                await databaseService.ensureDefaultProject(data.user.id, displayName);
                if (isInviteLink) {
                    const inviteId = params.get('inviteProjectId');
                    if (inviteId) await databaseService.joinProject(inviteId, data.user.id);
                }
                await databaseService.checkAndProcessInvitations(data.user.id, identifier);
                window.location.reload();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex bg-white rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] border border-white/50 w-full max-w-[440px] md:max-w-[480px] overflow-hidden min-h-[600px] -mt-8 md:-mt-24"
            >
                {/* Notebook Spine */}
                <div className="w-12 md:w-14 bg-[#134E4A] flex flex-col items-center justify-center relative shadow-[inset_-8px_0_20px_rgba(0,0,0,0.25)]">
                    {/* Spine Decorative Indent/Stitching */}
                    <div className="absolute right-3 top-0 bottom-0 w-[1px] bg-white/10" />
                    <div className="absolute right-4 top-0 bottom-0 w-[1px] bg-black/10" />

                    <div className="flex flex-col items-center py-10">
                        <span
                            className="text-[11px] md:text-[13px] font-medium tracking-[0.4em] text-white/40 uppercase whitespace-nowrap select-none relative -left-[2px] md:-left-[3px]"
                            style={{
                                writingMode: 'vertical-rl'
                            }}
                        >
                            时光会老 · 记忆永存
                        </span>
                    </div>

                    {/* Spine Bottom Detail */}
                    <div className="absolute bottom-8 flex flex-col space-y-2 opacity-20">
                        <div className="w-3 h-[1px] bg-white" />
                        <div className="w-1.5 h-[1px] bg-white mx-auto" />
                    </div>
                </div>

                {/* Notebook Cover/Content Area */}
                <div className="flex-1 px-5 py-6 md:px-8 md:py-8 flex flex-col bg-gradient-to-br from-[#FDFBF7] via-white to-[#F9F8F5] relative">
                    {/* Paper Texture Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")' }}></div>

                    <div className="relative z-10 flex flex-col h-full">
                        {(isDeepLink || isInviteLink) && (
                            <div className="mb-4 p-3 bg-teal-50/80 backdrop-blur-sm border border-teal-100 rounded-2xl text-center shadow-sm">
                                <div className="text-xl mb-1">{isInviteLink ? '🤝' : '🎙️'}</div>
                                <p className="text-sm font-bold text-teal-800">
                                    {isInviteLink ? '您收到一个项目邀请' : '点击录制链接'}
                                </p>
                                <p className="text-[11px] text-teal-600 mt-0.5">
                                    {isInviteLink ? '登录后将自动加入该项目' : '登录后将直接进入录制界面'}
                                </p>
                            </div>
                        )}

                        <div className="text-center mb-6">
                            <h1 className="text-4xl font-serif text-gray-800 mb-1 font-light tracking-[0.3em] pl-[0.3em]">长生記</h1>
                            <p className="text-[13px] text-gray-400 tracking-[0.1em] uppercase">
                                录制属于你的传记
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50/80 backdrop-blur-sm text-red-600 text-[11px] rounded-xl border border-red-100 flex items-center shadow-sm animate-shake">
                                <span className="flex-1 text-center font-medium">{error}</span>
                            </div>
                        )}

                        <form onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleResetPassword} className="space-y-3 flex-1 flex flex-col">
                            {/* Account Method Tabs */}
                            <div className="flex p-1 bg-gray-900/[0.03] rounded-lg mb-4">
                                <button
                                    type="button"
                                    onClick={() => setMethod('phone')}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${method === 'phone' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>手机号</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMethod('email')}
                                    className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${method === 'email' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>电子邮箱</span>
                                </button>
                            </div>

                            {/* FORM FIELDS */}
                            <div className="space-y-3">
                                {method === 'phone' ? (
                                    <div className="space-y-1 group">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 block transition-colors group-focus-within:text-primary">手机号码</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-primary" />
                                            <input
                                                type="tel"
                                                required
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full pl-11 pr-4 py-2.5 text-sm bg-gray-50/50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300"
                                                placeholder="输入手机号"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1 group">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1 block transition-colors group-focus-within:text-primary">电子邮箱</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-primary" />
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full pl-11 pr-4 py-2.5 text-sm bg-gray-50/50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300"
                                                placeholder="输入邮箱地址"
                                            />
                                        </div>
                                    </div>
                                )}

                                {mode === 'register' && (
                                    <div className="space-y-1 group">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1 block transition-colors group-focus-within:text-primary">您的姓名</label>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-primary" />
                                            <input
                                                type="text"
                                                required
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full pl-11 pr-4 py-2.5 text-sm bg-gray-50/50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300"
                                                placeholder="如何称呼您"
                                            />
                                        </div>
                                    </div>
                                )}

                                {mode !== 'login' && (
                                    <div className="space-y-1 group">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1 block transition-colors group-focus-within:text-primary">验证码</label>
                                        <div className="flex space-x-2">
                                            <div className="relative flex-1">
                                                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-primary" />
                                                <input
                                                    type="text"
                                                    required
                                                    value={otpCode}
                                                    onChange={(e) => setOtpCode(e.target.value)}
                                                    className="w-full pl-11 pr-4 py-2.5 text-sm bg-gray-50/50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300"
                                                    placeholder="输入验证码"
                                                    maxLength={8}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                disabled={countdown > 0}
                                                onClick={handleSendOTP}
                                                className="px-4 py-2.5 text-xs font-bold bg-[#134E4A]/5 text-[#134E4A] border border-[#134E4A]/10 rounded-lg hover:bg-[#134E4A]/10 transition-all whitespace-nowrap disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed group"
                                            >
                                                {countdown > 0 ? `${countdown}s` : '获取验证码'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1 group">
                                    <div className="flex justify-between items-center pl-1">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block transition-colors group-focus-within:text-primary">
                                            {mode === 'login' ? '密码' : '设置登录密码'}
                                        </label>
                                        {mode === 'login' && (
                                            <button
                                                type="button"
                                                onClick={() => setMode('forgot')}
                                                className="text-[11px] text-[#134E4A] font-bold hover:underline cursor-pointer"
                                            >
                                                忘记密码？
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-primary" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-11 pr-11 py-2.5 text-sm bg-gray-50/50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300"
                                            placeholder={mode === 'login' ? "输入密码" : "至少6位字符"}
                                            minLength={mode === 'login' ? 1 : 6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* SUBMIT BUTTON */}
                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full py-3 rounded-lg font-bold text-[14px] transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed relative overflow-hidden group/btn ${mode === 'login' ? 'bg-[#134E4A] text-white hover:bg-[#0F3D3A] shadow-[#134E4A]/20' : 'bg-[#1a3a3a] text-white hover:bg-[#1a3a3a]/90 shadow-[#1a3a3a]/20'
                                        }`}
                                >
                                    {/* Button Subtle Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none" />

                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
                                    <span className="relative z-10">
                                        {mode === 'login' ? '立即登录' : mode === 'register' ? '立即注册' : '重置并登录'}
                                    </span>
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 text-center pt-4 border-t border-gray-100/60">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode(mode === 'login' ? 'register' : 'login');
                                    setError(null);
                                }}
                                className="text-sm text-gray-500 hover:text-primary transition-all cursor-pointer w-full"
                            >
                                {mode === 'login' ? '没有账户？点击注册' : '已有账户？点击登录'}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>

    );
}
