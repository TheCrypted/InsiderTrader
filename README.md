# I ❤️ insider trading

Project for the Hack the Burgh XII hackhathon.

## Overview

We built a real-time monitoring and prediction platform that tracks financial activities of US congresspeople, including stock trades and lobbying payments to predict legislative outcomes and enable accountability.

Citizens lack visibility into the financial incentives driving congressional voting behavior. Meanwhile, the ability to predict legislative outcomes has real value, both for civic engagement and financial markets like Polymarket.

Thus we built an end-to-end system that: aggregates **real-time** data from multiple sources: congressional stock trades (Congress.gov, Quiver API), lobbying disclosures (Lobbying Disclosure Act API), stock market data (Alpaca, Finnhub, Yahoo Finance), and legislator information (Bioguide API)

We built two **custom ML models** to analyze this data: **Bill-Company Matcher**: Identifies which publicly-traded companies would be affected by pending legislation **Passage Predictor**: Calculates bill passage likelihood based on trading patterns, lobbying activity, and the makeup of congress

We **stream live predictions** to users via WebSockets as new disclosures arrive and integrate with Polymarket to enable betting using the incoming predictions.

## Tech Stack

- **Backend**: C# handling data ingestion, ML inference, and real-time event streaming
- **Frontend**: React dashboard with live-updating predictions and legislator activity feeds
- **Database**: SQLite for storage of historical trades, lobbying records, and predictions
- **Deployment**: Docker Compose for containerized orchestration
- **APIs Integrated**: Congress.gov, Quiver, Alpaca, Finnhub, Yahoo Finance, Lobbying Disclosure Act, Bioguide, Polymarket

Our real-time data pipeline continuously monitors our data sources, automatically triggers model re-inference when new information becomes available, and pushes updated predictions to connected clients enabling users to act on information as soon as it's disclosed.
