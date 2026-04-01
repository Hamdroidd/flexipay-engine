import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { CreditCard, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
        toast({ title: "Account created!", description: "You can now sign in." });
        setIsSignUp(false);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-primary/10 glow-primary">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-heading font-bold gradient-text">Dynamic BNPL</h1>
          <p className="text-muted-foreground mt-2">Smart installment plans, powered by your spending</p>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-heading font-semibold text-foreground mb-6">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <Input
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-secondary border-border"
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-secondary border-border"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-secondary border-border"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
