# Requirements Document - TastyTrade Strategy Inference

## Requirements

Given a CSV, decorate the trading rows with a classifier that indicates the strategy of a given trade.

## CSV Context

Here are the expected columns in a TastyTrade CSV.

- Date
- Type
- Sub Type
- Action
- Symbol
- Instrument
- Type
- Description
- Value
- Quantity
- Average Price
- Commissions
- Fees
- Multiplier
- Root
- Symbol
- Underlying Symbol
- Expiration Date
- Strike Price
- Call or Put	
- Order #	
- Total
- Currency

And here is a sample dataset for each column above.

2025-04-25T10:45:29-0700
Trade	
Sell to Open	
SELL_TO_OPEN	
SPY   
250606P00500000	
Equity Option	
Sold 1 SPY 06/06/25 Put 500.00 @ 4.16	
416.00	
1	
416.00	
-1.00	
-0.15	
100	
SPY	
SPY	
6/06/25	
500	
PUT	
380705550	
414.85	
USD

## Inference Logic

To find the strategy used, identify if this is an open trade or a close trade.

- Open Trade means `Action` is either `SELL_TO_OPEN` or `BUY_TO_OPEN`. 
- Close trade means `Action` is either `SELL_TO_CLOSE` or `BUY_TO_CLOSE`. 

If it is a close trade, find the corresponding open trade. Use the strategy of open trade as this closing trade's strategy.

If it is an open trade, look for `Order #` column. Then once you have the order number, group/find all open trades by that order number.

Then apply inferring strategy logic such as:

- A Sell Put or a Buy Call is a Long Option
- A Buy Put or a Sell Call is a Short Option
- A Sell Put AND a Sell Call is a Strangle
- A Buy Put AND a Buy Call is a Straddle
- A Sell Put AND a Buy Put both for same expiry  is a Put Credit Spread
- A Sell Call AND a Buy Call both for same expiry is a Call Credit Spread
- A Sell Put AND Buy Put with a Sell Call and a Buy Call is an Iron Condor

Classiy others as custom.