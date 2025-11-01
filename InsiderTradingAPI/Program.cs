using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using DateTime = System.DateTime;
using JsonElement = System.Text.Json.JsonElement;
using JsonValueKind = System.Text.Json.JsonValueKind;
using DotNetEnv;

// Load .env file into environment variables
Env.Load();

var finnhubToken = Environment.GetEnvironmentVariable("FINNHUB_TOKEN");
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS - Allow all origins for development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin() // Allow any origin for development
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
builder.Services.AddHttpClient("bio", client =>
    {
        client.DefaultRequestHeaders.UserAgent.ParseAdd(
            "Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0");
        client.DefaultRequestHeaders.Accept.ParseAdd("application/json,text/plain;q=0.9,*/*;q=0.8");
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("en-GB,en;q=0.5");
        // Don't set Cookie (it will stale quickly). Let’s rely on headers + retries.
    })
    .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
    {
        AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate | DecompressionMethods.Brotli
    });

builder.Services.AddHttpClient("quiver", c =>
{
    c.BaseAddress = new Uri("https://api.quiverquant.com");
    c.DefaultRequestHeaders.Accept.ParseAdd("application/json");
    c.DefaultRequestHeaders.Authorization =
        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "123");
});


// Add SQLite database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")
                      ?? "Data Source=data/app.db"));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db  = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var env = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();
    var httpBio = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>().CreateClient("bio");

    db.Database.EnsureCreated();

    if (!db.Politicians.Any())
    {
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var path = Path.Combine(env.ContentRootPath, "data", "legislators-current.json");

        // 1) Parse JSON file -> collect minimal info first
        var items = new List<(string BioGuideId, string FullName, string Dob, string Party, string Position, string State)>();

        using (FileStream fs = File.OpenRead(path))
        await foreach (var elem in JsonSerializer.DeserializeAsyncEnumerable<JsonElement>(fs, options))
        {
            if (elem.ValueKind != JsonValueKind.Object) continue;

            var bioGuideId = GetString(elem, "id", "bioguide");
            if (string.IsNullOrWhiteSpace(bioGuideId)) continue;

            string fullName = GetString(elem, "name", "official_full");
            if (string.IsNullOrWhiteSpace(fullName))
            {
                var first = GetString(elem, "name", "first");
                var last = GetString(elem, "name", "last");
                fullName = $"{first} {last}".Trim();
            }

            string dateOfBirth = GetString(elem, "bio", "birthday");

            string party = "", position = "", state = "";
            if (elem.TryGetProperty("terms", out var termsEl) && termsEl.ValueKind == JsonValueKind.Array)
            {
                JsonElement? latest = null;
                DateTime latestEnd = DateTime.MinValue;
                foreach (var term in termsEl.EnumerateArray())
                {
                    var endStr = term.TryGetProperty("end", out var e) ? e.GetString() : null;
                    if (DateTime.TryParse(endStr, out var endDt) && endDt > latestEnd)
                    { latestEnd = endDt; latest = term; }
                }
                if (latest is JsonElement cur)
                {
                    party = cur.TryGetProperty("party", out var p) ? p.GetString() ?? "" : "";
                    var type = cur.TryGetProperty("type", out var t) ? t.GetString() : null;
                    position = type switch { "sen" => "Senator", "rep" => "Representative", _ => type ?? "" };
                    state = cur.TryGetProperty("state", out var s) ? s.GetString() ?? "" : "";
                }
            }

            items.Add((bioGuideId, fullName, dateOfBirth, party, position, state));
        }

        // 2) Batch-fetch image URLs with limited concurrency + retries
        var results = new ConcurrentBag<Politician>();
        var throttler = new SemaphoreSlim(8); // <= tune concurrency (start with 6–10)
        var tasks = items.Select(async it =>
        {
            await throttler.WaitAsync();
            try
            {
                string imageUrl = await GetBioGuideImageUrlAsync(it.BioGuideId, httpBio);
                results.Add(new Politician(
                    bioGuideId: it.BioGuideId,
                    fullName: it.FullName,
                    dateOfBirth: it.Dob,
                    politicalParty: it.Party,
                    position: it.Position,
                    territory: it.State,
                    imageUrl: imageUrl
                ));
            }
            finally { throttler.Release(); }
        }).ToArray();

        await Task.WhenAll(tasks);

        // 3) Save in chunks to keep memory/transactions reasonable
        const int batchSize = 250;
        foreach (var chunk in results.Chunk(batchSize))
        {
            db.Politicians.AddRange(chunk);
            await db.SaveChangesAsync();
        }
    }

    if (!db.Trades.Any())
    {
        var httpQuiver = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>().CreateClient("quiver");
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString
        };

        using var resp = await httpQuiver.GetAsync("/beta/live/congresstrading", HttpCompletionOption.ResponseHeadersRead);
        resp.EnsureSuccessStatusCode();

        await using var stream = await resp.Content.ReadAsStreamAsync();
        var records = await JsonSerializer.DeserializeAsync<List<CongressionalTradeLiveResponse>>(stream, options)
                      ?? new List<CongressionalTradeLiveResponse>();

        // Map to your Trade entity
        var trades = records.Select(ToTrade);

        // Save in chunks to avoid huge transactions
        const int batchSize = 500;
        foreach (var chunk in trades.Chunk(batchSize))
        {
            db.Trades.AddRange(chunk);
            await db.SaveChangesAsync();
        }
    }
}

// helpers
static string GetString(JsonElement root, string objName, string propName)
{
    if (root.TryGetProperty(objName, out var obj) && obj.ValueKind == JsonValueKind.Object &&
        obj.TryGetProperty(propName, out var val) && val.ValueKind == JsonValueKind.String)
        return val.GetString() ?? "";
    return "";
}

static async Task<string> GetBioGuideImageUrlAsync(string bioGuideId, HttpClient http)
{
    if (string.IsNullOrWhiteSpace(bioGuideId)) return "";
    // simple retry with backoff on 429/403/5xx
    var baseUri = new Uri("https://bioguide.congress.gov");
    var reqUri = new Uri(baseUri, $"/search/bio/{bioGuideId}.json");

    for (int attempt = 1; attempt <= 5; attempt++)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, reqUri);
            // vary Accept slightly toward JSON
            req.Headers.Accept.ParseAdd("application/json");

            using var resp = await http.SendAsync(req);
            if ((int)resp.StatusCode == 404) return "";            // none available
            if (resp.IsSuccessStatusCode)
            {
                using var stream = await resp.Content.ReadAsStreamAsync();
                using var doc = await JsonDocument.ParseAsync(stream);

                if (doc.RootElement.TryGetProperty("data", out var data) &&
                    data.TryGetProperty("image", out var images) &&
                    images.ValueKind == JsonValueKind.Array &&
                    images.GetArrayLength() > 0 &&
                    images[0].TryGetProperty("contentUrl", out var urlProp))
                {
                    var rel = urlProp.GetString() ?? "";
                    return string.IsNullOrWhiteSpace(rel) ? "" : new Uri(baseUri, rel).ToString();
                }
                return "";
            }

            // retry on likely transient / bot challenge codes
            if (resp.StatusCode is HttpStatusCode.TooManyRequests or HttpStatusCode.Forbidden
                or HttpStatusCode.BadGateway or HttpStatusCode.ServiceUnavailable or HttpStatusCode.GatewayTimeout)
            {
                await Task.Delay(TimeSpan.FromMilliseconds(200 * Math.Pow(2, attempt))); // 200,400,800,1600,3200
                continue;
            }

            // other codes: give up for this id
            return "";
        }
        catch
        {
            await Task.Delay(TimeSpan.FromMilliseconds(200 * Math.Pow(2, attempt)));
        }
    }

    return "";
}

static Trade ToTrade(CongressionalTradeLiveResponse r)
{
    return new Trade(
        tradeId: Guid.NewGuid(),
        bioGuideId: r.BioGuideID,
        fullName: r.Representative,
        ticker: r.Ticker,
        tradedAt: r.TransactionDate.ToString("yyyy-MM-dd"),
        disclosureDate: r.ReportDate.ToString("yyyy-MM-dd"),
        tradeType: r.Transaction,
        tradeAmount: r.Range ?? (r.Amount?.ToString() ?? string.Empty) // Prefer human-readable range; fall back to numeric
    );
}

app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();

app.MapGet("/test", () => { return $"hello world!"; });

app.MapGet("/politician-info/{bioGuideId}", async (string bioGuideId, AppDbContext db) =>
    await db.Politicians.Where(p => p.bioGuideId == bioGuideId).ToListAsync());

app.MapGet("/senate-lobbying", async (HttpContext context, string symbol, string? fromDate, string? toDate) =>
{
    using var httpClient = new HttpClient();
    var apiUrl = $"https://finnhub.io/api/v1/stock/lobbying?symbol={symbol}&from={fromDate ?? "2021-01-01"}&to={toDate ?? "2022-12-31"}&token={finnhubToken}";
    var response = await httpClient.GetAsync(apiUrl);
    if (!response.IsSuccessStatusCode)
        return Results.StatusCode((int)response.StatusCode);
    var content = await response.Content.ReadAsStringAsync();
    return Results.Content(content, "application/json");
});

// given politician ID- give their last 24 months of trades

app.MapGet("/trades-by/{bioGuideId}",
    async (string bioGuideId, AppDbContext db) => await db.Trades.Where(t => t.bioGuideId == bioGuideId).ToListAsync());

app.MapGet("/all-representatives", async (AppDbContext db) =>
    await db.Politicians.ToListAsync());

// app.MapGet("/trading-volume-by-year/{bioGuideId}", (string bioGuideId, AppDbContext db)=>{
//     return db.Trades.Where(t=> t.bioGuideId == bioGuideId, )
// });

app.Run();

public record CongressionalTradeLiveResponse(
    [property: JsonPropertyName("Representative")] string Representative,
    [property: JsonPropertyName("BioGuideID")] string BioGuideID,
    [property: JsonPropertyName("ReportDate")] DateTime ReportDate,
    [property: JsonPropertyName("TransactionDate")] DateTime TransactionDate,
    [property: JsonPropertyName("Ticker")] string Ticker,
    [property: JsonPropertyName("Transaction")] string Transaction,
    [property: JsonPropertyName("Range")] string Range,
    [property: JsonPropertyName("House")] string House,
    [property: JsonPropertyName("Amount")] decimal? Amount,
    [property: JsonPropertyName("Party")] string Party,
    [property: JsonPropertyName("last_modified")] DateTime? LastModified,
    [property: JsonPropertyName("TickerType")] string TickerType,
    [property: JsonPropertyName("Description")] string? Description,
    [property: JsonPropertyName("ExcessReturn")] double? ExcessReturn,
    [property: JsonPropertyName("PriceChange")] double? PriceChange,
    [property: JsonPropertyName("SPYChange")] double? SPYChange
);
