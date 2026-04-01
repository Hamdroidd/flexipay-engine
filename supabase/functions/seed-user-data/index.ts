import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

/**
 * Seeds realistic mock transaction data for a new user
 * Called after signup to populate the dashboard with demo data
 */

const mockTransactions = [
  { amount: 45.99, description: "Grocery Store", category: "groceries", days_ago: 2 },
  { amount: 12.50, description: "Coffee Shop", category: "food", days_ago: 3 },
  { amount: 89.99, description: "Electric Bill", category: "utilities", days_ago: 5 },
  { amount: 250.00, description: "Rent Deposit", category: "housing", days_ago: 7 },
  { amount: 34.99, description: "Streaming Services", category: "entertainment", days_ago: 8 },
  { amount: 67.50, description: "Gas Station", category: "transport", days_ago: 10 },
  { amount: 120.00, description: "Online Shopping", category: "shopping", days_ago: 12 },
  { amount: 28.75, description: "Restaurant Dinner", category: "food", days_ago: 14 },
  { amount: 55.00, description: "Phone Bill", category: "utilities", days_ago: 16 },
  { amount: 15.99, description: "Book Purchase", category: "shopping", days_ago: 18 },
  { amount: 42.00, description: "Gym Membership", category: "health", days_ago: 20 },
  { amount: 95.00, description: "Insurance Payment", category: "insurance", days_ago: 22 },
  { amount: 200.00, description: "Freelance Payment", category: "income", days_ago: 25, type: "credit" },
  { amount: 75.00, description: "Medical Copay", category: "health", days_ago: 27 },
  { amount: 500.00, description: "Salary Deposit", category: "income", days_ago: 1, type: "credit" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has transactions (avoid re-seeding)
    const { data: existing } = await supabaseClient
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ message: "Data already seeded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const transactions = mockTransactions.map((t) => {
      const date = new Date(now);
      date.setDate(date.getDate() - t.days_ago);
      return {
        user_id: user.id,
        amount: t.amount,
        description: t.description,
        transaction_type: t.type || "debit",
        category: t.category,
        created_at: date.toISOString(),
      };
    });

    await supabaseClient.from("transactions").insert(transactions);

    return new Response(JSON.stringify({ message: "Seed data created", count: transactions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
