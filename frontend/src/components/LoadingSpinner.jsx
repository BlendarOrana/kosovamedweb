import { useState, useEffect } from 'react';

const LoadingSpinner = ({ fullScreen = false, className = '' }) => {
	// This state is still used for the fullScreen version
	const [dots, setDots] = useState('');

	useEffect(() => {
		// The interval only runs when the component is mounted
		const interval = setInterval(() => {
			setDots(prev => {
				if (prev === '...') return '';
				return prev + '.';
			});
		}, 500);

		// Cleanup function to clear the interval when the component unmounts
		return () => clearInterval(interval);
	}, []);



	// --- FIXED: New Inline Spinner Version ---
	// This now renders a clean, red, spinning circle.
	return (
		<div className={`flex items-center justify-center py-8 ${className}`}>
			<div 
className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
				role="status"
				aria-label="loading"
			>
				<span className="sr-only">Loading...</span>
			</div>
		</div>
	);
};

export default LoadingSpinner;