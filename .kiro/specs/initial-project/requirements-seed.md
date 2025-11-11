# Initial Project Requirements - Seed Document

## Purpose
This document captures high-level requirements and ideas before they are formalized into structured requirements, design, and tasks.

---

## High-Level Goals

### What problem are we solving?

I want to build a personal options trading journal and analytics tool that gives me insights that my option trading brokers do not provide out of the box in their platforms.

I currently track my trades on the Numbers software on my Mac, which is similar to Microsoft Excel. I have some charts and graphs I manually re-generate everytime I add new trade entries.

So, here is my idea.

I want to be able to visualize my trades on an analytics dashboard where I can see breakdown of my trades and profit and loss by various dimensions such as ticker symbol, strategy used, win rates, amongs several others.


### Who is this for?

Any Retail Options Trader whose trading platform does not provide personalized insights into their trading.


### What does success look like?

Initially, I should just be able to load a CSV and see desired dashboard.

Then I would like to see if I can integrate the tool direcly with my platform (using Oauth or Auth header as a hidden environment variable).

Eventually, I would like to integrate with some intelligent API (could be AI/MCP enabled) so that I can ask some text based questions such as - what's my historical edge with selling puts on NVDA?

---

## Feature Ideas

### Core Features
<!-- List the essential features that must be included -->

1. Dashboard UI
2. Client side / browser only CSV driven analysis
3. Option strategy classification - auto-detect strategy from leg combinations

### Nice-to-Have Features
<!-- List features that would be valuable but aren't critical for the first version -->

0. Allow sign-in for users so that they can:

1. Directly integrate with their trading platform
2. X-Platform Portfolio Risk view (aggregated risk across all trades)
3. X-Platform Margin Risk view

---

## Constraints & Considerations

### Technical Constraints
<!-- Any technical limitations, required technologies, or platforms -->

- Code is liability. Write/generate minimal code, use well managed open source libraries wherever possible. For example:
    - Use D3 JS for charting
    - Use tailwind for css

- Since I would like to integrate with multiple trading platforms that I use, I would like any API integration to use a configurable approach and perhaps an adapter pattern so we dont need to duplicate any error handling, circuit breakers, retries, etc.


### Timeline & Resources
<!-- Any time constraints or resource limitations -->

- I can dedicate maybe 10 hours in a week to this project. And the project must be built within 2 weeks.

### Dependencies
<!-- Any external systems, APIs, or services this will integrate with -->



---

## Questions & Unknowns
<!-- List any open questions or areas that need clarification -->

1. 
2. 
3. 

---

## Next Steps
Once you've filled in your high-level requirements above, we'll work together to:
1. Clarify and refine the requirements into structured user stories
2. Create a technical design document
3. Build an actionable task list for implementation

## Clarifications

### Data & CSV Format

1. What columns/fields are in your current CSV? (e.g., date, ticker, strategy, entry price, exit price, P&L, etc.)

- Symbol
- Type
- Strategy
- Strike
- Expiry
- Volume
- Entry
- Delta
- Days to Expire (at Entry) 
- Exit
- Debit
- Credit
- Profit/Loss
- %-age (Premium)
- Days Held	
- Rem. DTE	
- Account	
- Result


Note: 

* Some of the columns are actually computed by a formula.
    - Days to Expire (at Entry) is Expiry - Entry
    - Profit/Loss = Credit - Debit
    - %-age (Premium) = Profit/Loss divided by Credit
    - Days Held	= Exit - Entry
    - Rem. DTE = Exit - Expiry
    - result = IF(ISBLANK(Exit),"Open", IF(Profit/Loss >0,"Win","Loss"))
* Sometimes data for some columns will be empty.

2. Do you track individual option legs (strike, expiration, type) or just the overall position?

Depends on how I close them. If I close legs separately, I typically break out the entry in CSV into two rows.

3. How do you currently classify strategies in your spreadsheet - manually or by some logic?

Manually.

### Dashboard & Analytics

4. What are your top 3-5 most important metrics/visualizations you look at today? 5. Do you need to filter by date ranges (e.g., last 30 days, YTD, all-time)? 

- Profit/Loss Trend Line per month, with trailing 12 months by default
- Win Rate by Strategy (Count, %-age, $ amount)
- P/L breakdown by buy versus sell grouped by strategy and by trading platform
- P/L breakdown by symbol and strategy
- P/L breakdown by symbol 
- P/L breakdown by strategy

The date range filter - last week, last 7 days, last 30 days, last 12 months, YTD, all-time.

6. Should the dashboard show open positions vs closed positions, or just closed?

Provide options to view both, default closed.

### Technical Approach

7. Do you have a preference for the tech stack? (React, Vue, vanilla JS? Static site or need a backend?) 

Considering we will eventually need to make API calls, we would most likely at least need a backend proxy. But initially - maybe vanilla JS is fine? I dont have a strong opinion, help me with follow-up questions - consider that we do need to use D3.js.

8. For "browser only" - should the CSV data persist between sessions (localStorage) or reload each time? 

Lets use localStorage, but provide easy way for user to reload.

9. When you say "client side / browser only" - does that mean you want a static HTML/JS app you can run locally without a server?

Good question. I want to serve this website from a S3 bucket/Cloudfront, and eventually maybe a domain name. During development, I am unsure how best to handle that - maybe a locally running server sounds fine.

### Platform Integration (Future)

10. Which trading platforms do you use? (e.g., Robinhood, TD Ameritrade, Interactive Brokers, Tastytrade, etc.) 

Robinhood, Tastytrade, Fidelity, and Vanguard. But let's limit to Robinhood and Tastytrade.

11. Do these platforms have public APIs, or would you need to scrape/export data?

### Scope for MVP

12. For the 2-week timeline, should we focus purely on the CSV upload + dashboard, or try to include platform integration?

Let's first focus purely on the Dashboard from CSV and do that really well. And then if we still have time we can revisit the next steps.