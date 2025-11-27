# Requirements Document - Robinhood Strategy Inference

## Requirements

Given a CSV, decorate the trading rows with a classifier that indicates the strategy of a given trade.

## CSV Context

Here are the expected columns in a Robinhood CSV.

- Activity Date
- Process Date
- Settle Date
- Instrument
- Description
- Trans Code
- Quantity
- Price
- Amount

## Inference Logic

To find the strategy used, first identify if this is an open trade or a close trade: 

- Open Trade means `Trans Code` is either `STO` or `BTO`. 
- Close trade means `Action` is either `STC` or `BTC` or `OEXP`. 

If it is a close trade, find the corresponding open trade. Use the strategy of open trade as this closing trade's strategy.

If it is an open trade, look for `Instrument` and `Activity Date` columns. Then, group/find all open trades for that `Instrument` by the `Activity Date`.

Then apply inferring strategy logic such as:

- A Sell Put or a Buy Call is a Long Option

- A Buy Put or a Sell Call is a Short Option

- A Sell Put AND a Sell Call is a Strangle

- A Buy Put AND a Buy Call is a Straddle

- A Sell Put AND a Buy Put both for same expiry is a Put Credit Spread

- A Sell Call AND a Buy Call both for same expiry is a Call Credit Spread

- A Sell Put AND Buy Put with a Sell Call and a Buy Call is an Iron Condor

Classiy others as unknown.