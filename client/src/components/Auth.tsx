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
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="bg-blue-100 p-3 rounded-full inline-block mb-4">
                        <Lock className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {step === 'PHONE' ? 'Sign in to Telegram' : step === 'CODE' ? 'Enter Code' : 'Enter Password'}
                    </h1>
                    <p className="text-gray-500 mt-2">
                        {step === 'PHONE' ? 'Manage your files securely' : `Sent to ${phone}`}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={step === 'PHONE' ? handleSendCode : handleSignIn}>
                    {step === 'PHONE' && (
                        <div className="space-y-4">
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                                <input
                                    type="tel"
                                    placeholder="Phone Number (e.g. +1234567890)"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-widest"
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
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
                        className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
                    >
                        Wrong number?
                    </button>
                )}
            </div>
        </div>
    );
};
