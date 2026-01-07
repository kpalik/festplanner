
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
        const { email, tripId, tripName, inviterName } = await req.json()

        // 1. Authenticate user
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing Authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid User Token', details: userError }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Authorize: Check if user is an organizer of the trip
        const { data: membership } = await supabaseClient
            .from('trip_members')
            .select('role')
            .eq('trip_id', tripId)
            .eq('user_id', user.id)
            .single()

        if (!membership || membership.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Unauthorized: You must be an admin to invite users.' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Proceed with Service Role for Resend (Environment vars)
        // We typically access Env vars directly, no need for separate client for that.

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY is not set');
            return new Response(
                JSON.stringify({ error: 'Server configuration error: Missing email provider key. Please set RESEND_API_KEY in your Supabase Edge Function secrets.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Determine invite link
        const origin = req.headers.get('origin') || 'https://festplanner.app'; // Fallback to production URL if origin missing
        // Redirect to login page with return URL to the trip
        const inviteLink = `${origin}/login?invited=true&email=${encodeURIComponent(email)}&redirect=/trips/${tripId}`;

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'FestPlanner <invite@fest.elimu.pl>',
                to: [email],
                subject: `Zaproszenie do wyjazdu / Invitation to join: ${tripName}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #1e293b; font-size: 24px; text-align: center;">Zostałeś zaproszony! / You've been invited!</h1>
                        
                        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; border: 1px solid #bfdbfe; margin: 25px 0; text-align: center;">
                            <p style="margin: 0; color: #1e40af; font-size: 15px; line-height: 1.5;">
                                <strong>⚠️ WAŻNE / IMPORTANT</strong><br/><br/>
                                Aby uzyskać dostęp do wyjazdu, musisz zalogować się używając dokładnie tego adresu e-mail:<br/>
                                <em>To access the trip, you MUST log in using exactly this email address:</em>
                            </p>
                            <p style="margin: 10px 0 0 0; color: #1e3a8a; font-size: 18px; font-weight: bold;">
                                ${email}
                            </p>
                        </div>

                        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
                            ${inviterName ? `<strong>${inviterName}</strong>` : 'Ktoś / Someone'} zaprasza Cię do dołączenia do wyjazdu <strong>${tripName}</strong> w aplikacji FestPlanner.
                        </p>
                        
                         <p style="color: #64748b; font-size: 14px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px;">
                            ${inviterName ? `<strong>${inviterName}</strong>` : 'Someone'} has invited you to join the trip <strong>${tripName}</strong> on FestPlanner.
                        </p>

                        <div style="margin: 35px 0; text-align: center;">
                            <a href="${inviteLink}" style="display: inline-block; padding: 14px 28px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                                Dołącz do wyjazdu / Join Trip
                            </a>
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 13px; text-align: center;">
                            Kliknij przycisk powyżej, aby zaakceptować zaproszenie.<br/>
                            Click the button above to accept the invitation.
                        </p>
                    </div>
                `
            })
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('Resend error:', data);
            return new Response(
                JSON.stringify({ error: 'Failed to send email via Resend', details: data }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ message: 'Invite sent successfully', data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Function error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
