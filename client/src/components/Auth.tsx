import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Phone, ArrowRight, Loader2, Globe, Cloud, Shield, Github, CheckCircle2 } from 'lucide-react';
import { countries, type Country } from '../constants/countries';
import Logo from '../assets/logo.svg';

export const Auth = () => {
    const { sendCode, signIn } = useAuth();
    const [step, setStep] = useState<'PHONE' | 'CODE' | 'PASSWORD'>('PHONE');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [selectedCountry, setSelectedCountry] = useState<Country>(countries.find(c => c.code === 'US') || countries[0]);
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [phoneCodeHash, setPhoneCodeHash] = useState('');

    // Auto-detect country
    useEffect(() => {
        try {
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (timeZone.includes('Calcutta') || timeZone.includes('Kolkata') || timeZone.includes('India')) {
                const india = countries.find(c => c.code === 'IN');
                if (india) setSelectedCountry(india);
            } else if (timeZone.startsWith('Europe/London')) {
                const uk = countries.find(c => c.code === 'GB');
                if (uk) setSelectedCountry(uk);
            }
        } catch (e) {
            console.error('Failed to detect country', e);
        }
    }, []);

    // Update phone when country changes
    useEffect(() => {
        setPhone(selectedCountry.dial_code + ' ');
    }, [selectedCountry]);


    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Remove spaces
            const cleanPhone = phone.replace(/\s/g, '');
            const res = await sendCode(cleanPhone);
            if (res.phoneCodeHash) {
                setPhoneCodeHash(res.phoneCodeHash as string);
            }
            setStep('CODE');
        } catch (error) {
            const err = error as { response?: { data?: { message?: string } } };
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
            // Phone is already stored from previous step
            const cleanPhone = phone.replace(/\s/g, '');
            await signIn(cleanPhone, code, password, phoneCodeHash);
        } catch (error) {
            const err = error as { response?: { data?: { error?: string; message?: string } } };
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
        <div className="min-h-screen bg-brand-bg flex">
            {/* Left Side - Hero / Features */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-brand-primary/50 overflow-hidden flex-col justify-between p-12 text-white">
                {/* Background decoration */}
                <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-white/10 blur-[150px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-brand-accent/30 blur-[100px] pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-12">
                        <img src={Logo} alt="Logo" className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm p-1" />
                        <span className="text-2xl font-bold tracking-tight">TGramDrive</span>
                    </div>

                    <h1 className="text-5xl font-bold leading-tight mb-6">
                        Unlock Unlimited <br /> Cloud Storage.
                    </h1>
                    <p className="text-xl text-white/80 max-w-md mb-12 leading-relaxed">
                        Securely store, access, and share your files leveraging Telegram's infrastructure. No limits, completely free.
                    </p>

                    <div className="space-y-6">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                <Cloud className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Unlimited Storage</h3>
                                <p className="text-white/60 text-sm">Upload files up to 2GB each provided by Telegram.</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Secure & Private</h3>
                                <p className="text-white/60 text-sm">Your files are encrypted and stored safely.</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Easy Management</h3>
                                <p className="text-white/60 text-sm">Intuitive dashboard to organize your digital life.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 mt-auto">
                    <a
                        href="https://github.com/kiran-venugopal/TGramDrive"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-white/70 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-5 py-3 rounded-full backdrop-blur-md"
                    >
                        <Github className="w-5 h-5" />
                        <span className="font-medium">Source Code</span>
                    </a>
                </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-12 relative overflow-hidden">
                {/* Mobile Background decoration */}
                <div className="lg:hidden absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/10 blur-[100px] pointer-events-none"></div>

                {/* Mobile Logo Header */}
                <div className="absolute top-6 left-6 flex items-center space-x-2 lg:hidden">
                    <img src={Logo} alt="Logo" className="w-8 h-8 rounded-lg" />
                    <span className="text-xl font-bold text-brand-text">TGramDrive</span>
                </div>

                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <div className="bg-brand-primary/10 p-4 rounded-2xl inline-block mb-6 lg:hidden">
                            <Lock className="w-8 h-8 text-brand-primary" />
                        </div>
                        <h2 className="text-3xl font-bold text-brand-text">
                            {step === 'PHONE' ? 'Welcome Back' : step === 'CODE' ? 'Verification' : 'Security Check'}
                        </h2>
                        <p className="text-brand-text/50 mt-2 text-lg">
                            {step === 'PHONE' ? 'Sign in with your Telegram account' : step === 'CODE' ? `Enter the code sent to ${phone}` : 'Enter your 2FA password'}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 text-red-500 p-4 rounded-xl text-sm border border-red-500/20 flex items-center">
                            <span className="mr-2">⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={step === 'PHONE' ? handleSendCode : handleSignIn} className="space-y-6">
                        {step === 'PHONE' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-text/70 mb-2">Country</label>
                                    <div className="relative group">
                                        <Globe className="absolute left-3 top-3.5 text-brand-text/40 w-5 h-5 pointer-events-none group-focus-within:text-brand-primary transition-colors" />
                                        <select
                                            className="w-full pl-10 pr-4 py-3 border border-brand-text/10 rounded-xl bg-brand-card/50 text-brand-text outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all appearance-none cursor-pointer hover:bg-brand-card"
                                            value={selectedCountry.code}
                                            onChange={(e) => {
                                                const country = countries.find(c => c.code === e.target.value);
                                                if (country) setSelectedCountry(country);
                                            }}
                                        >
                                            {countries.map(country => (
                                                <option key={country.code} value={country.code} className="bg-brand-bg text-brand-text">
                                                    {country.name} ({country.dial_code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-brand-text/70 mb-2">Phone Number</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-3 top-3.5 text-brand-text/40 w-5 h-5 group-focus-within:text-brand-primary transition-colors" />
                                        <input
                                            type="tel"
                                            placeholder="Enter phone number"
                                            className="w-full pl-10 pr-4 py-3 border border-brand-text/10 rounded-xl bg-brand-card/50 text-brand-text placeholder-brand-text/30 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-all hover:bg-brand-card/80"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'CODE' && (
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-brand-text/70 mb-2">Verification Code</label>
                                <input
                                    type="text"
                                    placeholder="• • • • •"
                                    className="w-full px-4 py-4 border border-brand-text/10 rounded-xl bg-brand-card/50 text-brand-text placeholder-brand-text/20 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none text-center text-3xl tracking-[1em] transition-all"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <p className="text-center text-sm text-brand-text/50">
                                    Check your Telegram app for the code
                                </p>
                            </div>
                        )}

                        {step === 'PASSWORD' && (
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-brand-text/70 mb-2">Password</label>
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 border border-brand-text/10 rounded-xl bg-brand-card/50 text-brand-text placeholder-brand-text/30 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary outline-none transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-6 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-4 rounded-xl transition duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/30 transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    {step === 'PHONE' ? 'Continue' : step === 'CODE' ? 'Sign In' : 'Unlock Account'}
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </button>
                    </form>

                    {step !== 'PHONE' && (
                        <button
                            onClick={() => setStep('PHONE')}
                            className="w-full text-center text-sm text-brand-text/50 hover:text-brand-primary transition-colors"
                        >
                            Change phone number
                        </button>
                    )}

                    {/* Mobile Footer Link */}
                    <div className="lg:hidden mt-8 text-center">
                        <a
                            href="https://github.com/kiran-venugopal/TGramDrive"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 text-brand-text/50 hover:text-brand-primary text-sm transition-colors"
                        >
                            <Github className="w-4 h-4" />
                            <span>Source code</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
