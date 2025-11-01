using System.Text.Json;
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

// Add SQLite database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")
                      ?? "Data Source=data/app.db"));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    if (!db.Politicians.Any())
    {
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        // Use ContentRootPath if this runs in ASP.NET
        var env = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();
        var path = Path.Combine(env.ContentRootPath, "data", "legislators-current.json");

        using FileStream fs = File.OpenRead(path);

        await foreach (var elem in JsonSerializer.DeserializeAsyncEnumerable<JsonElement>(fs, options))
        {
            if (elem.ValueKind != JsonValueKind.Object) continue;

            // id.bioguide
            string bioGuideId = GetString(elem, "id", "bioguide");

            // name.official_full (fallback to "first last")
            string fullName = GetString(elem, "name", "official_full");
            if (string.IsNullOrWhiteSpace(fullName))
            {
                var first = GetString(elem, "name", "first");
                var last = GetString(elem, "name", "last");
                fullName = $"{first} {last}".Trim();
            }

            // bio.birthday (keep as string to match your record signature)
            string dateOfBirth = GetString(elem, "bio", "birthday");

            // Find the latest term (by 'end' date) to infer party/position/state
            string politicalParty = "";
            string position = "";
            string territory = "";

            if (elem.TryGetProperty("terms", out var termsEl) && termsEl.ValueKind == JsonValueKind.Array)
            {
                JsonElement? latest = null;
                DateTime latestEnd = DateTime.MinValue;

                foreach (var term in termsEl.EnumerateArray())
                {
                    string endStr = term.TryGetProperty("end", out var endEl) ? endEl.GetString() : null;
                    if (DateTime.TryParse(endStr, out var endDt))
                    {
                        if (endDt > latestEnd) { latestEnd = endDt; latest = term; }
                    }
                    else
                    {
                        // If end is missing/unparseable, consider using start as fallback
                        var startStr = term.TryGetProperty("start", out var startEl) ? startEl.GetString() : null;
                        if (DateTime.TryParse(startStr, out var startDt) && startDt > latestEnd)
                        {
                            latestEnd = startDt; latest = term;
                        }
                    }
                }

                if (latest is JsonElement cur)
                {
                    politicalParty = cur.TryGetProperty("party", out var p) ? p.GetString() ?? "" : "";
                    var type = cur.TryGetProperty("type", out var t) ? t.GetString() : null;
                    position = type switch
                    {
                        "sen" => "Senator",
                        "rep" => "Representative",
                        _     => type ?? ""
                    };
                    territory = cur.TryGetProperty("state", out var s) ? s.GetString() ?? "" : "";
                }
            }

            // Your record signature:
            // Politician(string bioGuideId, string fullName, string imageUrl, string bio,
            //            string dateOfBirth, string policitalParty, string position, string territory)

            var politician = new Politician(
                bioGuideId: bioGuideId,
                fullName: fullName,
                dateOfBirth: dateOfBirth,
                politicalParty: politicalParty,
                position: position,
                territory: territory
            );

            // Skip obviously bad rows (optional)
            if (!string.IsNullOrWhiteSpace(politician.bioGuideId))
                db.Politicians.Add(politician);
        }

        await db.SaveChangesAsync();
    }
}

static string GetString(JsonElement root, string objName, string propName)
{
    if (root.TryGetProperty(objName, out var obj) && obj.ValueKind == JsonValueKind.Object &&
        obj.TryGetProperty(propName, out var val) && val.ValueKind == JsonValueKind.String)
    {
        return val.GetString() ?? "";
    }

    return "";
}


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment()) {
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();


app.MapGet("/test", () => { return $"hello world!"; });

app.MapGet("/politician-info/{bioGuideId}", async (string bioGuideId, AppDbContext db) =>
    await db.Politicians.Where(p => p.bioGuideId == bioGuideId).ToListAsync());

app.MapGet("/senate-lobbying", async (HttpContext context, string symbol, string? fromDate, string? toDate) =>
{
    using var httpClient = new HttpClient();
    var apiUrl = $"https://finnhub.io/api/v1/stock/lobbying?symbol={symbol}&from={fromDate ?? "2021-01-01"}&to={toDate ?? "2022-12-31"}&token={TOKEN}";
    var response = await httpClient.GetAsync(apiUrl);
    if (!response.IsSuccessStatusCode)
        return Results.StatusCode((int)response.StatusCode);
    var content = await response.Content.ReadAsStringAsync();
    return Results.Content(content, "application/json");
});

app.Run();