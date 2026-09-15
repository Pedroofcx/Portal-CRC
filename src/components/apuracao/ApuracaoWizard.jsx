import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export default function ApuracaoWizard({ currentStep, steps }) {
  return (
    <Card className="border-0 shadow-sm mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={`step-${index}`}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all",
                    index < currentStep && "bg-success text-white",
                    index === currentStep && "bg-primary text-white",
                    index > currentStep && "bg-muted text-muted-foreground"
                  )}
                >
                  {index < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <p className={cn(
                  "text-xs mt-2 font-medium text-center",
                  index <= currentStep ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4 transition-all",
                    index < currentStep ? "bg-success" : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}