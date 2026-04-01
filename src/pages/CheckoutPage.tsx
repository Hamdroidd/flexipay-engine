import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InstallmentOption {
  num_payments: number;
  payment_amount: number;
  total: number;
  frequency: string;
}

interface EligibilityResult {
  eligible: boolean;
  risk_level: "low" | "medium" | "high";
  reason?: string;
  recommended_plan?: InstallmentOption;
  all_options?: InstallmentOption[];
  spending_summary: {
    last_30_days: number;
    balance: number;
    spending_ratio: number;
  };
}

export default function CheckoutPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [selectedOption, setSelectedOption] = useState<InstallmentOption | null>(null);

  const checkEligibility = async () => {
    if (!price || Number(price) <= 0) return;
    setChecking(true);
    setResult(null);
    setSelectedOption(null);

    try {
      const { data, error } = await supabase.functions.invoke("check-eligibility", {
        body: { purchase_price: Number(price), item_name: itemName || "Item" },
      });

      if (error) throw error;
      setResult(data);
      if (data.recommended_plan) setSelectedOption(data.recommended_plan);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const createPlan = async () => {
    if (!selectedOption || !result?.eligible) return;
    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-bnpl-plan", {
        body: {
          item_name: itemName || "Item",
          total_amount: Number(price),
          num_installments: selectedOption.num_payments,
        },
      });

      if (error) throw error;
      toast({ title: "Plan Created!", description: `${selectedOption.num_payments} payments of $${selectedOption.payment_amount.toFixed(2)}` });
      setResult(null);
      setPrice("");
      setItemName("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const riskColors = {
    low: "text-success",
    medium: "text-warning",
    high: "text-destructive",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Checkout Simulator</h1>
        <p className="text-muted-foreground">Test your BNPL eligibility in real-time</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-heading font-semibold text-foreground">Enter Purchase Details</h2>
        </div>

        <Input
          placeholder="Item name (e.g., MacBook Pro)"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className="bg-secondary border-border"
        />
        <Input
          type="number"
          placeholder="Price ($)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          min="1"
          step="0.01"
          className="bg-secondary border-border"
        />
        <Button onClick={checkEligibility} disabled={checking || !price} className="w-full">
          {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {checking ? "Checking..." : "Check BNPL Eligibility"}
        </Button>
      </motion.div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`glass-card p-6 ${result.eligible ? "glow-success" : "glow-destructive"}`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              {result.eligible ? (
                <CheckCircle2 className="w-8 h-8 text-success" />
              ) : (
                <XCircle className="w-8 h-8 text-destructive" />
              )}
              <div>
                <h2 className="text-xl font-heading font-bold text-foreground">
                  {result.eligible ? "You're Approved!" : "Not Eligible"}
                </h2>
                <p className={`text-sm font-medium ${riskColors[result.risk_level]}`}>
                  Risk Level: {result.risk_level.charAt(0).toUpperCase() + result.risk_level.slice(1)}
                </p>
              </div>
            </div>

            {/* Spending Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Balance", value: `$${result.spending_summary.balance.toLocaleString()}` },
                { label: "30d Spending", value: `$${result.spending_summary.last_30_days.toLocaleString()}` },
                { label: "Spend Ratio", value: `${(result.spending_summary.spending_ratio * 100).toFixed(0)}%` },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-lg bg-secondary/50 text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-semibold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            {result.eligible && result.all_options ? (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">SELECT A PLAN</h3>
                <div className="space-y-2 mb-4">
                  {result.all_options.map((opt) => (
                    <button
                      key={opt.num_payments}
                      onClick={() => setSelectedOption(opt)}
                      className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                        selectedOption?.num_payments === opt.num_payments
                          ? "border-primary bg-primary/10 glow-primary"
                          : "border-border bg-secondary/30 hover:border-primary/50"
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-medium text-foreground">{opt.num_payments} Monthly Payments</p>
                        <p className="text-sm text-muted-foreground">Interest-free</p>
                      </div>
                      <span className="text-lg font-heading font-bold text-primary">
                        ${opt.payment_amount.toFixed(2)}/mo
                      </span>
                    </button>
                  ))}
                </div>

                <Button onClick={createPlan} disabled={creating || !selectedOption} className="w-full">
                  {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {creating ? "Creating Plan..." : "Confirm & Create Plan"}
                </Button>
              </>
            ) : (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-foreground">{result.reason}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
