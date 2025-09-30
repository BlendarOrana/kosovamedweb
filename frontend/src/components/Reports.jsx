import { useState, useEffect, useCallback, memo } from 'react';
import { FiDownload, FiCalendar, FiClock, FiBarChart2, FiInfo, FiLoader } from 'react-icons/fi';
import { useReportsStore } from '../stores/useReportsStore';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const InputField = memo(({ id, label, type, value, onChange, ...props }) => {
  const commonClasses = 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition placeholder-gray-400';
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      {type === 'select' ? (
        <select id={id} value={value} onChange={onChange} className={commonClasses} {...props}>
          {props.options.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
        </select>
      ) : (
        <input id={id} type={type} value={value} onChange={onChange} className={commonClasses} {...props} />
      )}
    </div>
  );
});

const ReportCard = memo(({ report, onDownload, isLoading }) => {
  const Icon = report.icon;
  const [filters, setFilters] = useState(report.initialFilters);

  useEffect(() => {
    if (report.initialFilters.startDate !== undefined) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const formatDate = (date) => date.toISOString().split('T')[0];
      setFilters(prev => ({ ...prev, startDate: formatDate(firstDay), endDate: formatDate(lastDay) }));
    }
  }, [report.initialFilters.startDate]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDownloadClick = () => onDownload(filters);
  const { downloadProgress } = useReportsStore(state => ({ downloadProgress: state.downloadProgress }));

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/20 rounded-lg">
            <Icon className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{report.title}</h3>
            <p className="text-sm text-gray-400 mt-1">{report.description}</p>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-4 flex-grow">
        {report.fields.map(field => (
          <InputField
            key={field.key}
            id={`${report.id}-${field.key}`}
            label={field.label}
            type={field.type}
            value={filters[field.key]}
            onChange={e => handleFilterChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            options={field.options}
          />
        ))}
      </div>
      <div className="p-6 bg-gray-900/40 rounded-b-2xl">
        <button
          onClick={handleDownloadClick}
          disabled={isLoading}
          className={clsx('w-full flex items-center justify-center px-4 py-2.5 font-bold rounded-lg shadow-lg transition-all duration-300',
            isLoading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-cyan-500 text-white hover:bg-cyan-600 '
          )}
        >
          {isLoading ? (
            <><FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5" /><span>Duke shkarkuar...</span></>
          ) : (
            <><FiDownload className="-ml-1 mr-2 h-5 w-5" /><span>Shkarko Raportin</span></>
          )}
        </button>
        {isLoading && downloadProgress > 0 && (
          <div className="mt-4">
            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div className="bg-cyan-500 h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${downloadProgress}%` }} transition={{ duration: 0.3 }} />
            </div>
            <p className="text-xs text-gray-400 text-center mt-1.5">{downloadProgress}% e plotësuar</p>
          </div>
        )}
      </div>
    </div>
  );
});

const Reports = () => {
  const { downloadAttendanceReport, downloadVacationReport, downloadSummaryReport, loading } = useReportsStore();

  const handleDownloadAttendance = useCallback(f => downloadAttendanceReport(f), [downloadAttendanceReport]);
  const handleDownloadVacation = useCallback(f => downloadVacationReport(f), [downloadVacationReport]);
  const handleDownloadSummary = useCallback(f => downloadSummaryReport(f), [downloadSummaryReport]);

  const reportDefinitions = [
    {
      id: 'attendance', title: 'Raporti i Pranisë', description: 'Gjurmoni hyrjet, daljet dhe orët e punës.',
      icon: FiClock, initialFilters: { startDate: '', endDate: '', username: '' },
      onDownload: handleDownloadAttendance,
      fields: [
        { key: 'startDate', label: 'Nga data', type: 'date' },
        { key: 'endDate', label: 'Deri më datë', type: 'date' },
        { key: 'username', label: 'Emri i Përdoruesit (opsional)', type: 'text', placeholder: 'e.g., filan.fisteku' },
      ],
    },
    {
      id: 'vacation', title: 'Raporti i Pushimeve', description: 'Eksportoni statusin e kërkesave për leje.',
      icon: FiCalendar, initialFilters: { status: '', username: '' },
      onDownload: handleDownloadVacation,
      fields: [
        {
          key: 'status', label: 'Statusi', type: 'select',
          options: [
            { value: '', label: 'Të gjitha Statuset' }, { value: 'pending', label: 'Në Pritje' },
            { value: 'approved', label: 'Të Miratuara' }, { value: 'rejected', label: 'Të Refuzuara' },
          ],
        },
        { key: 'username', label: 'Emri i Përdoruesit (opsional)', type: 'text', placeholder: 'e.g., filan.fisteku' },
      ],
    },
  ];

  const summaryReportDefinition = {
    id: 'summary', title: 'Raporti Përmbledhës', description: 'Statistika agregate të performancës.',
    icon: FiBarChart2, initialFilters: { startDate: '', endDate: '' },
    onDownload: handleDownloadSummary,
    fields: [
      { key: 'startDate', label: 'Nga data', type: 'date' },
      { key: 'endDate', label: 'Deri më datë', type: 'date' },
    ],
  };

  return (
    <div className=" min-h-full p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
            {reportDefinitions.map(report => (<ReportCard key={report.id} report={report} onDownload={report.onDownload} isLoading={loading} />))}
            <div className="md:col-span-2">
              <ReportCard key={summaryReportDefinition.id} report={summaryReportDefinition} onDownload={summaryReportDefinition.onDownload} isLoading={loading} />
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-gray-800/80 backdrop-blur-sm border border-cyan-500/30 rounded-2xl shadow-2xl p-6 sticky top-8">
              <div className='flex items-center text-lg font-semibold text-white mb-4'>
                <FiInfo className="mr-3 text-cyan-400 h-6 w-6" /><span>Udhëzime</span>
              </div>
              <div className="space-y-4 text-sm text-gray-300">
                <p><strong className="font-medium text-white">1. Zgjidhni Raportin:</strong> Përdorni një nga kartat në të majtë për të zgjedhur llojin e raportit.</p>
                <p><strong className="font-medium text-white">2. Aplikoni Filtrat:</strong> Përcaktoni intervalet e datave, emrat e përdoruesve ose statuset. Lënia bosh e një fushe do t'i përfshijë të gjitha të dhënat.</p>
                <p><strong className="font-medium text-white">3. Shkarkoni:</strong> Shtypni butonin "Shkarko Raportin" për të gjeneruar dhe shkarkuar skedarin Excel.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;