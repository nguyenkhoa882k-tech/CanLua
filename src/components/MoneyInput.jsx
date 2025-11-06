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

// Input for weight (max 3 digits)
export const WeightInput = React.forwardRef(({ value, onChangeText, ...props }, ref) => {
  const handleChange = (text) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 3) {
      onChangeText(numbers);
    }
  };

  return (
    <TextInput
      {...props}
      ref={ref}
      value={value}
      onChangeText={handleChange}
      keyboardType="numeric"
      maxLength={3}
    />
  );
});
