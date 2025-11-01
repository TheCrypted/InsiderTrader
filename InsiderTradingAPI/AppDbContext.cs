using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<WeatherForecast> WeatherForecasts { get; set; }
    public DbSet<Politician> Politicians { get; set; }
}

public class WeatherForecast
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public int TemperatureC { get; set; }
    public string? Summary { get; set; }
}

[PrimaryKey(nameof(bioGuideId))]
public record Politician(
    string bioGuideId,
    string fullName,
    string dateOfBirth,
    string politicalParty,
    string position,
    string territory
);
    
record Trade(string bioGuideId, string fullName, string ticker,
    string tradedAt, string tradeType, string tradeAmount);