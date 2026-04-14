import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepTitles?: string[];
}

export default function ProgressBar({ currentStep, totalSteps, stepTitles }: ProgressBarProps) {
  const percentage = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100);

  return (
    <div className="w-full">
      {/* Step indicators */}
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex flex-col items-center flex-1">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                ${step < currentStep
                  ? 'bg-primary-600 text-white'
                  : step === currentStep
                    ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                    : 'bg-gray-200 text-gray-500'
                }
              `}
            >
              {step < currentStep ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step
              )}
            </div>
            {stepTitles && stepTitles[step - 1] && (
              <span className={`
                mt-1 text-xs text-center hidden sm:block max-w-[80px] truncate
                ${step === currentStep ? 'text-primary-700 font-medium' : 'text-gray-400'}
              `}>
                {stepTitles[step - 1]}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Progress line */}
      <div className="relative h-1.5 bg-gray-200 rounded-full mt-1">
        <div
          className="absolute left-0 top-0 h-full bg-primary-600 rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
