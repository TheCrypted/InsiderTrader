using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add SQLite database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") 
                      ?? "Data Source=app.db"));

var app = builder.Build();

// Weather summaries used throughout the app
var summaries = new[] {
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment()) {
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();


app.MapGet("/test", () => {
    return $"hello world!";
});

app.MapGet("/weatherforecasts", async (AppDbContext db) => {
    return await db.WeatherForecasts.ToListAsync();
});

app.MapPost("/weatherforecasts", async (AppDbContext db) => {
    var random = new Random();
    var weatherForecast = new WeatherForecast
    {
        Date = DateTime.Now.AddDays(random.Next(1, 30)),
        TemperatureC = random.Next(-20, 55),
        Summary = summaries[random.Next(summaries.Length)]
    };
    
    db.WeatherForecasts.Add(weatherForecast);
    await db.SaveChangesAsync();
    
    return Results.Created($"/weatherforecasts/{weatherForecast.Id}", weatherForecast);
});

app.Run();