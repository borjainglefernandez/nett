import { useState } from "react";
import { AlertTriangle } from "lucide-react";

type ErrorBannerProps = {
  errorCode: number;
  errorMessage: string;
};

const ErrorBanner: React.FC<ErrorBannerProps> = ({ errorCode, errorMessage }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-start shadow-lg">
      <AlertTriangle size={24} className="mr-3 text-red-500" />
      <div className="flex-1">
        <strong className="block">Error {errorCode}</strong>
        <p className="text-sm">{errorMessage}</p>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="ml-4 text-red-500 hover:text-red-700"
        aria-label="Close error banner"
      >
        ✕
      </button>
    </div>
  );
};

export default ErrorBanner;
