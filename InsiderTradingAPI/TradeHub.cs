namespace InsiderTradingAPI; 

using Microsoft.AspNetCore.SignalR;

public sealed class TradeHub : Hub;

public sealed record TradeNotification(
    string bioGuideId,
    string ticker,
    string tradedAt,       // "YYYY-MM-DD"
    string disclosureDate, // "YYYY-MM-DD"
    string tradeType,
    string tradeAmount
);