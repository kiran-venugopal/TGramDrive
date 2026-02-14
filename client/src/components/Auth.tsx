import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Phone, ArrowRight, Loader2 } from 'lucide-react';

export const Auth = () => {
    const { sendCode, signIn } = useAuth();
    const [step, setStep] = useState<'PHONE' | 'CODE' | 'PASSWORD'>('PHONE');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [phoneCodeHash, setPhoneCodeHash] = useState(''); // Store hash if needed, or handle in backend session

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await sendCode(phone);
            if (res.phoneCodeHash) {
                setPhoneCodeHash(res.phoneCodeHash);
            }
            setStep('CODE');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send code');
        } finally {
            setLoading(false);
        }
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signIn(phone, code, password, phoneCodeHash);
            // Success is handled by AuthContext updating user
        } catch (err: any) {
            if (err.response?.data?.error === 'SESSION_PASSWORD_NEEDED') {
                setStep('PASSWORD');
            } else {
                setError(err.response?.data?.message || 'Failed to sign in');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-primary/20 blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-accent/20 blur-[100px] pointer-events-none"></div>

            <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-brand-text/10 relative z-10">
                <div className="text-center mb-8">
                    <div className="bg-brand-primary/20 p-3 rounded-full inline-block mb-4 shadow-lg shadow-brand-primary/20">
                        <Lock className="w-8 h-8 text-brand-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-brand-text">
                        {step === 'PHONE' ? 'Sign in to Telegram' : step === 'CODE' ? 'Enter Code' : 'Enter Password'}
                    </h1>
                    <p className="text-brand-text/50 mt-2">
                        {step === 'PHONE' ? 'Manage your files securely' : `Sent to ${phone}`}
                    </p>
                </div>

                {error && (
                    <div className="bg-brand-accent/10 text-brand-accent p-3 rounded-lg mb-6 text-sm border border-brand-accent/20">
                        {error}
                    </div>
                )}

                <form onSubmit={step === 'PHONE' ? handleSendCode : handleSignIn}>
                    {step === 'PHONE' && (
                        <div className="space-y-4">
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-brand-text/30 w-5 h-5" />
                                <input
                                    type="tel"
                                    placeholder="Phone Number (e.g. +1234567890)"
                                    className="w-full pl-10 pr-4 py-3 border border-brand-text/20 rounded-lg bg-black/20 text-brand-text placeholder-brand-text/30 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {step === 'CODE' && (
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Enter 5-digit code"
                                className="w-full px-4 py-3 border border-brand-text/20 rounded-lg bg-black/20 text-brand-text placeholder-brand-text/30 focus:ring-2 focus:ring-brand-primary outline-none text-center text-2xl tracking-widest transition-all"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    {step === 'PASSWORD' && (
                        <div className="space-y-4">
                            <input
                                type="password"
                                placeholder="Two-Step Verification Password"
                                className="w-full px-4 py-3 border border-brand-text/20 rounded-lg bg-black/20 text-brand-text placeholder-brand-text/30 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 bg-brand-primary hover:bg-brand-primary/80 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-brand-primary/20"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                {step === 'PHONE' ? 'Continue' : step === 'CODE' ? 'Sign In' : 'Unlock'}
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                        )}
                    </button>
                </form>

                {step !== 'PHONE' && (
                    <button
                        onClick={() => setStep('PHONE')}
                        className="w-full mt-4 text-sm text-brand-text/50 hover:text-brand-text transition-colors"
                    >
                        Wrong number?
                    </button>
                )}
            </div>
        </div>
    );
};
