import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCongressmanData } from '../hooks/useCongressmanData';
import { useTradesData } from '../hooks/useTradesData';
import Container from '../components/shared/Container';
import CongressmanProfile from '../components/congressman/CongressmanProfile';
import CongressmanTabs from '../components/congressman/CongressmanTabs';
import TradeVolumeChart from '../components/congressman/TradeVolumeChart';
import SectorPieChart from '../components/congressman/SectorPieChart';
import StatsOverview from '../components/congressman/StatsOverview';
import TradesTable from '../components/congressman/TradesTable';
import LiveStockPortfolio from '../components/congressman/LiveStockPortfolio';
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
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <TradeVolumeChart data={chartData.volumeByYear} loading={loadingTrades} />
              </div>
              <div>
                <StatsOverview
                  tradeVolume={congressman?.tradeVolume || '-'}
                  totalTrades={congressman?.totalTrades || '-'}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <TradesTable trades={trades} loading={loadingTrades} />
              </div>
              <div>
                <SectorPieChart data={chartData.sectorData} />
              </div>
            </div>
          </div>
        );
      case 'portfolio':
        return (
          <LiveStockPortfolio congressmanId={id} loading={loadingTrades} />
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
      <div className="min-h-screen bg-gresearch-grey-200 py-12">
        <Container>
          <LoadingSpinner size="lg" className="mt-20" />
        </Container>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gresearch-grey-200 overflow-hidden flex flex-col">
      <Container className="flex-1 flex flex-col py-4">
        {/* Back Link */}
        <div className="mb-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Congress Trading
          </Link>
        </div>

        {/* Profile Section */}
        <div className="mb-3">
          <CongressmanProfile congressman={congressman} loading={loadingProfile} />
        </div>

        {/* Tabs and Content */}
        <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex-shrink-0">
            <CongressmanTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">{renderTabContent()}</div>
        </div>
      </Container>
    </div>
  );
};

export default CongressmanTradingPage;

