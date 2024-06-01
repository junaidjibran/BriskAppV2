export function getStringDiff(str1, str2) {
    const diff = [];
    
    // Find characters in str1 that are not in str2
    for (let i = 0; i < str1.length; i++) {
      if (!str2.includes(str1[i])) {
        diff.push(str1[i]);
      }
    }
    
    // Find characters in str2 that are not in str1
    for (let i = 0; i < str2.length; i++) {
      if (!str1.includes(str2[i])) {
        diff.push(str2[i]);
      }
    }
    
    return diff.join('');
  }