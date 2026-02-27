- For the pre-arrival experience, can we have a HA plugin which 
- Before buying, user can emulate the whole experience. After logging in browses to the app, can prompt with example components.
- In the future, you could then export this to your account.

## Demo Abuse Protection (TODO)

The demo environment (/demo) currently has no abuse protection. Users could
theoretically spin up unlimited sandboxes and consume AI credits without paying.

When ready, implement:
- Rate limiting per user (e.g. max 10 prompts per demo session, max 3 sessions per day)
- Sandbox timeout enforcement (currently 15 min, Vercel handles this)
- Consider IP-based rate limiting as a fallback
- Monitor sandbox and AI API usage costs to detect abuse patterns
- Optional: CAPTCHA before starting a demo session