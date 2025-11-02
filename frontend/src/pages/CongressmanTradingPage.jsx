import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCongressmanData } from '../hooks/useCongressmanData';
import { useTradesData } from '../hooks/useTradesData';
import { simulateTrade } from '../utils/api';
import Header from '../components/Header';
import CongressmanProfile from '../components/congressman/CongressmanProfile';
import CongressmanTabs from '../components/congressman/CongressmanTabs';
import TradeVolumeChart from '../components/congressman/TradeVolumeChart';
import SectorPieChart from '../components/congressman/SectorPieChart';
import TradesTable from '../components/congressman/TradesTable';
import NetWorth from '../components/congressman/NetWorth';
import CorporateDonors from '../components/congressman/CorporateDonors';
import ProposedLegislation from '../components/congressman/ProposedLegislation';
import LoadingSpinner from '../components/shared/LoadingSpinner';

const CongressmanTradingPage = () => {
  const { id } = useParams();
  const { congressman, loading: loadingProfile } = useCongressmanData(id);
  const { trades, chartData, loading: loadingTrades } = useTradesData(id);
  const [activeTab, setActiveTab] = useState('trades');
  const [showSimulateForm, setShowSimulateForm] = useState(false);
  const [ticker, setTicker] = useState('');
  const [count, setCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  const handleSimulateTrade = async (e) => {
    e.preventDefault();
    if (!ticker.trim() || count < 1) return;

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      await simulateTrade(id, ticker.trim().toUpperCase(), count);
      setSubmitMessage({ type: 'success', text: `Successfully simulated ${count} trade(s) for ${ticker.toUpperCase()}` });
      setTicker('');
      setCount(1);
      // Optionally refresh trades data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setSubmitMessage({ type: 'error', text: 'Failed to simulate trade. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'trades':
        return (
          <div className="grid grid-cols-1">
            {/* Full width chart section */}
            <div className="border-b border-black">
              <TradeVolumeChart data={chartData.volumeByYear} loading={loadingTrades} />
            </div>
            {/* Bottom section with table and pie chart */}
            <div className="grid grid-cols-3">
              <div className="col-span-2 border-r border-black">
                <TradesTable trades={trades} loading={loadingTrades} />
              </div>
              <div>
                <SectorPieChart data={chartData.sectorData} />
              </div>
            </div>
          </div>
        );
      case 'networth':
        return (
          <NetWorth congressman={congressman} loading={loadingProfile} />
        );
      case 'donors':
        return (
          <CorporateDonors congressmanId={id} loading={loadingTrades} />
        );
      case 'legislation':
        return (
          <ProposedLegislation congressmanId={id} loading={loadingTrades} />
        );
      default:
        return null;
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main>
        {/* Profile and Content Section - Grid layout with profile on left */}
        <div className="flex flex-col lg:flex-row border-b border-black">
          {/* Profile Section - Left side (narrower, fixed width) */}
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-black flex-shrink-0">
            <CongressmanProfile congressman={congressman} loading={loadingProfile} />
            
            {/* Simulate Trade Form */}
            <div className="border-t border-black">
              <div className="p-6 space-y-4">
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowSimulateForm(!showSimulateForm)}
                    className="px-4 py-2 bg-black text-white font-medium text-sm hover:bg-stone-900 transition-colors border border-black"
                  >
                    {showSimulateForm ? 'Hide' : 'Simulate Trade'}
                  </button>
                </div>
                
                {showSimulateForm && (
                  <form onSubmit={handleSimulateTrade} className="space-y-4 animate-fade-in">
                    <div>
                      <label htmlFor="ticker" className="block text-xs text-gray-600 mb-1">
                        Ticker
                      </label>
                      <input
                        id="ticker"
                        type="text"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                        placeholder="AAPL"
                        className="w-full px-3 py-2 border border-black text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        maxLength={10}
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="count" className="block text-xs text-gray-600 mb-1">
                        Count
                      </label>
                      <input
                        id="count"
                        type="number"
                        value={count}
                        onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        className="w-full px-3 py-2 border border-black text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting || !ticker.trim() || count < 1}
                      className="w-full px-4 py-2 bg-black text-white font-medium text-sm hover:bg-stone-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-black"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <LoadingSpinner size="sm" />
                          Submitting...
                        </span>
                      ) : (
                        'Submit'
                      )}
                    </button>
                    
                    {submitMessage && (
                      <div className={`p-3 border border-black text-xs ${
                        submitMessage.type === 'success' 
                          ? 'bg-green-50 text-green-900' 
                          : 'bg-red-50 text-red-900'
                      }`}>
                        {submitMessage.text}
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Tabs and Content Section - Right side */}
          <div className="flex-1 min-w-0">
            {/* Tabs Section - Grid with black border */}
            <div className="border-b border-black">
              <div className="px-6 py-4">
                <CongressmanTabs activeTab={activeTab} onTabChange={setActiveTab} />
              </div>
            </div>

            {/* Content Section - Grid with black border, no padding */}
            <div className="border-b border-black">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CongressmanTradingPage;

