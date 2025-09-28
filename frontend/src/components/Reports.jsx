import { useState, useEffect, useCallback, memo,react } from 'react';
import { create } from "zustand";
import {
  FiDownload,
  FiCalendar,
  FiClock,
  FiFilter,
  FiCheck,
  FiLoader,
  FiBarChart2,
  FiFileText,
  FiUsers,
  FiInfo,
} from 'react-icons/fi';
import { useReportsStore } from '../stores/useReportsStore'; // Assuming your store is here
import { useUserStore } from '../stores/useUserStore';     // Assuming your store is here
import { motion } from 'framer-motion';
import clsx from 'clsx';

// ============================================================================
// Child Component: StatCard (Memoized for performance)
// ============================================================================
const StatCard = memo(({ icon: Icon, title, value, iconBgColor, iconColor }) => (
  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center">
    <div className={`p-3 rounded-full ${iconBgColor}`}>
      <Icon className={`h-6 w-6 ${iconColor}`} />
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-xl font-semibold text-slate-800">{value}</p>
    </div>
  </div>
));

// ============================================================================
// Child Component: InputField (Memoized for performance)
// ============================================================================
const InputField = memo(({ id, label, type, value, onChange, ...props }) => {
  const commonClasses =
    'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition';

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      {type === 'select' ? (
        <select id={id} value={value} onChange={onChange} className={commonClasses} {...props}>
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          className={commonClasses}
          {...props}
        />
      )}
    </div>
  );
});

// ============================================================================
// Child Component: ReportCard (Manages its own state, memoized)
// ============================================================================
const ReportCard = memo(({ report, onDownload, isLoading }) => {
  const Icon = report.icon;
  
  // *** CRITICAL PERFORMANCE FIX ***
  // Each card manages its own internal state. Changes here will NOT
  // cause the parent `Reports` component to re-render.
  const [filters, setFilters] = useState(report.initialFilters);

  useEffect(() => {
    // Set default date ranges on initial component mount
    if (report.initialFilters.startDate !== undefined) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const formatDate = (date) => date.toISOString().split('T')[0];
      
      setFilters(prev => ({
        ...prev,
        startDate: formatDate(firstDay),
        endDate: formatDate(lastDay)
      }));
    }
  }, [report.initialFilters.startDate]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDownloadClick = () => {
    onDownload(filters);
  };
  
  const { loading, downloadProgress } = useReportsStore(state => ({
    loading: state.loading,
    downloadProgress: state.downloadProgress
  }));


  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
      {/* Card Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Icon className="h-6 w-6 text-blue-700" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{report.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{report.description}</p>
          </div>
        </div>
      </div>

      {/* Form Fields */}
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
            options={field.options} // For select dropdown
          />
        ))}
      </div>

      {/* Download Button & Progress Bar */}
      <div className="p-6 bg-slate-50/70 rounded-b-lg">
        <button
          onClick={handleDownloadClick}
          disabled={isLoading}
          className={clsx(
            'w-full flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors duration-200',
            isLoading
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          )}
        >
          {isLoading ? (
            <>
              <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5" />
              <span>Duke shkarkuar...</span>
            </>
          ) : (
            <>
              <FiDownload className="-ml-1 mr-2 h-5 w-5" />
              <span>Shkarko Raportin</span>
            </>
          )}
        </button>
         {isLoading && downloadProgress > 0 && (
          <div className="mt-4">
            <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${downloadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-slate-500 text-center mt-1.5">
              {downloadProgress}% e plotësuar
            </p>
          </div>
        )}
      </div>
    </div>
  );
});


// ============================================================================
// Main Component: Reports
// ============================================================================
const Reports = () => {
  const {
    downloadAttendanceReport,
    downloadVacationReport,
    downloadSummaryReport,
    loading
  } = useReportsStore();
  
  const { user } = useUserStore();

  const handleDownloadAttendance = useCallback(
    filters => downloadAttendanceReport(filters),
    [downloadAttendanceReport]
  );
  
  const handleDownloadVacation = useCallback(
    filters => downloadVacationReport(filters),
    [downloadVacationReport]
  );
  
  const handleDownloadSummary = useCallback(
    filters => downloadSummaryReport(filters),
    [downloadSummaryReport]
  );

  const reportDefinitions = [
    {
      id: 'attendance',
      title: 'Raporti i Pranisë',
      description: 'Gjurmoni hyrjet, daljet dhe orët e punës.',
      icon: FiClock,
      initialFilters: { startDate: '', endDate: '', username: '' },
      onDownload: handleDownloadAttendance,
      fields: [
        { key: 'startDate', label: 'Nga data', type: 'date' },
        { key: 'endDate', label: 'Deri më datë', type: 'date' },
        { key: 'username', label: 'Emri i Përdoruesit (opsional)', type: 'text', placeholder: 'e.g., filan.fisteku' },
      ],
    },
    {
      id: 'vacation',
      title: 'Raporti i Pushimeve',
      description: 'Eksportoni statusin e kërkesave për leje.',
      icon: FiCalendar,
      initialFilters: { status: '', username: '' },
      onDownload: handleDownloadVacation,
      fields: [
        { 
          key: 'status', 
          label: 'Statusi', 
          type: 'select',
          options: [
            { value: '', label: 'Të gjitha Statuset' },
            { value: 'pending', label: 'Në Pritje' },
            { value: 'approved', label: 'Të Miratuara' },
            { value: 'rejected', label: 'Të Refuzuara' },
          ],
        },
        { key: 'username', label: 'Emri i Përdoruesit (opsional)', type: 'text', placeholder: 'e.g., filan.fisteku' },
      ],
    },
    // This report will be a single item now, for better layout.
    // We wrap it in an array to use the .map function consistently.
  ];
  
  const summaryReportDefinition = {
    id: 'summary',
    title: 'Raporti Përmbledhës',
    description: 'Statistika agregate të performancës.',
    icon: FiBarChart2,
    initialFilters: { startDate: '', endDate: '' },
    onDownload: handleDownloadSummary,
    fields: [
      { key: 'startDate', label: 'Nga data', type: 'date' },
      { key: 'endDate', label: 'Deri më datë', type: 'date' },
    ],
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}


        
        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Reports Section (Left) */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                {reportDefinitions.map(report => (
                    <ReportCard 
                        key={report.id}
                        report={report}
                        onDownload={report.onDownload}
                        isLoading={loading}
                    />
                ))}
                 {/* Summary card gets its own space for better alignment */}
                <div className="md:col-span-2">
                    <ReportCard
                      key={summaryReportDefinition.id}
                      report={summaryReportDefinition}
                      onDownload={summaryReportDefinition.onDownload}
                      isLoading={loading}
                    />
                </div>
            </div>

            {/* Help/Details Section (Right) */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 sticky top-8">
                    <div className='flex items-center text-lg font-semibold text-slate-800 mb-4'>
                        <FiInfo className="mr-3 text-blue-600 h-6 w-6" />
                        <span>Udhëzime</span>
                    </div>
                    <div className="space-y-4 text-sm text-slate-600">
                        <p>
                            <strong className="font-medium text-slate-700">1. Zgjidhni Raportin:</strong>
                            Përdorni një nga kartat në të majtë për të zgjedhur llojin e raportit.
                        </p>
                        <p>
                            <strong className="font-medium text-slate-700">2. Aplikoni Filtrat:</strong>
                            Përcaktoni intervalet e datave, emrat e përdoruesve ose statuset për të saktësuar të dhënat tuaja. Lënia bosh e një fushe do t'i përfshijë të gjitha të dhënat për atë fushë.
                        </p>
                        <p>
                            <strong className="font-medium text-slate-700">3. Shkarkoni:</strong>
                            Shtypni butonin "Shkarko Raportin" për të gjeneruar dhe shkarkuar skedarin Excel në kompjuterin tuaj.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;