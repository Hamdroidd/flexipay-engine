import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, ArrowRight, Mail, Lock, User, CheckCircle2, ArrowLeft, Sparkles, Shield, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import authBg from "@/assets/auth-bg.jpg";

type AuthStep = "welcome" | "signup-email" | "signup-details" | "verify-sent" | "login";

export default function AuthPage() {
  const [step, setStep] = useState<AuthStep>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return;
    setLoading(true);
    try {
      await signUp(email, password, fullName);
      setStep("verify-sent");
    } catch (err: any) {
      toast({ title: "Sign up failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Zap, label: "Instant Eligibility", desc: "Real-time BNPL decisions" },
    { icon: Shield, label: "Smart Risk Engine", desc: "AI-powered assessment" },
    { icon: Sparkles, label: "Zero Interest", desc: "Split payments, no fees" },
  ];

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 },
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel — Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <img
          src={authBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/80 to-transparent" />
        <div className="relative z-10 p-12 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="p-2.5 rounded-xl bg-primary/15 glow-primary">
                <CreditCard className="w-7 h-7 text-primary" />
              </div>
              <span className="text-xl font-heading font-bold text-foreground">BNPL Engine</span>
            </div>
            <h1 className="text-4xl font-heading font-bold text-foreground leading-tight mb-4">
              Smart Payments,{" "}
              <span className="gradient-text">Smarter Decisions</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-10">
              Dynamic installment plans powered by your real spending behavior. No static limits.
            </p>

            <div className="space-y-4">
              {features.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className="flex items-center gap-4"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <f.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel — Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="p-2 rounded-xl bg-primary/15 glow-primary">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <span className="text-lg font-heading font-bold text-foreground">Dynamic BNPL</span>
          </div>

          <AnimatePresence mode="wait">
            {/* WELCOME SCREEN */}
            {step === "welcome" && (
              <motion.div
                key="welcome"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-3xl font-heading font-bold text-foreground mb-2">Get Started</h2>
                  <p className="text-muted-foreground">Create an account or sign in to continue</p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => setStep("signup-email")}
                    className="w-full h-12 text-base"
                  >
                    Create Account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStep("login")}
                    className="w-full h-12 text-base"
                  >
                    Sign In
                  </Button>
                </div>

                <div className="pt-4">
                  <div className="glass-card p-4 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Secure & Private</p>
                      <p className="text-xs text-muted-foreground">Your financial data is encrypted and never shared with third parties.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SIGNUP — STEP 1: EMAIL */}
            {step === "signup-email" && (
              <motion.div
                key="signup-email"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <button onClick={() => setStep("welcome")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <h2 className="text-2xl font-heading font-bold text-foreground mb-1">Create Account</h2>
                  <p className="text-muted-foreground text-sm">Step 1 of 2 — Enter your email</p>
                  <div className="flex gap-2 mt-3">
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                    <div className="h-1 flex-1 rounded-full bg-secondary" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-secondary border-border"
                      autoFocus
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (!email) { toast({ title: "Please enter your email", variant: "destructive" }); return; }
                      setStep("signup-details");
                    }}
                    className="w-full h-12"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button onClick={() => setStep("login")} className="text-primary hover:underline">Sign in</button>
                </p>
              </motion.div>
            )}

            {/* SIGNUP — STEP 2: NAME + PASSWORD */}
            {step === "signup-details" && (
              <motion.div
                key="signup-details"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <button onClick={() => setStep("signup-email")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <h2 className="text-2xl font-heading font-bold text-foreground mb-1">Almost there</h2>
                  <p className="text-muted-foreground text-sm">Step 2 of 2 — Set up your profile</p>
                  <div className="flex gap-2 mt-3">
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="glass-card px-4 py-3 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground">{email}</span>
                  </div>

                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="pl-10 h-12 bg-secondary border-border"
                      autoFocus
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Password (min. 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10 h-12 bg-secondary border-border"
                    />
                  </div>

                  <Button type="submit" className="w-full h-12" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </motion.div>
            )}

            {/* VERIFICATION SENT */}
            {step === "verify-sent" && (
              <motion.div
                key="verify-sent"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="text-center space-y-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center glow-primary"
                >
                  <Mail className="w-9 h-9 text-primary" />
                </motion.div>

                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground mb-2">Check your inbox</h2>
                  <p className="text-muted-foreground">
                    We've sent a verification link to
                  </p>
                  <p className="text-primary font-semibold mt-1">{email}</p>
                </div>

                <div className="glass-card p-5 text-left space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <p className="text-sm text-foreground">Open the verification email</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <p className="text-sm text-foreground">Click the verification link</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <p className="text-sm text-foreground">Come back and sign in</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Button onClick={() => setStep("login")} className="w-full h-12">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    I've verified — Sign In
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Didn't receive the email? Check your spam folder or{" "}
                    <button
                      onClick={() => setStep("signup-email")}
                      className="text-primary hover:underline"
                    >
                      try again
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* LOGIN */}
            {step === "login" && (
              <motion.div
                key="login"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <button onClick={() => setStep("welcome")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <h2 className="text-2xl font-heading font-bold text-foreground mb-1">Welcome back</h2>
                  <p className="text-muted-foreground text-sm">Sign in to your account</p>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-12 bg-secondary border-border"
                      autoFocus
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 h-12 bg-secondary border-border"
                    />
                  </div>

                  <Button type="submit" className="w-full h-12" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button onClick={() => setStep("signup-email")} className="text-primary hover:underline">Create one</button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
