import { useState, useMemo, useCallback } from 'react';
import { FiClock, FiCalendar, FiDownload, FiArrowLeft, FiArrowRight, FiCheckCircle, FiLoader, FiBarChart2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
// Sigurohuni që të importoni store-et tuaja saktë
import { useReportsStore } from '../stores/useReportsStore';
import { useUserStore } from '../stores/useUserStore';


// --- Komponentët e ripërdorshëm të UI ---

const InputField = ({ id, label, type, value, onChange, options = [], ...props }) => {
  const commonClasses = 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition placeholder-gray-400';
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      {type === 'select' ? (
        <select id={id} value={value} onChange={onChange} className={commonClasses} {...props}>
          {options.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
        </select>
      ) : (
        <input id={id} type={type} value={value} onChange={onChange} className={commonClasses} {...props} />
      )}
    </div>
  );
};

const WizardStep = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -50 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

const ProgressBar = ({ currentStep, totalSteps }) => {
    const progress = (currentStep / totalSteps) * 100;
    return (
        <div className="bg-gray-700 rounded-full h-2 mb-8">
            <motion.div
                className="bg-cyan-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeInOut", duration: 0.5 }}
            />
        </div>
    );
};


// --- Hapat e Wizard-it ---

const Step1_SelectReport = ({ onSelect, selectedId, reportDefinitions }) => (
  <WizardStep>
    <h2 className="text-2xl font-bold text-white mb-1">Zgjidhni një Raport</h2>
    <p className="text-gray-400 mb-6">Zgjidhni llojin e raportit që dëshironi të gjeneroni.</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {reportDefinitions.map((report) => {
        const Icon = report.icon;
        return (
          <div
            key={report.id}
            onClick={() => onSelect(report.id)}
            className={clsx(
              'p-6 rounded-lg cursor-pointer border-2 transition-all duration-300',
              selectedId === report.id ? 'bg-cyan-500/20 border-cyan-500' : 'bg-gray-800 border-gray-700 hover:border-cyan-600'
            )}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gray-700/50 rounded-lg">
                <Icon className={clsx("h-6 w-6", selectedId === report.id ? "text-cyan-400" : "text-gray-400")} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{report.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{report.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </WizardStep>
);

const Step2_ConfigureFilters = ({ report, filters, onFilterChange }) => (
  <WizardStep>
    <h2 className="text-2xl font-bold text-white mb-1">Vendos Filtrat</h2>
    <p className="text-gray-400 mb-6">Specifikoni kriteret për '{report.title}'. Lërini fushat bosh për të përfshirë të gjitha të dhënat.</p>
    <div className="space-y-4">
      {report.fields.map((field) => (
        <InputField
          key={field.key}
          id={`${report.id}-${field.key}`}
          label={field.label}
          type={field.type}
          value={filters[field.key] || ''}
          onChange={(e) => onFilterChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          options={field.options}
        />
      ))}
    </div>
  </WizardStep>
);

const Step3_Download = ({ report, onDownload, isLoading, downloadProgress }) => {
    const Icon = report.icon;

    return (
    <WizardStep>
        <div className="text-center">
            <div className="flex justify-center items-center mb-4">
                <div className="p-4 bg-cyan-500/20 rounded-full">
                    <Icon className="h-10 w-10 text-cyan-400" />
                </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Gati për Shkarkim</h2>
            <p className="text-gray-400 mb-8">Jeni gati të gjeneroni '{report.title}'.</p>
            
            <button
                onClick={onDownload}
                disabled={isLoading}
                className={clsx(
                    'w-full max-w-xs mx-auto flex items-center justify-center px-6 py-3 font-bold rounded-lg shadow-lg transition-all duration-300 text-lg',
                    isLoading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-cyan-500 text-white hover:bg-cyan-600'
                )}
            >
                {isLoading ? (
                    <><FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5" /><span>Duke u shkarkuar...</span></>
                ) : (
                    <><FiDownload className="-ml-1 mr-3 h-5 w-5" /><span>Gjenero dhe Shkarko</span></>
                )}
            </button>
            
            {isLoading && (
            <div className="mt-6 max-w-xs mx-auto">
                <div className="bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                        className="bg-cyan-500 h-2.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${downloadProgress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
                <p className="text-sm text-gray-400 text-center mt-2">{downloadProgress}% Përfunduar</p>
            </div>
            )}
        </div>
    </WizardStep>
    );
};


// --- Komponenti kryesor i Raporteve ---

const Reports = () => {
  const [step, setStep] = useState(1);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [filters, setFilters] = useState({});

  // Hardcoded regions
  const REGIONS = ['Istog', 'Gjilan', 'Malishevë', 'Skenderaj', 'Viti', 'Klinë', 'Ferizaj', 'Fushë Kosovë', 'Mitrovicë', 'Prizren'];

  // Këto do të vijnë nga store-et tuaja aktuale
  const { downloadAttendanceReport, downloadVacationReport, loading, downloadProgress } = useReportsStore();
  const { titles = [] } = useUserStore();

  const regionOptions = useMemo(() => [
    { value: '', label: 'Të gjitha Rajonet' },
    ...REGIONS.map((region) => ({ value: region, label: region })),
  ], []);

  const titleOptions = useMemo(() => [
    { value: '', label: 'Të gjithë Titujt' },
    ...(titles || []).map((title) => ({ value: title, label: title })),
  ], [titles]);

  const reportDefinitions = useMemo(() => [
    {
      id: 'attendance', 
      title: 'Raporti i Pjesëmarrjes', 
      description: 'Ndiqni hyrjet, daljet dhe orët e punës.',
      icon: FiClock, 
      initialFilters: { startDate: '', endDate: '', username: '', region: '', title: '' },
      onDownload: downloadAttendanceReport,
      fields: [
        { key: 'startDate', label: 'Data e Fillimit', type: 'date' },
        { key: 'endDate', label: 'Data e Mbarimit', type: 'date' },
        { key: 'username', label: 'Përdoruesi (opsional)', type: 'text', placeholder: 'p.sh. filan fisteku' },
        { key: 'region', label: 'Rajoni (opsional)', type: 'select', options: regionOptions },
        { key: 'title', label: 'Roli (opsional)', type: 'select', options: titleOptions },
      ],
    },
    {
      id: 'vacation', 
      title: 'Raporti i Lejeve', 
      description: 'Eksportoni statusin e kërkesave për leje të punonjësve.',
      icon: FiCalendar, 
      initialFilters: { status: '', username: '', region: '', title: '' },
      onDownload: downloadVacationReport,
      fields: [
        {
          key: 'status', label: 'Statusi', type: 'select',
          options: [
            { value: '', label: 'Të gjitha Statuset' }, 
            { value: 'pending', label: 'Në Pritje' },
            { value: 'approved', label: 'Miratuar' }, 
            { value: 'rejected', label: 'Refuzuar' },
          ],
        },
        { key: 'username', label: 'Përdoruesi (opsional)', type: 'text', placeholder: '' },
        { key: 'region', label: 'Rajoni (opsional)', type: 'select', options: regionOptions },
        { key: 'title', label: 'Roli (opsional)', type: 'select', options: titleOptions },
      ],
    },
  ], [regionOptions, titleOptions, downloadAttendanceReport, downloadVacationReport]);

  const handleSelectReport = (id) => {
    setSelectedReportId(id);
    const report = reportDefinitions.find((r) => r.id === id);
    if (report) {
      const initialFilters = { ...report.initialFilters };
      if (id === 'attendance') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const formatDate = (date) => date.toISOString().split('T')[0];
        initialFilters.startDate = formatDate(firstDay);
        initialFilters.endDate = formatDate(lastDay);
      }
      setFilters(initialFilters);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));
  
  const handleDownload = useCallback(() => {
    const report = reportDefinitions.find((r) => r.id === selectedReportId);
    if (report) {
      report.onDownload(filters);
    }
  }, [selectedReportId, filters, reportDefinitions]);
  
  const selectedReport = reportDefinitions.find((r) => r.id === selectedReportId);

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="bg-gray-800/80 backdrop-blur-sm border border-cyan-500/30 rounded-2xl shadow-2xl p-6 sm:p-8">
            <ProgressBar currentStep={step} totalSteps={3} />
            <AnimatePresence mode="wait">
                {step === 1 && (
                    <Step1_SelectReport
                        key="step1"
                        onSelect={handleSelectReport}
                        selectedId={selectedReportId}
                        reportDefinitions={reportDefinitions}
                    />
                )}
                {step === 2 && selectedReport && (
                    <Step2_ConfigureFilters
                        key="step2"
                        report={selectedReport}
                        filters={filters}
                        onFilterChange={handleFilterChange}
                    />
                )}
                {step === 3 && selectedReport && (
                    <Step3_Download
                        key="step3"
                        report={selectedReport}
                        onDownload={handleDownload}
                        isLoading={loading}
                        downloadProgress={downloadProgress}
                    />
                )}
            </AnimatePresence>

          {/* Navigimi */}
          <div className="mt-8 pt-6 border-t border-gray-700 flex justify-between items-center">
                <button
                onClick={handleBack}
                disabled={step === 1 || loading}
                className={clsx(
                    'flex items-center px-4 py-2 font-semibold rounded-lg transition-all',
                    (step === 1 || loading) ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-gray-700'
                )}
                >
                <FiArrowLeft className="mr-2 h-5 w-5" />
                <span>Prapa</span>
                </button>
            
            <div className="text-sm text-gray-400">Hapi {step} nga 3</div>

                {step < 3 ? (
                  <button
                    onClick={handleNext}
                    disabled={!selectedReportId || loading}
                    className={clsx(
                        'flex items-center px-4 py-2 font-bold rounded-lg transition-all',
                        (!selectedReportId || loading) 
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-cyan-500 text-white hover:bg-cyan-600'
                    )}
                  >
                  <span>Para</span>
                  <FiArrowRight className="ml-2 h-5 w-5" />
                  </button>
                ) : (
                  <div style={{ width: '82px' }} /> // Për të mbajtur layout-in
                )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;