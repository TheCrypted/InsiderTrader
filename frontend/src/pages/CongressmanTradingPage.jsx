import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCongressmanData } from '../hooks/useCongressmanData';
import { useTradesData } from '../hooks/useTradesData';
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

