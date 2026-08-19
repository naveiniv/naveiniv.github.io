// api/brief.js
// Vercel turns this file into the endpoint: POST /api/brief
// Docs: https://vercel.com/docs/functions

export default async function handler(request, response) {
  try {
    // 1. Only allow POST — reject GET, DELETE, etc.
    if (request.method !== 'POST') {
      return response.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Guard against a missing/unparsed body — destructuring undefined
    // would otherwise crash the function before we can respond cleanly.
    const body = request.body || {};
    const { name, email, company, brief, website } = body;

    // 2. Honeypot check — real users never see or fill this hidden field, bots do.
    //    We return 200 (fake success) instead of an error so bots don't learn
    //    to leave it empty.
    if (website) {
      return response.status(200).json({ success: true });
    }

    // 3. Validate the fields you actually care about.
    //    Never trust client-side validation alone — anyone can POST here directly.
    const errors = {};
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      errors.name = 'Name is required';
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Valid email required';
    }
    if (!brief || typeof brief !== 'string' || brief.trim().length < 10 || brief.length > 5000) {
      errors.brief = 'Please add more detail to your brief (10-5000 characters)';
    }
    if (company && typeof company === 'string' && company.length > 100) {
      errors.company = 'Company name too long';
    }

    if (Object.keys(errors).length > 0) {
      return response.status(400).json({ success: false, errors });
    }

    // 4. Confirm the Resend key is actually configured before we try to use it.
    //    Without this check, a missing key produces a confusing Resend error
    //    instead of a clear one.
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set in this environment');
      return response.status(500).json({ success: false, error: 'Server is not configured to send email yet.' });
    }

    // 5. Send the email via Resend's API.
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // "onboarding@resend.dev" works out of the box for testing.
        // Once you verify your own domain in Resend, switch this to something
        // like "briefs@naveiniv.com" for a more professional sender address.
        from: 'Brief Form <onboarding@resend.dev>',
        to: 'ugcnaveini@gmail.com',
        reply_to: email,
        subject: `New brief from ${company || name}`,
        text: `Name: ${name}\nCompany: ${company || 'N/A'}\nEmail: ${email}\n\n${brief}`
      })
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend API error:', emailRes.status, errText);
      return response.status(500).json({ success: false, error: 'Failed to send. Please try again.' });
    }

    return response.status(200).json({ success: true });
  } catch (err) {
    // Catches anything unexpected anywhere above — parsing errors, typos,
    // network failures — so the function always returns a clean response
    // instead of crashing with FUNCTION_INVOCATION_FAILED.
    console.error('Brief submission error:', err);
    return response.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }
}