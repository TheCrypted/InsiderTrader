using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace InsiderTradingAPI;

public sealed class TradeSyncService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<TradeSyncService> _logger;
    private readonly TimeSpan _interval;

    public TradeSyncService(
        IServiceProvider services,
        IHttpClientFactory httpClientFactory,
        IOptions<TradeSyncOptions> opts,
        ILogger<TradeSyncService> logger)
    {
        _services = services;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _interval = TimeSpan.FromMilliseconds(Math.Max(250, opts.Value.IntervalMS));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_interval);
        do
        {
            try
            {
                await SyncOnce(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Trade sync iteration failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
    
    private async Task SyncOnce(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db   = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var http = _httpClientFactory.CreateClient("quiver");

        var json = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString
        };

        using var resp = await http.GetAsync("/beta/live/congresstrading",
            HttpCompletionOption.ResponseHeadersRead, ct);
        if (!resp.IsSuccessStatusCode) {
            return;
        }

        await using var stream = await resp.Content.ReadAsStreamAsync(ct);
        var records = await JsonSerializer
            .DeserializeAsync<List<CongressionalTradeLiveResponse>>(stream, json, ct)
            ?? new();

        if (records.Count == 0)
        {
            _logger.LogInformation("Trade sync: API returned 0 items.");
            return;
        }

        var mapped = records.Select(ToTrade).ToList();

        // Build small distinct sets for IN filters
        var bioSet   = mapped.Select(t => t.bioGuideId).Where(s => !string.IsNullOrEmpty(s)).Distinct().ToList();
        var dateSet  = mapped.Select(t => t.tradedAt).Where(s => !string.IsNullOrEmpty(s)).Distinct().ToList();
        var tickSet  = mapped.Select(t => t.ticker).Where(s => !string.IsNullOrEmpty(s)).Distinct().ToList();
        var typeSet  = mapped.Select(t => t.tradeType).Where(s => !string.IsNullOrEmpty(s)).Distinct().ToList();
        var discSet  = mapped.Select(t => t.disclosureDate).Where(s => !string.IsNullOrEmpty(s)).Distinct().ToList();

        // If sets are empty, nothing to do
        if (bioSet.Count == 0 || dateSet.Count == 0)
        {
            _logger.LogInformation("Trade sync: nothing to insert (empty key sets).");
            return;
        }

        // Query existing rows using IN filters (translates to SQL)
        var existing = await db.Trades
            .Where(t => bioSet.Contains(t.bioGuideId)
                     && dateSet.Contains(t.tradedAt)
                     && discSet.Contains(t.disclosureDate)
                     && tickSet.Contains(t.ticker)
                     && typeSet.Contains(t.tradeType))
            .Select(t => new { t.bioGuideId, t.ticker, t.tradedAt, t.disclosureDate, t.tradeType })
            .ToListAsync(ct);

        static string Key(string b, string tik, string tr, string dis, string ty)
            => $"{b}|{tik}|{tr}|{dis}|{ty}";

        var existingKeys = existing
            .Select(e => Key(e.bioGuideId, e.ticker, e.tradedAt, e.disclosureDate, e.tradeType))
            .ToHashSet(StringComparer.Ordinal);

        static string K(Trade t) => Key(t.bioGuideId, t.ticker, t.tradedAt, t.disclosureDate, t.tradeType);

        var toInsert = mapped.Where(t => !existingKeys.Contains(K(t))).ToList();

        if (toInsert.Count == 0)
        {
            _logger.LogInformation("Trade sync: nothing new to insert.");
            return;
        }

        const int batchSize = 500;
        int inserted = 0;
        foreach (var chunk in toInsert.Chunk(batchSize))
        {
            db.Trades.AddRange(chunk);
            inserted += await db.SaveChangesAsync(ct);
        }

        _logger.LogInformation("Trade sync: inserted {Inserted} new trades (payload {Payload}).",
            inserted, records.Count);
    }

    
    private static Trade ToTrade(CongressionalTradeLiveResponse r)
    {
        return new Trade(
            tradeId: Guid.NewGuid(),
            bioGuideId: r.BioGuideID, 
            fullName: r.Representative,
            ticker: r.Ticker,
            tradedAt: r.TransactionDate.ToString("yyyy-MM-dd"),
            disclosureDate: r.ReportDate.ToString("yyyy-MM-dd"),
            tradeType: r.Transaction,
            tradeAmount: r.Range ?? (r.Amount?.ToString() ?? string.Empty) // Prefer human-readable range; fallback to numeric
        );
    }
    
    public static Dictionary<string, List<(int Year, int TotalUSDApprox)>> getCheeky() {
        return new Dictionary<string, List<(int Year, int TotalUSDApprox)>> {
            {"P000197", new List<(int, int)> {
                (2020, 18_500_000),
                (2021, 24_800_000),
                (2022, 16_700_000),
                (2023, 14_900_000),
                (2024, 13_400_000),
                (2025, 12_300_000),
            }},
            {"G000583", new List<(int, int)> {
                (2017, 14_000_000),
                (2018, 20_000_000),
                (2019, 30_000_000),
                (2020, 35_000_000),
                (2021, 45_000_000),
                (2022, 38_000_000),
                (2023, 34_000_000),
                (2024, 26_000_000),
                (2025, 17_000_000),
            }},
            {"S001217", new List<(int, int)> {
                (2023, 18_000_000),
                (2024, 26_350_000),
                (2025, 12_000_000),
            }},
            {"M001157", new List<(int, int)> {
                (2022, 110_000_000),
                (2023, 95_000_000),
                (2024, 90_000_000),
                (2025, 82_000_000),
            }},
            {"D000617", new List<(int, int)> {
                (2022, 32_000_000),
                (2023, 27_000_000),
                (2024, 22_000_000),
                (2025, 19_000_000),
            }},
            {"M001204", new List<(int, int)> {
                (2023, 700_000),
                (2024, 1_190_000),
                (2025, 900_000),
            }},
            {"G000596", new List<(int, int)> {
                (2023, 500_000),
                (2024, 1_330_000),
                (2025, 800_000),
            }},
            {"K000389", new List<(int, int)> {
                (2022, 2_100_000),
                (2023, 1_600_000),
                (2024, 1_200_000),
                (2025, 1_000_000),
            }},
            {"H001102", new List<(int, int)> {
                (2022, 9_500_000),
                (2023, 8_100_000),
                (2024, 10_200_000),
                (2025, 9_000_000),
            }},
        };
    }
}

public sealed class TradeSyncOptions
{
    public int IntervalMS { get; set; } = 5000;
}