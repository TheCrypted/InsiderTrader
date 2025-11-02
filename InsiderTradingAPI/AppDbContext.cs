using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Trade>().ToTable("Trades");
        modelBuilder.Entity<PendingTrade>().ToTable("TradesToAdd");
    }

    public DbSet<Politician> Politicians { get; set; }
    public DbSet<Trade> Trades { get; set; }
    public DbSet<PendingTrade> TradesToAdd { get; set; }
}

[PrimaryKey(nameof(bioGuideId))]
public record Politician(
    string bioGuideId,
    string fullName,
    string dateOfBirth,
    string politicalParty,
    string position,
    string territory,
    string imageUrl
);

[PrimaryKey(nameof(tradeId))]
public record Trade(Guid tradeId, string bioGuideId, string fullName, string ticker,
    string tradedAt, string disclosureDate, string tradeType, string tradeAmount);

[PrimaryKey(nameof(tradeId))]
public record PendingTrade(Guid tradeId, string bioGuideId, string fullName, string ticker,
    string tradedAt, string disclosureDate, string tradeType, string tradeAmount);
