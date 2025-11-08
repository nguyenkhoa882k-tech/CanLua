// Format number with thousand separators
export function formatNumber(num) {
  return num.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Convert number to Vietnamese words
export function numberToVietnamese(num) {
  if (num === 0) return 'Không kilogram';
  
  const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
  const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
  const thousands = ['', 'nghìn', 'triệu', 'tỷ'];
  
  const convertGroup = (n) => {
    if (n === 0) return '';
    
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    
    let result = '';
    
    // Hàng trăm
    if (hundred > 0) {
      result = ones[hundred] + ' trăm';
      if (remainder > 0) {
        result += ' ';
      }
    }
    
    // Hàng chục và đơn vị
    if (remainder === 0) {
      // Không có gì
    } else if (remainder < 10) {
      if (hundred > 0) {
        result += 'lẻ ' + ones[remainder];
      } else {
        result += ones[remainder];
      }
    } else if (remainder < 20) {
      result += teens[remainder - 10];
    } else {
      const ten = Math.floor(remainder / 10);
      const one = remainder % 10;
      
      result += tens[ten];
      if (one > 0) {
        if (one === 5) {
          result += ' lăm';
        } else if (one === 1) {
          result += ' mốt';
        } else {
          result += ' ' + ones[one];
        }
      }
    }
    
    return result;
  };
  
  const intPart = Math.floor(num);
  const decimalPart = Math.round((num - intPart) * 10);
  
  let result = '';
  let groupIndex = 0;
  let temp = intPart;
  
  while (temp > 0) {
    const group = temp % 1000;
    if (group > 0) {
      const groupText = convertGroup(group);
      const thousandText = thousands[groupIndex] || '';
      result = groupText + (thousandText ? ' ' + thousandText : '') + (result ? ' ' + result : '');
    }
    temp = Math.floor(temp / 1000);
    groupIndex++;
  }
  
  // Capitalize first letter
  if (result) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }
  
  // Add decimal part
  if (decimalPart > 0 && decimalPart < 10) {
    result += ' phẩy ' + ones[decimalPart];
  }
  
  return result + ' kilogram';
}

// Sum helper
export function sum(arr) {
  return arr.reduce((a, b) => a + (Number(b) || 0), 0);
}

// Convert money to Vietnamese words
export function moneyToVietnamese(num) {
  if (num === 0) return 'Không đồng';
  
  const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
  const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
  const thousands = ['', 'nghìn', 'triệu', 'tỷ'];
  
  const convertGroup = (n) => {
    if (n === 0) return '';
    
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    
    let result = '';
    
    if (hundred > 0) {
      result = ones[hundred] + ' trăm';
      if (remainder > 0) {
        result += ' ';
      }
    }
    
    if (remainder === 0) {
      // Không có gì
    } else if (remainder < 10) {
      if (hundred > 0) {
        result += 'lẻ ' + ones[remainder];
      } else {
        result += ones[remainder];
      }
    } else if (remainder < 20) {
      result += teens[remainder - 10];
    } else {
      const ten = Math.floor(remainder / 10);
      const one = remainder % 10;
      
      result += tens[ten];
      if (one > 0) {
        if (one === 5) {
          result += ' lăm';
        } else if (one === 1) {
          result += ' mốt';
        } else {
          result += ' ' + ones[one];
        }
      }
    }
    
    return result;
  };
  
  const intPart = Math.floor(num);
  
  let result = '';
  let groupIndex = 0;
  let temp = intPart;
  
  while (temp > 0) {
    const group = temp % 1000;
    if (group > 0) {
      const groupText = convertGroup(group);
      const thousandText = thousands[groupIndex] || '';
      result = groupText + (thousandText ? ' ' + thousandText : '') + (result ? ' ' + result : '');
    }
    temp = Math.floor(temp / 1000);
    groupIndex++;
  }
  
  if (result) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }
  
  return result + ' đồng';
}
