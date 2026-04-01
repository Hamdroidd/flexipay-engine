import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, isToday } from "date-fns";

interface Payment {
  id: string;
  plan_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
}

interface Plan {
  id: string;
  item_name: string;
  total_amount: number;
  num_installments: number;
  status: string;
}

export default function RepaymentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    const [paymentsRes, plansRes] = await Promise.all([
      supabase.from("bnpl_payments").select("*").eq("user_id", user.id).order("due_date", { ascending: true }),
      supabase.from("bnpl_plans").select("*").eq("user_id", user.id),
    ]);
    setPayments(paymentsRes.data || []);
    setPlans(plansRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const markAsPaid = async (paymentId: string) => {
    await supabase
      .from("bnpl_payments")
      .update({ status: "paid", paid_date: new Date().toISOString().split("T")[0] })
      .eq("id", paymentId);
    toast({ title: "Payment marked as paid!" });
    fetchData();
  };

  const getPlanName = (planId: string) => plans.find((p) => p.id === planId)?.item_name || "Unknown";

  const statusConfig = {
    paid: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Paid" },
    pending: { icon: Clock, color: "text-primary", bg: "bg-primary/10", label: "Pending" },
    overdue: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Overdue" },
  };

  // Group by plan
  const groupedByPlan: Record<string, Payment[]> = {};
  payments.forEach((p) => {
    if (!groupedByPlan[p.plan_id]) groupedByPlan[p.plan_id] = [];
    // Mark overdue if pending and past due
    if (p.status === "pending" && isPast(new Date(p.due_date)) && !isToday(new Date(p.due_date))) {
      p.status = "overdue";
    }
    groupedByPlan[p.plan_id].push(p);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Repayment Calendar</h1>
        <p className="text-muted-foreground">Track your upcoming and completed payments</p>
      </div>

      {Object.keys(groupedByPlan).length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-heading font-semibold text-foreground mb-2">No Payments Yet</h3>
          <p className="text-muted-foreground">Create a BNPL plan in the checkout simulator to see your repayment schedule.</p>
        </div>
      ) : (
        Object.entries(groupedByPlan).map(([planId, planPayments], idx) => {
          const plan = plans.find((p) => p.id === planId);
          const paidCount = planPayments.filter((p) => p.status === "paid").length;
          const progress = (paidCount / planPayments.length) * 100;

          return (
            <motion.div
              key={planId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-heading font-semibold text-foreground">{plan?.item_name || "Plan"}</h2>
                  <p className="text-sm text-muted-foreground">
                    ${plan?.total_amount.toFixed(2)} · {planPayments.length} installments
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{paidCount}/{planPayments.length} paid</p>
                  <div className="w-24 h-2 bg-secondary rounded-full mt-1">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {planPayments.map((payment) => {
                  const config = statusConfig[payment.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = config.icon;

                  return (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${config.bg}`}>
                          <StatusIcon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            ${payment.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Due: {format(new Date(payment.due_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                        {payment.status !== "paid" && (
                          <Button size="sm" variant="outline" onClick={() => markAsPaid(payment.id)}>
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
