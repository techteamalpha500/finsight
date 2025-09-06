import React, { useState } from 'react';
import { Button } from '../../../../components/Button';
import SmartRepaymentModal from './SmartRepaymentModal';

// Test component to verify our new modal works
export default function TestSmartRepaymentModal() {
  const [showModal, setShowModal] = useState(false);

  // Mock data for testing
  const mockLiabilities = [
    {
      id: '1',
      type: 'home_loan' as const,
      original_amount: 5000000,
      interest_rate: 8.5,
      tenure_months: 240,
      start_date: '2020-01-01',
      label: 'Home Loan',
      institution: 'SBI'
    },
    {
      id: '2', 
      type: 'car_loan' as const,
      original_amount: 800000,
      interest_rate: 9.5,
      tenure_months: 84,
      start_date: '2022-01-01',
      label: 'Car Loan',
      institution: 'HDFC Bank'
    },
    {
      id: '3',
      type: 'personal_loan' as const,
      original_amount: 300000,
      interest_rate: 14.5,
      tenure_months: 36,
      start_date: '2023-01-01', 
      label: 'Personal Loan',
      institution: 'ICICI Bank'
    }
  ];

  return (
    <div className="p-4">
      <Button onClick={() => setShowModal(true)}>
        Test Smart Repayment Modal
      </Button>
      
      <SmartRepaymentModal
        open={showModal}
        onClose={() => setShowModal(false)}
        liabilities={mockLiabilities}
        onApplyStrategy={(result) => {
          console.log('Strategy applied:', result);
          alert('Strategy applied! Check console for details.');
        }}
      />
    </div>
  );
}
