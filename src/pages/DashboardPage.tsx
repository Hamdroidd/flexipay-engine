import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, CreditCard, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Profile {
  current_balance: number;
  full_name: string;
}

interface Plan {
  id: string;
  item_name: string;
  total_amount: number;
  installment_amount: number;
  num_installments: number;
  status: string;
  created_at: string;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  transaction_type: string;
  category: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, plansRes, txRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("bnpl_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setProfile(profileRes.data);
      setPlans(plansRes.data || []);
      setTransactions(txRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const totalSpending30d = transactions
    .filter((t) => t.transaction_type === "debit")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const activePlans = plans.filter((p) => p.status === "active");
  const spendingRatio = profile ? totalSpending30d / profile.current_balance : 0;
  const riskLevel = spendingRatio < 0.3 ? "low" : spendingRatio < 0.5 ? "medium" : "high";

  // Spending by category for chart
  const categoryMap: Record<string, number> = {};
  transactions
    .filter((t) => t.transaction_type === "debit")
    .forEach((t) => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + Math.abs(t.amount);
    });
  const chartData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  const riskConfig = {
    low: { color: "text-success", bg: "bg-success/10", icon: ShieldCheck, label: "Low Risk" },
    medium: { color: "text-warning", bg: "bg-warning/10", icon: AlertTriangle, label: "Medium Risk" },
    high: { color: "text-destructive", bg: "bg-destructive/10", icon: ShieldAlert, label: "High Risk" },
  };

  const risk = riskConfig[riskLevel];
  const RiskIcon = risk.icon;

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Welcome back, {profile?.full_name || "User"}
        </h1>
        <p className="text-muted-foreground">Here's your financial overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Current Balance",
            value: `$${(profile?.current_balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            icon: DollarSign,
            accent: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "30-Day Spending",
            value: `$${totalSpending30d.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            icon: TrendingUp,
            accent: "text-warning",
            bg: "bg-warning/10",
          },
          {
            label: "Active Plans",
            value: activePlans.length.toString(),
            icon: CreditCard,
            accent: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Risk Level",
            value: risk.label,
            icon: RiskIcon,
            accent: risk.color,
            bg: risk.bg,
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.accent}`} />
              </div>
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4">Spending by Category</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="hsl(215 15% 55%)" fontSize={12} />
                <YAxis stroke="hsl(215 15% 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(220 18% 11%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px" }}
                  labelStyle={{ color: "hsl(210 20% 92%)" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={idx % 2 === 0 ? "hsl(199 89% 48%)" : "hsl(160 84% 39%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm">No spending data yet. Use the checkout simulator to create transactions.</p>
          )}
        </motion.div>

        {/* Active Plans */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4">Active BNPL Plans</h2>
          {activePlans.length > 0 ? (
            <div className="space-y-3">
              {activePlans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-foreground">{plan.item_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {plan.num_installments} × ${plan.installment_amount.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-primary">${plan.total_amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No active plans. Try the checkout simulator!</p>
          )}
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-6">
        <h2 className="text-lg font-heading font-semibold text-foreground mb-4">Recent Transactions</h2>
        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.slice(0, 8).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.description || "Transaction"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.transaction_type === "credit" ? "text-success" : "text-destructive"}`}>
                  {tx.transaction_type === "credit" ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No transactions yet.</p>
        )}
      </motion.div>
    </div>
  );
}
