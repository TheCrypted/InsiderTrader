import pandas as pd
import yfinance as yf
import requests
from bs4 import BeautifulSoup
import time

def get_sp500_tickers():
    """Scrape S&P 500 ticker list from Wikipedia."""
    print("Fetching S&P 500 ticker list from Wikipedia...")
    url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Try different ways to find the table
    table = soup.find('table', {'id': 'constituents'})
    
    if table is None:
        # Try finding by class
        table = soup.find('table', {'class': 'wikitable'})
    
    if table is None:
        raise Exception("Could not find S&P 500 table on Wikipedia. The page structure may have changed.")
    
    tickers = []
    names = []
    sectors = []
    industries = []
    
    rows = table.find_all('tr')[1:]  # Skip header row
    
    for row in rows:
        cols = row.find_all('td')
        if len(cols) >= 4:
            ticker = cols[0].text.strip().replace('\n', '')
            name = cols[1].text.strip().replace('\n', '')
            sector = cols[2].text.strip().replace('\n', '')
            industry = cols[3].text.strip().replace('\n', '')
            
            tickers.append(ticker)
            names.append(name)
            sectors.append(sector)
            industries.append(industry)
    
    if len(tickers) == 0:
        raise Exception("No companies found. Wikipedia page structure may have changed.")
    
    df = pd.DataFrame({
        'ticker': tickers,
        'name': names,
        'sector': sectors,
        'industry': industries
    })
    
    print(f"Found {len(df)} S&P 500 companies")
    return df

def get_company_description(ticker):
    """Get company business description using yfinance."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        # Try to get the long business summary
        description = info.get('longBusinessSummary', '')
        
        # Fallback options if no summary available
        if not description:
            description = info.get('description', '')
        
        if not description:
            # Create a basic description from available info
            name = info.get('shortName', ticker)
            sector = info.get('sector', 'Unknown')
            industry = info.get('industry', 'Unknown')
            description = f"{name} operates in the {industry} industry within the {sector} sector."
        
        return description
    
    except Exception as e:
        print(f"  ⚠️  Error fetching description for {ticker}: {e}")
        return ""

def create_sp500_dataset(output_file='sp500_dataset.csv', limit=None):
    """
    Create a dataset of S&P 500 companies with descriptions.
    
    Args:
        output_file (str): Name of the output CSV file
        limit (int): Optional limit on number of companies (for testing)
    
    Returns:
        pd.DataFrame: DataFrame with ticker, name, sector, industry, and description
    """
    # Get the list of S&P 500 companies
    sp500_df = get_sp500_tickers()
    
    if limit:
        print(f"\n⚠️  Limiting to first {limit} companies for testing")
        sp500_df = sp500_df.head(limit)
    
    # Add descriptions
    print(f"\nFetching business descriptions for {len(sp500_df)} companies...")
    print("This may take several minutes...\n")
    
    descriptions = []
    
    for idx, row in sp500_df.iterrows():
        ticker = row['ticker']
        name = row['name']
        
        print(f"[{idx+1}/{len(sp500_df)}] {ticker} - {name}")
        
        description = get_company_description(ticker)
        descriptions.append(description)
        
        # Rate limiting to avoid overwhelming the API
        if (idx + 1) % 10 == 0:
            print(f"  ⏸️  Pausing briefly (processed {idx+1} companies)...")
            time.sleep(2)
        else:
            time.sleep(0.5)
    
    sp500_df['description'] = descriptions
    
    # Save to CSV
    sp500_df.to_csv(output_file, index=False)
    print(f"\n✅ Dataset saved to '{output_file}'")
    print(f"   Total companies: {len(sp500_df)}")
    print(f"   With descriptions: {len([d for d in descriptions if d])}")
    
    # Display summary statistics
    print("\nSector breakdown:")
    print(sp500_df['sector'].value_counts())
    
    return sp500_df

if __name__ == "__main__":
    # Create the dataset - fetching ALL S&P 500 companies
    print("Starting S&P 500 dataset creation...")
    print("This will take approximately 10-15 minutes.\n")
    
    df = create_sp500_dataset(
        output_file='sp500_dataset.csv',
        limit=None  # Fetching all ~500 companies
    )
    
    print("\n" + "="*80)
    print("✅ DATASET CREATION COMPLETE!")
    print("="*80)
    print(f"File saved: sp500_dataset.csv")
    print(f"Total companies: {len(df)}")
    print(f"Columns: {', '.join(df.columns)}")
    
    # Display first few rows as preview
    print("\n" + "="*80)
    print("Preview of first 5 companies:")
    print("="*80)
    print(df[['ticker', 'name', 'sector']].head(5).to_string(index=False))