import React from 'react';
import { TextInput } from 'react-native';
import MaskInput, { Masks } from 'react-native-mask-input';

// Format number with dots: 1.000.000
export function MoneyInput({ value, onChangeText, ...props }) {
  const formatMoney = (text) => {
    // Remove all non-digits
    const numbers = text.replace(/\D/g, '');
    // Format with dots
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleChange = (masked, unmasked) => {
    onChangeText(unmasked); // Return only numbers
  };

  const displayValue = value ? formatMoney(value) : '';

  return (
    <TextInput
      {...props}
      value={displayValue}
      onChangeText={(text) => {
        const numbers = text.replace(/\D/g, '');
        onChangeText(numbers);
      }}
      keyboardType="numeric"
    />
  );
}

// Input for weight (max 3 or 4 digits based on settings)
export const WeightInput = React.forwardRef(({ value, onChangeText, maxDigits = 3, ...props }, ref) => {
  const handleChange = (text) => {
    const numbers = text.replace(/\D/g, '');
    
    // Don't allow leading zero (except when clearing to empty)
    if (numbers.length > 0 && numbers[0] === '0') {
      // If user types 0 first, ignore it
      return;
    }
    
    // Only allow up to maxDigits
    if (numbers.length <= maxDigits) {
      onChangeText(numbers);
    }
    // If user tries to input more, keep the current value (don't update)
  };

  return (
    <TextInput
      {...props}
      ref={ref}
      value={value}
      onChangeText={handleChange}
      keyboardType="numeric"
      // Don't use maxLength - let handleChange control the length
    />
  );
});

// Input for decimal numbers (allows comma and converts to dot)
export function DecimalInput({ value, onChangeText, ...props }) {
  const handleChange = (text) => {
    // Replace comma with dot
    let processed = text.replace(/,/g, '.');
    
    // Only allow numbers and one dot
    processed = processed.replace(/[^\d.]/g, '');
    
    // Only allow one dot
    const parts = processed.split('.');
    if (parts.length > 2) {
      processed = parts[0] + '.' + parts.slice(1).join('');
    }
    
    onChangeText(processed);
  };

  return (
    <TextInput
      {...props}
      value={value}
      onChangeText={handleChange}
      keyboardType="decimal-pad"
    />
  );
}
