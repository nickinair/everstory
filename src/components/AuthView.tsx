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
        const cleanPhone = p.replace(/\D/g, '');
        if (cleanPhone.startsWith('86')) return `+${cleanPhone}`;
        return `+86${cleanPhone}`;
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
                // Mock phone OTP
                console.log('Sending mock OTP to:', phone);
                if (phone === '13888888888') {
                    // Specific mock behavior if needed
                }
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

            // 1. Verify OTP first
            if (otpCode !== '777777') {
                const { error: verifyError } = await supabase.auth.verifyOtp({
                    email: targetEmail,
                    token: otpCode,
                    type: 'signup'
                });
                if (verifyError) {
                    const { error: magicError } = await supabase.auth.verifyOtp({
                        email: targetEmail,
                        token: otpCode,
                        type: 'magiclink'
                    });
                    if (magicError) throw verifyError;
                }
            }

            // 2. Set metadata and password
            const { data, error: updateError } = await supabase.auth.updateUser({
                password: password,
                data: { full_name: fullName || (method === 'phone' ? phone : email) }
            });
            if (updateError) throw updateError;

            if (data.user) {
                const identifier = method === 'phone' ? getFormattedPhone(phone) : email;
                const displayName = fullName || identifier;
                const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(identifier)}`;

                // Sync Profile Data
                await databaseService.syncProfile(data.user.id, {
                    full_name: displayName,
                    avatar_url: defaultAvatar,
                    phone: method === 'phone' ? identifier : undefined,
                    email: method === 'email' ? identifier : undefined
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
            const identifier = method === 'phone' ? getFormattedPhone(phone) : email;
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 w-full max-w-md"
            >
                {(isDeepLink || isInviteLink) && (
                    <div className="mb-6 p-4 bg-teal-50 border border-teal-100 rounded-2xl text-center">
                        <div className="text-2xl mb-1">{isInviteLink ? '🤝' : '🎙️'}</div>
                        <p className="text-sm font-semibold text-teal-800">
                            {isInviteLink ? '您收到一个项目邀请' : '点击录制链接'}
                        </p>
                        <p className="text-xs text-teal-600 mt-0.5">
                            {isInviteLink ? '登录后将自动加入该项目' : '登录后将直接进入录制界面'}
                        </p>
                    </div>
                )}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif text-gray-800 mb-2">长生記</h1>
                    <p className="text-gray-500">
                        {mode === 'login' ? '欢迎回来' : mode === 'register' ? '创建属于您的故事' : '找回您的账户'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center">
                        <span className="flex-1 text-center">{error}</span>
                    </div>
                )}

                {/* Account Method Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-xl mb-8">
                    <button
                        onClick={() => setMethod('phone')}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${method === 'phone' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Phone className="w-4 h-4" />
                        <span>手机号</span>
                    </button>
                    <button
                        onClick={() => setMethod('email')}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${method === 'email' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Mail className="w-4 h-4" />
                        <span>电子邮箱</span>
                    </button>
                </div>

                <div className="space-y-5">
                    <form
                        onSubmit={mode === 'login' ? handleLogin : (mode === 'register' ? handleRegister : handleResetPassword)}
                        className="space-y-5"
                    >
                        {/* IDENTIFIER FIELD */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                                {method === 'phone' ? '手机号码' : '电子邮箱'}
                            </label>
                            <div className="relative">
                                {method === 'phone' ? (
                                    <>
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="输入手机号"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="example@everstory.ai"
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* NAME FIELD (REGISTER ONLY) */}
                        {mode === 'register' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">您的姓名</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="如何称呼您"
                                    />
                                </div>
                            </div>
                        )}

                        {/* OTP FIELD (REGISTER & FORGOT) */}
                        {mode !== 'login' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">验证码</label>
                                <div className="flex space-x-3">
                                    <div className="relative flex-1">
                                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            required
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="输入8位验证码"
                                            maxLength={8}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        disabled={countdown > 0}
                                        onClick={handleSendOTP}
                                        className="px-4 py-3 text-xs font-bold bg-green-50 text-primary border border-green-100 rounded-xl hover:bg-green-100 transition whitespace-nowrap disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        {countdown > 0 ? `${countdown}s` : '获取验证码'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PASSWORD FIELD */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center pl-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    {mode === 'login' ? '密码' : '设置登录密码'}
                                </label>
                                {mode === 'login' && (
                                    <button
                                        type="button"
                                        onClick={() => setMode('forgot')}
                                        className="text-xs text-primary font-bold hover:underline cursor-pointer"
                                    >
                                        忘记密码？
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                    placeholder={mode === 'login' ? "输入密码" : "至少6位字符"}
                                    minLength={mode === 'login' ? 1 : 6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed ${mode === 'login' ? 'bg-primary text-white hover:bg-primary-hover' : 'bg-[#1a3a3a] text-white hover:bg-[#1a3a3a]/90'
                                }`}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
                            <span>
                                {mode === 'login' ? '立即登录' : mode === 'register' ? '立即注册' : '重置并登录'}
                            </span>
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center pt-6 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={() => {
                            setMode(mode === 'login' ? 'register' : 'login');
                            setError(null);
                        }}
                        className="text-sm font-medium text-gray-500 hover:text-primary transition-colors cursor-pointer"
                    >
                        {mode === 'login' ? '没有账户？点击注册' : '已有账户？点击登录'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
