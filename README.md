# I ❤️ insider trading

Project for the Hack the Burgh XII hackhathon.

## Data sources

- Polymarket

```mermaid
flowchart TD;
    bio["Biographical data for politicians"]
    polymarket["Polymarket stream of data"]
    bills["Bills"]
    politicians["Politician trading"]
    stocks["Stocks for the top companies"]
    lobbying["Lobbying data"]

   backend[(Backend)]

   model[(Model)]

   frontend[(Frontend)] 

   bio & polymarket & --> backend --> model --> frontend
```