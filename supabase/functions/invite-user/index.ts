// Setup: 
// 1. Create a function in Supabase Dashboard or CLI named 'invite-user'
// 2. Set env variables if needed (SUPABASE_SERVICE_ROLE_KEY is injected automatically in Edge Functions)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            // Supabase API URL - env var automatically populated by Supabase
            Deno.env.get('SUPABASE_URL') ?? '',
            // Supabase Service Role Key - env var automatically populated by Supabase
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, tripId, tripName } = await req.json()

        if (!email) {
            return new Response(
                JSON.stringify({ error: 'Email is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Use Supabase Auth Admin to invite the user
        // This sends the standard Supabase Invite email.
        // You can customize the template in Supabase Dashboard > Authentication > Email Templates > Invite User
        const { data, error } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
            data: {
                invited_to_trip: tripId,
                invited_by_trip_name: tripName
            },
            // Redirect back to the trip page after they set their password
            redirectTo: `${req.headers.get('origin') ?? 'http://localhost:5173'}/trips/${tripId}`
        })

        if (error) {
            // If user already exists, 'inviteUserByEmail' might verify them or error depending on config.
            // If they exist, we assume the frontend handled the 'Add Member' logic, and we might just want to send a notification (not supported by default auth methods here without external provider).
            console.error('Invite error:', error)
            // Check if error is "User already registered" - in that case, we can't use this method to notify.
            return new Response(
                JSON.stringify({ error: error.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ message: 'Invite sent', user: data.user }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
