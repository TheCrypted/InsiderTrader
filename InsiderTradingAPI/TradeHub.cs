namespace InsiderTradingAPI; 

using Microsoft.AspNetCore.SignalR;

public sealed class TradeHub : Hub;

public sealed record TradeOrLobbyingNotification(
    string billId,
    DateTime updatedAt
);