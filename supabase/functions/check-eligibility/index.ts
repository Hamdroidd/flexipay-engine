import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

/**
 * BNPL Eligibility Engine
 * 
 * Decision Logic:
 * 1. If recent_spending > 70% of balance → DENY (high spending risk)
 * 2. If balance < 20% of purchase_price → DENY (insufficient funds)
 * 3. Otherwise: Calculate max installment limit = balance * 0.5
 *    and offer 2, 3, or 4 payment options based on affordability
 */

interface EligibilityRequest {
  purchase_price: number;
  item_name: string;
}

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's auth
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: EligibilityRequest = await req.json();
    const { purchase_price, item_name } = body;

    if (!purchase_price || purchase_price <= 0) {
      return new Response(JSON.stringify({ error: "Invalid purchase price" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user profile (balance)
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("current_balance")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const balance = Number(profile.current_balance);

    // Fetch last 30 days of debit transactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: transactions } = await supabaseClient
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("transaction_type", "debit")
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Calculate total spending in last 30 days
    const recentSpending = (transactions || []).reduce(
      (sum, t) => sum + Math.abs(Number(t.amount)),
      0
    );

    const spendingRatio = balance > 0 ? recentSpending / balance : 1;

    const spendingSummary = {
      last_30_days: recentSpending,
      balance,
      spending_ratio: Math.round(spendingRatio * 100) / 100,
    };

    // RULE 1: High recent spending → Deny
    if (recentSpending > 0.7 * balance) {
      const result: EligibilityResult = {
        eligible: false,
        risk_level: "high",
        reason: "Your recent spending exceeds 70% of your current balance. We recommend reducing spending before taking on a new payment plan.",
        spending_summary: spendingSummary,
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RULE 2: Balance too low relative to purchase → Deny
    if (balance < 0.2 * purchase_price) {
      const result: EligibilityResult = {
        eligible: false,
        risk_level: "high",
        reason: "Your current balance is less than 20% of the purchase price. A higher balance is required for BNPL eligibility.",
        spending_summary: spendingSummary,
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RULE 3: Calculate installment options
    const maxInstallmentLimit = balance * 0.5;
    const riskLevel: "low" | "medium" | "high" = 
      spendingRatio < 0.3 ? "low" : spendingRatio < 0.5 ? "medium" : "high";

    // Determine affordable installment counts
    const options: InstallmentOption[] = [];
    for (const n of [2, 3, 4]) {
      const paymentAmount = Math.round((purchase_price / n) * 100) / 100;
      // Each payment must be within affordable range
      if (paymentAmount <= maxInstallmentLimit) {
        options.push({
          num_payments: n,
          payment_amount: paymentAmount,
          total: purchase_price,
          frequency: "monthly",
        });
      }
    }

    if (options.length === 0) {
      const result: EligibilityResult = {
        eligible: false,
        risk_level: "high",
        reason: "The purchase amount exceeds your affordable installment limit based on your current balance.",
        spending_summary: spendingSummary,
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Recommend the middle option (best balance of payments vs duration)
    const recommendedIndex = Math.floor(options.length / 2);

    const result: EligibilityResult = {
      eligible: true,
      risk_level: riskLevel,
      recommended_plan: options[recommendedIndex],
      all_options: options,
      spending_summary: spendingSummary,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
