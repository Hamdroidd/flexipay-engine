import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

/**
 * Create BNPL Plan
 * Creates a new plan and generates payment schedule
 */

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { item_name, total_amount, num_installments } = await req.json();

    if (!item_name || !total_amount || !num_installments) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const installmentAmount = Math.round((total_amount / num_installments) * 100) / 100;

    // Create the plan
    const { data: plan, error: planError } = await supabaseClient
      .from("bnpl_plans")
      .insert({
        user_id: user.id,
        item_name,
        total_amount,
        num_installments,
        installment_amount: installmentAmount,
        status: "active",
      })
      .select()
      .single();

    if (planError) {
      return new Response(JSON.stringify({ error: planError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate payment schedule (monthly payments starting next month)
    const payments = [];
    const now = new Date();
    for (let i = 0; i < num_installments; i++) {
      const dueDate = new Date(now);
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      dueDate.setDate(1); // Due on 1st of each month
      
      payments.push({
        plan_id: plan.id,
        user_id: user.id,
        amount: installmentAmount,
        due_date: dueDate.toISOString().split("T")[0],
        status: "pending",
      });
    }

    const { error: paymentsError } = await supabaseClient
      .from("bnpl_payments")
      .insert(payments);

    if (paymentsError) {
      return new Response(JSON.stringify({ error: paymentsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct first installment from balance (simulate first payment)
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("current_balance")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      await supabaseClient
        .from("profiles")
        .update({ current_balance: Number(profile.current_balance) - installmentAmount })
        .eq("user_id", user.id);
    }

    // Record as transaction
    await supabaseClient.from("transactions").insert({
      user_id: user.id,
      amount: total_amount,
      description: `BNPL: ${item_name}`,
      transaction_type: "debit",
      category: "bnpl",
    });

    return new Response(JSON.stringify({ plan, message: "Plan created successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
